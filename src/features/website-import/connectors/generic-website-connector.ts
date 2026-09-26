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
  extractTrackingMetadata,
  type WebsiteTrackingMetadata,
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
    const tracking = extractTrackingMetadata(html);

    // 1. Título
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    const cleanH1 = h1Match ? this.stripHtmlTags(h1Match[1]) : "";
    const title =
      cleanH1 ||
      tracking?.title ||
      meta["og:title"] ||
      meta["page_title"] ||
      "Imóvel Anunciado";

    if (
      /\b\d+\s+imóveis?\s+(?:encontrados?|disponíveis?|para\s+você|na\s+busca|em\s+destaque)/i.test(title) ||
      /\bimóve(?:is|l)\s+encontrado/i.test(title) ||
      /\bresultados?\s+da\s+busca/i.test(title) ||
      /\bbusca\s+de\s+imóve/i.test(title)
    ) {
      throw new Error(`Página de listagem/filtro ignorada: "${title}"`);
    }

    // 2. Descrição Completa (DOM, JSON embutido e fallbacks)
    const description = extractFullPropertyDescription(html, meta);

    // 3. Tipo de transação e Tipo do imóvel
    let transactionType: "sale" | "rent" | "sale_or_rent";
    if (tracking?.transaction) {
      transactionType = tracking.transaction;
    } else {
      // Verifica badges de finalidade no HTML (ex: <span id="finalidade">Venda</span>)
      const finalidadeMatch =
        html.match(/<(?:span|div|p|li)[^>]*id=["']finalidade["'][^>]*>([\s\S]*?)<\/(?:span|div|p|li)>/i) ||
        html.match(/<(?:span|div|p|li)[^>]*class=["'][^"']*finalidade[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|p|li)>/i);
      const finalidadeText = finalidadeMatch ? this.stripHtmlTags(finalidadeMatch[1]).toLowerCase() : "";

      if (finalidadeText.includes("venda")) {
        transactionType = "sale";
      } else if (finalidadeText.includes("loca") || finalidadeText.includes("aluguel")) {
        transactionType = "rent";
      } else {
        transactionType = inferTransactionType(`${title} ${description} ${reference.url}`);
      }
    }

    const propertyType = inferPropertyType(
      `${tracking?.type || ""} ${title} ${description}`
    );

    // 4. Preços
    let price: number | undefined;
    let rentPrice: number | undefined;

    if (tracking?.priceVenda && transactionType !== "rent") {
      price = tracking.priceVenda;
    }
    if (tracking?.priceAluguel && transactionType !== "sale") {
      rentPrice = tracking.priceAluguel;
    }

    if (!price && !rentPrice) {
      const extracted = this.extractPricesFromHtml(html, title, transactionType);
      price = extracted.price;
      rentPrice = extracted.rentPrice;
    }

    // 5. Especificações (Quartos, banheiros, vagas, área)
    const bedrooms =
      tracking?.bedrooms ??
      this.extractSpecificationMetric(html, ["quarto", "dormit[oó]rio", "dorm"]);
    const suites = this.extractSpecificationMetric(html, ["su[ií]te"]);
    const bathrooms =
      tracking?.bathrooms ??
      this.extractSpecificationMetric(html, ["banheiro", "bwc"]);
    const parkingSpaces = this.extractSpecificationMetric(html, ["vaga", "garagem"]);
    const usableArea = tracking?.area ?? this.extractAreaFromHtml(html);

    // 6. Endereço (Tracking > DOM > URL > fallback)
    const address = this.extractAddressFromHtml(html, meta, reference.url, tracking);

    // 7. Mídias (Fotos reais do imóvel, excluindo logos e banners)
    const rawImageUrls = extractImageUrls(html, reference.url);
    if (tracking?.image && !rawImageUrls.includes(tracking.image)) {
      rawImageUrls.unshift(tracking.image);
    }
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
    const lowerHtml = html.toLowerCase();
    const isUnavailable =
      lowerTitle.includes("indisponível") ||
      lowerTitle.includes("indisponivel") ||
      lowerTitle.includes("não está mais disponível") ||
      lowerTitle.includes("nao esta mais disponivel") ||
      lowerTitle.includes("não encontrado") ||
      lowerTitle.includes("desativado") ||
      lowerTitle.includes("imóvel indisponível") ||
      lowerTitle.includes("imovel indisponivel") ||
      lowerHtml.includes("este imóvel não está mais disponível") ||
      lowerHtml.includes("este imovel nao esta mais disponivel");

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
      isUnavailable,
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
    const isExplicitRent = transactionType === "rent" || lower.includes("aluguel") || lower.includes("loca");
    const isExplicitSale = transactionType === "sale" || lower.includes("venda") || lower.includes("compra");

    // 1. Tenta encontrar preços com rótulos explícitos (ex: "Valor de venda", "Venda:", "Locação:")
    const saleLabelMatch = html.match(/(?:valor\s+(?:de\s+)?venda|preço\s+(?:de\s+)?venda|venda)[\s:]*R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/i);
    const rentLabelMatch = html.match(/(?:valor\s+(?:de\s+)?(?:loca[cç][aã]o|aluguel)|aluguel|loca[cç][aã]o)[\s:]*R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/i);

    if (saleLabelMatch && transactionType !== "rent") {
      price = parseCurrencyBrl(saleLabelMatch[1]);
    }
    if (rentLabelMatch && transactionType !== "sale") {
      rentPrice = parseCurrencyBrl(rentLabelMatch[1]);
    }

    if (price || rentPrice) {
      if (transactionType === "sale") rentPrice = undefined;
      if (transactionType === "rent") price = undefined;
      return { price, rentPrice };
    }

    // 2. Busca valores monetários no formato brasileiro
    // Sanitiza o HTML para evitar capturar faixas de preço de agência no rodapé (ex: "priceRange": "R$ 0 - R$ 5.000.000")
    const sanitizedHtml = html
      .replace(/"priceRange"\s*:\s*"[^"]*"/gi, "")
      .replace(/priceRange\s*:\s*'[^']*'/gi, "");

    const priceMatches = sanitizedHtml.matchAll(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/gi);
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

    if (transactionType === "sale") rentPrice = undefined;
    if (transactionType === "rent") price = undefined;

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
    pageUrl?: string,
    tracking?: WebsiteTrackingMetadata | null
  ): NormalizedAddress {
    // 1. Extração de Coordenadas Geográficas (lat, lng / latitude, longitude)
    let latitude: number | undefined;
    let longitude: number | undefined;
    let isApproximate = false;

    // A. Procura coordenadas do imóvel no payload de renderização (ex: Loft Sites / Next.js)
    // Ignorando estritamente coordenadas da imobiliária / corretores
    const nextCoordsMatch = html.match(
      /(?<!broker(?:Address)?|agency|office|imobiliaria)[^\w]latitude\\*"?:\s*\\*"?(-?\d+\.\d+)\\*"?[\s\S]{1,60}?(?<!broker(?:Address)?|agency|office|imobiliaria)[^\w]longitude\\*"?:\s*\\*"?(-?\d+\.\d+)\\*"?/i
    );
    if (nextCoordsMatch) {
      const latVal = parseFloat(nextCoordsMatch[1]);
      const lngVal = parseFloat(nextCoordsMatch[2]);
      if (latVal >= -35 && latVal <= 6 && lngVal >= -75 && lngVal <= -30) {
        latitude = latVal;
        longitude = lngVal;
      }
    }

    const exactMatch = html.match(/\\*"?showPropertyExactLocation\\*"?:\s*(true|false)/i);
    if (exactMatch && exactMatch[1] === "false") {
      isApproximate = true;
    }

    if (!latitude || !longitude) {
      const mapMatch = html.match(/maps\.google\.com[^\"]*?[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
      if (mapMatch) {
        latitude = parseFloat(mapMatch[1]);
        longitude = parseFloat(mapMatch[2]);
      } else if (meta["geo.position"]) {
        const parts = meta["geo.position"].split(/[,; ]+/);
        if (parts.length >= 2) {
          latitude = parseFloat(parts[0]);
          longitude = parseFloat(parts[1]);
        }
      }
    }

    // 2. Extração de CEP
    const cepMatch = html.match(/(?:\\?"end_cep\\?"|\\?"cep\\?"):\s*\\?"(\d{5}-?\d{3})\\?"/i);
    const postalCode = cepMatch ? cepMatch[1] : (meta["postal_code"] || undefined);

    // 3. Extração de Número
    const numMatch = html.match(/(?:\\?"end_numero\\?"|\\?"numero\\?"):\s*\\?"?(\d+)\\?"?/i);
    const number = numMatch ? numMatch[1] : undefined;

    // 4. Extração de Logradouro / Rua
    const ruaMatch = html.match(/(?:\\?"end_logradouro\\?"|\\?"logradouro\\?"|\\?"rua\\?"|\\?"endereco\\?"):\\?"([^\\"]+)\\?"/i);
    const descRuaMatch = html.match(/(?:localizado na|situado na|localizada na|situada na)\s+((?:avenida|av\.|rua|r\.|travessa|alameda|rodovia)\s+[^,<\n]+)/i);
    const street = ruaMatch ? ruaMatch[1]?.trim() : (descRuaMatch ? descRuaMatch[1]?.trim() : undefined);

    // 5. Extração de Bairro, Cidade e Estado
    const bairroMatch = html.match(/(?:\\?"end_bairro\\?"|\\?"bairro\\?"):\s*\\?"([^\\"]+)\\?"/i);
    const cidadeMatch = html.match(/(?:\\?"end_cidade\\?"|\\?"cidade\\?"):\s*\\?"([^\\"]+)\\?"/i);
    const estadoMatch = html.match(/(?:\\?"end_estado\\?"|\\?"uf\\?"):\s*\\?"([a-zA-Z]{2})\\?"/i);

    // Extração via DOM típico (ex: <h3 ...>Três Vendas, Pelotas - RS</h3>)
    const domLocationMatch = html.match(/<h[2345][^>]*>([^<>\n]+),\s*([^<>\n]+)\s*-\s*([A-Za-z]{2})<\/h[2345]>/i);

    // Fallback via URL estruturada
    const fromUrl = pageUrl ? extractAddressFromUrl(pageUrl) : {};

    const cleanText = this.stripHtmlTags(html);
    const locationMatch = /\b(?:bairro|localiza[cç][aã]o)[:\s]*([^<>\n,]+)(?:,\s*([^<>\n,-]+))?(?:\s*-\s*([a-zA-Z]{2}))?/i.exec(
      cleanText
    );

    const neighborhood =
      tracking?.neighborhood ||
      (bairroMatch ? bairroMatch[1]?.trim() : undefined) ||
      (domLocationMatch ? domLocationMatch[1]?.trim() : undefined) ||
      fromUrl.neighborhood ||
      (locationMatch ? locationMatch[1]?.trim() : undefined);

    let city =
      tracking?.city ||
      (cidadeMatch ? cidadeMatch[1]?.trim() : undefined) ||
      (domLocationMatch ? domLocationMatch[2]?.trim() : undefined) ||
      fromUrl.city ||
      (locationMatch && locationMatch[2] ? locationMatch[2]?.trim() : undefined);

    if (city && /^(?:avenida|rua|travessa|alameda)/i.test(city)) {
      city = fromUrl.city || "Pelotas";
    }

    const state =
      tracking?.state ||
      (estadoMatch ? estadoMatch[1]?.trim().toUpperCase() : undefined) ||
      (domLocationMatch ? domLocationMatch[3]?.trim().toUpperCase() : undefined) ||
      fromUrl.state ||
      (locationMatch && locationMatch[3] ? locationMatch[3]?.trim().toUpperCase() : "RS");

    // Determina se a localização é pontual (exata) ou apenas uma região / bairro
    const isExact = !isApproximate && Boolean(street && number && number !== "0" && number !== "0000");

    return {
      country: "Brasil",
      state,
      city,
      neighborhood,
      street,
      number,
      postalCode,
      latitude,
      longitude,
      addressVisible: isExact,
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
