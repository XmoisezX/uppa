/**
 * JetimobConnector
 * Conector dedicado de alta fidelidade para imobiliárias que utilizam o CRM Jetimob
 * baseado na arquitetura Next.js (com Flight data / React Server Components).
 *
 * Resolve problemas comuns em sites Jetimob:
 * 1. Preços em contratos Flight (em centavos) em vez do priceRange genérico da agência (R$ 5.000.000).
 * 2. Endereço completo estruturado (Bairro, Cidade, Estado, Coordenadas e Logradouro).
 * 3. Fotos em alta resolução hospedadas no CDN s01/s02.jetimgs.com.
 * 4. Características e comodidades (facilities e condominiumInfrastructure).
 * 5. Especificações completas (dormitórios, suítes, banheiros, vagas de garagem e áreas).
 */

import type { NormalizedProperty, NormalizedAddress, NormalizedMedia } from "@/types/feed";
import type { ConnectorContext, ListingReference } from "../types";
import type { WebsiteConnector } from "./connector.interface";
import { safeFetch } from "../security/ssrf-guard";
import {
  parseSitemapXml,
  inferTransactionType,
  inferPropertyType,
  extractAddressFromUrl,
} from "../utils/html-parser-utils";
import { filterListingImages } from "../utils/media-filter";
import { resolveWebsiteExternalId } from "../utils/external-id-resolver";

export class JetimobConnector implements WebsiteConnector {
  public readonly id = "jetimob";
  public readonly name = "Conector Jetimob CRM (Next.js)";

  /**
   * Avalia se este conector é adequado para o domínio informado
   */
  public async canHandle(context: ConnectorContext): Promise<boolean> {
    const sitemaps = context.sitemaps || [];
    const hasJetimobSitemap = sitemaps.some(
      (s) => s.includes("sitemap-imoveis.xml") || s.includes("jetimob")
    );
    if (hasJetimobSitemap) return true;

    if (
      context.domain.includes("jetimob") ||
      context.baseUrl.includes("jetimob")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Descobre todas as URLs de imóveis a partir do sitemap-imoveis.xml do Jetimob
   */
  public async discoverListings(
    context: ConnectorContext
  ): Promise<ListingReference[]> {
    const maxListings = context.maxListings ?? 10000;
    const discovered = new Map<string, ListingReference>();

    const targetSitemaps = new Set<string>();
    if (context.sitemaps && context.sitemaps.length > 0) {
      for (const s of context.sitemaps) targetSitemaps.add(s);
    }
    // Adiciona caminhos padrão do Jetimob
    targetSitemaps.add(`${context.baseUrl}/sitemap-imoveis.xml`);
    targetSitemaps.add(`${context.baseUrl}/sitemap.xml`);
    targetSitemaps.add(`${context.baseUrl}/sitemap_index.xml`);

    const queue = Array.from(targetSitemaps);
    const visited = new Set<string>();

    while (queue.length > 0 && discovered.size < maxListings) {
      const smUrl = queue.shift()!;
      if (visited.has(smUrl)) continue;
      visited.add(smUrl);

      try {
        const res = await safeFetch(smUrl, { timeoutMs: 12000 });
        if (!res.ok) continue;

        const xml = await res.text();
        const entries = parseSitemapXml(xml);

        for (const entry of entries) {
          if (entry.url.endsWith(".xml") && !visited.has(entry.url)) {
            // Se for sub-sitemap específico de imóveis, prioriza
            if (entry.url.includes("imovel") || entry.url.includes("imoveis")) {
              queue.unshift(entry.url);
            } else {
              queue.push(entry.url);
            }
          } else if (this.isJetimobListingUrl(entry.url)) {
            if (!discovered.has(entry.url)) {
              // O último segmento geralmente é o código
              const segments = entry.url.split("/").filter(Boolean);
              const externalIdHint = segments[segments.length - 1];

              discovered.set(entry.url, {
                url: entry.url,
                lastmod: entry.lastmod,
                sourceUpdatedAtHint: entry.lastmod,
                externalIdHint,
              });
            }
          }

          if (discovered.size >= maxListings) break;
        }
      } catch (err: any) {
        console.warn(`[JetimobConnector] Falha ao processar sitemap ${smUrl}:`, err?.message);
      }
    }

    return Array.from(discovered.values());
  }

  /**
   * Faz o download e parsing de um anúncio individual da Jetimob
   */
  public async fetchListing(
    reference: ListingReference,
    context: ConnectorContext
  ): Promise<NormalizedProperty> {
    const res = await safeFetch(reference.url, {
      timeoutMs: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      ...context.safeFetchOptions,
    });

    if (!res.ok) {
      throw new Error(`Falha HTTP ${res.status} ao acessar anúncio: ${reference.url}`);
    }

    const html = await res.text();

    // 1. Extrai Meta Tags (SEO / OpenGraph)
    const meta: Record<string, string> = {};
    const metaRegex = /<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi;
    let metaMatch: RegExpExecArray | null;
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      meta[metaMatch[1].toLowerCase()] = metaMatch[2];
    }

    // 2. Extrai e decodifica os blocos de Flight data do Next.js App Router
    const flightChunks: string[] = [];
    const flightRegex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
    let flightMatch: RegExpExecArray | null;
    while ((flightMatch = flightRegex.exec(html)) !== null) {
      flightChunks.push(flightMatch[1]);
    }

    const fullFlight = flightChunks
      .map((c) => {
        try {
          return JSON.parse(`"${c}"`);
        } catch {
          return c;
        }
      })
      .join("");

    // 3. Mapeia entidades Flight por identificador (<id>:<conteúdo>)
    const entityMap = new Map<string, string>();
    const lines = fullFlight.split("\n");
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0 && colonIdx < 10) {
        const id = line.substring(0, colonIdx);
        const content = line.substring(colonIdx + 1);
        entityMap.set(id, content);
      }
    }

    // Função auxiliar para resolver ponteiros no formato "$<id>"
    const resolveRef = (val: any): any => {
      if (typeof val === "string" && val.startsWith("$")) {
        const refId = val.substring(1);
        const raw = entityMap.get(refId);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return val;
    };

    // 4. Localiza a entidade principal do imóvel
    let propEntity: Record<string, any> | null = null;
    for (const content of entityMap.values()) {
      if (
        content.startsWith("{") &&
        content.includes('"bedrooms"') &&
        content.includes('"bathrooms"') &&
        content.includes('"contracts"')
      ) {
        try {
          propEntity = JSON.parse(content);
          break;
        } catch {}
      }
    }

    // 5. Código e Título
    let explicitCode = propEntity?.code;
    if (!explicitCode) {
      const codeMatch = fullFlight.match(/"code":"([^"]+)"/);
      if (codeMatch) explicitCode = codeMatch[1];
    }
    if (!explicitCode) {
      const segments = reference.url.split("/").filter(Boolean);
      explicitCode = segments[segments.length - 1];
    }

    const title =
      propEntity?.title ||
      meta["og:title"] ||
      this.extractTitleFromHtml(html) ||
      "Imóvel à Venda";

    // 6. Especificações (Quartos, banheiros, suítes, vagas)
    const bedrooms =
      typeof propEntity?.bedrooms === "number" ? propEntity.bedrooms : 0;
    const bathrooms =
      typeof propEntity?.bathrooms === "number" ? propEntity.bathrooms : 0;
    const suites =
      typeof propEntity?.suites === "number" ? propEntity.suites : 0;
    const parkingSpaces =
      typeof propEntity?.garage === "number" ? propEntity.garage : 0;

    // 7. Área (Útil / Total / Terreno)
    let usableArea: number | undefined;
    let totalArea: number | undefined;

    if (propEntity?.totalArea) {
      const areaObj = resolveRef(propEntity.totalArea);
      if (areaObj?.value && typeof areaObj.value === "number") {
        totalArea = areaObj.value;
      }
    }
    if (propEntity?.usefulArea) {
      const areaObj = resolveRef(propEntity.usefulArea);
      if (areaObj?.value && typeof areaObj.value === "number") {
        usableArea = areaObj.value;
      }
    }
    if (propEntity?.privateArea) {
      const areaObj = resolveRef(propEntity.privateArea);
      if (areaObj?.value && typeof areaObj.value === "number" && !usableArea) {
        usableArea = areaObj.value;
      }
    }
    if (!usableArea && totalArea) {
      usableArea = totalArea;
    }

    // 8. Endereço Completo
    let neighborhood: string | undefined;
    let city: string | undefined;
    let state: string | undefined;
    let street: string | undefined;
    let number: string | undefined;
    let postalCode: string | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (propEntity?.address) {
      const addr = resolveRef(propEntity.address);
      if (addr && typeof addr === "object") {
        neighborhood = addr.neighborhood || undefined;
        city = addr.city || undefined;
        state = addr.state || undefined;
        street = addr.street || undefined;
        number = addr.number || undefined;
        postalCode = addr.zipCode || undefined;

        if (addr.coordinate) {
          const coord = resolveRef(addr.coordinate);
          if (coord && typeof coord === "object") {
            if (typeof coord.latitude === "number") latitude = coord.latitude;
            if (typeof coord.longitude === "number") longitude = coord.longitude;
          }
        }
      }
    }

    // Fallback 1 de endereço: busca em todas as entidades Flight
    if (!neighborhood || !city) {
      for (const content of entityMap.values()) {
        if (
          content.includes('"neighborhood"') &&
          content.includes('"city"') &&
          content.includes('"state"')
        ) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.neighborhood || parsed.city) {
              neighborhood = neighborhood || parsed.neighborhood || undefined;
              city = city || parsed.city || undefined;
              state = state || parsed.state || undefined;
              break;
            }
          } catch {}
        }
      }
    }

    // Fallback 2 de endereço: extração via slug URL Jetimob (-bairro-{b}-em-{c})
    if (!neighborhood || !city) {
      const fromUrl = extractAddressFromUrl(reference.url);
      neighborhood = neighborhood || fromUrl.neighborhood;
      city = city || fromUrl.city;
      state = state || fromUrl.state;
    }

    const address: NormalizedAddress = {
      country: "Brasil",
      state: state || "RS",
      city: city || "Pelotas",
      neighborhood: neighborhood || undefined,
      street: street || undefined,
      number: number || undefined,
      postalCode: postalCode || undefined,
      latitude,
      longitude,
    };

    // 9. Preços reais dos contratos (em centavos no Jetimob)
    let price: number | undefined;
    let rentPrice: number | undefined;

    if (propEntity?.contracts) {
      const contracts = resolveRef(propEntity.contracts);
      if (Array.isArray(contracts)) {
        for (const cRef of contracts) {
          const contract = resolveRef(cRef);
          if (contract && contract.price) {
            const priceObj = resolveRef(contract.price);
            if (priceObj && typeof priceObj.value === "number") {
              // Valores no Flight da Jetimob estão em centavos (ex: 240000000 = 2.400.000)
              const realVal =
                priceObj.value > 100000 ? priceObj.value / 100 : priceObj.value;
              if (realVal >= 10000 && !price) {
                price = realVal;
              } else if (realVal < 10000 && !rentPrice) {
                rentPrice = realVal;
              }
            }
          }
        }
      }
    }

    // Fallback de preços se não veio em propEntity.contracts
    if (!price && !rentPrice) {
      for (const content of entityMap.values()) {
        if (
          content.includes('"currency"') &&
          content.includes('"value"') &&
          !content.includes('"priceRange"')
        ) {
          try {
            const valObj = JSON.parse(content);
            if (valObj.value && typeof valObj.value === "number") {
              const realValue =
                valObj.value > 100000 ? valObj.value / 100 : valObj.value;
              if (realValue >= 10000 && !price) {
                price = realValue;
              } else if (realValue < 10000 && !rentPrice) {
                rentPrice = realValue;
              }
            }
          } catch {}
        }
      }
    }

    // Fallback via regex no título (excluindo priceRange)
    if (!price && !rentPrice) {
      const titlePriceMatch = title.match(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/i);
      if (titlePriceMatch) {
        const cleanVal = parseFloat(
          titlePriceMatch[1].replace(/\./g, "").replace(",", ".")
        );
        if (cleanVal >= 10000) price = cleanVal;
        else rentPrice = cleanVal;
      }
    }

    // 10. Tipo de Transação e Tipo do Imóvel
    const transactionType = inferTransactionType(
      `${title} ${reference.url} ${price ? "venda" : ""} ${rentPrice ? "aluguel" : ""}`
    );
    const propertyType = inferPropertyType(
      `${propEntity?.type || ""} ${title} ${reference.url}`
    );

    // 11. Características / Comodidades (facilities e condominiumInfrastructure)
    const featuresSet = new Set<string>();
    if (propEntity?.facilities) {
      const facs = resolveRef(propEntity.facilities);
      if (Array.isArray(facs)) {
        for (const fRef of facs) {
          const item = resolveRef(fRef);
          if (item?.label) featuresSet.add(item.label.trim());
        }
      }
    }
    if (propEntity?.condominiumInfrastructure) {
      const infra = resolveRef(propEntity.condominiumInfrastructure);
      if (Array.isArray(infra)) {
        for (const fRef of infra) {
          const item = resolveRef(fRef);
          if (item?.label) featuresSet.add(item.label.trim());
        }
      }
    }

    // 12. Fotos e Mídias (CDN jetimgs.com)
    const rawImages: string[] = [];
    if (propEntity?.images) {
      const imgs = resolveRef(propEntity.images);
      if (Array.isArray(imgs)) {
        for (const imgRef of imgs) {
          const imgObj = resolveRef(imgRef);
          if (imgObj?.src) rawImages.push(imgObj.src);
        }
      }
    }

    // Complementa com todas as URLs do jetimgs.com encontradas no payload/HTML
    const allJetimgs =
      (html + fullFlight).match(
        /https:\/\/[^"'\s<>\\]+?jetimgs\.com\/[^"'\s<>\\]+/g
      ) || [];
    for (const imgUrl of allJetimgs) {
      const cleanUrl = imgUrl.replace(/\\$/, "");
      if (
        !cleanUrl.includes("favicon") &&
        !cleanUrl.includes("submarca") &&
        !cleanUrl.includes("logo") &&
        !cleanUrl.includes("icon") &&
        !cleanUrl.includes("avatar")
      ) {
        rawImages.push(cleanUrl);
      }
    }

    // Deduplica fotos por hash / nome base do arquivo
    const seenFilenames = new Set<string>();
    const deduplicatedUrls: string[] = [];
    for (const img of rawImages) {
      const filename = img.split("/").pop() || img;
      if (!seenFilenames.has(filename)) {
        seenFilenames.add(filename);
        deduplicatedUrls.push(img);
      }
    }

    const images: NormalizedMedia[] = filterListingImages(
      deduplicatedUrls,
      reference.url
    );

    // 13. Descrição
    const description =
      meta["description"] ||
      meta["og:description"] ||
      this.extractDescriptionFromHtml(html) ||
      `${title} localizado no bairro ${neighborhood || "Centro"} em ${city || "Pelotas"}.`;

    // 14. Resolução de External ID consistente
    const canonicalUrl = meta["canonical"] || reference.url;
    const externalId = resolveWebsiteExternalId({
      explicitCode,
      canonicalUrl,
      pageUrl: reference.url,
    });

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
      bedrooms,
      bathrooms,
      suites,
      parkingSpaces,
      usableArea,
      totalArea,
      address,
      images,
      features: Array.from(featuresSet),
      sourceUpdatedAt: reference.lastmod || new Date().toISOString(),
      isUnavailable: false,
    };
  }

  private isJetimobListingUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return (
      lower.includes("/imovel/") &&
      !lower.includes("/imoveis/") &&
      !lower.endsWith("/imoveis") &&
      !lower.endsWith("/imovel")
    );
  }

  private extractTitleFromHtml(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].replace(/\s*\|\s*.*$/, "").trim();
    }
    return undefined;
  }

  private extractDescriptionFromHtml(html: string): string | undefined {
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    return descMatch ? descMatch[1].trim() : undefined;
  }
}
