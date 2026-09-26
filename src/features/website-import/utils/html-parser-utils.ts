/**
 * Utilitários puros em memória para Parsing de HTML, XML (Sitemaps) e JSON-LD
 * Desenvolvido sem dependências pesadas externas para máxima portabilidade e performance.
 */

import type { PropertyType, TransactionType } from "@/types/property";
import type { NormalizedAddress } from "@/types/feed";

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
 * Extrai todas as tags <img> com URLs candidatas, descartando logos, ícones e assets de interface
 */
export function extractImageUrls(html: string, baseUrl?: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const seen = new Set<string>();

  const imgRegex = /<img\s+([^>]*?)>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const attrs = match[1];
    const srcMatch = attrs.match(/(?:src|data-src|data-original)=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (!src || src.startsWith("data:")) continue;

    // Inspeciona alt, class, id e src para filtrar logos e ícones de interface
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const classMatch = attrs.match(/class=["']([^"']*)["']/i);
    const idMatch = attrs.match(/id=["']([^"']*)["']/i);
    const alt = (altMatch ? altMatch[1] : "").toLowerCase();
    const cls = (classMatch ? classMatch[1] : "").toLowerCase();
    const idStr = (idMatch ? idMatch[1] : "").toLowerCase();
    const srcLower = src.toLowerCase();

    if (
      alt.includes("logo") ||
      alt.includes("marca") ||
      alt.includes("icone") ||
      alt.includes("icon") ||
      alt.includes("banner") ||
      alt.includes("avatar") ||
      alt.includes("tecnologia") ||
      alt.includes("selo") ||
      cls.includes("logo") ||
      cls.includes("brand") ||
      idStr.includes("logo") ||
      srcLower.includes("loftsites.com.br/images") ||
      srcLower.includes("loftsites.com.br/shared") ||
      srcLower.includes("/logo") ||
      srcLower.includes("favicon") ||
      srcLower.includes("icon")
    ) {
      continue;
    }

    try {
      const resolved = baseUrl ? new URL(src, baseUrl).toString() : src;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        urls.push(resolved);
      }
    } catch {
      if (!seen.has(src)) {
        seen.add(src);
        urls.push(src);
      }
    }
  }

  // Também busca fotos do catálogo Vista / CRM / CMS embutidas em atributos JSON no HTML
  const vistaFotoMatches = html.matchAll(/\\?"Foto\\?":\s*\\?"(https?:\/\/[^\s"\\]+)/gi);
  for (const vm of vistaFotoMatches) {
    const photoUrl = vm[1].replace(/\\/g, "");
    if (photoUrl && !photoUrl.includes("_p.jpg") && !seen.has(photoUrl)) {
      seen.add(photoUrl);
      urls.push(photoUrl);
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
  const isSale =
    /\b(?:venda|vendas|vende-se|vender|comprar?|compra)\b/i.test(text) ||
    /\b(?:sale|buy)\b/i.test(text);

  const isRent =
    /\b(?:loca[cç][aã]o|loca[cç][oõ]es|aluguel|aluga-se|alugar?)\b/i.test(text) ||
    /\brent\b/i.test(text);

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

/**
 * Identifica com precisão se uma URL pertence a uma página de anúncio/detalhe de imóvel
 * Descartando URLs de listagem, busca, paginação, filtros e institucionais.
 */
export function isListingDetailUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.toLowerCase().trim();
    const search = parsed.search.toLowerCase();

    // 1. Descarta extensões estáticas e arquivos não-página
    if (/\.(?:xml|jpg|jpeg|png|webp|gif|svg|pdf|css|js|json|ico)$/i.test(pathname)) {
      return false;
    }

    // 2. Query params de paginação ou filtro desqualificam anúncio individual
    if (
      search.includes("page=") ||
      search.includes("pagina=") ||
      search.includes("p=") ||
      search.includes("bairro=") ||
      search.includes("cidade=") ||
      search.includes("finalidade=") ||
      search.includes("tipo=") ||
      search.includes("filtro=") ||
      search.includes("valor=") ||
      search.includes("preco=") ||
      search.includes("order=") ||
      search.includes("sort=")
    ) {
      return false;
    }

    // 3. Paginação no pathname (ex: /page/2, /pagina/3)
    if (/\/(?:page|pagina|p)\/\d+/i.test(pathname)) {
      return false;
    }

    // 4. Páginas institucionais e administrativas
    if (
      pathname.includes("/sobre") ||
      pathname.includes("/contato") ||
      pathname.includes("/politica") ||
      pathname.includes("/termos") ||
      pathname.includes("/trabalhe-conosco") ||
      pathname.includes("/quem-somos") ||
      pathname.includes("/empresa") ||
      pathname.includes("/equipe") ||
      pathname.includes("/login") ||
      pathname.includes("/admin") ||
      pathname.includes("/painel") ||
      pathname.includes("/blog") ||
      pathname.includes("/noticia") ||
      pathname.includes("/feed") ||
      pathname.includes("/tag/") ||
      pathname.includes("/categoria/")
    ) {
      return false;
    }

    // 5. Rotas exatas de busca ou catálogo geral
    const categoryRoots = [
      "/imoveis",
      "/imoveis/a-venda",
      "/imoveis/para-alugar",
      "/imoveis/venda",
      "/imoveis/locacao",
      "/imoveis/aluguel",
      "/imoveis/comprar",
      "/imovel/busca",
      "/busca",
      "/pesquisa",
      "/resultados",
      "/catalogo",
      "/propriedades",
    ];
    const cleanPath = pathname.replace(/\/+$/, "");
    if (categoryRoots.includes(cleanPath)) {
      return false;
    }

    // 5.1 Rejeita rotas de filtros por bairro, cidade, busca ou paginação
    if (
      pathname.includes("/busca") ||
      pathname.includes("/pesquisa") ||
      pathname.includes("/resultados") ||
      pathname.includes("/encontrados") ||
      pathname.includes("/bairro/") ||
      pathname.includes("/cidade/") ||
      pathname.includes("/categoria/") ||
      /-[a-z]{2}$/i.test(cleanPath) // ex: tres-vendas-pelotas-rs, centro-pelotas-rs
    ) {
      return false;
    }

    // 6. Singular /imovel/, /propriedade/, /listing/, /anuncio/ com detalhes
    if (
      pathname.startsWith("/imovel/") ||
      pathname.startsWith("/propriedade/") ||
      pathname.startsWith("/listing/") ||
      pathname.startsWith("/anuncio/")
    ) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length >= 2) {
        return true;
      }
    }

    // 7. Presença de código de anúncio evidente no último segmento
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      if (
        /^[a-zA-Z]{2,4}\d+[-_a-zA-Z0-9]*/.test(last) ||
        /[-_](?:cod|ref|id|imovel)[-_]?\d+/i.test(last) ||
        /^\d{4,}\b/.test(last) ||
        /-\d{4,}$/.test(last)
      ) {
        return true;
      }
    }

    // 8. URLs em /imoveis/ com 4 ou mais segmentos estruturados e código no final
    if (segments[0] === "imoveis" && segments.length >= 4) {
      const last = segments[segments.length - 1];
      if (
        /^[a-zA-Z]{2,4}\d+/i.test(last) ||
        /\d{3,}/.test(last) ||
        /[-_](?:cod|ref|id)/i.test(last)
      ) {
        return true;
      }
    }

    // 9. URLs que contêm /imovel- ou /listing- com slug
    if (/\/imovel-[a-z0-9]/i.test(pathname) || /\/listing-[a-z0-9]/i.test(pathname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Tenta inferir componentes de endereço a partir da estrutura da URL
 * Ex: /imovel/apartamento/venda/pelotas/rs/centro/AP5986_UPIMOV
 */
export function extractAddressFromUrl(rawUrl: string): Partial<NormalizedAddress> {
  const UF_LIST = new Set([
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  ]);

  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);

    // 0. Formato Jetimob e CRMs modernos: ...-bairro-{bairro}-em-{cidade}/...
    const jetimobPattern = /-bairro-([^-/]+(?:-[^-/]+)*)-em-([^-/]+(?:-[^-/]+)*)/i.exec(parsed.pathname);
    if (jetimobPattern) {
      const rawNeigh = jetimobPattern[1].replace(/[-_]+/g, " ");
      const rawCity = jetimobPattern[2].replace(/[-_]+/g, " ");
      const formatWord = (str: string) =>
        str
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");

      return {
        country: "Brasil",
        state: "RS",
        city: formatWord(rawCity),
        neighborhood: formatWord(rawNeigh),
      };
    }

    // 1. Formato em múltiplos segmentos por barras: ["imovel", tipo, transacao, cidade, uf, bairro, codigo]
    if (segments.length >= 6 && segments[0] === "imovel") {
      const stateCandidate = segments.find(
        (s) => s.length === 2 && UF_LIST.has(s.toUpperCase())
      );
      if (stateCandidate) {
        const stateIdx = segments.indexOf(stateCandidate);
        const cityCandidate = stateIdx > 0 ? segments[stateIdx - 1] : undefined;
        const neighborhoodCandidate =
          stateIdx + 1 < segments.length - 1 ? segments[stateIdx + 1] : undefined;

        const formatName = (str?: string) =>
          str
            ? str
                .replace(/[-_]+/g, " ")
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ")
            : undefined;

        return {
          country: "Brasil",
          state: stateCandidate.toUpperCase(),
          city: formatName(cityCandidate),
          neighborhood: formatName(neighborhoodCandidate),
        };
      }
    }

    // 2. Formato com slug único hifenizado (ex: /imovel/casa-tres-vendas-pelotas-rs-3-quartos-215m2-4959)
    let slug = segments[segments.length - 1] || "";
    if (/^\d+$/.test(slug) || slug.length <= 4) {
      if (segments.length >= 2) {
        slug = segments[segments.length - 2] || slug;
      }
    }
    const parts = slug.split("-");

    // Procura por UF válida entre os tokens (ex: rs, sc, sp)
    let ufIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length === 2 && UF_LIST.has(parts[i].toUpperCase())) {
        ufIdx = i;
        break;
      }
    }

    const formatName = (words: string[]) =>
      words.length > 0
        ? words
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")
        : undefined;

    if (ufIdx !== -1) {
      const state = parts[ufIdx].toUpperCase();
      const beforeUf = parts.slice(1, ufIdx); // descarta o tipo inicial (casa, apto, etc)
      if (beforeUf.length > 0) {
        const cityIndex = beforeUf.findIndex((p) =>
          ["pelotas", "bage", "porto", "caxias", "canoas", "rio", "capao"].includes(
            p.toLowerCase()
          )
        );
        if (cityIndex !== -1) {
          const neighborhoodParts = beforeUf.slice(0, cityIndex);
          const cityParts = beforeUf.slice(cityIndex);
          return {
            country: "Brasil",
            state,
            city: formatName(cityParts),
            neighborhood: formatName(neighborhoodParts),
          };
        } else {
          const cityParts = [beforeUf[beforeUf.length - 1]];
          const neighborhoodParts = beforeUf.slice(0, beforeUf.length - 1);
          return {
            country: "Brasil",
            state,
            city: formatName(cityParts),
            neighborhood: formatName(neighborhoodParts),
          };
        }
      }
    }
  } catch {
    // Ignora
  }
  return {};
}

/**
 * Extrai a descrição completa do imóvel a partir do HTML, payloads embutidos
 * (como Next.js __next_f, Nuxt, JSON inline) e blocos semânticos do DOM,
 * evitando que meta tags cortadas de SEO (og:description de ~150 chars)
 * sobreponham a descrição rica do anúncio.
 */
export function extractFullPropertyDescription(
  html: string,
  meta: Record<string, string> = {},
  listingBlock?: Record<string, any>
): string {
  if (!html) return "";

  const candidates: string[] = [];

  // 1. Bloco de Schema.org explícito
  if (
    listingBlock?.description &&
    typeof listingBlock.description === "string" &&
    listingBlock.description.trim().length > 0
  ) {
    candidates.push(listingBlock.description.trim());
  }

  // 2. Extração de payloads JSON embutidos (Next.js __next_f, Nuxt, Redux store ou scripts inline)
  // Exemplo real: \"descricao\":\"Localizado na Avenida São Francisco...\"
  const jsonDescMatch =
    html.match(/\\"[dD]escri(?:cao|ção|ption)\\"\s*:\s*\\"([^\"]{60,})\\"/i) ||
    html.match(/"[dD]escri(?:cao|ção|ption)"\s*:\s*"([^"]{60,})"/i);
  if (jsonDescMatch) {
    const unescaped = jsonDescMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
    if (unescaped.length > 50) {
      candidates.push(unescaped);
    }
  }

  // 3. Classes comuns de texto longo de descrição no DOM
  const proseRegex =
    /<(?:div|section|article|p)[^>]*class=["'][^"']*(?:whitespace-pre-wrap|prose|leading-relaxed|texto-descricao|descricao|description|property-description|property-details|imovel-detalhes)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|p)>/gi;
  let proseMatch: RegExpExecArray | null;
  while ((proseMatch = proseRegex.exec(html)) !== null) {
    const raw = proseMatch[1];
    const text = raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+\n/g, "\n\n")
      .trim();
    if (text.length > 80) {
      candidates.push(text);
    }
  }

  // 4. Bloco HTML após cabeçalhos típicos ("Descrição", "Sobre o Imóvel")
  const headingRegex =
    /<(?:h1|h2|h3|h4|strong|b|span|div)[^>]*>\s*(?:Descriç[aã]o|Sobre o Imóvel|Detalhes do Imóvel|Informações Gerais)\s*<\/(?:h1|h2|h3|h4|strong|b|span|div)>\s*<(?:div|p|section)[^>]*>([\s\S]*?)<\/(?:div|p|section)>/i;
  const headingMatch = html.match(headingRegex);
  if (headingMatch) {
    const clean = headingMatch[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (clean.length > 50) {
      candidates.push(clean);
    }
  }

  // 5. Fallback para meta tags (og:description, description)
  if (meta["og:description"]) candidates.push(meta["og:description"].trim());
  if (meta["description"]) candidates.push(meta["description"].trim());

  if (candidates.length === 0) return "";

  // Escolhe o candidato com maior conteúdo informativo real (maior comprimento útil)
  candidates.sort((a, b) => b.length - a.length);

  return candidates[0] || "";
}

/**
 * Estrutura de metadados extraídos de elementos de rastreamento / CRM comuns em sites imobiliários
 * (como Loft Sites, Vista, Imoview e Kenlo)
 */
export interface WebsiteTrackingMetadata {
  id?: string;
  title?: string;
  type?: string;
  transaction?: "sale" | "rent" | "sale_or_rent";
  priceVenda?: number;
  priceAluguel?: number;
  condominiumFee?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  neighborhood?: string;
  city?: string;
  state?: string;
  image?: string;
}

export function extractTrackingMetadata(html: string): WebsiteTrackingMetadata | null {
  if (!html) return null;

  // Procura elemento estruturado de tracking (padrão em plataformas Loft Sites / Vista / Imoview)
  const trackMatch = html.match(/<div[^>]*id=["']property-details-tracking["'][^>]*>/i);
  if (trackMatch) {
    const tag = trackMatch[0];
    const getAttr = (name: string) => {
      const m = tag.match(new RegExp(`data-${name}=["']([^"']*)["']`, "i"));
      return m ? m[1].trim() : undefined;
    };

    const hasVenda = getAttr("has-venda") === "1";
    const hasAluguel = getAttr("has-aluguel") === "1";
    const rawTx = (getAttr("transaction") || "").toLowerCase();

    let transaction: "sale" | "rent" | "sale_or_rent" = "sale";
    if (hasVenda && hasAluguel) transaction = "sale_or_rent";
    else if (hasAluguel || rawTx.includes("loca") || rawTx.includes("aluguel")) transaction = "rent";
    else if (hasVenda || rawTx.includes("venda")) transaction = "sale";

    const priceVenda = parseCurrencyBrl(getAttr("price-venda"));
    const priceAluguel = parseCurrencyBrl(getAttr("price-aluguel"));

    return {
      id: getAttr("id"),
      title: getAttr("title"),
      type: getAttr("type"),
      transaction,
      priceVenda,
      priceAluguel,
      condominiumFee: parseCurrencyBrl(getAttr("condo")),
      area: parseCurrencyBrl(getAttr("area")),
      bedrooms: parseInt(getAttr("bedrooms") || "0", 10) || undefined,
      bathrooms: parseInt(getAttr("bathrooms") || "0", 10) || undefined,
      neighborhood: getAttr("neighborhood"),
      city: getAttr("city"),
      state: getAttr("state")?.toUpperCase(),
      image: getAttr("image"),
    };
  }

  return null;
}



