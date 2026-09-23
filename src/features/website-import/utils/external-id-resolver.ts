/**
 * External ID Resolver para Website Import
 * Conforme ordem de prioridade estrita:
 * 1. código explícito do imóvel (Ref, Código, Cód, SKU);
 * 2. ID interno da API;
 * 3. identificador estruturado (JSON-LD @id, productID);
 * 4. URL canônica estável normalizada (slug / path final estável).
 *
 * Garante estabilidade: NUNCA gera um ID aleatório que mude a cada crawl.
 */

export interface ExternalIdCandidateInput {
  explicitCode?: string | null;
  apiId?: string | number | null;
  structuredId?: string | null;
  canonicalUrl?: string | null;
  pageUrl?: string | null;
}

export function resolveWebsiteExternalId(
  input: ExternalIdCandidateInput
): string {
  // Prioridade 1: Código explícito do anúncio (ex: "AP-104", "CA002", "Ref: 984")
  if (input.explicitCode) {
    const clean = sanitizeIdentifier(String(input.explicitCode));
    if (clean.length >= 2) {
      return clean;
    }
  }

  // Prioridade 2: ID interno da API
  if (input.apiId !== undefined && input.apiId !== null) {
    const clean = sanitizeIdentifier(String(input.apiId));
    if (clean.length >= 1) {
      return clean;
    }
  }

  // Prioridade 3: Identificador estruturado (Schema.org @id ou similar)
  if (input.structuredId) {
    const clean = sanitizeIdentifier(String(input.structuredId));
    if (clean.length >= 2) {
      return clean;
    }
  }

  // Prioridade 4: URL canônica estável ou URL da página
  if (input.canonicalUrl) {
    const canonicalSlug = extractStableSlugFromUrl(input.canonicalUrl);
    if (canonicalSlug && canonicalSlug !== "home" && canonicalSlug !== "index") {
      return canonicalSlug;
    }
  }

  if (input.pageUrl) {
    const pageSlug = extractStableSlugFromUrl(input.pageUrl);
    if (pageSlug && pageSlug !== "home" && pageSlug !== "index") {
      return pageSlug;
    }
  }

  throw new Error(
    "Não foi possível determinar um externalId estável e reprodutível para o anúncio."
  );
}

/**
 * Extrai um identificador estável a partir do path de uma URL,
 * descartando parâmetros de tracking (utm, fbclid, etc.) e barras finais.
 */
export function extractStableSlugFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Remove query params e hashes
    let pathname = parsed.pathname.trim();

    // Remove barra inicial e final
    pathname = pathname.replace(/^\/+|\/+$/g, "");

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "";
    }

    // Pega o último segmento significativo (slug da página do imóvel)
    const lastSegment = segments[segments.length - 1];

    // Se o último segmento for apenas uma extensão (.html, .php), limpa
    const cleanLastSegment = lastSegment.replace(/\.(html|php|aspx|jsp)$/i, "");

    return sanitizeIdentifier(cleanLastSegment);
  } catch {
    return "";
  }
}

/**
 * Remove caracteres de controle mantendo letras, números, hífens e underlines
 */
function sanitizeIdentifier(text: string): string {
  return text
    .replace(/^ref[:\s_-]*/i, "")
    .replace(/^c[oó]d[:\s_-]*/i, "")
    .replace(/^codigo[:\s_-]*/i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}
