import { createClient } from "@/lib/supabase/server";
import type { SearchFilters, SearchPropertyItem, SearchResult } from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import { getApproximateCoordinates } from "./utils/price-formatter";

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
 * Colunas explícitas selecionadas na busca (PROIBIDO SELECT * - Seção 86)
 */
const SEARCH_PROPERTIES_SELECT = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  price,
  rent_price,
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
  agency:agencies!agency_id (
    id,
    name,
    slug,
    logo_url,
    creci,
    verified_at,
    phone
  ),
  media:property_media (
    id,
    url,
    is_cover,
    position
  )
`;

/**
 * Executa a busca pública de imóveis ativos com filtros dinâmicos e paginação
 */
export async function searchProperties(filters: SearchFilters): Promise<SearchResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const offset = (page - 1) * limit;

  // Inicia query com projeção estrita de colunas (sem SELECT *) e status='active'
  let query = supabase
    .from("properties")
    .select(SEARCH_PROPERTIES_SELECT, { count: "exact" })
    .eq("status", "active");

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
  if (filters.city) {
    const cleanCity = filters.city.trim();
    if (isUuid(cleanCity)) {
      // Se for UUID válido, filtra diretamente pela chave estrangeira city_id
      query = query.eq("city_id", cleanCity);
    } else {
      // Caso contrário, resolve o ID buscando pelo slug no banco de dados
      const slugCity = cleanCity.toLowerCase();
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("slug", slugCity)
        .maybeSingle();

      if (cityRow?.id) {
        query = query.eq("city_id", cityRow.id);
      }
    }
  }

  // 5. FILTRO: BAIRRO (neighborhood)
  if (filters.neighborhood) {
    query = query.eq("neighborhood_id", filters.neighborhood);
  }

  // 6. FILTROS DE PREÇO (price_min e price_max)
  const isRent = filters.transactionType === "rent";
  const priceColumn = isRent ? "rent_price" : "price";

  if (filters.priceMin !== undefined && filters.priceMin > 0) {
    query = query.gte(priceColumn, filters.priceMin);
  }

  if (filters.priceMax !== undefined && filters.priceMax > 0) {
    query = query.lte(priceColumn, filters.priceMax);
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

  // 11. ORDENAÇÃO
  if (filters.orderBy === "price_asc") {
    query = query.order(priceColumn, { ascending: true, nullsFirst: false });
  } else if (filters.orderBy === "price_desc") {
    query = query.order(priceColumn, { ascending: false, nullsFirst: false });
  } else if (filters.orderBy === "area_desc") {
    query = query.order("usable_area", { ascending: false, nullsFirst: false });
  } else {
    // Padrão: mais recentes primeiro
    query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  // 12. PAGINAÇÃO COM RANGE
  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error || !data) {
    return {
      properties: [],
      total: 0,
      page,
      totalPages: 0,
      limit,
      filters,
    };
  }

  // Formata o resultado aplicando privacidade estrita de endereço
  const properties: SearchPropertyItem[] = data.map((row: any) => {
    const rawMedia = (row.media as any[]) || [];
    const sortedMedia = rawMedia
      .map((m) => ({
        id: m.id,
        url: m.url,
        isCover: Boolean(m.is_cover),
        position: m.position || 0,
      }))
      .sort((a, b) => {
        if (a.isCover) return -1;
        if (b.isCover) return 1;
        return a.position - b.position;
      });

    // Privacidade de Endereço (Seção 44 do MASTER_PLAN):
    // Se address_visible for false, oculta número/logradouro e aplica coordenadas aproximadas
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

    return {
      id: row.id,
      slug: row.slug,
      externalId: row.external_id,
      title: row.title,
      transactionType: row.transaction_type,
      propertyType: row.property_type,
      price: row.price,
      rentPrice: row.rent_price,
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
      city: row.city,
      neighborhood: row.neighborhood,
      state: row.state,
      agency: row.agency
        ? {
            id: row.agency.id,
            name: row.agency.name,
            slug: row.agency.slug,
            logoUrl: row.agency.logo_url,
            creci: row.agency.creci,
            verifiedAt: row.agency.verified_at,
            phone: row.agency.phone,
          }
        : null,
      media: sortedMedia,
    };
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    properties,
    total,
    page,
    totalPages,
    limit,
    filters,
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

  const supabase = await createClient();
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

      return { properties: items, total: items.length };
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

