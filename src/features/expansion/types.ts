/**
 * Tipos centrais do Módulo de Expansão Territorial e Ingestão Estruturada da UPPA
 * Conforme MASTER_PLAN.md e regras do projeto.
 */

export type CityExpansionStatus =
  | "not_started"
  | "researching"
  | "eligible"
  | "crawling"
  | "active"
  | "paused"
  | "saturated"
  | "blocked";

export type CityExpansionPriority = "A" | "B" | "C" | "not_prioritized";

export interface CityExpansionMetrics {
  id: string;
  name: string;
  slug: string;
  stateCode?: string;
  ibgeCode?: number | null;
  population?: number | null;
  populationReferenceYear?: number | null;
  populationSource?: string | null;
  populationUpdatedAt?: string | null;
  expansionStatus: CityExpansionStatus;
  expansionPriority: CityExpansionPriority;
  expansionScore: number;
  lastDiscoveryAt?: string | null;
  nextDiscoveryAt?: string | null;
  knownAgenciesCount: number;
  claimedAgenciesCount: number;
  activePropertiesCount: number;
  activeOffersCount: number;
  coverageRatio?: number; // activePropertiesCount / (expected Properties based on population)
}

export interface CityExpansionScoreBreakdown {
  totalScore: number;
  priority: CityExpansionPriority;
  factors: {
    populationScore: number; // 0-100
    gapScore: number; // 0-100 (razão população vs estoque atual)
    agencyOpportunityScore: number; // 0-100 (agências conhecidas vs integradas)
    densityScore: number; // 0-100
  };
  reasons: string[];
}

export type AgencyDataSourceType =
  | "website"
  | "feed"
  | "public_record"
  | "manual"
  | "partner";

export interface AgencyDataSource {
  id: string;
  agencyId: string;
  fieldName: string;
  sourceType: AgencyDataSourceType;
  sourceUrl?: string | null;
  capturedValue?: string | null;
  capturedAt: string;
  confidence: number;
  isOfficial: boolean;
}

export type CrawlJobTrigger = "manual" | "scheduled" | "admin_expansion";

export type CrawlJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type CrawlTaskType = "discovery_page" | "property_page";

export type CrawlTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface CrawlJob {
  id: string;
  cityId?: string | null;
  agencyId: string;
  websiteSourceId: string;
  trigger: CrawlJobTrigger;
  status: CrawlJobStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  heartbeatAt?: string | null;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  offersFound: number;
  offersCreated: number;
  offersUpdated: number;
  offersUnchanged: number;
  errors: Array<{
    code: string;
    message: string;
    url?: string;
    timestamp: string;
  }>;
  safetyLockTriggered?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlTask {
  id: string;
  jobId: string;
  normalizedUrl: string;
  taskType: CrawlTaskType;
  status: CrawlTaskStatus;
  attemptCount: number;
  priority: number;
  availableAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  contentHash?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreRegisterAgencyInput {
  name: string;
  legalName?: string | null;
  cnpj?: string | null;
  creci?: string | null;
  logo?: string | null;
  website?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  commercialAddress?: string | null;
  cityId?: string | null;
  sourceUrl?: string | null;
}
