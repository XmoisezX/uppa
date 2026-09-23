/**
 * WebsiteSourceDetector
 * Responsável por analisar um domínio e identificar a melhor estratégia de importação
 * seguindo rigorosamente a ordem de prioridade de descoberta:
 * 1. sitemap.xml e sitemaps referenciados no robots.txt
 * 2. outros sitemaps indexados (ex: sitemap-imoveis.xml)
 * 3. identificação de padrões de URLs de imóveis
 * 4. verificação de Schema.org / JSON-LD
 * 5. dados estruturados no HTML (OpenGraph / Microdata)
 * 6. identificação de endpoints públicos de API
 * 7. identificação de CMS/CRM conhecido (Tecimob, Kenlo, WordPress, etc.)
 * 8. fallback para parsing HTML genérico
 */

import { safeFetch } from "../security/ssrf-guard";
import {
  extractHtmlLinks,
  extractJsonLdBlocks,
  parseSitemapXml,
  extractMetaTags,
  isListingDetailUrl,
} from "../utils/html-parser-utils";
import type { DetectionResult } from "../types";

export class WebsiteSourceDetector {
  /**
   * Executa a análise e detecção da estrutura do site da imobiliária
   */
  public async detect(rawBaseUrl: string): Promise<DetectionResult> {
    let baseUrl = rawBaseUrl.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }

    // Normaliza URL base
    const parsed = new URL(baseUrl);
    const domain = parsed.hostname.toLowerCase();
    const origin = parsed.origin;

    const detectedSitemaps = new Set<string>();
    const listingUrlCandidates = new Set<string>();
    const publicApiEndpoints = new Set<string>();
    let hasJsonLd = false;
    let detectedCms: string | null = null;

    // =========================================================================
    // ETAPA 1 & 2: VERIFICAR ROBOTS.TXT E SITEMAPS
    // =========================================================================
    try {
      const robotsRes = await safeFetch(`${origin}/robots.txt`, { timeoutMs: 6000 });
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        const sitemapMatches = robotsText.matchAll(/Sitemap:\s*(https?:\/\/[^\s]+)/gi);
        for (const match of sitemapMatches) {
          if (match[1]) detectedSitemaps.add(match[1].trim());
        }
      }
    } catch {
      // Falha no robots.txt não interrompe
    }

    // Adiciona sitemaps comuns por convenção
    detectedSitemaps.add(`${origin}/sitemap.xml`);
    detectedSitemaps.add(`${origin}/sitemap_index.xml`);

    // Inspeciona os sitemaps encontrados para descobrir sub-sitemaps e URLs de imóveis (Fila recursiva)
    const sitemapQueue: string[] = Array.from(detectedSitemaps);
    const visitedSitemaps = new Set<string>();

    while (sitemapQueue.length > 0 && listingUrlCandidates.size < 500) {
      const sitemapUrl = sitemapQueue.shift()!;
      if (visitedSitemaps.has(sitemapUrl)) continue;
      visitedSitemaps.add(sitemapUrl);

      try {
        const smRes = await safeFetch(sitemapUrl, { timeoutMs: 10000 });
        if (smRes.ok) {
          const smXml = await smRes.text();
          const entries = parseSitemapXml(smXml);

          for (const entry of entries) {
            // Se for sub-sitemap (ex: sitemap-imoveis.xml ou pelotas-rs-brasil.xml)
            if (entry.url.endsWith(".xml")) {
              if (!visitedSitemaps.has(entry.url)) {
                sitemapQueue.push(entry.url);
                detectedSitemaps.add(entry.url);
              }
            } else if (isListingDetailUrl(entry.url)) {
              listingUrlCandidates.add(entry.url);
            }
          }
        }
      } catch {
        // Ignora sitemap inacessível
      }

      if (listingUrlCandidates.size >= 500) break;
    }

    // =========================================================================
    // ETAPA 3 & 4: ACESSAR PÁGINA INICIAL / CATÁLOGO PARA DETECTAR HTML E SCRIPTS
    // =========================================================================
    let sampleHtml = "";
    try {
      const homeRes = await safeFetch(origin, { timeoutMs: 10000 });
      if (homeRes.ok) {
        sampleHtml = await homeRes.text();
      }
    } catch (err: any) {
      console.warn(`[WebsiteSourceDetector] Falha ao acessar homepage ${origin}:`, err?.message);
    }

    // =========================================================================
    // ETAPA 5 & 6: DETECÇÃO DE CMS / CRM CONHECIDO E APIs PÚBLICAS
    // =========================================================================
    if (sampleHtml) {
      detectedCms = this.detectCmsFromHtml(sampleHtml, origin);

      // Procura por chamadas de API públicas no HTML / Scripts
      const apiMatches = sampleHtml.matchAll(
        /["'](\/(?:api|wp-json|v1|v2|imoveis\/api|properties\/api)[^"']*)["']/gi
      );
      for (const m of apiMatches) {
        if (m[1]) publicApiEndpoints.add(`${origin}${m[1]}`);
      }

      // Se ainda não descobriu URLs nos sitemaps, extrai links do HTML
      if (listingUrlCandidates.size === 0) {
        const links = extractHtmlLinks(sampleHtml, origin);
        for (const link of links) {
          if (this.isLikelyListingUrl(link)) {
            listingUrlCandidates.add(link);
          }
        }
      }
    }

    // =========================================================================
    // ETAPA 7: INSPECIONAR UMA PÁGINA DE IMÓVEL REAL PARA DETECTAR JSON-LD
    // =========================================================================
    const sampleListingUrls = Array.from(listingUrlCandidates).slice(0, 5);

    if (sampleListingUrls.length > 0) {
      try {
        const testUrl = sampleListingUrls[0];
        const pageRes = await safeFetch(testUrl, { timeoutMs: 10000 });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const jsonLdBlocks = extractJsonLdBlocks(pageHtml);

          for (const block of jsonLdBlocks) {
            const type = String(block?.["@type"] || "").toLowerCase();
            if (
              type.includes("realestatelisting") ||
              type.includes("singlefamilyresidence") ||
              type.includes("house") ||
              type.includes("apartment") ||
              type.includes("product") ||
              type.includes("place") ||
              type.includes("accommodation")
            ) {
              hasJsonLd = true;
              break;
            }
          }
        }
      } catch {
        // Falha no fetch da página de amostra não invalida a detecção
      }
    }

    // =========================================================================
    // ETAPA 8: DETERMINAR O CONECTOR RECOMENDADO
    // =========================================================================
    const recommendedConnector = hasJsonLd
      ? "universal_structured_data"
      : "generic_website";

    return {
      domain,
      baseUrl: origin,
      sitemaps: Array.from(detectedSitemaps),
      listingPatterns: this.inferUrlPatterns(Array.from(listingUrlCandidates)),
      hasJsonLd,
      detectedCms,
      publicApiEndpoints: Array.from(publicApiEndpoints),
      recommendedConnector,
      sampleListingUrls,
      status: "detected",
      message: `Detecção concluída. Conector recomendado: ${recommendedConnector} (${detectedCms || "Plataforma Genérica"}).`,
    };
  }

  /**
   * Identifica se uma URL possui características de página de imóvel individual
   */
  public isLikelyListingUrl(url: string): boolean {
    return isListingDetailUrl(url);
  }

  /**
   * Infere padrões de prefixo a partir das URLs encontradas
   */
  private inferUrlPatterns(urls: string[]): string[] {
    const patterns = new Set<string>();
    for (const url of urls) {
      try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length >= 2) {
          patterns.add(`/${segments[0]}/`);
        }
      } catch {
        // Ignora
      }
    }
    return Array.from(patterns).slice(0, 5);
  }

  /**
   * Identifica CMS / CRM conhecido através de assinaturas no HTML
   */
  private detectCmsFromHtml(html: string, url: string): string | null {
    const lower = html.toLowerCase();

    if (lower.includes("tecimob") || url.includes("tecimob.com.br")) {
      return "Tecimob";
    }
    if (lower.includes("ingaia") || lower.includes("kenlo") || url.includes("kenlo")) {
      return "Kenlo / inGaia";
    }
    if (lower.includes("unionsoftwares") || lower.includes("unionsistemas")) {
      return "Union Softwares";
    }
    if (lower.includes("imoview") || lower.includes("vista.imobi")) {
      return "Vista / Imoview";
    }
    if (lower.includes("dwv.com.br") || lower.includes("dwvapp")) {
      return "DWV";
    }
    if (lower.includes("wp-content") || lower.includes("wordpress")) {
      return "WordPress (Tema Imobiliário)";
    }

    return null;
  }
}
