import { cache } from "react";
import { createPublicServerClient } from "@/lib/supabase/server";
import { SEO_INDEXABILITY_CONFIG } from "./config";
import type {
  TerritorialHubData,
  TerritorialNeighborhoodSummary,
  TerritorialTypeSummary,
  AdminSeoStats,
} from "./types";
import type { PropertyWithDetails } from "@/types/property";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  townhouse: "Sobrado",
  condo_house: "Casa de Condomínio",
  penthouse: "Cobertura",
  studio: "Studio",
  loft: "Loft",
  kitnet: "Kitnet",
  land: "Terreno",
  commercial: "Comercial",
  office: "Sala Comercial",
  warehouse: "Galpão",
  farm: "Chácara / Sítio",
  rural: "Rural",
  other: "Imóvel",
};

/**
 * Converte slug territorial (ex: 'pelotas-rs' ou 'pelotas') em busca de cidade e estado
 */
export function parseCitySlug(citySlug: string): { slug: string; stateCode?: string } {
  const parts = citySlug.toLowerCase().split("-");
  if (parts.length > 1 && parts[parts.length - 1].length === 2) {
    const stateCode = parts.pop()!.toUpperCase();
    const slug = parts.join("-");
    return { slug, stateCode };
  }
  return { slug: citySlug.toLowerCase() };
}

/**
 * Formata slug unificado de cidade e UF (ex: 'pelotas-rs')
 */
export function formatCitySlug(slug: string, stateCode?: string): string {
  if (!stateCode) return slug;
  return `${slug}-${stateCode.toLowerCase()}`;
}

/**
 * Consulta dados territoriais de uma cidade para SEO programático
 */
export const getCityTerritorialData = cache(
  async (citySlug: string): Promise<TerritorialHubData | null> => {
    const supabase = createPublicServerClient();
    const { slug, stateCode } = parseCitySlug(citySlug);

    // 1. Localiza a cidade
    let cityQuery = supabase
      .from("cities")
      .select("id, name, slug, state:states!state_id(id, code, name)")
      .eq("slug", slug);

    const { data: citiesData, error: cityErr } = await cityQuery;
    if (cityErr || !citiesData || citiesData.length === 0) {
      return null;
    }

    const cityRecord = stateCode
      ? citiesData.find((c: any) => c.state?.code?.toUpperCase() === stateCode) || citiesData[0]
      : citiesData[0];

    if (!cityRecord) return null;

    // 2. Busca métricas leves de todas as propriedades ativas canônicas desta cidade com ofertas ativas
    const { data: metricsData, error: metricsErr } = await supabase
      .from("properties")
      .select(`
        id,
        transaction_type,
        property_type,
        price,
        rent_price,
        lowest_sale_price,
        highest_sale_price,
        lowest_rent_price,
        highest_rent_price,
        neighborhood:neighborhoods!neighborhood_id (
          id,
          name,
          slug
        )
      `)
      .eq("city_id", cityRecord.id)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .gt("active_offers_count", 0);

    if (metricsErr || !metricsData) {
      return null;
    }

    const allProps = metricsData as any[];
    const totalCount = allProps.length;

    // Estatísticas de preço e tipos
    let saleCount = 0;
    let rentCount = 0;
    const salePrices: number[] = [];
    const rentPrices: number[] = [];
    const typeCountMap = new Map<string, number>();
    const neighborhoodMap = new Map<string, { id: string; name: string; slug: string; count: number }>();

    for (const p of allProps) {
      if (p.transaction_type === "sale" || p.transaction_type === "sale_or_rent") {
        saleCount++;
        const pr = p.lowest_sale_price || p.price;
        if (pr && pr > 0) salePrices.push(pr);
      }
      if (p.transaction_type === "rent" || p.transaction_type === "sale_or_rent") {
        rentCount++;
        const rpr = p.lowest_rent_price || p.rent_price;
        if (rpr && rpr > 0) rentPrices.push(rpr);
      }

      const pType = p.property_type;
      if (pType) {
        typeCountMap.set(pType, (typeCountMap.get(pType) || 0) + 1);
      }

      if (p.neighborhood?.id) {
        const nId = p.neighborhood.id;
        const existing = neighborhoodMap.get(nId);
        if (existing) {
          existing.count++;
        } else {
          neighborhoodMap.set(nId, {
            id: nId,
            name: p.neighborhood.name,
            slug: p.neighborhood.slug || p.neighborhood.name.toLowerCase(),
            count: 1,
          });
        }
      }
    }

    const minPrice = salePrices.length > 0 ? Math.min(...salePrices) : undefined;
    const maxPrice = salePrices.length > 0 ? Math.max(...salePrices) : undefined;
    const avgPrice =
      salePrices.length > 0
        ? Math.round(salePrices.reduce((a, b) => a + b, 0) / salePrices.length)
        : undefined;

    const minRentPrice = rentPrices.length > 0 ? Math.min(...rentPrices) : undefined;
    const maxRentPrice = rentPrices.length > 0 ? Math.max(...rentPrices) : undefined;
    const avgRentPrice =
      rentPrices.length > 0
        ? Math.round(rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length)
        : undefined;

    const topTypes: TerritorialTypeSummary[] = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({
        type: type as any,
        label: PROPERTY_TYPE_LABELS[type] || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const neighborhoods: TerritorialNeighborhoodSummary[] = Array.from(
      neighborhoodMap.values()
    )
      .map((n) => ({
        id: n.id,
        name: n.name,
        slug: n.slug,
        propertyCount: n.count,
      }))
      .sort((a, b) => b.propertyCount - a.propertyCount);

    const isIndexable = totalCount >= SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_CITY;

    // 3. Busca apenas 12 imóveis com fotos e agência para exibição rápida nos cards
    const { data: samplePropsData } = await supabase
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
        lowest_sale_price,
        highest_sale_price,
        lowest_rent_price,
        highest_rent_price,
        active_offers_count,
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
        neighborhood:neighborhoods!neighborhood_id (
          id,
          name,
          slug
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
      .eq("city_id", cityRecord.id)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .gt("active_offers_count", 0)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12);

    const sampleProperties = ((samplePropsData as any[]) || []).map((p) => {
      const coverMedia = p.media?.find((m: any) => m.isCover) || p.media?.[0];
      return {
        id: p.id,
        slug: p.slug,
        externalId: p.external_id,
        title: p.title,
        transactionType: p.transaction_type,
        propertyType: p.property_type,
        price: p.price,
        rentPrice: p.rent_price,
        condominiumFee: p.condominium_fee,
        usableArea: p.usable_area,
        totalArea: p.total_area,
        bedrooms: p.bedrooms,
        suites: p.suites,
        bathrooms: p.bathrooms,
        parkingSpaces: p.parking_spaces,
        financiable: p.financiable,
        furnished: p.furnished,
        acceptsExchange: p.accepts_exchange,
        addressVisible: p.address_visible,
        street: p.street,
        number: p.number,
        latitude: p.latitude,
        longitude: p.longitude,
        publishedAt: p.published_at,
        city: {
          id: cityRecord.id,
          name: cityRecord.name,
          slug: cityRecord.slug,
        },
        neighborhood: p.neighborhood
          ? {
              id: p.neighborhood.id,
              name: p.neighborhood.name,
              slug: p.neighborhood.slug,
            }
          : undefined,
        state: {
          id: cityRecord.state?.id || "",
          code: cityRecord.state?.code || "",
          name: cityRecord.state?.name || "",
        },
        agency: p.agency
          ? {
              id: p.agency.id,
              name: p.agency.name,
              slug: p.agency.slug,
              logoUrl: p.agency.logo_url,
              creci: p.agency.creci,
              verifiedAt: p.agency.verified_at,
              phone: p.agency.phone,
            }
          : undefined,
        primaryMedia: coverMedia ? { url: coverMedia.url } : undefined,
        mediaCount: p.media?.length || 0,
        activeOffersCount: p.active_offers_count || 1,
        lowestSalePrice: p.lowest_sale_price || undefined,
        highestSalePrice: p.highest_sale_price || undefined,
        lowestRentPrice: p.lowest_rent_price || undefined,
        highestRentPrice: p.highest_rent_price || undefined,
      };
    });

    return {
      city: {
        id: cityRecord.id,
        name: cityRecord.name,
        slug: cityRecord.slug,
        state: {
          id: cityRecord.state?.id || "",
          code: cityRecord.state?.code || "",
          name: cityRecord.state?.name || "",
        },
      },
      totalCount,
      saleCount,
      rentCount,
      minPrice,
      avgPrice,
      maxPrice,
      minRentPrice,
      avgRentPrice,
      maxRentPrice,
      topTypes,
      neighborhoods,
      properties: sampleProperties as any,
      isIndexable,
    };
  }
);

/**
 * Consulta dados territoriais de um bairro para SEO programático
 */
export const getNeighborhoodTerritorialData = cache(
  async (
    citySlug: string,
    neighborhoodSlug: string
  ): Promise<TerritorialHubData | null> => {
    const supabase = createPublicServerClient();
    const { slug, stateCode } = parseCitySlug(citySlug);

    // 1. Localiza a cidade
    const { data: citiesData } = await supabase
      .from("cities")
      .select("id, name, slug, state:states!state_id(id, code, name)")
      .eq("slug", slug);

    if (!citiesData || citiesData.length === 0) return null;

    const cityRecord = stateCode
      ? citiesData.find((c: any) => c.state?.code?.toUpperCase() === stateCode) || citiesData[0]
      : citiesData[0];

    if (!cityRecord) return null;

    // 2. Localiza o bairro na cidade
    const { data: neighData, error: neighErr } = await supabase
      .from("neighborhoods")
      .select("id, name, slug")
      .eq("city_id", cityRecord.id)
      .eq("slug", neighborhoodSlug)
      .maybeSingle();

    if (neighErr || !neighData) return null;

    // 3. Busca propriedades ativas canônicas do bairro (métricas leves)
    const { data: metricsData, error: metricsErr } = await supabase
      .from("properties")
      .select(`
        id,
        transaction_type,
        property_type,
        price,
        rent_price,
        lowest_sale_price,
        highest_sale_price,
        lowest_rent_price,
        highest_rent_price
      `)
      .eq("city_id", cityRecord.id)
      .eq("neighborhood_id", neighData.id)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .gt("active_offers_count", 0);

    if (metricsErr || !metricsData) return null;

    const allProps = metricsData as any[];
    const totalCount = allProps.length;

    let saleCount = 0;
    let rentCount = 0;
    const salePrices: number[] = [];
    const rentPrices: number[] = [];
    const typeCountMap = new Map<string, number>();

    for (const p of allProps) {
      if (p.transaction_type === "sale" || p.transaction_type === "sale_or_rent") {
        saleCount++;
        const pr = p.lowest_sale_price || p.price;
        if (pr && pr > 0) salePrices.push(pr);
      }
      if (p.transaction_type === "rent" || p.transaction_type === "sale_or_rent") {
        rentCount++;
        const rpr = p.lowest_rent_price || p.rent_price;
        if (rpr && rpr > 0) rentPrices.push(rpr);
      }

      const pType = p.property_type;
      if (pType) {
        typeCountMap.set(pType, (typeCountMap.get(pType) || 0) + 1);
      }
    }

    const minPrice = salePrices.length > 0 ? Math.min(...salePrices) : undefined;
    const maxPrice = salePrices.length > 0 ? Math.max(...salePrices) : undefined;
    const avgPrice =
      salePrices.length > 0
        ? Math.round(salePrices.reduce((a, b) => a + b, 0) / salePrices.length)
        : undefined;

    const minRentPrice = rentPrices.length > 0 ? Math.min(...rentPrices) : undefined;
    const maxRentPrice = rentPrices.length > 0 ? Math.max(...rentPrices) : undefined;
    const avgRentPrice =
      rentPrices.length > 0
        ? Math.round(rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length)
        : undefined;

    const topTypes: TerritorialTypeSummary[] = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({
        type: type as any,
        label: PROPERTY_TYPE_LABELS[type] || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Busca bairros relacionados na mesma cidade para interlinking
    const { data: otherNeighborhoods } = await supabase
      .from("neighborhoods")
      .select("id, name, slug")
      .eq("city_id", cityRecord.id)
      .neq("id", neighData.id)
      .limit(10);

    const relatedNeighborhoods: TerritorialNeighborhoodSummary[] = (
      otherNeighborhoods || []
    ).map((n) => ({
      id: n.id,
      name: n.name,
      slug: n.slug,
      propertyCount: 0,
    }));

    const isIndexable = totalCount >= SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_NEIGHBORHOOD;

    // 4. Busca até 12 imóveis com fotos e agência para exibição dos cards
    const { data: samplePropsData } = await supabase
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
        lowest_sale_price,
        highest_sale_price,
        lowest_rent_price,
        highest_rent_price,
        active_offers_count,
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
      .eq("city_id", cityRecord.id)
      .eq("neighborhood_id", neighData.id)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .gt("active_offers_count", 0)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12);

    const sampleProperties = ((samplePropsData as any[]) || []).map((p) => {
      const coverMedia = p.media?.find((m: any) => m.isCover) || p.media?.[0];
      return {
        id: p.id,
        slug: p.slug,
        externalId: p.external_id,
        title: p.title,
        transactionType: p.transaction_type,
        propertyType: p.property_type,
        price: p.price,
        rentPrice: p.rent_price,
        condominiumFee: p.condominium_fee,
        usableArea: p.usable_area,
        totalArea: p.total_area,
        bedrooms: p.bedrooms,
        suites: p.suites,
        bathrooms: p.bathrooms,
        parkingSpaces: p.parking_spaces,
        financiable: p.financiable,
        furnished: p.furnished,
        acceptsExchange: p.accepts_exchange,
        addressVisible: p.address_visible,
        street: p.street,
        number: p.number,
        latitude: p.latitude,
        longitude: p.longitude,
        publishedAt: p.published_at,
        city: {
          id: cityRecord.id,
          name: cityRecord.name,
          slug: cityRecord.slug,
        },
        neighborhood: {
          id: neighData.id,
          name: neighData.name,
          slug: neighData.slug,
        },
        state: {
          id: cityRecord.state?.id || "",
          code: cityRecord.state?.code || "",
          name: cityRecord.state?.name || "",
        },
        agency: p.agency
          ? {
              id: p.agency.id,
              name: p.agency.name,
              slug: p.agency.slug,
              logoUrl: p.agency.logo_url,
              creci: p.agency.creci,
              verifiedAt: p.agency.verified_at,
              phone: p.agency.phone,
            }
          : undefined,
        primaryMedia: coverMedia ? { url: coverMedia.url } : undefined,
        mediaCount: p.media?.length || 0,
        activeOffersCount: p.active_offers_count || 1,
        lowestSalePrice: p.lowest_sale_price || undefined,
        highestSalePrice: p.highest_sale_price || undefined,
        lowestRentPrice: p.lowest_rent_price || undefined,
        highestRentPrice: p.highest_rent_price || undefined,
      };
    });

    return {
      city: {
        id: cityRecord.id,
        name: cityRecord.name,
        slug: cityRecord.slug,
        state: {
          id: cityRecord.state?.id || "",
          code: cityRecord.state?.code || "",
          name: cityRecord.state?.name || "",
        },
      },
      neighborhood: {
        id: neighData.id,
        name: neighData.name,
        slug: neighData.slug,
      },
      totalCount,
      saleCount,
      rentCount,
      minPrice,
      avgPrice,
      maxPrice,
      minRentPrice,
      avgRentPrice,
      maxRentPrice,
      topTypes,
      relatedNeighborhoods,
      properties: sampleProperties as any,
      isIndexable,
    };
  }
);

/**
 * Constrói título dinâmico com base em dados reais do imóvel físico
 */
export function buildPropertyMetaTitle(property: PropertyWithDetails): string {
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || "Imóvel";
  const bedrooms = property.bedrooms;
  const bedroomsText =
    bedrooms && bedrooms > 0
      ? ` com ${bedrooms} ${bedrooms === 1 ? "quarto" : "quartos"}`
      : "";

  const transactionText =
    property.transactionType === "rent"
      ? "para alugar"
      : property.transactionType === "sale_or_rent"
      ? "à venda e locação"
      : "à venda";

  const neighborhood = property.neighborhood?.name;
  const city = property.city?.name;

  let locationText = "";
  if (neighborhood && city) {
    locationText = ` no ${neighborhood} em ${city}`;
  } else if (city) {
    locationText = ` em ${city}`;
  }

  return `${typeLabel}${bedroomsText} ${transactionText}${locationText} | UPPA`;
}

/**
 * Constrói descrição dinâmica com base em dados físicos e comerciais reais
 */
export function buildPropertyMetaDescription(
  property: PropertyWithDetails,
  activeOffersCount = 1,
  lowestPrice?: number | null
): string {
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || "Imóvel";
  const area = property.usableArea || property.totalArea;
  const bedrooms = property.bedrooms;
  const parking = property.parkingSpaces;
  const neighborhood = property.neighborhood?.name;
  const city = property.city?.name;

  const parts: string[] = [];
  if (area) parts.push(`${area} m²`);
  if (bedrooms && bedrooms > 0)
    parts.push(`com ${bedrooms} ${bedrooms === 1 ? "quarto" : "quartos"}`);
  if (parking && parking > 0)
    parts.push(`e ${parking} ${parking === 1 ? "vaga" : "vagas"}`);

  const specsText = parts.length > 0 ? ` de ${parts.join(" ")}` : "";
  const locationText = neighborhood && city ? ` no ${neighborhood}, ${city}` : city ? ` em ${city}` : "";

  let commercialText = "";
  const effectivePrice =
    lowestPrice ||
    (property.transactionType === "rent" ? property.rentPrice : property.price);

  if (activeOffersCount > 1 && effectivePrice) {
    commercialText = ` Compare ${activeOffersCount} ofertas disponíveis a partir de R$ ${effectivePrice.toLocaleString("pt-BR")}.`;
  } else if (effectivePrice) {
    commercialText = ` Oferta disponível por R$ ${effectivePrice.toLocaleString("pt-BR")}.`;
  } else {
    commercialText = " Veja detalhes, fotos e comodidades na UPPA.";
  }

  const desc = `${typeLabel}${specsText}${locationText}.${commercialText}`;
  return desc.length > 160 ? desc.slice(0, 157) + "..." : desc;
}

/**
 * Constrói JSON-LD multi-ofertas estruturado para Property x Offers
 */
export function buildPropertyStructuredData(
  property: PropertyWithDetails,
  offers: any[],
  siteUrl: string
) {
  const canonicalUrl = `${siteUrl}/imovel/${property.slug}`;
  const images = property.media?.map((m) => m.url).filter(Boolean) || [];

  // Múltiplas ofertas comerciais legítimas sem fingir que são múltiplos imóveis
  const schemaOffers =
    offers.length > 0
      ? offers.map((offer) => {
          const price =
            offer.salePrice ||
            offer.rentPrice ||
            property.price ||
            property.rentPrice ||
            0;
          return {
            "@type": "Offer",
            price,
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
            url: canonicalUrl,
            seller: offer.agency
              ? {
                  "@type": "RealEstateAgent",
                  name: offer.agency.name,
                  url: `${siteUrl}/imobiliaria/${offer.agency.slug}`,
                  telephone: offer.agency.phone || offer.agency.whatsapp,
                }
              : undefined,
            businessFunction:
              offer.transactionType === "rent" || property.transactionType === "rent"
                ? "http://purl.org/goodrelations/v1#LeaseOut"
                : "http://purl.org/goodrelations/v1#Sell",
          };
        })
      : [
          {
            "@type": "Offer",
            price: property.price || property.rentPrice || 0,
            priceCurrency: "BRL",
            availability:
              property.status === "active" && (property.activeOffersCount ?? 1) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: canonicalUrl,
            businessFunction:
              property.transactionType === "rent"
                ? "http://purl.org/goodrelations/v1#LeaseOut"
                : "http://purl.org/goodrelations/v1#Sell",
          },
        ];

  const citySlug = property.city?.slug
    ? formatCitySlug(property.city.slug, property.state?.code)
    : undefined;

  const breadcrumbsList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "UPPA",
        item: siteUrl,
      },
      ...(property.city && citySlug
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: property.city.name,
              item: `${siteUrl}/imoveis/${citySlug}`,
            },
          ]
        : []),
      ...(property.neighborhood && citySlug
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: property.neighborhood.name,
              item: `${siteUrl}/imoveis/${citySlug}/${property.neighborhood.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: property.neighborhood && citySlug ? 4 : property.city && citySlug ? 3 : 2,
        name: property.title,
        item: canonicalUrl,
      },
    ],
  };

  const realEstateListing = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description || property.title,
    url: canonicalUrl,
    image: images,
    offers: schemaOffers.length === 1 ? schemaOffers[0] : schemaOffers,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.addressVisible ? property.street : undefined,
      addressLocality: property.city?.name,
      addressRegion: property.state?.code,
      postalCode: property.addressVisible ? property.zipcode : undefined,
      addressCountry: "BR",
    },
    geo:
      property.addressVisible && property.latitude && property.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          }
        : undefined,
  };

  return [realEstateListing, breadcrumbsList];
}

/**
 * Consulta estatísticas completas para o painel de controle /admin/seo
 */
export async function getAdminSeoStats(): Promise<AdminSeoStats> {
  const supabase = createPublicServerClient();

  // 1. Total de propriedades canônicas ativas
  const { count: totalCanonical } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("canonical_property_id", null);

  // 2. Propriedades canônicas com ofertas ativas
  const { count: totalWithOffers } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0);

  // 3. Propriedades sem ofertas ativas (recebem noindex)
  const { count: totalWithoutOffers } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .eq("active_offers_count", 0);

  // 4. Propriedades consolidadas (merged com 301)
  const { count: totalMerged } = await supabase
    .from("property_slug_redirects" as any)
    .select("id", { count: "exact", head: true });

  // 5. Cidades com estoque e indexabilidade
  const { data: cityProps } = await supabase
    .from("properties")
    .select(`
      city:cities!city_id (
        id,
        name,
        slug,
        state:states!state_id (
          code
        )
      )
    `)
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0);

  const cityCountMap = new Map<
    string,
    { name: string; stateCode: string; count: number; slug: string }
  >();

  for (const row of (cityProps as any[]) || []) {
    const c = row.city;
    if (!c?.id) continue;
    const key = c.id;
    const stateCode = c.state?.code || "RS";
    const existing = cityCountMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      cityCountMap.set(key, {
        name: c.name,
        stateCode,
        count: 1,
        slug: formatCitySlug(c.slug || c.name.toLowerCase(), stateCode),
      });
    }
  }

  const citiesList = Array.from(cityCountMap.values()).map((c) => ({
    ...c,
    isIndexable: c.count >= SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_CITY,
  }));

  const indexableCities = citiesList.filter((c) => c.isIndexable).length;
  const noindexCities = citiesList.filter((c) => !c.isIndexable).length;

  // 6. Bairros com estoque e indexabilidade
  const { data: neighProps } = await supabase
    .from("properties")
    .select("neighborhood_id")
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .not("neighborhood_id", "is", null);

  const neighCountMap = new Map<string, number>();
  for (const row of (neighProps as any[]) || []) {
    if (!row.neighborhood_id) continue;
    neighCountMap.set(
      row.neighborhood_id,
      (neighCountMap.get(row.neighborhood_id) || 0) + 1
    );
  }

  let indexableNeighborhoods = 0;
  let noindexNeighborhoods = 0;
  for (const count of neighCountMap.values()) {
    if (count >= SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_NEIGHBORHOOD) {
      indexableNeighborhoods++;
    } else {
      noindexNeighborhoods++;
    }
  }

  // 4 páginas institucionais + cidades indexáveis + bairros indexáveis + propriedades ativas
  const totalSitemapUrls =
    4 + indexableCities + indexableNeighborhoods + (totalWithOffers || 0);

  return {
    totalCanonicalProperties: totalCanonical || 0,
    totalWithOffers: totalWithOffers || 0,
    totalWithoutOffers: totalWithoutOffers || 0,
    totalMergedRedirects: totalMerged || 0,
    totalCities: citiesList.length,
    indexableCities,
    noindexCities,
    totalNeighborhoods: neighCountMap.size,
    indexableNeighborhoods,
    noindexNeighborhoods,
    totalSitemapUrls,
    citiesList: citiesList.sort((a, b) => b.count - a.count),
  };
}
