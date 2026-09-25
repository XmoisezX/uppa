/**
 * Tipos e Interfaces do Sistema Completo de Ranking de Imóveis (0 a 100 pontos)
 * Em conformidade estrita com as diretrizes do Portal UPPA e MASTER_PLAN.md.
 */

export interface RankingWeights {
  relevance: number; // 25 pontos
  quality: number; // 15 pontos
  featured: number; // 15 pontos
  verified_brokerage: number; // 10 pontos
  freshness: number; // 10 pontos
  completeness: number; // 5 pontos
  media: number; // 5 pontos
  price: number; // 5 pontos
  engagement: number; // 5 pontos
}

export interface FreshnessInterval {
  maxDays: number;
  score: number;
}

export interface MediaInterval {
  minPhotos: number;
  maxPhotos: number;
  score: number;
}

export interface RankingCriteriaMeta {
  key: keyof RankingWeights;
  name: string;
  max: number;
  active: boolean;
  description: string;
}

export interface RankingConfig {
  weights: RankingWeights;
  freshness_intervals: FreshnessInterval[];
  media_intervals: MediaInterval[];
  video_tour_bonus: number;
  criteria_meta: RankingCriteriaMeta[];
  updated_at?: string;
  updated_by?: string;
}

export interface PropertyRankingBreakdown {
  relevance: number;
  quality: number;
  featured: number;
  verified_brokerage: number;
  freshness: number;
  completeness: number;
  media: number;
  price: number;
  engagement: number;
}

export interface PropertyRankingResult {
  score: number;
  breakdown: PropertyRankingBreakdown;
  diagnostics?: {
    relevanceRatio?: number;
    qualityRatio?: number;
    daysSinceUpdate?: number;
    photosCount?: number;
    hasVideoOrTour?: boolean;
    priceM2?: number | null;
    cohortMedianPriceM2?: number | null;
    engagementActions?: number;
    activeDays?: number;
  };
}

export interface CohortPriceStats {
  cohortKey: string;
  sampleSize: number;
  medianPriceM2: number;
  avgPriceM2: number;
  minPriceM2: number;
  maxPriceM2: number;
}

export interface PropertyEngagementData {
  propertyId: string;
  totalLeads: number;
  whatsappClicks: number;
  formLeads: number;
  otherEvents: number;
  publishedAt: string | null;
  leadsCount?: number;
  formSubmissions?: number;
  daysActive?: number;
}
