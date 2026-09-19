/**
 * FeedDetector - Identificação automática de padrão de feed XML baseado no conteúdo
 * Conforme MASTER_PLAN.md e especificações do projeto:
 * - Detecta VRSync/VivaReal ou Chaves na Mão pelo conteúdo sem depender da URL.
 * - Retorna "unknown" se o formato não for reconhecido.
 */

export type FeedFormat = "vrsync" | "chaves_na_mao" | "unknown";

/**
 * Analisa o conteúdo XML e retorna o formato identificado
 */
export function detectFeedFormat(xmlContent: string): FeedFormat {
  if (!xmlContent || typeof xmlContent !== "string") {
    return "unknown";
  }

  const trimmed = xmlContent.trim();
  if (trimmed.length === 0) {
    return "unknown";
  }

  // 1. Verificação do padrão VRSync / VivaReal / Zap
  const isVRSync =
    /<ListingDataFeed[\s>]/i.test(trimmed) ||
    /xmlns[^=]*=.*vivareal/i.test(trimmed) ||
    /xmlns[^=]*=.*vrsync/i.test(trimmed) ||
    (/<Listings[\s>]/i.test(trimmed) && /<Listing[\s>]/i.test(trimmed)) ||
    (/<Listing[\s>]/i.test(trimmed) && /<ListingID[\s>]/i.test(trimmed));

  if (isVRSync) {
    return "vrsync";
  }

  // 2. Verificação do padrão Chaves na Mão
  const isChavesNaMao =
    (/<Document[\s>]/i.test(trimmed) &&
      /<imoveis[\s>]/i.test(trimmed) &&
      /<imovel[\s>]/i.test(trimmed)) ||
    (/<imovel[\s>]/i.test(trimmed) && /<referencia[\s>]/i.test(trimmed));

  if (isChavesNaMao) {
    return "chaves_na_mao";
  }

  return "unknown";
}
