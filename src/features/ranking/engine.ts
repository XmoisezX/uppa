import type { SearchFilters, SearchPropertyItem } from "@/features/search/types";
import type {
  RankingConfig,
  PropertyRankingBreakdown,
  PropertyRankingResult,
  CohortPriceStats,
  PropertyEngagementData,
} from "./types";
import { DEFAULT_RANKING_CONFIG } from "./config";

/**
 * Motor Central de Cálculo de Ranking de Imóveis (0 a 100 pontos)
 * Totalmente determinístico, auditável e contextual por tipo de imóvel.
 */

/**
 * 1. CRITÉRIO: RELEVÂNCIA DA BUSCA (0 a 25 pontos)
 * Mede o grau de afinidade e correspondência com os parâmetros pesquisados pelo usuário.
 */
export function calculateRelevanceScore(
  property: {
    city?: { id?: string; name?: string; slug?: string } | null;
    neighborhood?: { id?: string; name?: string; slug?: string } | null;
    state?: { id?: string; code?: string; name?: string } | null;
    propertyType: string;
    transactionType: string;
    price?: number | null;
    rentPrice?: number | null;
    bedrooms?: number | null;
    suites?: number | null;
    bathrooms?: number | null;
    parkingSpaces?: number | null;
    usableArea?: number | null;
    title?: string | null;
    description?: string | null;
  },
  filters?: SearchFilters,
  maxWeight = 25
): number {
  if (!filters) {
    return maxWeight; // Sem filtros específicos, relevância base total
  }

  // Avalia se há filtros ativos
  let totalEvaluatedWeight = 0;
  let accumulatedMatch = 0;

  // Finalidade (transaction_type)
  if (filters.transactionType) {
    totalEvaluatedWeight += 4;
    if (property.transactionType === filters.transactionType) {
      accumulatedMatch += 4;
    } else if (property.transactionType === "sale_or_rent") {
      accumulatedMatch += 3.5;
    }
  }

  // Tipo de Imóvel (property_type)
  if (filters.propertyType) {
    totalEvaluatedWeight += 5;
    const requestedTypes = Array.isArray(filters.propertyType)
      ? filters.propertyType
      : [filters.propertyType];
    if (requestedTypes.includes(property.propertyType as any)) {
      accumulatedMatch += 5;
    }
  }

  // Cidade / Bairro
  if (filters.city) {
    totalEvaluatedWeight += 4;
    const cleanCity = filters.city.toLowerCase();
    const cityMatch =
      property.city?.slug?.toLowerCase() === cleanCity ||
      property.city?.name?.toLowerCase() === cleanCity ||
      property.city?.id === filters.city;
    if (cityMatch) {
      accumulatedMatch += 4;
    }
  }

  if (filters.neighborhood) {
    totalEvaluatedWeight += 4;
    const cleanNeigh = filters.neighborhood.toLowerCase();
    const neighMatch =
      property.neighborhood?.slug?.toLowerCase() === cleanNeigh ||
      property.neighborhood?.name?.toLowerCase() === cleanNeigh ||
      property.neighborhood?.id === filters.neighborhood;
    if (neighMatch) {
      accumulatedMatch += 4;
    }
  }

  // Faixa de Preço
  const isRent = property.transactionType === "rent" || filters.transactionType === "rent";
  const propertyPrice = isRent ? property.rentPrice || property.price : property.price;

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    totalEvaluatedWeight += 4;
    if (propertyPrice && propertyPrice > 0) {
      const min = filters.priceMin || 0;
      const max = filters.priceMax || min * 2;
      const targetMid = (min + max) / 2;
      if (max > min) {
        const distanceRatio = Math.abs(propertyPrice - targetMid) / ((max - min) / 2 || 1);
        const matchFactor = Math.max(0.6, 1 - distanceRatio * 0.4);
        accumulatedMatch += 4 * matchFactor;
      } else {
        accumulatedMatch += 3.5;
      }
    }
  }

  // Quartos (bedrooms)
  if (filters.bedrooms !== undefined && filters.bedrooms > 0) {
    totalEvaluatedWeight += 4;
    const pBeds = property.bedrooms || 0;
    if (pBeds === filters.bedrooms) {
      accumulatedMatch += 4; // Bateu perfeitamente com a intenção
    } else if (pBeds > filters.bedrooms) {
      accumulatedMatch += 3.2; // Atende ao filtro >=, mas intenção exata ganha mais
    }
  }

  // Se nenhum parâmetro foi especificado, concede o peso máximo
  if (totalEvaluatedWeight === 0) {
    return maxWeight;
  }

  const ratio = Math.min(1, Math.max(0, accumulatedMatch / totalEvaluatedWeight));
  const score = Math.round(maxWeight * ratio * 10) / 10;
  return Math.min(maxWeight, Math.max(0, score));
}

/**
 * 2. CRITÉRIO: QUALIDADE DO ANÚNCIO (0 a 15 pontos)
 * Fórmula contextual por tipo de imóvel (não penaliza terreno por não ter quartos ou sala comercial por suítes).
 */
export function calculateQualityScore(
  property: {
    propertyType: string;
    title?: string | null;
    description?: string | null;
    price?: number | null;
    rentPrice?: number | null;
    condominiumFee?: number | null;
    iptu?: number | null;
    usableArea?: number | null;
    totalArea?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    parkingSpaces?: number | null;
    neighborhoodId?: string | null;
    cityId?: string | null;
    featuresCount?: number;
  },
  maxWeight = 15
): number {
  const pType = property.propertyType;
  const isLandOrRural = ["land", "farm", "rural"].includes(pType);
  const isCommercial = ["commercial", "office", "warehouse"].includes(pType);

  let pointsEarned = 0;
  let totalPossible = 0;

  // 1. Título descritivo e expressivo (> 20 caracteres)
  totalPossible += 2;
  const titleLen = (property.title || "").trim().length;
  if (titleLen >= 25) pointsEarned += 2;
  else if (titleLen >= 12) pointsEarned += 1.2;

  // 2. Descrição detalhada (> 150 chars = full, > 50 = parcial)
  totalPossible += 3.5;
  const descLen = (property.description || "").trim().length;
  if (descLen >= 150) pointsEarned += 3.5;
  else if (descLen >= 60) pointsEarned += 2;
  else if (descLen >= 20) pointsEarned += 1;

  // 3. Preço válido (> 0)
  totalPossible += 2.5;
  const hasPrice =
    (property.price !== null && property.price !== undefined && property.price > 0) ||
    (property.rentPrice !== null && property.rentPrice !== undefined && property.rentPrice > 0);
  if (hasPrice) pointsEarned += 2.5;

  // 4. Área informada (> 0)
  totalPossible += 2.5;
  const hasArea =
    (property.usableArea !== null && property.usableArea !== undefined && property.usableArea > 0) ||
    (property.totalArea !== null && property.totalArea !== undefined && property.totalArea > 0);
  if (hasArea) pointsEarned += 2.5;

  // 5. Especificações contextuais
  const hasNeighborhood = Boolean(property.neighborhoodId || (property as any).neighborhood?.id || (property as any).neighborhood?.name);
  const hasCity = Boolean(property.cityId || (property as any).city?.id || (property as any).city?.name);

  if (!isLandOrRural && !isCommercial) {
    // Residencial padrão: quartos, banheiros, vagas
    totalPossible += 3;
    if ((property.bedrooms || 0) > 0) pointsEarned += 1.2;
    if ((property.bathrooms || 0) > 0) pointsEarned += 1.0;
    if (property.parkingSpaces !== null && property.parkingSpaces !== undefined) pointsEarned += 0.8;
  } else if (isCommercial) {
    // Comercial: banheiros, condomínio/iptu
    totalPossible += 3;
    if ((property.bathrooms || 0) > 0) pointsEarned += 1.5;
    if (property.condominiumFee !== null || property.iptu !== null) pointsEarned += 1.5;
  } else {
    // Terreno / Rural: área total/lote relevante e localização
    totalPossible += 3;
    if ((property.totalArea || 0) > 0 || (property.usableArea || 0) > 0) pointsEarned += 1.8;
    if (hasNeighborhood || hasCity) pointsEarned += 1.2;
  }

  // 6. Características / comodidades adicionais cadastradas
  totalPossible += 1.5;
  const fCount = property.featuresCount || (property as any).features?.length || 0;
  if (fCount >= 4) pointsEarned += 1.5;
  else if (fCount >= 1) pointsEarned += 0.8;
  else if (isLandOrRural) pointsEarned += 0.8; // Terrenos costumam ter menos amenidades

  const ratio = Math.min(1, Math.max(0, pointsEarned / (totalPossible || 1)));
  const score = Math.round(maxWeight * ratio * 10) / 10;
  return Math.min(maxWeight, Math.max(0, score));
}

/**
 * 3. CRITÉRIO: IMÓVEL EM DESTAQUE (0 ou 15 pontos)
 * Considera expiração automática: start_at <= current_time <= end_at
 */
export function calculateFeaturedScore(
  isFeatured: boolean,
  maxWeight = 15,
  endAt?: string | Date | null,
  startAt?: string | Date | null
): number {
  if (!isFeatured) return 0;

  const now = Date.now();
  if (startAt) {
    const sDate = new Date(startAt);
    if (!isNaN(sDate.getTime()) && sDate.getTime() > now) {
      return 0; // Ainda não iniciado
    }
  }

  if (endAt) {
    const eDate = new Date(endAt);
    if (!isNaN(eDate.getTime()) && eDate.getTime() < now) {
      return 0; // Destaque expirado
    }
  }

  return maxWeight;
}

/**
 * 4. CRITÉRIO: IMOBILIÁRIA VERIFICADA (0 ou 10 pontos)
 * Pertence estritamente à imobiliária, não ao imóvel.
 */
export function calculateVerifiedScore(
  isAgencyVerified: boolean,
  maxWeight = 10
): number {
  return isAgencyVerified ? maxWeight : 0;
}

/**
 * 5. CRITÉRIO: ATUALIZAÇÃO / RECÊNCIA (0 a 10 pontos)
 * 0–3 dias = 10; 4–7 dias = 9; 8–14 dias = 8; 15–30 dias = 6; 31–60 dias = 4; 61–90 dias = 2; >90 = 0.
 */
export function calculateFreshnessScore(
  updatedAtDate: string | Date | null | undefined,
  intervals = DEFAULT_RANKING_CONFIG.freshness_intervals,
  maxWeight = 10
): number {
  if (!updatedAtDate) return 0;
  const date = new Date(updatedAtDate);
  if (isNaN(date.getTime())) return 0;

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  for (const interval of intervals) {
    if (diffDays <= interval.maxDays) {
      // Normaliza proporcionalmente ao maxWeight
      return Math.min(maxWeight, Math.round((interval.score / 10) * maxWeight * 10) / 10);
    }
  }

  return 0;
}

/**
 * 6. CRITÉRIO: COMPLETUDE DOS DADOS (0 a 5 pontos)
 * Verifica presença e consistência dos dados fundamentais.
 */
export function calculateCompletenessScore(
  property: {
    price?: number | null;
    rentPrice?: number | null;
    cityId?: string | null;
    stateId?: string | null;
    neighborhoodId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    usableArea?: number | null;
    totalArea?: number | null;
    propertyType?: string | null;
    transactionType?: string | null;
    externalId?: string | null;
  },
  maxWeight = 5
): number {
  let validFields = 0;
  const totalFields = 7;

  // Preço válido
  if (
    (property.price && property.price > 0) ||
    (property.rentPrice && property.rentPrice > 0)
  ) {
    validFields += 1;
  }

  // Localização administrativa (cidade e estado)
  if (property.cityId && property.stateId) {
    validFields += 1;
  }

  // Bairro
  if (property.neighborhoodId) {
    validFields += 1;
  }

  // Coordenadas geográficas
  if (
    property.latitude !== null &&
    property.latitude !== undefined &&
    property.longitude !== null &&
    property.longitude !== undefined &&
    property.latitude !== 0 &&
    property.longitude !== 0
  ) {
    validFields += 1;
  }

  // Área
  if (
    (property.usableArea && property.usableArea > 0) ||
    (property.totalArea && property.totalArea > 0)
  ) {
    validFields += 1;
  }

  // Tipo e finalidade definidos
  if (property.propertyType && property.transactionType) {
    validFields += 1;
  }

  // Código de referência da imobiliária
  if (property.externalId && property.externalId.trim() !== "") {
    validFields += 1;
  }

  const ratio = validFields / totalFields;
  return Math.min(maxWeight, Math.round(maxWeight * ratio * 10) / 10);
}

/**
 * 7. CRITÉRIO: QUALIDADE DE MÍDIA (0 a 5 pontos)
 * Fotos válidas + vídeo/tour virtual.
 */
export function calculateMediaScore(
  mediaList: Array<{ url: string; type?: string; isCover?: boolean }> = [],
  intervals = DEFAULT_RANKING_CONFIG.media_intervals,
  bonusVideo = 1,
  maxWeight = 5
): number {
  const photoCount = mediaList.filter(
    (m) => !m.type || m.type === "image"
  ).length;

  const hasVideoOrTour = mediaList.some(
    (m) => m.type === "video" || m.type === "virtual_tour"
  );

  let basePoints = 0;
  for (const interval of intervals) {
    if (photoCount >= interval.minPhotos && photoCount <= interval.maxPhotos) {
      basePoints = interval.score;
      break;
    }
  }

  if (hasVideoOrTour) {
    basePoints += bonusVideo;
  }

  return Math.min(maxWeight, Math.max(0, basePoints));
}

/**
 * 8. CRITÉRIO: COMPETITIVIDADE DE PREÇO (0 a 5 pontos)
 * Compara preço por m² com imóveis semelhantes no mesmo município / tipo / transação.
 * Possui proteções estritas contra preços fictícios ou amostras pequenas.
 */
export function calculatePriceScore(
  property: {
    price?: number | null;
    rentPrice?: number | null;
    usableArea?: number | null;
    transactionType: string;
  },
  cohortStats?: CohortPriceStats | null,
  maxWeight = 5
): number {
  const isRent = property.transactionType === "rent";
  const price = isRent ? property.rentPrice : property.price;
  const area = property.usableArea;

  // Validação de limites reais de mercado
  if (!price || price <= 0 || !area || area < 10) {
    return 2.5; // Pontuação neutra/base quando dados não são computáveis
  }

  const priceM2 = price / area;

  // Proteção contra valores irreais de teste ou erro de digitação
  const minSensibleM2 = isRent ? 3 : 200;
  const maxSensibleM2 = isRent ? 300 : 60000;
  if (priceM2 < minSensibleM2 || priceM2 > maxSensibleM2) {
    return 1.0;
  }

  // Se não houver dados de coorte com amostra estatística confiável (mínimo 3 imóveis)
  if (!cohortStats || cohortStats.sampleSize < 3 || cohortStats.medianPriceM2 <= 0) {
    return 2.5; // Pontuação neutra equilibrada
  }

  const median = cohortStats.medianPriceM2;
  const diffPercent = (priceM2 - median) / median;

  // Muito abaixo da mediana (> 65% abaixo) pode ser valor falso ou incorreto
  if (diffPercent < -0.65) {
    return 1.5;
  }

  // Preço muito competitivo (entre 5% e 30% abaixo da mediana de mercado)
  if (diffPercent >= -0.3 && diffPercent <= -0.05) {
    return maxWeight; // 5.0 pts
  }

  // Em linha com a mediana de mercado (+- 5%)
  if (diffPercent > -0.05 && diffPercent <= 0.05) {
    return 4.0;
  }

  // Até 20% acima da mediana
  if (diffPercent > 0.05 && diffPercent <= 0.2) {
    return 3.0;
  }

  // Até 40% acima da mediana
  if (diffPercent > 0.2 && diffPercent <= 0.4) {
    return 2.0;
  }

  // Mais de 40% acima da mediana de mercado
  return 1.0;
}

/**
 * 9. CRITÉRIO: ENGAJAMENTO DO ANÚNCIO (0 a 5 pontos)
 * Baseado em leads e cliques reais normalizados pelo tempo em que o anúncio esteve ativo.
 */
export function calculateEngagementScore(
  engagement?: PropertyEngagementData | null,
  maxWeight = 5
): number {
  if (!engagement) return 0;
  const total = engagement.totalLeads ?? engagement.leadsCount ?? 0;
  if (total <= 0) {
    return 0; // Sem engajamento
  }

  const formLeads = engagement.formLeads ?? engagement.formSubmissions ?? 0;
  const whatsappClicks = engagement.whatsappClicks ?? 0;
  const other = engagement.otherEvents ?? 0;

  // Ponderação por intenção do comprador: formulário (3x) > WhatsApp (2x) > outros (1x)
  const weightedActions = formLeads * 3.0 + whatsappClicks * 2.0 + other * 1.0;

  // Normalização pelo tempo ativo em dias (mínimo 1 dia para evitar divisão por zero)
  let activeDays = 30;
  if (engagement.publishedAt) {
    const pubDate = new Date(engagement.publishedAt);
    if (!isNaN(pubDate.getTime())) {
      activeDays = Math.max(1, Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  // Ações ponderadas por mês (taxa mensal de engajamento)
  const monthlyEngagementRate = (weightedActions / activeDays) * 30;

  let points = 0;
  if (monthlyEngagementRate >= 6.0) points = 5.0;
  else if (monthlyEngagementRate >= 3.5) points = 4.0;
  else if (monthlyEngagementRate >= 1.5) points = 3.0;
  else if (monthlyEngagementRate >= 0.5) points = 2.0;
  else if (monthlyEngagementRate > 0) points = 1.0;

  return Math.min(maxWeight, points);
}

/**
 * CALCULA O RANKING COMPLETO DE UM IMÓVEL (0 a 100 pontos)
 */
export function calculatePropertyRanking(
  property: {
    id: string;
    propertyType: string;
    transactionType: string;
    title?: string | null;
    description?: string | null;
    price?: number | null;
    rentPrice?: number | null;
    condominiumFee?: number | null;
    iptu?: number | null;
    usableArea?: number | null;
    totalArea?: number | null;
    bedrooms?: number | null;
    suites?: number | null;
    bathrooms?: number | null;
    parkingSpaces?: number | null;
    neighborhoodId?: string | null;
    cityId?: string | null;
    stateId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    externalId?: string | null;
    updatedAt?: string | Date | null;
    publishedAt?: string | Date | null;
    agency?: { id?: string; name?: string; slug?: string; verifiedAt?: string | null; [key: string]: any } | null;
    city?: { id?: string; name?: string; slug?: string } | null;
    neighborhood?: { id?: string; name?: string; slug?: string } | null;
    state?: { id?: string; code?: string; name?: string } | null;
    media?: Array<{ url: string; type?: string; isCover?: boolean }>;
    features?: Array<any>;
    featured?: boolean;
    [key: string]: any;
  },
  options?: {
    filters?: SearchFilters;
    searchFilters?: SearchFilters;
    config?: RankingConfig;
    rankingConfig?: RankingConfig;
    cohortStats?: CohortPriceStats | null;
    engagementData?: PropertyEngagementData | null;
    isFeatured?: boolean;
    isAgencyVerified?: boolean;
  }
): PropertyRankingResult {
  const config = options?.rankingConfig || options?.config || DEFAULT_RANKING_CONFIG;
  const weights = config.weights;
  const activeFilters = options?.filters || options?.searchFilters;

  // 1. Relevância da Busca (0 a 25)
  const relevance = calculateRelevanceScore(property, activeFilters, weights.relevance);

  // 2. Qualidade do Anúncio (0 a 15)
  const quality = calculateQualityScore(
    {
      ...property,
      featuresCount: property.features?.length || 0,
    },
    weights.quality
  );

  // 3. Imóvel em Destaque (0 ou 15)
  const isFeatured = options?.isFeatured !== undefined ? options.isFeatured : Boolean(property.featured);
  const featured = calculateFeaturedScore(isFeatured, weights.featured);

  // 4. Imobiliária Verificada (0 ou 10)
  const isAgencyVerified =
    options?.isAgencyVerified !== undefined
      ? options.isAgencyVerified
      : Boolean(property.agency?.verifiedAt);
  const verified_brokerage = calculateVerifiedScore(isAgencyVerified, weights.verified_brokerage);

  // 5. Atualização / Recência (0 a 10)
  const freshness = calculateFreshnessScore(
    property.updatedAt || property.publishedAt,
    config.freshness_intervals,
    weights.freshness
  );

  // 6. Completude dos Dados (0 a 5)
  const completeness = calculateCompletenessScore(property, weights.completeness);

  // 7. Qualidade de Mídia (0 a 5)
  const media = calculateMediaScore(
    property.media || [],
    config.media_intervals,
    config.video_tour_bonus,
    weights.media
  );

  // 8. Competitividade de Preço (0 a 5)
  const price = calculatePriceScore(property, options?.cohortStats, weights.price);

  // 9. Engajamento do Anúncio (0 a 5)
  const engagement = calculateEngagementScore(options?.engagementData, weights.engagement);

  // Soma Total (exatamente 0 a 100)
  const rawSum =
    relevance +
    quality +
    featured +
    verified_brokerage +
    freshness +
    completeness +
    media +
    price +
    engagement;

  const totalWeightsSum =
    (weights.relevance || 0) +
    (weights.quality || 0) +
    (weights.featured || 0) +
    (weights.verified_brokerage || 0) +
    (weights.freshness || 0) +
    (weights.completeness || 0) +
    (weights.media || 0) +
    (weights.price || 0) +
    (weights.engagement || 0);

  const normalizedSum =
    totalWeightsSum > 0 && Math.abs(totalWeightsSum - 100) > 0.01
      ? (rawSum / totalWeightsSum) * 100
      : rawSum;

  const score = Math.min(100, Math.max(0, Math.round(normalizedSum * 10) / 10));

  const breakdown: PropertyRankingBreakdown = {
    relevance,
    quality,
    featured,
    verified_brokerage,
    freshness,
    completeness,
    media,
    price,
    engagement,
  };

  return {
    score,
    breakdown,
  };
}

/**
 * ORDENAÇÃO DE IMÓVEIS POR RANKING COM CRITÉRIOS DE DESEMPATE DETERMINÍSTICOS
 * Conforme Seção 14 do MASTER_PLAN:
 * 1. Score total DESC
 * 2. Relevância DESC
 * 3. Qualidade DESC
 * 4. Destaque DESC
 * 5. Imobiliária verificada DESC
 * 6. Recência DESC
 * 7. Engajamento DESC
 * 8. updated_at mais recente DESC
 * 9. ID do anúncio ASC (critério final determinístico)
 */
export function sortPropertiesByRanking<T extends { id: string; updatedAt?: string; [key: string]: any }>(
  itemsWithRanking: Array<{
    item: T;
    ranking: PropertyRankingResult;
  }>
): T[] {
  return itemsWithRanking
    .sort((a, b) => {
      // 1. Score total
      if (b.ranking.score !== a.ranking.score) {
        return b.ranking.score - a.ranking.score;
      }

      // 2. Relevância
      if (b.ranking.breakdown.relevance !== a.ranking.breakdown.relevance) {
        return b.ranking.breakdown.relevance - a.ranking.breakdown.relevance;
      }

      // 3. Qualidade
      if (b.ranking.breakdown.quality !== a.ranking.breakdown.quality) {
        return b.ranking.breakdown.quality - a.ranking.breakdown.quality;
      }

      // 4. Destaque
      if (b.ranking.breakdown.featured !== a.ranking.breakdown.featured) {
        return b.ranking.breakdown.featured - a.ranking.breakdown.featured;
      }

      // 5. Imobiliária Verificada
      if (b.ranking.breakdown.verified_brokerage !== a.ranking.breakdown.verified_brokerage) {
        return b.ranking.breakdown.verified_brokerage - a.ranking.breakdown.verified_brokerage;
      }

      // 6. Recência
      if (b.ranking.breakdown.freshness !== a.ranking.breakdown.freshness) {
        return b.ranking.breakdown.freshness - a.ranking.breakdown.freshness;
      }

      // 7. Engajamento
      if (b.ranking.breakdown.engagement !== a.ranking.breakdown.engagement) {
        return b.ranking.breakdown.engagement - a.ranking.breakdown.engagement;
      }

      // 8. updated_at mais recente
      const dateA = a.item.updatedAt ? new Date(a.item.updatedAt).getTime() : 0;
      const dateB = b.item.updatedAt ? new Date(b.item.updatedAt).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // 9. ID determinístico (sem randomização)
      return a.item.id.localeCompare(b.item.id);
    })
    .map((wrapper) => wrapper.item);
}
