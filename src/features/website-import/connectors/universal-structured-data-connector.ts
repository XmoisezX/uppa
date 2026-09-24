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
    const maxListings = context.maxListings ?? 2000;
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

    if (meta["og:image"]) rawImageUrls.push(meta["og:image"]);

    const images = filterListingImages(rawImageUrls, reference.url);

    // 3. Normalização de Título e Descrição
    const title =
      listingBlock?.name ||
      meta["og:title"] ||
      meta["page_title"] ||
      "Imóvel para Venda ou Locação";

    const description = extractFullPropertyDescription(html, meta, listingBlock);

    // 4. Tipo de Transação e Tipo do Imóvel
    const transactionType = inferTransactionType(
      `${title} ${description} ${offers?.priceCurrency || ""} ${offers?.category || ""}`
    );

    const propertyType = inferPropertyType(
      `${listingBlock?.["@type"] || ""} ${title} ${listingBlock?.category || ""}`
    );

    // 5. Preços
    const rawPrice = parseCurrencyBrl(offers?.price || listingBlock?.price);
    let price: number | undefined;
    let rentPrice: number | undefined;

    if (transactionType === "rent") {
      rentPrice = rawPrice;
    } else if (transactionType === "sale_or_rent") {
      price = rawPrice;
      rentPrice = parseCurrencyBrl(offers?.rentPrice);
    } else {
      price = rawPrice;
    }

    // 6. Especificações
    const bedrooms = extractInteger(
      listingBlock?.numberOfBedrooms ??
        listingBlock?.numberOfRooms ??
        listingBlock?.bedrooms
    );
    const bathrooms = extractInteger(
      listingBlock?.numberOfBathroomsTotal ??
        listingBlock?.numberOfBathrooms ??
        listingBlock?.bathrooms
    );
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
      ) || undefined;

    const totalArea =
      parseCurrencyBrl(
        listingBlock?.totalArea?.value ??
          listingBlock?.totalArea ??
          listingBlock?.lotArea
      ) || undefined;

    // 8. Endereço
    let lat: number | undefined = geoBlock.latitude ? parseFloat(geoBlock.latitude) : undefined;
    let lng: number | undefined = geoBlock.longitude ? parseFloat(geoBlock.longitude) : undefined;

    if (!lat || !lng) {
      const latMatch = html.match(/(?:\\?"latitude\\?"|\\?"lat\\?"):\s*(-?\d+\.\d+)/i);
      const lngMatch = html.match(/(?:\\?"longitude\\?"|\\?"lng\\?"):\s*(-?\d+\.\d+)/i);
      if (latMatch && lngMatch) {
        const lVal = parseFloat(latMatch[1]);
        const gVal = parseFloat(lngMatch[1]);
        if (lVal >= -35 && lVal <= 6 && gVal >= -75 && gVal <= -30) {
          lat = lVal;
          lng = gVal;
        }
      }
    }

    const street = addressBlock.streetAddress || undefined;
    const number = addressBlock.streetNumber || undefined;
    const isExact = Boolean(street && number && number !== "0" && number !== "0000");

    const address: NormalizedAddress = {
      country: "Brasil",
      state: addressBlock.addressRegion || undefined,
      city: addressBlock.addressLocality || undefined,
      neighborhood:
        addressBlock.addressSublocality ||
        addressBlock.neighborhood ||
        undefined,
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
