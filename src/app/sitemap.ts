import type { MetadataRoute } from "next";
import { createPublicServerClient } from "@/lib/supabase/server";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";
import { formatCitySlug } from "@/features/seo/services";

export const revalidate = 3600; // 1 hora de cache ISR para o sitemap

/**
 * Sitemap dinâmico e escalável da UPPA (App Router)
 *
 * Contém exclusivamente:
 * 1. Páginas institucionais de alto valor (/comprar, /alugar, /guias, home)
 * 2. Cidades territoriais com estoque real >= MIN_PROPERTIES_CITY
 * 3. Bairros com estoque real >= MIN_PROPERTIES_NEIGHBORHOOD
 * 4. Propriedades físicas canônicas ativas com ofertas disponíveis (canonical_property_id IS NULL)
 *
 * NÃO indexa:
 * - Properties merged (redirecionam 301)
 * - Ofertas individuais de imobiliárias
 * - Cidades/bairros com estoque insuficiente (recebem noindex)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const supabase = createPublicServerClient();

  const entries: MetadataRoute.Sitemap = [];

  // 1. PÁGINAS INSTITUCIONAIS RELEVANTES
  entries.push(
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/comprar`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/alugar`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/guias`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }
  );

  // 2. PÁGINAS TERRITORIAIS (CIDADES E BAIRROS COM ESTOQUE RELEVANTE)
  try {
    const { data: territorialData } = await supabase
      .from("properties")
      .select(`
        city:cities!city_id (
          id,
          name,
          slug,
          state:states!state_id (
            code
          )
        ),
        neighborhood:neighborhoods!neighborhood_id (
          id,
          name,
          slug
        )
      `)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .gt("active_offers_count", 0);

    const cityCountMap = new Map<
      string,
      { slug: string; count: number; name: string }
    >();
    const neighborhoodCountMap = new Map<
      string,
      { citySlug: string; neighSlug: string; count: number }
    >();

    for (const row of (territorialData as any[]) || []) {
      const city = row.city;
      const neigh = row.neighborhood;

      if (city?.id) {
        const cityKey = city.id;
        const cSlug = formatCitySlug(city.slug || city.name.toLowerCase(), city.state?.code);
        const existingCity = cityCountMap.get(cityKey);
        if (existingCity) {
          existingCity.count++;
        } else {
          cityCountMap.set(cityKey, {
            slug: cSlug,
            count: 1,
            name: city.name,
          });
        }

        if (neigh?.id && neigh?.slug) {
          const neighKey = `${cityKey}:${neigh.id}`;
          const existingNeigh = neighborhoodCountMap.get(neighKey);
          if (existingNeigh) {
            existingNeigh.count++;
          } else {
            neighborhoodCountMap.set(neighKey, {
              citySlug: cSlug,
              neighSlug: neigh.slug,
              count: 1,
            });
          }
        }
      }
    }

    // Adiciona cidades indexáveis
    for (const city of cityCountMap.values()) {
      if (city.count >= SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_CITY) {
        entries.push({
          url: `${siteUrl}/imoveis/${city.slug}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }

    // Adiciona bairros indexáveis
    for (const neigh of neighborhoodCountMap.values()) {
      if (neigh.count >= SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_NEIGHBORHOOD) {
        entries.push({
          url: `${siteUrl}/imoveis/${neigh.citySlug}/${neigh.neighSlug}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    console.error("[Sitemap] Erro ao carregar rotas territoriais:", err);
  }

  // 3. IMÓVEIS FÍSICOS CANÔNICOS ATIVOS COM OFERTAS ATIVAS
  try {
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("slug, updated_at")
        .eq("status", "active")
        .is("canonical_property_id", null)
        .gt("active_offers_count", 0)
        .order("updated_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error || !properties || properties.length === 0) break;

      for (const p of properties) {
        if (!p.slug) continue;
        entries.push({
          url: `${siteUrl}/imovel/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }

      if (properties.length < pageSize) break;
      from += pageSize;
    }
  } catch (err) {
    console.error("[Sitemap] Erro ao carregar imóveis canônicos:", err);
  }

  return entries;
}
