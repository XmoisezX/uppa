/**
 * Filtro de Mídias de Anúncios Imobiliários
 * Conforme requisitos:
 * - Extrai apenas imagens relacionadas ao imóvel
 * - Descarta logos, ícones, banners, imagens de interface e tracking pixels
 * - Preserva URLs originais
 * - Define a primeira imagem válida como capa (isCover: true)
 */

import type { NormalizedMedia } from "@/types/feed";

const EXCLUDED_PATTERNS = [
  /logo/i,
  /icon/i,
  /icone/i,
  /banner/i,
  /header/i,
  /footer/i,
  /avatar/i,
  /favicon/i,
  /placeholder/i,
  /pixel/i,
  /tracking/i,
  /analytics/i,
  /btn[_-]/i,
  /button/i,
  /badge/i,
  /arrow/i,
  /social/i,
  /facebook/i,
  /instagram/i,
  /whatsapp/i,
  /share/i,
  /sprite/i,
  /loader/i,
  /spinner/i,
  /blank\.gif/i,
  /1x1/i,
  /spacer/i,
];

const DISALLOWED_EXTENSIONS = [".svg", ".gif", ".ico", ".bmp"];

/**
 * Filtra e normaliza uma lista de URLs de imagens do anúncio
 */
export function filterListingImages(
  rawUrls: string[],
  baseUrl?: string,
  maxImages = 40
): NormalizedMedia[] {
  if (!rawUrls || !Array.isArray(rawUrls)) return [];

  const seenUrls = new Set<string>();
  const validImages: NormalizedMedia[] = [];

  for (const rawUrl of rawUrls) {
    if (!rawUrl || typeof rawUrl !== "string") continue;
    const trimmed = rawUrl.trim();
    if (!trimmed) continue;

    // Resolução de URLs relativas se baseUrl for fornecida
    let resolvedUrl: string;
    try {
      resolvedUrl = baseUrl ? new URL(trimmed, baseUrl).toString() : trimmed;
    } catch {
      continue;
    }

    // Protocolo obrigatório http ou https
    if (!resolvedUrl.startsWith("http://") && !resolvedUrl.startsWith("https://")) {
      continue;
    }

    // Normaliza para lowercase na checagem de exclusão
    const urlLower = resolvedUrl.toLowerCase();

    // 1. Bloqueia extensões impróprias para fotos de imóveis
    const hasDisallowedExt = DISALLOWED_EXTENSIONS.some((ext) => {
      const cleanPath = urlLower.split("?")[0];
      return cleanPath.endsWith(ext);
    });
    if (hasDisallowedExt) continue;

    // 2. Bloqueia padrões conhecidos de ícones, banners, logos e pixels
    const matchesExcluded = EXCLUDED_PATTERNS.some((pattern) =>
      pattern.test(urlLower)
    );
    if (matchesExcluded) continue;

    // 3. Deduplicação
    if (seenUrls.has(resolvedUrl)) continue;
    seenUrls.add(resolvedUrl);

    validImages.push({
      type: "image",
      url: resolvedUrl,
      isCover: validImages.length === 0, // Primeiro item válido é a foto de capa
    });

    if (validImages.length >= maxImages) break;
  }

  return validImages;
}
