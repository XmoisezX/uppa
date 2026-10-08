import { createClient, createPublicServerClient } from "@/lib/supabase/server";
import type { SearchFilters, SearchPropertyItem, SearchResult } from "./types";
import { SEARCH_BATCH_SIZE } from "./constants";
import { decodeCursor, encodeCursor } from "./utils/cursor";
import {
  calculatePropertyRanking,
  sortPropertiesByRanking,
} from "@/features/ranking/engine";
import { getRankingConfig } from "@/features/ranking/services";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import { getApproximateCoordinates } from "./utils/price-formatter";

/**
 * Cache leve em memória de destaques da home/busca (TTL 60s)
 */
let cachedFeaturedIds: { ids: string[]; expiresAt: number } | null = null;
async function getFeaturedPropertyIds(supabase: any): Promise<string[]> {
  const now = Date.now();
  if (cachedFeaturedIds && cachedFeaturedIds.expiresAt > now) {
    return cachedFeaturedIds.ids;
  }
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "featured_property_ids")
      .maybeSingle();
    const ids = Array.isArray(data?.value) ? data.value : [];
    cachedFeaturedIds = { ids, expiresAt: now + 60000 };
    return ids;
  } catch {
    return [];
  }
}

/**
 * Validador robusto de formato UUID v1-v5
 */
export function isUuid(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
}

/**
 * Valida limites geográficos de Bounding Box (Seção 17 do MASTER_PLAN)
 */
export function isValidBoundingBox(bbox?: {
  north: number;
  south: number;
  east: number;
  west: number;
}): boolean {
  if (!bbox) return false;
  const { north, south, east, west } = bbox;
  return (
    typeof north === "number" &&
    typeof south === "number" &&
    typeof east === "number" &&
    typeof west === "number" &&
    !isNaN(north) &&
    !isNaN(south) &&
    !isNaN(east) &&
    !isNaN(west) &&
    south >= -90 &&
    north <= 90 &&
    south <= north &&
    west >= -180 &&
    east <= 180 &&
    west <= east
  );
}

/**
 * DTO OTIMIZADO PARA SEARCH CARDS (Projeção estrita, sem description, sem 30 fotos)
 * Une property + representative offer + agency + single cover em 1 única query PostgreSQL
 */
const SEARCH_PROPERTIES_SELECT = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  active_offers_count,
  lowest_sale_price,
  highest_sale_price,
  lowest_rent_price,
  highest_rent_price,
  primary_offer_id,
  condominium_fee,
  usable_area,
  total_area,
  bedrooms,
  suites,
  bathrooms,
  parking_spaces,
  financiable,
  furnished,
  accepts_exchange,
  address_visible,
  street,
  number,
  latitude,
  longitude,
  published_at,
  updated_at,
  ranking_score,
  city:cities!city_id (
    id,
    name,
    slug
  ),
  neighborhood:neighborhoods!neighborhood_id (
    id,
    name,
    slug
  ),
  state:states!state_id (
    id,
    code,
    name
  ),
  primary_offer:property_offers!primary_offer_id (
    id,
    sale_price,
    rent_price,
    agency_id,
    agency:agencies!agency_id (
      id,
      name,
      slug,
      logo_url,
      creci,
      verified_at,
      phone
    )
  ),
  cover:property_media (
    url,
    is_cover
  )
`;

/**
 * Executa a busca pública de imóveis ativos com filtros dinâmicos e Keyset/Cursor Pagination
 */
export async function searchProperties(filters: SearchFilters): Promise<SearchResult> {
  const supabase = createPublicServerClient();

  const limit = Math.min(50, Math.max(1, filters.limit || SEARCH_BATCH_SIZE));
  const decodedCursor = decodeCursor(filters.cursor);
  const isKeyset = Boolean(decodedCursor);

  const isRent = filters.transactionType === "rent";
  const hasPriceMin = filters.priceMin !== undefined && filters.priceMin > 0;
  const hasPriceMax = filters.priceMax !== undefined && filters.priceMax > 0;
  const hasPriceFilter = hasPriceMin || hasPriceMax;

  let selectProjection = SEARCH_PROPERTIES_SELECT;
  if (hasPriceFilter) {
    selectProjection += `,\n  matching_offers:property_offers!property_offers_property_id_fkey!inner (\n    id,\n    sale_price,\n    rent_price,\n    status\n  )`;
  }

  // Inicia query com projeção enxuta e apenas 1 imagem de capa
  let query = supabase
    .from("properties")
    .select(selectProjection, isKeyset ? undefined : { count: "exact" })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .eq("cover.is_cover", true);

  // 1. FILTRO: FINALIDADE (transaction_type)
  if (filters.transactionType) {
    if (filters.transactionType === "sale") {
      query = query.in("transaction_type", ["sale", "sale_or_rent"]);
    } else if (filters.transactionType === "rent") {
      query = query.in("transaction_type", ["rent", "sale_or_rent"]);
    } else {
      query = query.eq("transaction_type", filters.transactionType);
    }
  }

  // 2. FILTRO: TIPO DE IMÓVEL (property_type)
  if (filters.propertyType) {
    if (Array.isArray(filters.propertyType) && filters.propertyType.length > 0) {
      query = query.in("property_type", filters.propertyType);
    } else if (typeof filters.propertyType === "string") {
      query = query.eq("property_type", filters.propertyType);
    }
  }

  // 3. FILTRO: ESTADO (state)
  if (filters.state) {
    const cleanState = filters.state.trim().toUpperCase();
    if (cleanState.length === 2) {
      // Busca pelo código UF
      const { data: stateRow } = await supabase
        .from("states")
        .select("id")
        .eq("code", cleanState)
        .maybeSingle();

      if (stateRow?.id) {
        query = query.eq("state_id", stateRow.id);
      }
    } else {
      query = query.eq("state_id", filters.state);
    }
  }

  // 4. FILTRO: CIDADE (city)
  let resolvedCityId: string | null = null;
  if (filters.city) {
    const cleanCity = filters.city.trim();
    if (isUuid(cleanCity)) {
      resolvedCityId = cleanCity;
      query = query.eq("city_id", cleanCity);
    } else {
      const slugCity = cleanCity.toLowerCase();
      // Tenta por slug e, caso não localize, por nome
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .or(`slug.eq.${slugCity},name.ilike.${cleanCity}`)
        .limit(1)
        .maybeSingle();

      if (cityRow?.id) {
        resolvedCityId = cityRow.id;
        query = query.eq("city_id", cityRow.id);
      }
    }
  }

  // 5. FILTRO: BAIRRO (neighborhood)
  let resolvedNeighborhoodId: string | null = null;
  if (filters.neighborhood) {
    const cleanNeigh = filters.neighborhood.trim();
    if (isUuid(cleanNeigh)) {
      resolvedNeighborhoodId = cleanNeigh;
      query = query.eq("neighborhood_id", cleanNeigh);
    } else {
      const slugNeigh = cleanNeigh.toLowerCase();
      let nQuery = supabase
        .from("neighborhoods")
        .select("id")
        .or(`slug.eq.${slugNeigh},name.ilike.${cleanNeigh}`);
      if (resolvedCityId) {
        nQuery = nQuery.eq("city_id", resolvedCityId);
      }
      const { data: neighRow } = await nQuery.limit(1).maybeSingle();
      if (neighRow?.id) {
        resolvedNeighborhoodId = neighRow.id;
        query = query.eq("neighborhood_id", neighRow.id);
      }
    }
  }

  // 6. FILTROS DE PREÇO (Item 1: Pelo menos uma oferta ativa deve satisfazer integralmente o filtro)
  const minPriceCol = isRent ? "lowest_rent_price" : "lowest_sale_price";
  const maxPriceCol = isRent ? "highest_rent_price" : "highest_sale_price";
  const offerPriceCol = isRent ? "matching_offers.rent_price" : "matching_offers.sale_price";

  if (hasPriceFilter) {
    query = query.eq("matching_offers.status", "active");

    if (hasPriceMin) {
      query = query.gte(offerPriceCol, filters.priceMin!);
    }
    if (hasPriceMax) {
      query = query.lte(offerPriceCol, filters.priceMax!);
    }
  }

  // 7. FILTROS DE ESPECIFICAÇÕES (dormitórios, banheiros, vagas)
  if (filters.bedrooms !== undefined && filters.bedrooms > 0) {
    query = query.gte("bedrooms", filters.bedrooms);
  }

  if (filters.bathrooms !== undefined && filters.bathrooms > 0) {
    query = query.gte("bathrooms", filters.bathrooms);
  }

  if (filters.parkingSpaces !== undefined && filters.parkingSpaces > 0) {
    query = query.gte("parking_spaces", filters.parkingSpaces);
  }

  // 8. FILTROS DE METRAGEM (area_min e area_max)
  if (filters.areaMin !== undefined && filters.areaMin > 0) {
    query = query.gte("usable_area", filters.areaMin);
  }

  if (filters.areaMax !== undefined && filters.areaMax > 0) {
    query = query.lte("usable_area", filters.areaMax);
  }

  // 9. FILTROS BOOLEANOS (financiable, furnished, accepts_exchange)
  if (filters.financiable === true) {
    query = query.eq("financiable", true);
  }

  if (filters.furnished === true) {
    query = query.eq("furnished", true);
  }

  if (filters.acceptsExchange === true) {
    query = query.eq("accepts_exchange", true);
  }

  // 10. FILTRO DE VIEWPORT / BOUNDING BOX (Seções 17 e 39 do MASTER_PLAN)
  if (isValidBoundingBox(filters.bbox)) {
    const { north, south, east, west } = filters.bbox!;
    query = query
      .gte("latitude", south)
      .lte("latitude", north)
      .gte("longitude", west)
      .lte("longitude", east);
  }

  // 11. ORDENAÇÃO E PIPELINE DETERMINÍSTICO (COM DESEMPATE POR ID)
  const isPriceAsc = filters.orderBy === "price_asc";
  const isPriceDesc = filters.orderBy === "price_desc";
  const isAreaDesc = filters.orderBy === "area_desc";
  const isRecent = filters.orderBy === "recent";

  if (isPriceAsc) {
    query = query
      .order(minPriceCol, { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (isPriceDesc) {
    query = query
      .order(maxPriceCol, { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (isAreaDesc) {
    query = query
      .order("usable_area", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (isRecent) {
    query = query
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else {
    // Default: ranking nativo no PostgreSQL
    query = query
      .order("ranking_score", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  }

  // 12. APLICAÇÃO DE KEYSET / CURSOR PAGINATION
  if (isKeyset && decodedCursor) {
    const { sortVal, id: cursorId } = decodedCursor;
    if (isPriceAsc) {
      query = query.or(
        `${minPriceCol}.gt.${sortVal},and(${minPriceCol}.eq.${sortVal},id.gt.${cursorId})`
      );
    } else if (isPriceDesc) {
      query = query.or(
        `${maxPriceCol}.lt.${sortVal},and(${maxPriceCol}.eq.${sortVal},id.gt.${cursorId})`
      );
    } else if (isAreaDesc) {
      query = query.or(
        `usable_area.lt.${sortVal},and(usable_area.eq.${sortVal},id.gt.${cursorId})`
      );
    } else if (isRecent) {
      query = query.or(
        `updated_at.lt.${sortVal},and(updated_at.eq.${sortVal},id.gt.${cursorId})`
      );
    } else {
      // Ranking
      query = query.or(
        `ranking_score.lt.${sortVal},and(ranking_score.eq.${sortVal},id.gt.${cursorId})`
      );
    }
  }

  // Obter IDs de destaques com cache leve
  const featuredIds = await getFeaturedPropertyIds(supabase);

  let rawData: any[] = [];
  let totalCount = 0;

  if (isKeyset) {
    // Busca do próximo lote via Keyset: sem COUNT(*) pesado e sem OFFSET caro
    const { data, error } = await query.limit(limit);
    if (error || !data) {
      if (error) console.error("[searchProperties] Erro no lote keyset:", error);
      return {
        properties: [],
        total: 0,
        page: 1,
        totalPages: 0,
        limit,
        filters,
        nextCursor: null,
        hasMore: false,
      };
    }
    rawData = data;
  } else {
    // Primeiro lote (SSR ou busca inicial): executa COUNT(*) e offset inicial
    const page = Math.max(1, filters.page || 1);
    const offset = (page - 1) * limit;
    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error || !data) {
      if (error) console.error("[searchProperties] Erro no lote inicial:", error);
      return {
        properties: [],
        total: 0,
        page,
        totalPages: 0,
        limit,
        filters,
        nextCursor: null,
        hasMore: false,
      };
    }
    rawData = data;
    totalCount = count || 0;
  }

  // 13. CONSTRUÇÃO DO DTO ENXUTO PARA LISTAGEM
  const properties: SearchPropertyItem[] = rawData.map((row: any) => {
    const coverUrl = Array.isArray(row.cover) && row.cover.length > 0 ? row.cover[0]?.url : null;
    const repOffer = row.primary_offer;
    const agency = repOffer?.agency;

    let lat = row.latitude;
    let lng = row.longitude;
    let street = row.street;
    let number = row.number;

    if (!row.address_visible && lat && lng) {
      const approx = getApproximateCoordinates(row.id, lat, lng);
      lat = approx.latitude;
      lng = approx.longitude;
      street = null;
      number = null;
    }

    const isFeatured = featuredIds.includes(row.id);

    return {
      id: row.id,
      featured: isFeatured,
      slug: row.slug,
      externalId: row.external_id,
      title: row.title,
      transactionType: row.transaction_type,
      propertyType: row.property_type,
      price: repOffer?.sale_price ?? row.lowest_sale_price,
      rentPrice: repOffer?.rent_price ?? row.lowest_rent_price,
      coverImage: coverUrl,
      representativeOfferId: repOffer?.id ?? row.primary_offer_id,
      activeOffersCount: row.active_offers_count ?? 1,
      lowestSalePrice: row.lowest_sale_price,
      highestSalePrice: row.highest_sale_price,
      lowestRentPrice: row.lowest_rent_price,
      highestRentPrice: row.highest_rent_price,
      primaryOfferId: row.primary_offer_id,
      condominiumFee: row.condominium_fee,
      usableArea: row.usable_area,
      totalArea: row.total_area,
      bedrooms: row.bedrooms || 0,
      suites: row.suites || 0,
      bathrooms: row.bathrooms || 0,
      parkingSpaces: row.parking_spaces || 0,
      financiable: Boolean(row.financiable),
      furnished: Boolean(row.furnished),
      acceptsExchange: Boolean(row.accepts_exchange),
      addressVisible: Boolean(row.address_visible),
      street,
      number,
      latitude: lat,
      longitude: lng,
      publishedAt: row.published_at,
      rankingScore: row.ranking_score,
      city: row.city,
      neighborhood: row.neighborhood,
      state: row.state,
      agency: agency
        ? {
            id: agency.id,
            name: agency.name,
            slug: agency.slug,
            logoUrl: agency.logo_url,
            creci: agency.creci,
            verifiedAt: agency.verified_at,
            phone: agency.phone,
          }
        : null,
      media: coverUrl ? [{ id: "cover", url: coverUrl, isCover: true, position: 0 }] : [],
    };
  });

  // 14. GERAÇÃO DETERMINÍSTICA DO PRÓXIMO CURSOR
  const hasMore = rawData.length === limit;
  let nextCursor: string | null = null;

  if (hasMore && rawData.length > 0) {
    const last = rawData[rawData.length - 1];
    let sortVal: any = null;
    if (isPriceAsc) {
      sortVal = last[minPriceCol] ?? last.price ?? 0;
    } else if (isPriceDesc) {
      sortVal = last[maxPriceCol] ?? last.price ?? 0;
    } else if (isAreaDesc) {
      sortVal = last.usable_area ?? 0;
    } else if (isRecent) {
      sortVal = last.updated_at || last.published_at || "";
    } else {
      sortVal = last.ranking_score ?? 0;
    }

    nextCursor = encodeCursor({
      sortVal,
      id: last.id,
      order: filters.orderBy || "ranking",
    });
  }

  const page = Math.max(1, filters.page || 1);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;

  return {
    properties,
    total: totalCount,
    page,
    totalPages,
    limit,
    filters,
    nextCursor,
    hasMore,
  };
}

/**
 * Consulta espacial dedicada para viewport do mapa (Seção 39 do MASTER_PLAN).
 * Tenta executar a RPC PostGIS `search_properties_bbox` (acelerada por índice GiST);
 * Caso a RPC ainda não esteja instalada no banco, executa fallback com filtro de coordenadas.
 */
export async function searchPropertiesSpatial(filters: SearchFilters): Promise<{
  properties: SearchPropertyItem[];
  total: number;
}> {
  if (!isValidBoundingBox(filters.bbox)) {
    const result = await searchProperties({ ...filters, limit: 100 });
    return { properties: result.properties, total: result.total };
  }

  const supabase = createPublicServerClient();
  const { north, south, east, west } = filters.bbox!;
  const limit = Math.min(150, Math.max(1, filters.limit || 100));

  const propertyTypes = Array.isArray(filters.propertyType)
    ? filters.propertyType
    : filters.propertyType
    ? [filters.propertyType]
    : null;

  // 1. Tenta executar via RPC PostGIS
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("search_properties_bbox", {
      p_min_lat: south,
      p_max_lat: north,
      p_min_lng: west,
      p_max_lng: east,
      p_transaction_type: filters.transactionType || null,
      p_property_types: propertyTypes,
      p_price_min: filters.priceMin || null,
      p_price_max: filters.priceMax || null,
      p_bedrooms: filters.bedrooms || null,
      p_bathrooms: filters.bathrooms || null,
      p_parking_spaces: filters.parkingSpaces || null,
      p_area_min: filters.areaMin || null,
      p_area_max: filters.areaMax || null,
      p_financiable: filters.financiable ?? null,
      p_furnished: filters.furnished ?? null,
      p_accepts_exchange: filters.acceptsExchange ?? null,
      p_limit: limit,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const items: SearchPropertyItem[] = rpcData.map((row: any) => ({
        id: row.id,
        slug: row.slug,
        externalId: row.id,
        title: row.title,
        transactionType: row.transaction_type,
        propertyType: row.property_type,
        price: row.price,
        rentPrice: row.rent_price,
        bedrooms: row.bedrooms || 0,
        suites: 0,
        bathrooms: 0,
        parkingSpaces: 0,
        usableArea: row.usable_area,
        financiable: false,
        furnished: false,
        acceptsExchange: false,
        addressVisible: Boolean(row.address_visible),
        street: row.street,
        latitude: row.latitude,
        longitude: row.longitude,
        city: row.city_name
          ? { id: "", name: row.city_name, slug: row.city_slug || "" }
          : null,
        agency: row.agency_name
          ? {
              id: "",
              name: row.agency_name,
              slug: "",
              logoUrl: row.agency_logo_url,
            }
          : null,
        media: row.cover_image_url
          ? [{ id: "1", url: row.cover_image_url, isCover: true, position: 0 }]
          : [],
      }));

      const rankingConfig = await getRankingConfig();
      const itemsWithRanking = items.map((item) => {
        const ranking = calculatePropertyRanking(item, {
          filters,
          rankingConfig,
        });
        item.rankingScore = ranking.score;
        item.rankingBreakdown = ranking.breakdown;
        return { item, ranking };
      });

      const sorted = sortPropertiesByRanking(itemsWithRanking);

      return { properties: sorted, total: sorted.length };
    }
  } catch (e) {
    // Fallback gracioso caso RPC não esteja ativa
  }

  // 2. Fallback gracioso com consulta PostgREST direta
  const fallbackResult = await searchProperties({
    ...filters,
    limit,
    page: 1,
  });

  return {
    properties: fallbackResult.properties,
    total: fallbackResult.total,
  };
}

