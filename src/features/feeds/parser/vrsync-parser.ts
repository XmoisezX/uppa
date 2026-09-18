/**
 * VRSyncParser - Parser puro em memória para feeds no padrão VRSync / XML
 * Conforme Seção 27 do MASTER_PLAN:
 * "Nunca deixar o parser escrever diretamente no banco. Criar tipo intermediário NormalizedProperty."
 */

import type {
  NormalizedProperty,
  NormalizedAddress,
  NormalizedMedia,
} from "@/types/feed";
import type { PropertyType, TransactionType, MediaType } from "@/types/property";

export interface ParseResult {
  properties: NormalizedProperty[];
  parseErrors: {
    externalId?: string;
    errorType: string;
    message: string;
    payload?: any;
  }[];
}

export class VRSyncParser {
  /**
   * Converte uma string XML no formato VRSync/VivaReal/ZAP para uma lista de NormalizedProperty
   */
  public parse(xmlString: string): ParseResult {
    const properties: NormalizedProperty[] = [];
    const parseErrors: ParseResult["parseErrors"] = [];

    if (!xmlString || typeof xmlString !== "string" || xmlString.trim().length === 0) {
      parseErrors.push({
        errorType: "xml_syntax",
        message: "O payload XML fornecido está vazio ou inválido.",
      });
      return { properties, parseErrors };
    }

    // 1. Extrair blocos de imóveis (<Listing>...</Listing> ou <Imovel>...</Imovel>)
    const listingMatches = this.extractElements(xmlString, ["Listing", "Imovel"]);

    if (listingMatches.length === 0) {
      parseErrors.push({
        errorType: "xml_syntax",
        message: "Nenhuma tag <Listing> ou <Imovel> foi encontrada no feed XML.",
      });
      return { properties, parseErrors };
    }

    for (const listingXml of listingMatches) {
      try {
        const normalized = this.parseSingleListing(listingXml);
        properties.push(normalized);
      } catch (err: any) {
        // Extrai código do imóvel se possível para registrar o erro pontual
        const extId =
          this.getTagValue(listingXml, "ListingID") ||
          this.getTagValue(listingXml, "CodigoImovel") ||
          undefined;

        parseErrors.push({
          externalId: extId,
          errorType: "validation_error",
          message: err?.message || "Erro desconhecido ao processar imóvel no XML",
          payload: { snippet: listingXml.substring(0, 300) },
        });
      }
    }

    return { properties, parseErrors };
  }

  /**
   * Processa uma única tag de imóvel
   */
  private parseSingleListing(xml: string): NormalizedProperty {
    // 1. Identificador Externo
    const externalId =
      this.getTagValue(xml, "ListingID") ||
      this.getTagValue(xml, "CodigoImovel") ||
      this.getTagValue(xml, "ID");

    if (!externalId) {
      throw new Error("Imóvel sem identificador único (ListingID ou CodigoImovel ausente).");
    }

    // 2. Título e Descrição
    const title =
      this.getTagValue(xml, "Title") ||
      this.getTagValue(xml, "Titulo") ||
      `Imóvel ${externalId}`;

    const description =
      this.getTagValue(xml, "Description") ||
      this.getTagValue(xml, "Descricao") ||
      undefined;

    // 3. Transação e Tipo
    const rawTxType =
      this.getTagValue(xml, "TransactionType") ||
      this.getTagValue(xml, "Pretencao") ||
      "sale";
    const transactionType = this.normalizeTransactionType(rawTxType);

    const rawPropType =
      this.getTagValue(xml, "PropertyType") ||
      this.getTagValue(xml, "TipoImovel") ||
      "apartment";
    const propertyType = this.normalizePropertyType(rawPropType);

    // 4. Valores Financeiros
    const price = this.parseOptionalDecimal(
      this.getTagValue(xml, "ListPrice") || this.getTagValue(xml, "PrecoVenda")
    );
    const rentPrice = this.parseOptionalDecimal(
      this.getTagValue(xml, "RentalPrice") || this.getTagValue(xml, "PrecoLocacao")
    );
    const condominiumFee = this.parseOptionalDecimal(
      this.getTagValue(xml, "PropertyAdministrationFee") ||
        this.getTagValue(xml, "Condominio")
    );
    const iptu = this.parseOptionalDecimal(
      this.getTagValue(xml, "YearlyTax") || this.getTagValue(xml, "IPTU")
    );

    // Validação de preço
    if (transactionType === "sale" && !price) {
      throw new Error(`Imóvel para venda sem preço definido (ListingID: ${externalId}).`);
    }
    if (transactionType === "rent" && !rentPrice) {
      throw new Error(`Imóvel para locação sem preço de aluguel (ListingID: ${externalId}).`);
    }
    if (transactionType === "sale_or_rent" && !price && !rentPrice) {
      throw new Error(`Imóvel para venda/locação sem preço de venda ou locação definido (ListingID: ${externalId}).`);
    }

    // 5. Características Básicas / Detalhes (campos ausentes retornam undefined/0 seguro)
    const bedrooms = this.parseOptionalInteger(
      this.getTagValue(xml, "Bedrooms") || this.getTagValue(xml, "Quartos")
    );
    const bathrooms = this.parseOptionalInteger(
      this.getTagValue(xml, "Bathrooms") || this.getTagValue(xml, "Banheiros")
    );
    const suites = this.parseOptionalInteger(
      this.getTagValue(xml, "Suites")
    );
    const parkingSpaces = this.parseOptionalInteger(
      this.getTagValue(xml, "Garage") ||
        this.getTagValue(xml, "Garagem") ||
        this.getTagValue(xml, "Vagas")
    );

    const usableArea = this.parseOptionalDecimal(
      this.getTagValue(xml, "LivingArea") ||
        this.getTagValue(xml, "UsableArea") ||
        this.getTagValue(xml, "AreaUtil")
    );
    const totalArea = this.parseOptionalDecimal(
      this.getTagValue(xml, "TotalArea") || this.getTagValue(xml, "AreaTotal")
    );
    const lotArea = this.parseOptionalDecimal(
      this.getTagValue(xml, "LotArea") || this.getTagValue(xml, "AreaTerreno")
    );

    // 6. Localização
    const address = this.parseLocation(xml);

    // 7. Fotos e Mídias
    const images = this.parseMedia(xml);

    // 8. Features / Diferenciais
    const features = this.parseFeatures(xml);

    // 9. Data de atualização na origem
    const rawUpdated =
      this.getTagValue(xml, "LastUpdate") ||
      this.getTagValue(xml, "DataAtualizacao");
    let sourceUpdatedAt: Date | undefined = undefined;
    if (rawUpdated) {
      const parsedDate = new Date(rawUpdated);
      if (!isNaN(parsedDate.getTime())) {
        sourceUpdatedAt = parsedDate;
      }
    }

    return {
      externalId,
      title,
      description,
      transactionType,
      propertyType,
      price,
      rentPrice,
      condominiumFee,
      iptu,
      bedrooms,
      bathrooms,
      suites,
      parkingSpaces,
      usableArea,
      totalArea,
      lotArea,
      address,
      images,
      features,
      sourceUpdatedAt,
    };
  }

  /**
   * Extrai e normaliza endereço
   */
  private parseLocation(xml: string): NormalizedAddress {
    const locBlock =
      this.extractSubBlock(xml, "Location") ||
      this.extractSubBlock(xml, "Localizacao") ||
      xml;

    // Estado: pode vir com atributo abbreviation="SP" ou texto "São Paulo"
    let state = this.getTagAttribute(locBlock, "State", "abbreviation");
    if (!state) {
      state = this.getTagValue(locBlock, "State") || this.getTagValue(locBlock, "Estado");
    }

    const city =
      this.getTagValue(locBlock, "City") || this.getTagValue(locBlock, "Cidade");
    const neighborhood =
      this.getTagValue(locBlock, "Neighborhood") ||
      this.getTagValue(locBlock, "Bairro");
    const street =
      this.getTagValue(locBlock, "Address") ||
      this.getTagValue(locBlock, "Logradouro") ||
      this.getTagValue(locBlock, "Rua");
    const number =
      this.getTagValue(locBlock, "StreetNumber") ||
      this.getTagValue(locBlock, "Numero");
    const complement =
      this.getTagValue(locBlock, "Complement") ||
      this.getTagValue(locBlock, "Complemento");
    const postalCode =
      this.getTagValue(locBlock, "PostalCode") ||
      this.getTagValue(locBlock, "CEP");

    const latRaw =
      this.getTagValue(locBlock, "Latitude") || this.getTagValue(locBlock, "Lat");
    const lngRaw =
      this.getTagValue(locBlock, "Longitude") || this.getTagValue(locBlock, "Lng");

    const parsedLat = this.parseOptionalDecimal(latRaw);
    const parsedLng = this.parseOptionalDecimal(lngRaw);

    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;

    // Coordenadas válidas: ambas definidas, numéricas, diferentes de (0, 0) e dentro dos limites terrestres
    if (
      parsedLat !== undefined &&
      parsedLng !== undefined &&
      !(parsedLat === 0 && parsedLng === 0) &&
      Math.abs(parsedLat) <= 90 &&
      Math.abs(parsedLng) <= 180
    ) {
      latitude = parsedLat;
      longitude = parsedLng;
    }

    return {
      country: "Brasil",
      state: state || undefined,
      city: city || undefined,
      neighborhood: neighborhood || undefined,
      street: street || undefined,
      number: number || undefined,
      complement: complement || undefined,
      postalCode: postalCode ? postalCode.replace(/\D/g, "") : undefined,
      latitude,
      longitude,
    };
  }

  /**
   * Extrai itens de mídia
   */
  private parseMedia(xml: string): NormalizedMedia[] {
    const mediaBlock =
      this.extractSubBlock(xml, "Media") ||
      this.extractSubBlock(xml, "Fotos") ||
      "";
    if (!mediaBlock) return [];

    const items: NormalizedMedia[] = [];

    // Formato VRSync: <Item medium="image" caption="...">https://...</Item>
    const itemRegex = /<Item\b([^>]*)>([\s\S]*?)<\/Item>/gi;
    let match;
    let index = 0;
    while ((match = itemRegex.exec(mediaBlock)) !== null) {
      const attrs = match[1];
      const content = this.cleanCData(match[2]).trim();

      if (content && content.startsWith("http")) {
        const captionMatch = attrs.match(/caption="([^"]*)"/i);
        const isPrimaryMatch = attrs.match(/primary="(true|1)"/i);

        items.push({
          type: "image",
          url: content,
          caption: captionMatch ? captionMatch[1] : undefined,
          isCover: isPrimaryMatch ? true : index === 0,
        });
        index++;
      }
    }

    // Formato alternativo simples: <Foto>https://...</Foto>
    if (items.length === 0) {
      const fotoMatches = this.extractElements(mediaBlock, ["Foto", "URL"]);
      fotoMatches.forEach((url, i) => {
        const cleaned = this.cleanCData(url).trim();
        if (cleaned.startsWith("http")) {
          items.push({
            type: "image",
            url: cleaned,
            isCover: i === 0,
          });
        }
      });
    }

    return items;
  }

  /**
   * Extrai lista de características
   */
  private parseFeatures(xml: string): string[] {
    const featBlock =
      this.extractSubBlock(xml, "Features") ||
      this.extractSubBlock(xml, "Caracteristicas") ||
      "";
    if (!featBlock) return [];

    const rawFeatures = this.extractElements(featBlock, [
      "Feature",
      "Caracteristica",
      "Item",
    ]);

    return rawFeatures
      .map((f) => this.cleanCData(f).trim())
      .filter((f) => f.length > 0);
  }

  // ==========================================
  // HELPERS DE NORMALIZAÇÃO E REGEX
  // ==========================================

  public normalizeTransactionType(val: string): TransactionType {
    const s = val.toLowerCase().trim();
    if (
      (s.includes("sale") && s.includes("rent")) ||
      (s.includes("vend") && s.includes("alug")) ||
      (s.includes("vend") && s.includes("loca")) ||
      s.includes("sale/rent") ||
      s.includes("sale_or_rent")
    ) {
      return "sale_or_rent";
    }
    if (s.includes("rent") || s.includes("loca") || s.includes("alug")) {
      return "rent";
    }
    if (s.includes("sale") || s.includes("vend")) {
      return "sale";
    }
    return "sale";
  }

  public normalizePropertyType(val: string): PropertyType {
    if (!val) return "other";
    const s = val.toLowerCase().trim();

    // Apartamentos, studios, lofts e coberturas
    if (s.includes("cobertura") || s.includes("penthouse")) return "penthouse";
    if (s.includes("kitnet") || s.includes("kitchenette")) return "kitnet";
    if (s.includes("loft")) return "loft";
    if (s.includes("studio")) return "studio";
    if (s.includes("apart") || s.includes("flat") || s.includes("edificio residencial")) return "apartment";

    // Casas, sobrados e condomínios fechados
    if (s.includes("condo") || s.includes("fechado")) return "condo_house";
    if (s.includes("sobrado") || s.includes("townhouse") || s.includes("village house")) return "townhouse";
    if (s.includes("casa") || s.includes("home") || s.includes("residential / home")) return "house";

    // Terrenos e lotes
    if (s.includes("terreno") || s.includes("lote") || s.includes("land") || s.includes("lot")) return "land";

    // Rurais e fazendas
    if (s.includes("fazenda") || s.includes("sitio") || s.includes("chacara") || s.includes("farm") || s.includes("ranch")) return "farm";
    if (s.includes("rural") || s.includes("agricultural")) return "rural";

    // Comerciais, galpões e salas
    if (s.includes("galpao") || s.includes("deposito") || s.includes("warehouse") || s.includes("industrial")) return "warehouse";
    if (s.includes("sala") || s.includes("office") || s.includes("escritorio") || s.includes("edificio comercial")) return "office";
    if (
      s.includes("comercial") ||
      s.includes("commercial") ||
      s.includes("building") ||
      s.includes("business") ||
      s.includes("hotel") ||
      s.includes("pousada")
    ) {
      return "commercial";
    }

    console.warn(`[VRSyncParser] Tipo de imóvel não mapeado diretamente: "${val}". Mapeado para fallback "other".`);
    return "other";
  }

  public parseOptionalInteger(val: string | number | null | undefined): number | undefined {
    if (val === null || val === undefined) return undefined;
    const str = String(val).trim();
    if (!str) return undefined;
    const clean = str.replace(/[^\d-]/g, "");
    if (!clean || clean === "-") return undefined;
    const num = parseInt(clean, 10);
    return isNaN(num) ? undefined : num;
  }

  public parseOptionalDecimal(val: string | number | null | undefined): number | undefined {
    if (val === null || val === undefined) return undefined;
    const str = String(val).trim();
    if (!str) return undefined;
    let clean = str.replace(/[^\d.,-]/g, "");
    if (!clean || clean === "-") return undefined;

    // Trata formatos com separadores de milhar e decimais mistos (ex: 1.200.000,00 ou 1,200.00)
    if (clean.includes(",") && clean.includes(".")) {
      if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
        clean = clean.replace(/\./g, "").replace(",", ".");
      } else {
        clean = clean.replace(/,/g, "");
      }
    } else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }

    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  private parseNumeric(val: string | null): number | undefined {
    return this.parseOptionalDecimal(val);
  }

  private parseIntSafe(val: string | null): number {
    return this.parseOptionalInteger(val) ?? 0;
  }

  private extractElements(xml: string, tagNames: string[]): string[] {
    const results: string[] = [];
    for (const tag of tagNames) {
      const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
      let m;
      while ((m = regex.exec(xml)) !== null) {
        results.push(m[1]);
      }
    }
    return results;
  }

  private extractSubBlock(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private getTagValue(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = xml.match(regex);
    if (!match) return null;
    return this.cleanCData(match[1]).trim();
  }

  private getTagAttribute(xml: string, tagName: string, attrName: string): string | null {
    const regex = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}="([^"]*)"`, "i");
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private cleanCData(val: string): string {
    return val
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private parseNumeric(val: string | null): number | undefined {
    if (!val) return undefined;
    const clean = val.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  private parseIntSafe(val: string | null): number {
    if (!val) return 0;
    const clean = val.replace(/\D/g, "");
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  }
}
