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

export const FALLBACK_HERO_BUBBLES: HeroBubbleProperty[] = [
  {
    id: "fb-1",
    slug: "casa-em-condominio-fechado-com-2-dormitorios-em-florianopolis-6094",
    title: "Casa em Condomínio Fechado de Alto Padrão",
    propertyType: "condo_house",
    transactionType: "sale",
    price: 1850000,
    rentPrice: null,
    cityName: "Florianópolis",
    neighborhoodName: "Jurerê Internacional",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-2",
    slug: "apartamento-com-vista-panoramica-e-3-suites",
    title: "Apartamento com Vista Panorâmica e 3 Suítes",
    propertyType: "apartment",
    transactionType: "sale",
    price: 2400000,
    rentPrice: null,
    cityName: "Balneário Camboriú",
    neighborhoodName: "Barra Sul",
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-3",
    slug: "casa-moderna-com-piscina-e-churrasqueira",
    title: "Casa Moderna com Piscina e Área Gourmet",
    propertyType: "house",
    transactionType: "sale",
    price: 1950000,
    rentPrice: null,
    cityName: "Curitiba",
    neighborhoodName: "Ecoville",
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-4",
    slug: "sobrado-triplex-em-bairro-nobre",
    title: "Sobrado Triplex com Arquitetura Contemporânea",
    propertyType: "townhouse",
    transactionType: "sale",
    price: 1650000,
    rentPrice: null,
    cityName: "Porto Alegre",
    neighborhoodName: "Moinhos de Vento",
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-5",
    slug: "apartamento-duplex-de-luxo-com-varanda",
    title: "Apartamento Duplex com Ampla Varanda",
    propertyType: "apartment",
    transactionType: "sale",
    price: 3200000,
    rentPrice: null,
    cityName: "São Paulo",
    neighborhoodName: "Moema",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-6",
    slug: "casa-terrea-em-condominio-com-seguranca",
    title: "Casa Térrea com Paisagismo Exuberante",
    propertyType: "condo_house",
    transactionType: "sale",
    price: 1450000,
    rentPrice: null,
    cityName: "Gramado",
    neighborhoodName: "Planalto",
    imageUrl: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-7",
    slug: "apartamento-em-frente-ao-mar",
    title: "Apartamento de Alto Padrão Frente Mar",
    propertyType: "apartment",
    transactionType: "sale",
    price: 2800000,
    rentPrice: null,
    cityName: "Itapema",
    neighborhoodName: "Meia Praia",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-8",
    slug: "casa-com-design-biofilico-e-lazer-completo",
    title: "Casa com Design Biofílico e Lazer Completo",
    propertyType: "house",
    transactionType: "sale",
    price: 2100000,
    rentPrice: null,
    cityName: "Campinas",
    neighborhoodName: "Nova Campinas",
    imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-9",
    slug: "sobrado-em-condominio-clube",
    title: "Sobrado em Condomínio Clube com 4 Suítes",
    propertyType: "townhouse",
    transactionType: "sale",
    price: 1750000,
    rentPrice: null,
    cityName: "Joinville",
    neighborhoodName: "Atiradores",
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fb-10",
    slug: "cobertura-horizontal-com-piscina-privativa",
    title: "Cobertura Horizontal com Piscina Privativa",
    propertyType: "apartment",
    transactionType: "sale",
    price: 3500000,
    rentPrice: null,
    cityName: "Pelotas",
    neighborhoodName: "Laranjal",
    imageUrl: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80",
  },
];

/**
 * Retorna uma seleção exclusiva de CASAS, SOBRADOS E APARTAMENTOS de ALTO PADRÃO
 * de CIDADES DISTINTAS com fotos reais para os balões flutuantes do Hero.
 */
async function fetchHeroBubbleProperties(limit = 10): Promise<HeroBubbleProperty[]> {
  try {
    const supabase = createPublicServerClient();

    // Consulta rápida limitada a 40 registros com filtro de preço para evitar timeouts
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
        city:cities!city_id (id, name, slug),
        neighborhood:neighborhoods!neighborhood_id (name),
        media:property_media (id, url, is_cover, position)
      `)
      .eq("status", "active")
      .in("property_type", ["house", "condo_house", "townhouse", "apartment"])
      .gt("price", 100000)
      .order("price", { ascending: false, nullsFirst: false })
      .limit(40);

    if (error || !data || data.length === 0) {
      return FALLBACK_HERO_BUBBLES.slice(0, limit);
    }

    const ALLOWED_TYPES = new Set(["house", "condo_house", "townhouse", "apartment"]);

    // Filtra imóveis com mídia válida, preço > 0 e título que seja estritamente residencial
    const valid = (data as any[]).filter((p) => {
      if (!Array.isArray(p.media) || p.media.length === 0 || !p.media[0]?.url) return false;
      if (!ALLOWED_TYPES.has(p.property_type)) return false;
      if ((p.price || 0) <= 0 && (p.rent_price || 0) <= 0) return false;

      const normTitle = (p.title || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      // Exclusões explícitas para garantir apenas casas, sobrados e apartamentos
      if (
        normTitle.includes("nao esta mais disponivel") ||
        normTitle.includes("indisponivel") ||
        normTitle.includes("terreno") ||
        normTitle.includes("lote") ||
        normTitle.includes("comercial") ||
        normTitle.includes("sala ") ||
        normTitle.includes("pavilhao") ||
        normTitle.includes("galpao") ||
        normTitle.includes("rural") ||
        normTitle.includes("chacara") ||
        normTitle.includes("sitio") ||
        normTitle.includes("fazenda") ||
        normTitle.includes("area para condominio")
      ) {
        return false;
      }

      return true;
    });

    if (valid.length === 0) {
      return FALLBACK_HERO_BUBBLES.slice(0, limit);
    }

    // Agrupa por cidade distinta
    const cityGroups = new Map<string, any[]>();
    for (const item of valid) {
      const cityName = item.city?.name || "Outra";
      if (!cityGroups.has(cityName)) cityGroups.set(cityName, []);
      cityGroups.get(cityName)!.push(item);
    }

    // Ordena as propriedades de cada cidade por valor decrescente (alto padrão primeiro)
    for (const [, list] of cityGroups.entries()) {
      list.sort((a, b) => (b.price || b.rent_price || 0) - (a.price || a.rent_price || 0));
    }

    // Ordena as cidades pelo valor do seu imóvel topo de linha (alto padrão)
    const sortedCities = Array.from(cityGroups.keys()).sort((a, b) => {
      const topA = cityGroups.get(a)![0]?.price || cityGroups.get(a)![0]?.rent_price || 0;
      const topB = cityGroups.get(b)![0]?.price || cityGroups.get(b)![0]?.rent_price || 0;
      return topB - topA;
    });

    const selected: any[] = [];
    const usedIds = new Set<string>();

    // 1º Passo: Seleciona o imóvel de maior padrão de cada cidade distinta
    for (const cityName of sortedCities) {
      const top = cityGroups.get(cityName)?.[0];
      if (top && !usedIds.has(top.id)) {
        selected.push(top);
        usedIds.add(top.id);
        if (selected.length >= limit) break;
      }
    }

    // 2º Passo: Se houver menos de 10 cidades, preenche com outros imóveis de alto padrão
    if (selected.length < limit) {
      const remaining = valid
        .filter((p) => !usedIds.has(p.id))
        .sort((a, b) => (b.price || b.rent_price || 0) - (a.price || a.rent_price || 0));

      for (const p of remaining) {
        selected.push(p);
        usedIds.add(p.id);
        if (selected.length >= limit) break;
      }
    }

    const mapped = selected.map((p) => {
      const sortedMedia = [...p.media].sort((a: any, b: any) => {
        if (a.is_cover) return -1;
        if (b.is_cover) return 1;
        return (a.position || 0) - (b.position || 0);
      });
      const cover = sortedMedia[0]?.url || p.media[0]?.url;

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

    // Se ainda assim faltarem itens para atingir o limite, complementa com os fallbacks
    if (mapped.length < limit) {
      const needed = limit - mapped.length;
      mapped.push(...FALLBACK_HERO_BUBBLES.slice(0, needed));
    }

    return mapped.slice(0, limit);
  } catch (err) {
    console.error("Erro ao carregar imóveis de alto padrão para os balões do Hero:", err);
    return FALLBACK_HERO_BUBBLES.slice(0, limit);
  }
}

export const getHeroBubbleProperties = unstable_cache(
  fetchHeroBubbleProperties,
  ["hero-bubble-properties-casas-sobrados-apartamentos-v4"],
  { revalidate: 300, tags: ["properties"] }
);

