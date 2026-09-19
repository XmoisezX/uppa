import { createClient } from "@/lib/supabase/server";
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
 * (Cumpre Regra 11 e 12: Zero dados fictícios ou hardcoded)
 */
export async function getActiveCitiesWithCounts(): Promise<ActiveCitySummary[]> {
  try {
    const supabase = await createClient();

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

/**
 * Retorna uma seleção enxuta de imóveis ativos recém-publicados reais.
 * (Cumpre Regra 13 e 19: Dados 100% reais do banco de dados)
 */
export async function getRecentActiveProperties(
  limit = 6
): Promise<SearchPropertyItem[]> {
  try {
    const supabase = await createClient();

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
          verified_at
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

    return (data as any[]).map((row) => {
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
        state: row.state,
        agency: row.agency
          ? {
              id: row.agency.id,
              name: row.agency.name,
              slug: row.agency.slug,
              logoUrl: row.agency.logo_url,
              creci: row.agency.creci,
              verifiedAt: row.agency.verified_at,
            }
          : null,
        media: sortedMedia,
      };
    });
  } catch (err) {
    console.error("Erro ao carregar imóveis recentes:", err);
    return [];
  }
}
