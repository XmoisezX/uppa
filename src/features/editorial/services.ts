import { EDITORIAL_ARTICLES, EDITORIAL_CATEGORIES } from "./data/articles";
import type {
  EditorialArticle,
  EditorialCategory,
  EditorialCategoryInfo,
  CityGuide,
  PopularSearchGroup,
} from "./types";
import type { ActiveCitySummary } from "@/features/home/services";

export function getEditorialCategories(): EditorialCategoryInfo[] {
  return EDITORIAL_CATEGORIES;
}

export function getEditorialArticles(category?: EditorialCategory): EditorialArticle[] {
  if (!category) {
    return EDITORIAL_ARTICLES;
  }
  return EDITORIAL_ARTICLES.filter((art) => art.category === category);
}

export function getEditorialArticleBySlug(slug: string): EditorialArticle | undefined {
  return EDITORIAL_ARTICLES.find((art) => art.slug === slug);
}

export function getFeaturedEditorialArticles(limit = 4): EditorialArticle[] {
  return EDITORIAL_ARTICLES.filter((art) => art.featured).slice(0, limit);
}

export function getRelatedArticles(currentSlug: string, limit = 3): EditorialArticle[] {
  const current = getEditorialArticleBySlug(currentSlug);
  if (!current) return EDITORIAL_ARTICLES.slice(0, limit);

  // Busca por slugs relacionados declarados ou mesma categoria
  const related = EDITORIAL_ARTICLES.filter(
    (art) =>
      art.slug !== currentSlug &&
      (current.relatedSlugs?.includes(art.slug) || art.category === current.category)
  );

  return related.slice(0, limit);
}

/**
 * Constrói os CityGuides utilizando estritamente as cidades reais com estoque no banco
 */
export function getCityGuides(activeCities: ActiveCitySummary[]): CityGuide[] {
  const cityDescriptions: Record<string, { tagline: string; highlight: string }> = {
    pelotas: {
      tagline: "Tradição cultural, polos universitários e ampla oferta residencial.",
      highlight: "Destaque para sobrados históricos, casas em condomínio fechado e apartamentos centrais.",
    },
    manaus: {
      tagline: "Principal polo econômico do Norte, bairros nobres e condomínios modernos.",
      highlight: "Forte demanda para locação executiva e apartamentos residenciais na Ponta Negra.",
    },
    canguçu: {
      tagline: "Capital da agricultura familiar com propriedades rurais e tranquilidade.",
      highlight: "Excelente para sítios produtivos, chácaras de lazer e terrenos em expansão.",
    },
    "porto-alegre": {
      tagline: "Capital gaúcha com diversidade de bairros, parques e infraestrutura completa.",
      highlight: "Apartamentos com alta liquidez e bairros arborizados de alto padrão.",
    },
  };

  return activeCities.map((city) => {
    const key = city.slug.toLowerCase();
    const meta = cityDescriptions[key] || {
      tagline: `Estoque de imóveis selecionados em ${city.name} - ${city.stateCode}.`,
      highlight: `Encontre casas, apartamentos e terrenos cadastrados por imobiliárias credenciadas em ${city.name}.`,
    };

    return {
      id: city.id,
      name: city.name,
      slug: city.slug,
      stateCode: city.stateCode,
      stateName: city.stateCode,
      propertyCount: city.propertyCount,
      tagline: meta.tagline,
      highlightText: meta.highlight,
    };
  });
}

/**
 * Gera grupos de buscas populares categorizados (Comprar, Alugar, Tipos e Cidades)
 */
export function getPopularSearchGroups(activeCities: ActiveCitySummary[]): PopularSearchGroup[] {
  const citySearches = activeCities.slice(0, 4).map((city) => ({
    label: `Imóveis em ${city.name} - ${city.stateCode}`,
    href: `/comprar?city=${encodeURIComponent(city.name)}`,
    category: "localizacao" as const,
    badge: `${city.propertyCount} imóveis`,
  }));

  return [
    {
      title: "Para Comprar",
      items: [
        { label: "Apartamentos à venda", href: "/comprar?propertyType=apartment", category: "comprar" },
        { label: "Casas em condomínio", href: "/comprar?propertyType=condo_house", category: "comprar" },
        { label: "Casas térreas", href: "/comprar?propertyType=house", category: "comprar" },
        { label: "Terrenos e lotes", href: "/comprar?propertyType=land", category: "comprar" },
        { label: "Imóveis financiáveis", href: "/comprar?financiable=true", category: "comprar" },
      ],
    },
    {
      title: "Para Alugar",
      items: [
        { label: "Apartamentos para alugar", href: "/alugar?propertyType=apartment", category: "alugar" },
        { label: "Casas para alugar", href: "/alugar?propertyType=house", category: "alugar" },
        { label: "Studios e Kitnets", href: "/alugar?propertyType=studio", category: "alugar" },
        { label: "Salas comerciais", href: "/alugar?propertyType=commercial", category: "alugar" },
        { label: "Imóveis mobiliados", href: "/alugar?furnished=true", category: "alugar" },
      ],
    },
    {
      title: "Cidades em Destaque",
      items: citySearches,
    },
  ];
}
