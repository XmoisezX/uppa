/**
 * Utilitários puros em memória para Parsing de HTML, XML (Sitemaps) e JSON-LD
 * Desenvolvido sem dependências pesadas externas para máxima portabilidade e performance.
 */

import type { PropertyType, TransactionType } from "@/types/property";

/**
 * Extrai todos os blocos de JSON-LD (<script type="application/ld+json">)
 */
export function extractJsonLdBlocks(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const rawContent = match[1]?.trim();
    if (!rawContent) continue;

    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed["@graph"])) {
          results.push(...parsed["@graph"]);
        } else {
          results.push(parsed);
        }
      }
    } catch {
      // Ignora blocos de JSON-LD com sintaxe inválida
    }
  }

  return results;
}

/**
 * Extrai tags <meta> relevantes (og:title, description, canonical, etc.)
 */
export function extractMetaTags(html: string): Record<string, string> {
  if (!html) return {};
  const meta: Record<string, string> = {};

  // Meta tags padrão e OpenGraph
  const metaRegex =
    /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase().trim();
    const val = match[2]?.trim() || "";
    meta[key] = val;
  }

  // Variação invertida (content antes de name/property)
  const metaRegexInverted =
    /<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']([^"']+)["'][^>]*>/gi;
  while ((match = metaRegexInverted.exec(html)) !== null) {
    const val = match[1]?.trim() || "";
    const key = match[2].toLowerCase().trim();
    if (!meta[key]) meta[key] = val;
  }

  // Canonical link <link rel="canonical" href="...">
  const canonicalMatch = /<link\s+[^>]*?rel=["']canonical["'][^>]*?href=["']([^"']+)["'][^>]*>/i.exec(
    html
  );
  if (canonicalMatch && canonicalMatch[1]) {
    meta["canonical"] = canonicalMatch[1].trim();
  }

  // Tag <title>
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch && titleMatch[1]) {
    meta["page_title"] = titleMatch[1].trim();
  }

  return meta;
}

/**
 * Extrai todos os links <a href="..."> de um documento HTML
 */
export function extractHtmlLinks(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const links = new Set<string>();
  const aRegex = /<a\s+[^>]*?href=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = aRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, baseUrl);
      // Mantém apenas links do mesmo hostname
      const baseHostname = new URL(baseUrl).hostname.toLowerCase();
      if (resolved.hostname.toLowerCase() === baseHostname) {
        resolved.hash = ""; // Remove hash
        links.add(resolved.toString());
      }
    } catch {
      // URL inválida ignorada
    }
  }

  return Array.from(links);
}

/**
 * Extrai todas as tags <img> com URLs candidatas
 */
export function extractImageUrls(html: string, baseUrl?: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const imgRegex =
    /<img\s+[^>]*?(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1]?.trim();
    if (src && !src.startsWith("data:")) {
      try {
        const resolved = baseUrl ? new URL(src, baseUrl).toString() : src;
        urls.push(resolved);
      } catch {
        urls.push(src);
      }
    }
  }

  return urls;
}

/**
 * Extrai URLs de um arquivo Sitemap XML (<loc>...</loc> e <lastmod>...</lastmod>)
 */
export interface SitemapUrlEntry {
  url: string;
  lastmod?: string;
}

export function parseSitemapXml(xmlString: string): SitemapUrlEntry[] {
  if (!xmlString) return [];
  const entries: SitemapUrlEntry[] = [];

  const urlBlockRegex = /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = urlBlockRegex.exec(xmlString)) !== null) {
    const block = blockMatch[1];
    const locMatch = /<loc>([\s\S]*?)<\/loc>/i.exec(block);
    if (!locMatch || !locMatch[1]) continue;

    const loc = locMatch[1].trim();
    const lastmodMatch = /<lastmod>([\s\S]*?)<\/lastmod>/i.exec(block);
    const lastmod = lastmodMatch ? lastmodMatch[1].trim() : undefined;

    entries.push({ url: loc, lastmod });
  }

  return entries;
}

/**
 * Converte valor textual de moeda brasileira (R$ 850.000,00 ou 850000) em number
 */
export function parseCurrencyBrl(val: any): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number") return isNaN(val) || val <= 0 ? undefined : val;

  const str = String(val).trim();
  if (!str) return undefined;

  // Se já for número limpo com ponto decimal (ex: "850000.00")
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return isNaN(num) || num <= 0 ? undefined : num;
  }

  // Remove "R$", espaços e formatação brasileira (1.200.000,00 -> 1200000.00)
  const cleaned = str
    .replace(/[^\d.,]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");

  const result = parseFloat(cleaned);
  return isNaN(result) || result <= 0 ? undefined : result;
}

/**
 * Extrai número inteiro a partir de texto (ex: "3 quartos" -> 3)
 */
export function extractInteger(val: any): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number") return Math.max(0, Math.floor(val));

  const match = String(val).match(/\d+/);
  if (!match) return undefined;

  const parsed = parseInt(match[0], 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Mapeia texto ou tipos livres para o enum TransactionType ("sale" | "rent" | "sale_or_rent")
 */
export function inferTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();
  const isSale =
    lower.includes("venda") ||
    lower.includes("comprar") ||
    lower.includes("sale") ||
    lower.includes("buy");
  const isRent =
    lower.includes("locacao") ||
    lower.includes("locação") ||
    lower.includes("aluguel") ||
    lower.includes("rent");

  if (isSale && isRent) return "sale_or_rent";
  if (isRent) return "rent";
  return "sale";
}

/**
 * Mapeia texto para o enum PropertyType padrão da UPPA
 */
export function inferPropertyType(text: string): PropertyType {
  const lower = text.toLowerCase();

  if (lower.includes("apartamento") || lower.includes("apto") || lower.includes("apartment"))
    return "apartment";
  if (lower.includes("casa em condomínio") || lower.includes("condomínio fechado"))
    return "condo_house";
  if (lower.includes("casa") || lower.includes("house") || lower.includes("sobrado"))
    return "house";
  if (lower.includes("terreno") || lower.includes("lote") || lower.includes("land"))
    return "land";
  if (lower.includes("cobertura") || lower.includes("penthouse"))
    return "penthouse";
  if (lower.includes("kitnet") || lower.includes("kitchenette"))
    return "kitnet";
  if (lower.includes("studio") || lower.includes("estúdio"))
    return "studio";
  if (lower.includes("loft"))
    return "loft";
  if (lower.includes("sala comercial") || lower.includes("escritório") || lower.includes("office"))
    return "office";
  if (lower.includes("galpão") || lower.includes("depósito") || lower.includes("warehouse"))
    return "warehouse";
  if (lower.includes("comercial") || lower.includes("loja"))
    return "commercial";
  if (lower.includes("chácara") || lower.includes("sítio") || lower.includes("fazenda") || lower.includes("rural"))
    return "farm";

  return "other";
}
