import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { SearchPropertyItem } from "@/features/search/types";

export interface ActiveCitySummary {
  id: string;
  name: string;
  slug: string;
  stateCode: string;
  propertyCount: number;
}

/**
 * Retorna as cidades com propriedades ativas reais no banco de dados,
 * ordenadas pelo número de anúncios disponíveis.
 * Utiliza unstable_cache com revalidação de 5 minutos para alta performance.
 */
async function fetchActiveCitiesWithCounts(): Promise<ActiveCitySummary[]> {
  try {
    const supabase = createPublicServerClient();

    // Consulta apenas imóveis ativos para extrair cidades reais com anúncios
    const { data, error } = await supabase
      .from("properties")
      .select(`
        city_id,
        city:cities!city_id (
          id,
          name,
          slug,
          state:states!state_id (
            code
          )
        )
      `)
      .eq("status", "active");

    if (error || !data) {
      return [];
    }

    const cityMap = new Map<string, ActiveCitySummary>();

    for (const row of data as any[]) {
      const city = row.city;
      if (!city || !city.id || !city.name) continue;

      const stateCode = city.state?.code || "";
      const existing = cityMap.get(city.id);

      if (existing) {
        existing.propertyCount += 1;
      } else {
        cityMap.set(city.id, {
          id: city.id,
          name: city.name,
          slug: city.slug || city.name.toLowerCase(),
          stateCode,
          propertyCount: 1,
        });
      }
    }

    // Ordena da cidade com mais estoque para a com menos
    const sorted = Array.from(cityMap.values()).sort(
      (a, b) => b.propertyCount - a.propertyCount
    );

    return sorted;
  } catch (err) {
    console.error("Erro ao carregar cidades ativas:", err);
    return [];
  }
}

export const getActiveCitiesWithCounts = unstable_cache(
  fetchActiveCitiesWithCounts,
  ["active-cities-with-counts"],
  { revalidate: 300, tags: ["cities", "properties"] }
);

/**
 * Retorna uma seleção enxuta de imóveis ativos recém-publicados reais.
 * Utiliza unstable_cache com revalidação de 60 segundos para alta performance.
 */
async function fetchRecentActiveProperties(
  limit = 6
): Promise<SearchPropertyItem[]> {
  try {
    const supabase = createPublicServerClient();

    const { data, error } = await supabase
      .from("properties")
      .select(`
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
      `)
      .eq("status", "active")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    let featuredIds: string[] = [];
    try {
      const { data: featRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "featured_property_ids")
        .maybeSingle();
      if (featRow?.value && Array.isArray(featRow.value)) {
        featuredIds = featRow.value;
      }
    } catch {
      // ignore
    }

    const items = (data as any[]).map((row) => {
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

      return {
        id: row.id,
        featured: featuredIds.includes(row.id),
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
        street: row.address_visible ? row.street : null,
        number: row.address_visible ? row.number : null,
        latitude: row.latitude,
        longitude: row.longitude,
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

    // Ordenar: imóveis com destaque primeiro, mantendo ordem cronológica secundária
    return items.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  } catch (err) {
    console.error("Erro ao carregar imóveis recentes:", err);
    return [];
  }
}

export const getRecentActiveProperties = unstable_cache(
  fetchRecentActiveProperties,
  ["recent-active-properties"],
  { revalidate: 60, tags: ["properties"] }
);

export interface HeroBubbleProperty {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  transactionType: string;
  price: number | null;
  rentPrice: number | null;
  cityName: string | null;
  neighborhoodName: string | null;
  imageUrl: string;
}

/**
 * Retorna uma seleção diversa de imóveis ativos com fotos reais para os balões flutuantes do Hero.
 * Prioriza diversidade de tipos (casa, apartamento, condomínio, etc.) e fotos reais.
 */
async function fetchHeroBubbleProperties(limit = 10): Promise<HeroBubbleProperty[]> {
  try {
    const supabase = createPublicServerClient();

    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        slug,
        title,
        property_type,
        transaction_type,
        price,
        rent_price,
        city:cities!city_id (name),
        neighborhood:neighborhoods!neighborhood_id (name),
        media:property_media (id, url, is_cover, position)
      `)
      .eq("status", "active")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(60);

    if (error || !data) return [];

    const valid = (data as any[]).filter(
      (p) => Array.isArray(p.media) && p.media.length > 0 && Boolean(p.media[0]?.url)
    );

    const byType = new Map<string, any[]>();
    for (const item of valid) {
      const type = item.property_type || "other";
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(item);
    }

    const selected: any[] = [];
    const types = Array.from(byType.keys());
    let index = 0;
    while (selected.length < limit && selected.length < valid.length) {
      let addedInRound = false;
      for (const t of types) {
        const list = byType.get(t);
        if (list && list[index]) {
          selected.push(list[index]);
          addedInRound = true;
          if (selected.length >= limit) break;
        }
      }
      if (!addedInRound) break;
      index++;
    }

    return selected.map((p) => {
      const cover = p.media.find((m: any) => m.is_cover)?.url || p.media[0]?.url;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        propertyType: p.property_type,
        transactionType: p.transaction_type,
        price: p.price,
        rentPrice: p.rent_price,
        cityName: p.city?.name || null,
        neighborhoodName: p.neighborhood?.name || null,
        imageUrl: cover,
      };
    });
  } catch (err) {
    console.error("Erro ao carregar imóveis para os balões do Hero:", err);
    return [];
  }
}

export const getHeroBubbleProperties = unstable_cache(
  fetchHeroBubbleProperties,
  ["hero-bubble-properties"],
  { revalidate: 120, tags: ["properties"] }
);

