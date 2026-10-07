import type { MetadataRoute } from "next";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";

/**
 * Robots.txt nativo do Next.js (App Router)
 * 
 * Permite o rastreamento das páginas públicas essenciais (home, imóveis, territorial, guias)
 * Bloqueia áreas administrativas (/admin, /painel), APIs, autenticação e armadilhas
 * de rastreamento com parâmetros de filtros infinitos.
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
          "/login",
          "/cadastro",
          "/redefinir-senha",
          "/auth",
          "/auth/",
          "/*?*minPrice=*",
          "/*?*maxPrice=*",
          "/*?*priceMin=*",
          "/*?*priceMax=*",
          "/*?*bedrooms=*",
          "/*?*bathrooms=*",
          "/*?*parkingSpaces=*",
          "/*?*areaMin=*",
          "/*?*areaMax=*",
          "/*?*financiable=*",
          "/*?*furnished=*",
          "/*?*acceptsExchange=*",
          "/*?*orderBy=*",
          "/*?*sort=*",
          "/*?*north=*",
          "/*?*zoom=*",
          "/*?*q=*",
          "/*?*page=*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
