/**
 * UniversalStructuredDataConnector
 * Conector de alta fidelidade que extrai imóveis a partir de Schema.org / JSON-LD
 * (RealEstateListing, SingleFamilyResidence, House, Apartment, Product, Accommodation).
 */

import type { NormalizedProperty, NormalizedAddress } from "@/types/feed";
import type { ConnectorContext, ListingReference } from "../types";
import type { WebsiteConnector } from "./connector.interface";
import { safeFetch } from "../security/ssrf-guard";
import {
  extractJsonLdBlocks,
  extractMetaTags,
  parseSitemapXml,
  parseCurrencyBrl,
  extractInteger,
  inferTransactionType,
  inferPropertyType,
  isListingDetailUrl,
  extractFullPropertyDescription,
  extractTrackingMetadata,
  extractImageUrls,
  extractAddressFromUrl,
} from "../utils/html-parser-utils";
import { filterListingImages } from "../utils/media-filter";
import { resolveWebsiteExternalId } from "../utils/external-id-resolver";

export class UniversalStructuredDataConnector implements WebsiteConnector {
  public readonly id = "universal_structured_data";
  public readonly name = "Conector Universal Schema.org / JSON-LD";

  public async canHandle(context: ConnectorContext): Promise<boolean> {
    // É o conector preferencial quando sitemaps ou páginas possuem dados estruturados
    return Boolean(context.sitemaps && context.sitemaps.length > 0);
  }

  /**
   * Descobre todas as URLs de imóveis a partir dos sitemaps disponíveis
   */
  public async discoverListings(
    context: ConnectorContext
  ): Promise<ListingReference[]> {
    const maxListings = context.maxListings ?? 10000;
    const discovered: Map<string, ListingReference> = new Map();
    const sitemapsToVisit = new Set<string>(context.sitemaps || []);

    // Adiciona sitemaps padrão caso a lista esteja vazia
    if (sitemapsToVisit.size === 0) {
      sitemapsToVisit.add(`${context.baseUrl}/sitemap.xml`);
      sitemapsToVisit.add(`${context.baseUrl}/sitemap_index.xml`);
    }

    const sitemapQueue: string[] = Array.from(sitemapsToVisit);
    const visitedSitemaps = new Set<string>();

    while (sitemapQueue.length > 0 && discovered.size < maxListings) {
      const smUrl = sitemapQueue.shift()!;
      if (visitedSitemaps.has(smUrl)) continue;
      visitedSitemaps.add(smUrl);

      try {
        const response = await safeFetch(smUrl, { timeoutMs: 12000 });
        if (!response.ok) continue;

        const xml = await response.text();
        const entries = parseSitemapXml(xml);

        for (const entry of entries) {
          // Se for sub-sitemap, enfileira para visita
          if (entry.url.endsWith(".xml") && !visitedSitemaps.has(entry.url)) {
            sitemapQueue.push(entry.url);
          } else if (this.isPropertyUrl(entry.url)) {
            if (!discovered.has(entry.url)) {
              discovered.set(entry.url, {
                url: entry.url,
                lastmod: entry.lastmod,
                sourceUpdatedAtHint: entry.lastmod,
              });
            }
          }

          if (discovered.size >= maxListings) break;
        }
      } catch (err: any) {
        console.warn(`[UniversalStructuredDataConnector] Falha ao processar sitemap ${smUrl}:`, err?.message);
      }
    }

    return Array.from(discovered.values());
  }

  /**
   * Extrai e normaliza os dados de um anúncio individual
   */
  public async fetchListing(
    reference: ListingReference,
    context: ConnectorContext
  ): Promise<NormalizedProperty> {
    const response = await safeFetch(reference.url, {
      timeoutMs: 15000,
      ...context.safeFetchOptions,
    });
    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status} ao acessar anúncio: ${reference.url}`);
    }

    const html = await response.text();
    const meta = extractMetaTags(html);
    const jsonLdBlocks = extractJsonLdBlocks(html);
    const tracking = extractTrackingMetadata(html);

    // Localiza o bloco de JSON-LD mais relevante para o imóvel
    const listingBlock = this.findBestJsonLdBlock(jsonLdBlocks);

    // Identifica ofertas / preço
    const offers = listingBlock?.offers || listingBlock?.priceSpecification || {};
    const addressBlock = listingBlock?.address || {};
    const geoBlock = listingBlock?.geo || {};

    // 1. Resolução do External ID (Código explícito > API ID > @id > Canonical URL)
    const explicitCode =
      listingBlock?.sku ||
      listingBlock?.identifier ||
      listingBlock?.productID ||
      tracking?.id ||
      this.extractCodeFromText(listingBlock?.name || meta["page_title"] || "");

    const canonicalUrl = meta["canonical"] || reference.url;

    const externalId = resolveWebsiteExternalId({
      explicitCode,
      apiId: listingBlock?.internalId,
      structuredId: listingBlock?.["@id"],
      canonicalUrl,
      pageUrl: reference.url,
    });

    // 2. Extração de Mídias
    const rawImageUrls: string[] = [];
    if (listingBlock?.image) {
      if (Array.isArray(listingBlock.image)) {
        for (const img of listingBlock.image) {
          if (typeof img === "string") rawImageUrls.push(img);
          else if (img?.url) rawImageUrls.push(img.url);
          else if (img?.contentUrl) rawImageUrls.push(img.contentUrl);
        }
      } else if (typeof listingBlock.image === "string") {
        rawImageUrls.push(listingBlock.image);
      } else if (listingBlock.image?.url) {
        rawImageUrls.push(listingBlock.image.url);
      }
    }

    if (tracking?.image && !rawImageUrls.includes(tracking.image)) {
      rawImageUrls.unshift(tracking.image);
    }

    if (rawImageUrls.length === 0) {
      rawImageUrls.push(...extractImageUrls(html, reference.url));
    }

    if (meta["og:image"]) rawImageUrls.push(meta["og:image"]);

    const images = filterListingImages(rawImageUrls, reference.url);

    // 3. Normalização de Título e Descrição
    const title =
      listingBlock?.name ||
      tracking?.title ||
      meta["og:title"] ||
      meta["page_title"] ||
      "Imóvel para Venda ou Locação";

    if (
      /\b\d+\s+imóveis?\s+(?:encontrados?|disponíveis?|para\s+você|na\s+busca|em\s+destaque)/i.test(title) ||
      /\bimóve(?:is|l)\s+encontrado/i.test(title) ||
      /\bresultados?\s+da\s+busca/i.test(title) ||
      /\bbusca\s+de\s+imóve/i.test(title)
    ) {
      throw new Error(`Página de listagem/filtro ignorada: "${title}"`);
    }

    const description = extractFullPropertyDescription(html, meta, listingBlock);

    // 4. Tipo de Transação e Tipo do Imóvel
    const transactionType =
      tracking?.transaction ||
      inferTransactionType(
        `${title} ${description} ${offers?.priceCurrency || ""} ${offers?.category || ""}`
      );

    const propertyType = inferPropertyType(
      `${tracking?.type || ""} ${listingBlock?.["@type"] || ""} ${title} ${listingBlock?.category || ""}`
    );

    // 5. Preços
    const rawPrice =
      parseCurrencyBrl(offers?.price || listingBlock?.price) ||
      (transactionType === "sale" ? tracking?.priceVenda : tracking?.priceAluguel);
    let price: number | undefined;
    let rentPrice: number | undefined;

    if (transactionType === "rent") {
      rentPrice = rawPrice;
    } else if (transactionType === "sale_or_rent") {
      price = rawPrice;
      rentPrice = parseCurrencyBrl(offers?.rentPrice) || tracking?.priceAluguel;
    } else {
      price = rawPrice;
    }

    // 6. Especificações
    const bedrooms =
      extractInteger(
        listingBlock?.numberOfBedrooms ??
          listingBlock?.numberOfRooms ??
          listingBlock?.bedrooms
      ) ?? tracking?.bedrooms;
    const bathrooms =
      extractInteger(
        listingBlock?.numberOfBathroomsTotal ??
          listingBlock?.numberOfBathrooms ??
          listingBlock?.bathrooms
      ) ?? tracking?.bathrooms;
    const suites = extractInteger(listingBlock?.numberOfSuites);
    const parkingSpaces = extractInteger(
      listingBlock?.parkingSpaces ??
        listingBlock?.numberOfParkingSpaces ??
        listingBlock?.garageSpaces
    );

    // 7. Áreas
    const usableArea =
      parseCurrencyBrl(
        listingBlock?.floorSize?.value ??
          listingBlock?.floorSize ??
          listingBlock?.livingArea?.value ??
          listingBlock?.livingArea
      ) || tracking?.area || undefined;

    const totalArea =
      parseCurrencyBrl(
        listingBlock?.totalArea?.value ??
          listingBlock?.totalArea ??
          listingBlock?.lotArea
      ) || undefined;

    // 8. Endereço
    let lat: number | undefined = geoBlock.latitude ? parseFloat(geoBlock.latitude) : undefined;
    let lng: number | undefined = geoBlock.longitude ? parseFloat(geoBlock.longitude) : undefined;
    let isApproximate = false;

    if (!lat || !lng) {
      const nextCoordsMatch = html.match(
        /(?<!broker(?:Address)?|agency|office|imobiliaria)[^\w]latitude\\*"?:\s*\\*"?(-?\d+\.\d+)\\*"?[\s\S]{1,60}?(?<!broker(?:Address)?|agency|office|imobiliaria)[^\w]longitude\\*"?:\s*\\*"?(-?\d+\.\d+)\\*"?/i
      );
      if (nextCoordsMatch) {
        const lVal = parseFloat(nextCoordsMatch[1]);
        const gVal = parseFloat(nextCoordsMatch[2]);
        if (lVal >= -35 && lVal <= 6 && gVal >= -75 && gVal <= -30) {
          lat = lVal;
          lng = gVal;
        }
      }
    }

    const exactMatch = html.match(/\\*"?showPropertyExactLocation\\*"?:\s*(true|false)/i);
    if (exactMatch && exactMatch[1] === "false") {
      isApproximate = true;
    }

    const street = addressBlock.streetAddress || undefined;
    const number = addressBlock.streetNumber || undefined;
    const isExact = !isApproximate && Boolean(street && number && number !== "0" && number !== "0000");

    const fromUrl = reference.url ? extractAddressFromUrl(reference.url) : {};
    const domLocationMatch = html.match(/<h[2345][^>]*>([^<>\n]+),\s*([^<>\n]+)\s*-\s*([A-Za-z]{2})<\/h[2345]>/i);

    const address: NormalizedAddress = {
      country: "Brasil",
      state:
        addressBlock.addressRegion ||
        tracking?.state ||
        (domLocationMatch ? domLocationMatch[3]?.trim().toUpperCase() : undefined) ||
        fromUrl.state ||
        "RS",
      city:
        addressBlock.addressLocality ||
        tracking?.city ||
        (domLocationMatch ? domLocationMatch[2]?.trim() : undefined) ||
        fromUrl.city,
      neighborhood:
        addressBlock.addressSublocality ||
        addressBlock.neighborhood ||
        tracking?.neighborhood ||
        (domLocationMatch ? domLocationMatch[1]?.trim() : undefined) ||
        fromUrl.neighborhood,
      street,
      number,
      postalCode: addressBlock.postalCode || undefined,
      latitude: lat,
      longitude: lng,
      addressVisible: isExact,
    };

    // 9. Características
    const features: string[] = [];
    if (Array.isArray(listingBlock?.amenityFeature)) {
      for (const f of listingBlock.amenityFeature) {
        const name = typeof f === "string" ? f : f?.name;
        if (name) features.push(String(name).trim());
      }
    }

    // 10. Data de Atualização na Origem
    const sourceUpdatedAt =
      reference.sourceUpdatedAtHint ||
      listingBlock?.dateModified ||
      listingBlock?.datePosted ||
      new Date().toISOString();

    // 11. Detecção de Imóvel Indisponível / Desativado / Vendido
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
      bathrooms: bathrooms ?? 0,
      suites: suites ?? 0,
      parkingSpaces: parkingSpaces ?? 0,
      usableArea,
      totalArea,
      address,
      images,
      features,
      sourceUpdatedAt,
      isUnavailable,
    };
  }

  private isPropertyUrl(url: string): boolean {
    return isListingDetailUrl(url);
  }

  private findBestJsonLdBlock(blocks: any[]): any {
    for (const b of blocks) {
      if (!b) continue;
      const type = String(b["@type"] || "").toLowerCase();
      if (
        type.includes("realestatelisting") ||
        type.includes("singlefamilyresidence") ||
        type.includes("house") ||
        type.includes("apartment") ||
        type.includes("product") ||
        type.includes("accommodation") ||
        type.includes("place")
      ) {
        return b;
      }
    }
    return blocks[0] || {};
  }

  private extractCodeFromText(text: string): string | null {
    const match = text.match(/(?:c[oó]d|ref|c[oó]digo)[:\s_-]*([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  }
}
