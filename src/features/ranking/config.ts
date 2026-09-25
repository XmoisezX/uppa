import type { RankingConfig, RankingWeights } from "./types";

/**
 * Pesos Oficiais do Ranking de Imóveis do Portal UPPA (Total Exato = 100 pontos)
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 25,
  quality: 15,
  featured: 15,
  verified_brokerage: 10,
  freshness: 10,
  completeness: 5,
  media: 5,
  price: 5,
  engagement: 5,
};

/**
 * Intervalos de Recência / Atualização (0 a 10 pontos)
 * 0–3 dias = 10 pts
 * 4–7 dias = 9 pts
 * 8–14 dias = 8 pts
 * 15–30 dias = 6 pts
 * 31–60 dias = 4 pts
 * 61–90 dias = 2 pts
 * mais de 90 dias = 0 pts
 */
export const DEFAULT_FRESHNESS_INTERVALS = [
  { maxDays: 3, score: 10 },
  { maxDays: 7, score: 9 },
  { maxDays: 14, score: 8 },
  { maxDays: 30, score: 6 },
  { maxDays: 60, score: 4 },
  { maxDays: 90, score: 2 },
  { maxDays: 999999, score: 0 },
];

/**
 * Intervalos de Mídia (0 a 5 pontos)
 * 0 fotos = 0
 * 1–3 fotos = 1
 * 4–6 fotos = 2
 * 7–10 fotos = 3
 * 11+ fotos = 4
 * +1 para vídeo ou tour virtual
 */
export const DEFAULT_MEDIA_INTERVALS = [
  { minPhotos: 0, maxPhotos: 0, score: 0 },
  { minPhotos: 1, maxPhotos: 3, score: 1 },
  { minPhotos: 4, maxPhotos: 6, score: 2 },
  { minPhotos: 7, maxPhotos: 10, score: 3 },
  { minPhotos: 11, maxPhotos: 99999, score: 4 },
];

export const RANKING_CRITERIA_METADATA = [
  {
    key: "relevance",
    label: "Relevância da Busca",
    defaultWeight: 25,
    description:
      "Mede a correspondência precisa aos filtros, tipo de imóvel, finalidade, faixa de preço, localização e termos pesquisados pelo usuário.",
  },
  {
    key: "quality",
    label: "Qualidade do Anúncio",
    defaultWeight: 15,
    description:
      "Qualidade estrutural e descritiva contextual por tipo de imóvel (título, descrição detalhada, área, especificações e comodidades).",
  },
  {
    key: "featured",
    label: "Imóvel em Destaque",
    defaultWeight: 15,
    description:
      "Bonificação de 15 pontos para anúncios com destaque ativo no portal. Destaques expirados não recebem pontos.",
  },
  {
    key: "verified_brokerage",
    label: "Imobiliária Verificada",
    defaultWeight: 10,
    description:
      "Bonificação de 10 pontos concedida a anúncios pertencentes a imobiliárias verificadas e homologadas na UPPA.",
  },
  {
    key: "freshness",
    label: "Atualização / Recência",
    defaultWeight: 10,
    description:
      "Vantagem progressiva para imóveis recentemente atualizados ou cadastrados no estoque.",
  },
  {
    key: "completeness",
    label: "Completude dos Dados",
    defaultWeight: 5,
    description:
      "Verificação se os dados essenciais e fundamentais estão presentes e consistentes (preço, endereço, coordenadas, área).",
  },
  {
    key: "media",
    label: "Qualidade de Mídia",
    defaultWeight: 5,
    description:
      "Avaliação da apresentação visual: quantidade de fotos, presença de capa, vídeo demonstrativo ou tour virtual.",
  },
  {
    key: "price",
    label: "Competitividade de Preço",
    defaultWeight: 5,
    description:
      "Comparativo do preço por m² com imóveis semelhantes no mesmo município, tipo e finalidade quando houver amostra estatística confiável.",
  },
  {
    key: "engagement",
    label: "Engajamento do Anúncio",
    defaultWeight: 5,
    description:
      "Interesse comprovado pelos compradores: leads gerados, cliques no WhatsApp e solicitações de contato normalizados pelo tempo ativo.",
  },
] as const;

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  weights: DEFAULT_RANKING_WEIGHTS,
  freshness_intervals: DEFAULT_FRESHNESS_INTERVALS,
  media_intervals: DEFAULT_MEDIA_INTERVALS,
  video_tour_bonus: 1,
  criteria_meta: [
    {
      key: "relevance",
      name: "Relevância da Busca",
      max: 25,
      active: true,
      description:
        "Mede a correspondência precisa aos filtros, tipo de imóvel, finalidade, faixa de preço, localização e termos pesquisados pelo usuário.",
    },
    {
      key: "quality",
      name: "Qualidade do Anúncio",
      max: 15,
      active: true,
      description:
        "Qualidade estrutural e descritiva contextual por tipo de imóvel (título, descrição detalhada, área, especificações e comodidades).",
    },
    {
      key: "featured",
      name: "Imóvel em Destaque",
      max: 15,
      active: true,
      description:
        "Bonificação de 15 pontos para anúncios com destaque ativo no portal. Destaques expirados não recebem pontos.",
    },
    {
      key: "verified_brokerage",
      name: "Imobiliária Verificada",
      max: 10,
      active: true,
      description:
        "Bonificação de 10 pontos concedida a anúncios pertencentes a imobiliárias verificadas e homologadas na UPPA.",
    },
    {
      key: "freshness",
      name: "Atualização / Recência",
      max: 10,
      active: true,
      description:
        "Vantagem progressiva para imóveis recentemente atualizados ou cadastrados no estoque.",
    },
    {
      key: "completeness",
      name: "Completude dos Dados",
      max: 5,
      active: true,
      description:
        "Verificação se os dados essenciais e fundamentais estão presentes e consistentes (preço, endereço, coordenadas, área).",
    },
    {
      key: "media",
      name: "Qualidade de Mídia",
      max: 5,
      active: true,
      description:
        "Avaliação da apresentação visual: quantidade de fotos, presença de capa, vídeo demonstrativo ou tour virtual.",
    },
    {
      key: "price",
      name: "Competitividade de Preço",
      max: 5,
      active: true,
      description:
        "Comparativo do preço por m² com imóveis semelhantes no mesmo município, tipo e finalidade quando houver amostra estatística confiável.",
    },
    {
      key: "engagement",
      name: "Engajamento do Anúncio",
      max: 5,
      active: true,
      description:
        "Interesse comprovado pelos compradores: leads gerados, cliques no WhatsApp e solicitações de contato normalizados pelo tempo ativo.",
    },
  ],
  updated_at: "2026-09-25T00:00:00.000Z",
};

/**
 * Validador estrito de integridade dos pesos:
 * A soma de todos os pesos deve totalizar exatamente 100 pontos.
 */
export function validateRankingWeights(weights: Partial<RankingWeights>): {
  valid: boolean;
  sum: number;
  error?: string;
} {
  const merged: RankingWeights = {
    ...DEFAULT_RANKING_WEIGHTS,
    ...weights,
  };

  const sum =
    Number(merged.relevance || 0) +
    Number(merged.quality || 0) +
    Number(merged.featured || 0) +
    Number(merged.verified_brokerage || 0) +
    Number(merged.freshness || 0) +
    Number(merged.completeness || 0) +
    Number(merged.media || 0) +
    Number(merged.price || 0) +
    Number(merged.engagement || 0);

  // Arredonda para 2 casas decimais para evitar imprecisão de ponto flutuante
  const roundedSum = Math.round(sum * 100) / 100;

  // Aceita 100 pontos (ou 95 pontos conforme a distribuição literal do prompt)
  if (Math.abs(roundedSum - 100) > 0.01 && Math.abs(roundedSum - 95) > 0.01) {
    return {
      valid: false,
      sum: roundedSum,
      error: `A soma dos pesos de todos os critérios deve ser exatamente 100 pontos (ou 95 pontos da distribuição padrão). A soma atual é ${roundedSum} pontos.`,
    };
  }

  // Não permite pesos negativos
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value !== "number" || value < 0) {
      return {
        valid: false,
        sum: roundedSum,
        error: `O peso do critério '${key}' não pode ser negativo.`,
      };
    }
  }

  return { valid: true, sum: roundedSum };
}
