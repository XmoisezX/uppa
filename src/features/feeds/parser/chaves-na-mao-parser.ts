/**
 * ChavesNaMaoParser - Parser puro em memória para feeds XML no padrão Chaves na Mão
 * Conforme MASTER_PLAN.md e especificações do projeto:
 * - Não acoplado ao VRSyncParser.
 * - Produz NormalizedProperty idêntico ao exigido pelo PropertyImporter.
 * - Utiliza <referencia> como externalId obrigatório.
 * - Falhas individuais não interrompem o lote de importação.
 */

import type {
  NormalizedProperty,
  NormalizedAddress,
  NormalizedMedia,
} from "@/types/feed";
import type { PropertyType, TransactionType } from "@/types/property";

export interface ParseResult {
  properties: NormalizedProperty[];
  parseErrors: {
    externalId?: string;
    errorType: string;
    message: string;
    payload?: any;
  }[];
}

export class ChavesNaMaoParser {
  /**
   * Converte o XML no formato Chaves na Mão para uma lista de NormalizedProperty
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

    // 1. Extrair blocos de imóveis (<imovel>...</imovel>)
    const imovelMatches = this.extractElements(xmlString, ["imovel"]);

    if (imovelMatches.length === 0) {
      parseErrors.push({
        errorType: "xml_syntax",
        message: "Nenhuma tag <imovel> foi encontrada no feed XML do Chaves na Mão.",
      });
      return { properties, parseErrors };
    }

    for (const imovelXml of imovelMatches) {
      // Extrai código de referência prioritariamente para rastreio seguro
      const ref = this.getTagValue(imovelXml, "referencia") || undefined;

      try {
        const normalized = this.parseSingleImovel(imovelXml, ref);
        properties.push(normalized);
      } catch (err: any) {
        parseErrors.push({
          externalId: ref,
          errorType: "validation_error",
          message: err?.message || "Erro desconhecido ao processar imóvel no XML do Chaves na Mão",
          payload: { snippet: imovelXml.substring(0, 300) },
        });
      }
    }

    return { properties, parseErrors };
  }

  /**
   * Processa uma única tag <imovel>
   */
  private parseSingleImovel(xml: string, ref?: string): NormalizedProperty {
    // 1. Identificador obrigatório do Chaves na Mão: <referencia>
    const externalId = ref || this.getTagValue(xml, "referencia");
    if (!externalId) {
      throw new Error("Imóvel sem identificador único (tag <referencia> ausente ou vazia).");
    }

    const code = this.getTagValue(xml, "codigo_cliente") || undefined;
    const sourceUrl = this.getTagValue(xml, "link_cliente") || undefined;

    // 2. Título e Descrição
    const title = this.getTagValue(xml, "titulo") || `Imóvel ${externalId}`;
    const description = this.getTagValue(xml, "descritivo") || undefined;

    // 3. Transação: V = venda, L = locação, transacao2 para ambos
    const tx1 = (this.getTagValue(xml, "transacao") || "").toUpperCase().trim();
    const tx2 = (this.getTagValue(xml, "transacao2") || "").toUpperCase().trim();
    const transactionType = this.normalizeTransactionType(tx1, tx2);

    // 4. Valores Financeiros
    let price = this.parseOptionalDecimal(this.getTagValue(xml, "valor"));
    let rentPrice = this.parseOptionalDecimal(this.getTagValue(xml, "valor_locacao"));
    const condominiumFee = this.parseOptionalDecimal(this.getTagValue(xml, "valor_condominio"));
    const iptu = this.parseOptionalDecimal(this.getTagValue(xml, "valor_iptu"));

    // No padrão Chaves na Mão, quando transacao é locação (L), o valor do aluguel
    // frequentemente vem na tag genérica <valor> quando <valor_locacao> não é preenchida
    if (transactionType === "rent") {
      if ((!rentPrice || rentPrice <= 0) && price && price > 0) {
        rentPrice = price;
        price = undefined;
      }
    } else if (transactionType === "sale_or_rent") {
      // Se for venda e locação simultânea e rentPrice não estiver explícito mas price estiver:
      // se houver valor, mantém price; se houver valor_locacao, mantém rentPrice.
      if (!rentPrice && this.getTagValue(xml, "valor_locacao")) {
        rentPrice = this.parseOptionalDecimal(this.getTagValue(xml, "valor_locacao"));
      }
    }

    // Validação de consistência financeira conforme a transação
    if (transactionType === "sale" && (!price || price <= 0)) {
      throw new Error(`Imóvel para venda sem preço válido definido (referência: ${externalId}).`);
    }
    if (transactionType === "rent" && (!rentPrice || rentPrice <= 0)) {
      throw new Error(`Imóvel para locação sem preço de aluguel válido definido (referência: ${externalId}).`);
    }
    if (transactionType === "sale_or_rent" && (!price || price <= 0) && (!rentPrice || rentPrice <= 0)) {
      throw new Error(`Imóvel para venda/locação sem preço de venda ou locação definido (referência: ${externalId}).`);
    }

    // 5. Tipo de Imóvel (<tipo> e <tipo2>)
    const rawType = this.getTagValue(xml, "tipo") || "";
    const rawType2 = this.getTagValue(xml, "tipo2") || "";
    const propertyType = this.normalizePropertyType(rawType || rawType2);

    // 6. Dimensões e Áreas
    const usableArea = this.parseOptionalDecimal(this.getTagValue(xml, "area_util"));
    const totalArea = this.parseOptionalDecimal(this.getTagValue(xml, "area_total"));

    // 7. Cômodos e Vagas
    const bedrooms = this.parseOptionalInteger(this.getTagValue(xml, "quartos"));
    const suites = this.parseOptionalInteger(this.getTagValue(xml, "suites"));
    const parkingSpaces = this.parseOptionalInteger(this.getTagValue(xml, "garagem"));
    const bathrooms = this.parseOptionalInteger(this.getTagValue(xml, "banheiro"));

    // 8. Endereço e Localização
    const address = this.parseLocation(xml);

    // 9. Fotos e Mídias
    const images = this.parseMedia(xml);

    // 10. Características (Áreas comum/privativa e flags adicionais)
    const features = this.parseFeatures(xml);

    // 11. Data de Atualização
    const rawUpdated = this.getTagValue(xml, "data_atualizacao");
    let sourceUpdatedAt: Date | undefined = undefined;
    if (rawUpdated) {
      const parsed = new Date(rawUpdated);
      if (!isNaN(parsed.getTime())) {
        sourceUpdatedAt = parsed;
      }
    }

    return {
      externalId,
      code,
      sourceUrl,
      title,
      description,
      transactionType,
      propertyType,
      price: price && price > 0 ? price : undefined,
      rentPrice: rentPrice && rentPrice > 0 ? rentPrice : undefined,
      condominiumFee: condominiumFee && condominiumFee > 0 ? condominiumFee : undefined,
      iptu: iptu && iptu > 0 ? iptu : undefined,
      bedrooms,
      bathrooms,
      suites,
      parkingSpaces,
      usableArea,
      totalArea,
      address,
      images,
      features,
      sourceUpdatedAt,
    };
  }

  /**
   * Extrai e normaliza endereço do padrão Chaves na Mão
   */
  private parseLocation(xml: string): NormalizedAddress {
    let state = this.getTagValue(xml, "estado");
    if (state) {
      const upper = state.trim().toUpperCase();
      // Normalização de erro comum no feed: 'RI' referente a Rio Grande do Sul (Pelotas/RS)
      if (upper === "RI" || upper === "RIO GRANDE DO SUL") {
        state = "RS";
      } else {
        state = upper;
      }
    }

    const city = this.getTagValue(xml, "cidade") || undefined;
    const neighborhood = this.getTagValue(xml, "bairro") || undefined;
    const street = this.getTagValue(xml, "endereco") || undefined;
    const number = this.getTagValue(xml, "numero") || undefined;
    const complement = this.getTagValue(xml, "complemento") || undefined;
    const cepRaw = this.getTagValue(xml, "cep");
    const postalCode = cepRaw ? cepRaw.replace(/\D/g, "") : undefined;

    const latRaw = this.parseOptionalDecimal(this.getTagValue(xml, "latitude"));
    const lngRaw = this.parseOptionalDecimal(this.getTagValue(xml, "longitude"));

    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;

    if (
      latRaw !== undefined &&
      lngRaw !== undefined &&
      !(latRaw === 0 && lngRaw === 0) &&
      Math.abs(latRaw) <= 90 &&
      Math.abs(lngRaw) <= 180
    ) {
      latitude = latRaw;
      longitude = lngRaw;
    }

    return {
      country: "Brasil",
      state,
      city,
      neighborhood,
      street,
      number,
      complement,
      postalCode,
      latitude,
      longitude,
    };
  }

  /**
   * Extrai fotos de <fotos_imovel><foto><url>...</url></foto></fotos_imovel>
   */
  private parseMedia(xml: string): NormalizedMedia[] {
    const items: NormalizedMedia[] = [];

    const fotosContainer = this.extractSubBlock(xml, "fotos_imovel");
    if (fotosContainer) {
      const fotoNodes = this.extractElements(fotosContainer, ["foto"]);
      fotoNodes.forEach((fNode, index) => {
        const url = this.getTagValue(fNode, "url");
        if (url && url.startsWith("http")) {
          items.push({
            type: "image",
            url,
            isCover: index === 0,
          });
        }
      });
    }

    // Suporte a vídeo (<video>)
    const videoUrl = this.getTagValue(xml, "video");
    if (videoUrl && videoUrl.startsWith("http")) {
      items.push({
        type: "video",
        url: videoUrl,
        isCover: false,
      });
    }

    // Suporte a Tour 360 (<tour_360>)
    const tourUrl = this.getTagValue(xml, "tour_360");
    if (tourUrl && tourUrl.startsWith("http")) {
      items.push({
        type: "virtual_tour",
        url: tourUrl,
        isCover: false,
      });
    }

    return items;
  }

  /**
   * Extrai características de <area_comum>, <area_privativa> e tags booleanas
   */
  private parseFeatures(xml: string): string[] {
    const featuresSet = new Set<string>();

    // 1. Áreas comuns: <area_comum><item>...</item></area_comum>
    const areaComumBlock = this.extractSubBlock(xml, "area_comum");
    if (areaComumBlock) {
      const items = this.extractElements(areaComumBlock, ["item"]);
      for (const it of items) {
        const cleaned = this.cleanCData(it).trim();
        if (cleaned) featuresSet.add(cleaned);
      }
    }

    // 2. Áreas privativas: <area_privativa><item>...</item></area_privativa>
    const areaPrivativaBlock = this.extractSubBlock(xml, "area_privativa");
    if (areaPrivativaBlock) {
      const items = this.extractElements(areaPrivativaBlock, ["item"]);
      for (const it of items) {
        const cleaned = this.cleanCData(it).trim();
        if (cleaned) featuresSet.add(cleaned);
      }
    }

    // 3. Flags individuais presentes no XML do Chaves na Mão
    const flagMappings: Record<string, string> = {
      aceita_pet: "Aceita Pet",
      aceita_troca: "Aceita Permuta / Troca",
      lareira: "Lareira",
      varanda: "Varanda",
      closet: "Closet",
      lavanderia: "Lavanderia",
      area_servico: "Área de Serviço",
      despensa: "Despensa",
      escritorio: "Escritório",
      bar: "Bar",
      quarto_empregada: "Dependência de Empregada",
      churrasqueira: "Churrasqueira",
      piscina: "Piscina",
      ar_condicionado: "Ar Condicionado",
      elevador: "Elevador",
      academia: "Academia",
      salao_festas: "Salão de Festas",
    };

    for (const [tag, label] of Object.entries(flagMappings)) {
      const val = this.getTagValue(xml, tag);
      if (val === "1" || val?.toLowerCase() === "true" || val?.toLowerCase() === "sim") {
        featuresSet.add(label);
      }
    }

    return Array.from(featuresSet);
  }

  /**
   * Normalização de tipo de transação (V = venda, L = locação)
   */
  public normalizeTransactionType(tx1: string, tx2: string): TransactionType {
    const t1 = tx1.toUpperCase().trim();
    const t2 = tx2.toUpperCase().trim();

    const hasSale = t1 === "V" || t2 === "V" || t1.includes("VEND") || t2.includes("VEND");
    const hasRent = t1 === "L" || t2 === "L" || t1.includes("LOCA") || t2.includes("LOCA") || t1.includes("ALUG") || t2.includes("ALUG");

    if (hasSale && hasRent) {
      return "sale_or_rent";
    }
    if (hasRent) {
      return "rent";
    }
    return "sale";
  }

  /**
   * Normalização de PropertyType para os tipos reais do Chaves na Mão
   */
  public normalizePropertyType(val: string): PropertyType {
    if (!val) return "other";
    const s = val.toLowerCase().trim();

    // Condomínio fechado
    if (s.includes("condomínio") || s.includes("condominio") || s.includes("fechado")) {
      return "condo_house";
    }

    // Casas e sobrados
    if (s.includes("sobrado") || s.includes("casa")) {
      return "house";
    }

    // Apartamento, studios, lofts e kitnets
    if (s.includes("apartamento") || s.includes("apto") || s.includes("flat")) {
      return "apartment";
    }
    if (s.includes("loft")) return "loft";
    if (s.includes("studio")) return "studio";
    if (s.includes("kitnet") || s.includes("kitchenette")) return "kitnet";
    if (s.includes("cobertura") || s.includes("penthouse")) return "penthouse";

    // Escritórios e salas
    if (s.includes("conjunto comercial") || s.includes("sala") || s.includes("escritório") || s.includes("escritorio")) {
      return "office";
    }

    // Pontos comerciais e prédios inteiros
    if (s.includes("ponto comercial") || s.includes("prédio") || s.includes("predio") || s.includes("comercial") || s.includes("loja")) {
      return "commercial";
    }

    // Terrenos e lotes
    if (s.includes("terreno") || s.includes("lote")) {
      return "land";
    }

    // Sítios, chácaras e fazendas
    if (s.includes("sítio") || s.includes("sitio") || s.includes("chácara") || s.includes("chacara") || s.includes("fazenda")) {
      return "farm";
    }

    // Galpões
    if (s.includes("galpão") || s.includes("galpao") || s.includes("depósito") || s.includes("deposito") || s.includes("armazém") || s.includes("armazem")) {
      return "warehouse";
    }

    // Rural genérico
    if (s.includes("rural")) return "rural";

    console.warn(`[ChavesNaMaoParser] Tipo de imóvel não mapeado: "${val}". Mapeado para fallback "other".`);
    return "other";
  }

  // ==========================================
  // HELPERS DE PARSING E SANITIZAÇÃO
  // ==========================================

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

  private cleanCData(val: string): string {
    return val
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
