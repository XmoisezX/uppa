import type { MetadataRoute } from "next";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";

/**
 * Robots.txt nativo do Next.js (App Router)
 * 
 * Permite o rastreamento das páginas públicas essenciais (home, imóveis, territorial, guias, imobiliárias).
 * Bloqueia áreas administrativas (/admin, /painel), APIs e autenticação real (/entrar, /cadastrar, /recuperar-senha).
 * Permite o rastreamento de filtros com parâmetros de busca para que os motores de busca possam ler e respeitar
 * as tags 'noindex, follow' e canonical, bloqueando estritamente armadilhas técnicas de viewport/mapa.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/comprar",
          "/alugar",
          "/imovel/",
          "/imoveis/",
          "/imobiliaria/",
          "/guias/",
          "/images/",
          "/_next/static/",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/painel",
          "/painel/",
          "/api",
          "/api/",
          "/entrar",
          "/cadastrar",
          "/recuperar-senha",
          "/auth",
          "/auth/",
          "/*?*north=*",
          "/*?*south=*",
          "/*?*east=*",
          "/*?*west=*",
          "/*?*zoom=*",
          "/*?*bbox=*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
