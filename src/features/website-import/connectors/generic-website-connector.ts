/**
 * GenericWebsiteConnector
 * Conector genérico baseado em HTML semântico, paginação de catálogo e OpenGraph
 * Atua como conector universal de contingência para websites convencionais.
 */

import type { NormalizedProperty, NormalizedAddress } from "@/types/feed";
import type { ConnectorContext, ListingReference } from "../types";
import type { WebsiteConnector } from "./connector.interface";
import { safeFetch } from "../security/ssrf-guard";
import {
  extractHtmlLinks,
  extractImageUrls,
  extractMetaTags,
  parseCurrencyBrl,
  extractInteger,
  inferTransactionType,
  inferPropertyType,
  parseSitemapXml,
  isListingDetailUrl,
  extractAddressFromUrl,
  extractFullPropertyDescription,
} from "../utils/html-parser-utils";
import { filterListingImages } from "../utils/media-filter";
import { resolveWebsiteExternalId } from "../utils/external-id-resolver";

export class GenericWebsiteConnector implements WebsiteConnector {
  public readonly id = "generic_website";
  public readonly name = "Conector Genérico de Websites Imobiliários";

  public async canHandle(_context: ConnectorContext): Promise<boolean> {
    return true; // Fallback universal sempre habilitado
  }

  /**
   * Descobre anúncios percorrendo links de paginação e catálogo
   */
  public async discoverListings(
    context: ConnectorContext
  ): Promise<ListingReference[]> {
    const maxListings = context.maxListings ?? 5000;
    const maxPages = context.maxPages ?? 30;
    const discoveredListings = new Map<string, ListingReference>();

    // 1. Prioridade 1: Verifica sitemaps disponíveis (muito mais rápido, completo e confiável)
    const sitemaps = new Set<string>(context.sitemaps || []);
    if (sitemaps.size === 0) {
      sitemaps.add(`${context.baseUrl}/sitemap.xml`);
      sitemaps.add(`${context.baseUrl}/sitemap_index.xml`);
    }

    const sitemapQueue = Array.from(sitemaps);
    const visitedSitemaps = new Set<string>();

    while (sitemapQueue.length > 0 && discoveredListings.size < maxListings) {
      const smUrl = sitemapQueue.shift()!;
      if (visitedSitemaps.has(smUrl)) continue;
      visitedSitemaps.add(smUrl);

      try {
        const response = await safeFetch(smUrl, { timeoutMs: 12000 });
        if (!response.ok) continue;

        const xml = await response.text();
        const entries = parseSitemapXml(xml);

        for (const entry of entries) {
          if (entry.url.endsWith(".xml")) {
            if (!visitedSitemaps.has(entry.url)) {
              sitemapQueue.push(entry.url);
            }
          } else if (isListingDetailUrl(entry.url)) {
            if (!discoveredListings.has(entry.url)) {
              discoveredListings.set(entry.url, {
                url: entry.url,
                lastmod: entry.lastmod,
                sourceUpdatedAtHint: entry.lastmod,
              });
            }
          }

          if (discoveredListings.size >= maxListings) break;
        }
      } catch {
        // Ignora falha de sitemap e continua busca
      }
    }

    // Se sitemaps já forneceram anúncios, retorna imediatamente
    if (discoveredListings.size > 0) {
      return Array.from(discoveredListings.values());
    }

    // 2. Prioridade 2: Fallback para rastreamento HTML via paginação
    const visitedPages = new Set<string>();
    const pagesToCrawl: string[] = [
      `${context.baseUrl}/imoveis`,
      `${context.baseUrl}/venda`,
      `${context.baseUrl}/aluguel`,
      context.baseUrl,
    ];

    let pagesCrawled = 0;

    while (pagesToCrawl.length > 0 && pagesCrawled < maxPages) {
      const currentPageUrl = pagesToCrawl.shift()!;
      if (visitedPages.has(currentPageUrl)) continue;
      visitedPages.add(currentPageUrl);
      pagesCrawled++;

      try {
        const response = await safeFetch(currentPageUrl, { timeoutMs: 12000 });
        if (!response.ok) continue;

        const html = await response.text();
        const links = extractHtmlLinks(html, currentPageUrl);

        for (const link of links) {
          if (this.isListingLink(link)) {
            if (!discoveredListings.has(link)) {
              discoveredListings.set(link, { url: link });
            }
          } else if (this.isPaginationLink(link, context.baseUrl)) {
            if (!visitedPages.has(link) && !pagesToCrawl.includes(link)) {
              pagesToCrawl.push(link);
            }
          }

          if (discoveredListings.size >= maxListings) break;
        }
      } catch (err: any) {
        console.warn(`[GenericWebsiteConnector] Erro ao rastrear página ${currentPageUrl}:`, err?.message);
      }

      if (discoveredListings.size >= maxListings) break;
    }

    return Array.from(discoveredListings.values());
  }

  /**
   * Extrai dados de um anúncio através do HTML semântico da página
   */
  public async fetchListing(
    reference: ListingReference,
    _context: ConnectorContext
  ): Promise<NormalizedProperty> {
    const response = await safeFetch(reference.url, {
      timeoutMs: 15000,
      ..._context.safeFetchOptions,
    });
    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status} ao acessar anúncio: ${reference.url}`);
    }

    const html = await response.text();
    const meta = extractMetaTags(html);

    // 1. Título
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    const cleanH1 = h1Match ? this.stripHtmlTags(h1Match[1]) : "";
    const title =
      cleanH1 ||
      meta["og:title"] ||
      meta["page_title"] ||
      "Imóvel Anunciado";

    // 2. Descrição Completa (DOM, JSON embutido e fallbacks)
    const description = extractFullPropertyDescription(html, meta);

    // 3. Tipo de transação e Tipo do imóvel
    const transactionType = inferTransactionType(`${title} ${description}`);
    const propertyType = inferPropertyType(`${title} ${description}`);

    // 4. Preços (Regex para R$ ...)
    const { price, rentPrice } = this.extractPricesFromHtml(html, title, transactionType);

    // 5. Especificações (Quartos, banheiros, vagas, área)
    // Suporta tanto "4 quartos" quanto "Quartos: 4"
    const bedrooms = this.extractSpecificationMetric(html, ["quarto", "dormit[oó]rio", "dorm"]);
    const suites = this.extractSpecificationMetric(html, ["su[ií]te"]);
    const bathrooms = this.extractSpecificationMetric(html, ["banheiro", "bwc"]);
    const parkingSpaces = this.extractSpecificationMetric(html, ["vaga", "garagem"]);
    const usableArea = this.extractAreaFromHtml(html);

    // 6. Endereço (Extração precisa da URL com fallback para o HTML)
    const address = this.extractAddressFromHtml(html, meta, reference.url);

    // 7. Mídias
    const rawImageUrls = extractImageUrls(html, reference.url);
    if (meta["og:image"]) rawImageUrls.push(meta["og:image"]);
    const images = filterListingImages(rawImageUrls, reference.url);

    // 8. Características (Features)
    const features = this.extractFeaturesFromHtml(html);

    // 9. Resolução de External ID
    const explicitCode =
      this.extractCodeFromHtml(html) || this.extractCodeFromHtml(title);
    const canonicalUrl = meta["canonical"] || reference.url;

    const externalId = resolveWebsiteExternalId({
      explicitCode,
      canonicalUrl,
      pageUrl: reference.url,
    });

    const lowerTitle = title.toLowerCase();
    const isUnavailable =
      lowerTitle.includes("indisponível") ||
      lowerTitle.includes("indisponivel") ||
      lowerTitle.includes("não está mais disponível") ||
      lowerTitle.includes("nao esta mais disponivel") ||
      lowerTitle.includes("não encontrado") ||
      lowerTitle.includes("desativado");

    return {
      externalId,
      code: explicitCode || externalId,
      sourceUrl: canonicalUrl,
      title: title.trim(),
      description: description.trim(),
      transactionType,
      propertyType,
      price,
      rentPrice,
      bedrooms: bedrooms ?? 0,
      suites: suites ?? 0,
      bathrooms: bathrooms ?? 0,
      parkingSpaces: parkingSpaces ?? 0,
      usableArea,
      address,
      images,
      features,
      sourceUpdatedAt: new Date().toISOString(),
    };
  }

  private isListingLink(url: string): boolean {
    return isListingDetailUrl(url);
  }

  private isPaginationLink(url: string, baseUrl: string): boolean {
    const lower = url.toLowerCase();
    if (!url.startsWith(baseUrl)) return false;

    return (
      lower.includes("page=") ||
      lower.includes("pagina=") ||
      lower.includes("/page/") ||
      lower.includes("/pagina/") ||
      lower.includes("p=")
    );
  }

  private stripHtmlTags(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractPricesFromHtml(
    html: string,
    title: string,
    transactionType?: string
  ): { price?: number; rentPrice?: number } {
    let price: number | undefined;
    let rentPrice: number | undefined;

    const lower = `${title} ${transactionType || ""}`.toLowerCase();
    const isExplicitRent = lower.includes("aluguel") || lower.includes("loca") || lower.includes("rent");
    const isExplicitSale = lower.includes("venda") || lower.includes("compra") || lower.includes("sale");

    // Busca valores monetários no formato brasileiro
    const priceMatches = html.matchAll(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/gi);
    for (const match of priceMatches) {
      const val = parseCurrencyBrl(match[1]);
      if (!val || val < 100) continue;

      if (isExplicitRent && !isExplicitSale) {
        if (!rentPrice) rentPrice = val;
      } else if (isExplicitSale && !isExplicitRent) {
        if (!price && val >= 1000) price = val;
      } else {
        if (val >= 25000 && !price) {
          price = val;
        } else if (val < 25000 && !rentPrice) {
          rentPrice = val;
        }
      }

      if (price && rentPrice) break;
    }

    return { price, rentPrice };
  }

  private extractSpecificationMetric(
    html: string,
    terms: string[]
  ): number | undefined {
    const termPattern = terms.join("|");
    // Padrão 1: "4 quartos" ou "4 dorms"
    const prefixMatch = new RegExp(`(\\d+)\\s*(?:${termPattern})s?\\b`, "i").exec(
      html
    );
    if (prefixMatch) {
      return extractInteger(prefixMatch[1]);
    }
    // Padrão 2: "Quartos: 4" ou "Dormitórios 4"
    const suffixMatch = new RegExp(
      `\\b(?:${termPattern})s?[:\\s]*(\\d+)`,
      "i"
    ).exec(html);
    if (suffixMatch) {
      return extractInteger(suffixMatch[1]);
    }
    return undefined;
  }

  private extractRegexMetric(html: string, regex: RegExp): number | undefined {
    const match = regex.exec(html);
    return match ? extractInteger(match[1]) : undefined;
  }

  private extractAreaFromHtml(html: string): number | undefined {
    const match = /(?:[aá]rea [uú]til|[aá]rea privativa|[aá]rea)[:\s]*([\d.,]+)\s*m²/i.exec(
      html
    );
    if (match) {
      return parseCurrencyBrl(match[1]);
    }
    const genericMatch = /([\d.,]+)\s*m²/i.exec(html);
    return genericMatch ? parseCurrencyBrl(genericMatch[1]) : undefined;
  }

  private extractAddressFromHtml(
    html: string,
    meta: Record<string, string>,
    pageUrl?: string
  ): NormalizedAddress {
    // 1. Tenta extrair a partir da URL estruturada (muito comum e precisa no Brasil)
    if (pageUrl) {
      const fromUrl = extractAddressFromUrl(pageUrl);
      if (fromUrl.city || fromUrl.neighborhood || fromUrl.state) {
        return {
          country: "Brasil",
          city: fromUrl.city,
          state: fromUrl.state,
          neighborhood: fromUrl.neighborhood,
          postalCode: meta["postal_code"] || undefined,
        };
      }
    }

    const cleanText = this.stripHtmlTags(html);
    // Procura por Bairro, Cidade - UF
    const locationMatch = /\b(?:bairro|localiza[cç][aã]o)[:\s]*([^<>\n,]+)(?:,\s*([^<>\n,-]+))?(?:\s*-\s*([a-zA-Z]{2}))?/i.exec(
      cleanText
    );

    return {
      country: "Brasil",
      neighborhood: locationMatch ? locationMatch[1]?.trim() : undefined,
      city: locationMatch && locationMatch[2] ? locationMatch[2]?.trim() : undefined,
      state: locationMatch && locationMatch[3] ? locationMatch[3]?.trim().toUpperCase() : undefined,
      postalCode: meta["postal_code"] || undefined,
    };
  }

  private extractFeaturesFromHtml(html: string): string[] {
    const commonFeatures = [
      "piscina",
      "churrasqueira",
      "elevador",
      "academia",
      "varanda",
      "sacada",
      "lareira",
      "portaria 24h",
      "ar condicionado",
      "mobiliado",
      "playground",
      "salao de festas",
      "quadra",
    ];

    const lower = html.toLowerCase();
    const found: string[] = [];

    for (const feat of commonFeatures) {
      if (lower.includes(feat)) {
        found.push(feat);
      }
    }

    return found;
  }

  private extractCodeFromHtml(html: string): string | null {
    const cleanText = this.stripHtmlTags(html);
    const match = /\b(?:c[oó]d(?:igo)?|ref)[:\s_-]+([a-zA-Z0-9_-]+)/i.exec(cleanText);
    return match ? match[1].trim() : null;
  }
}
