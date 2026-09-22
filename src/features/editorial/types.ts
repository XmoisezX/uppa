/**
 * Tipos da Camada Editorial e Conteúdo definidos no MASTER_PLAN.md (Etapa 6)
 */

export type EditorialCategory =
  | "compra"
  | "aluguel"
  | "financiamento"
  | "documentacao"
  | "mercado"
  | "decoracao"
  | "reforma"
  | "cidades"
  | "bairros";

export interface EditorialCategoryInfo {
  key: EditorialCategory;
  label: string;
  description: string;
}

export interface EditorialArticleSection {
  title: string;
  content: string[];
}

export interface EditorialArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: EditorialCategory;
  categoryLabel: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    role: string;
  };
  featured?: boolean;
  tags: string[];
  sections: EditorialArticleSection[];
  relatedSlugs?: string[];
}

export interface CityGuide {
  id: string;
  name: string;
  slug: string;
  stateCode: string;
  stateName: string;
  propertyCount: number;
  highlightText: string;
  popularNeighborhoods?: string[];
  tagline: string;
}

export interface PopularSearchItem {
  label: string;
  href: string;
  category: "comprar" | "alugar" | "tipos" | "localizacao";
  badge?: string;
}

export interface PopularSearchGroup {
  title: string;
  items: PopularSearchItem[];
}
