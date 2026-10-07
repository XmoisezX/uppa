/**
 * SEO_INDEXABILITY_CONFIG
 * 
 * Configurações e critérios centrais de indexabilidade técnica e programática da UPPA.
 * Evita a criação de páginas fracas (thin content) e combinações infinitas de filtros no Google.
 */

export const SEO_INDEXABILITY_CONFIG = {
  /**
   * Quantidade mínima de propriedades ativas para uma página de cidade
   * ser indexável (index, follow) e entrar no sitemap.
   * Cidades abaixo deste limiar recebem 'noindex, follow'.
   */
  MIN_PROPERTIES_CITY: 3,

  /**
   * Quantidade mínima de propriedades ativas para uma página de bairro
   * ser indexável (index, follow) e entrar no sitemap.
   * Bairros abaixo deste limiar recebem 'noindex, follow'.
   */
  MIN_PROPERTIES_NEIGHBORHOOD: 2,

  /**
   * Quantidade mínima de propriedades ativas para uma combinação
   * territorial de tipologia/finalidade ser indexável.
   */
  MIN_PROPERTIES_SEGMENT: 2,

  /**
   * Limite de URLs por arquivo de sitemap para suporte à futura partição.
   */
  SITEMAP_CHUNK_SIZE: 5000,

  /**
   * URL canônica base do portal.
   */
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://uppa.com.br",

  /**
   * Padrão de títulos e descrições para páginas institucionais e territoriais.
   */
  BRAND_NAME: "UPPA",
  DEFAULT_META_TITLE: "UPPA — Portal Imobiliário | Imóveis para Comprar e Alugar",
  DEFAULT_META_DESCRIPTION:
    "Encontre casas, apartamentos e terrenos para comprar e alugar com ofertas transparentes de imobiliárias e corretores credenciados.",
};
