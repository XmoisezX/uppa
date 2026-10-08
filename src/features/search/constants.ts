/**
 * Configurações e constantes do motor de busca e listagem pública da UPPA
 * Conforme MASTER_PLAN e requisitos de alta performance
 */

/** Quantidade padrão de imóveis por lote (SSR inicial e infinite scroll) */
export const SEARCH_BATCH_SIZE = 20;

/** Margem de prefetch antecipado do IntersectionObserver (1 a 2 viewports) */
export const SEARCH_SENTINEL_ROOT_MARGIN = "800px";

/** Hostnames de mídia confiáveis pré-aprovados para otimização via next/image */
export const TRUSTED_MEDIA_HOSTS = new Set([
  "static.arboimoveis.com.br",
  "fotos.infoideias.net",
  "blog.upimoveis.com.br",
  "cdn.vistahost.com.br",
  "app.chavereserva.com",
  "s01.jetimgs.com",
]);
