/**
 * Tipos do Módulo de Feeds e Importação definidos no MASTER_PLAN.md (Seções 23, 24, 25, 27 e 88)
 */

import type { PropertyType, TransactionType, MediaType } from "./property";

export type FeedType = "vrsync" | "custom_xml" | "chaves_na_mao" | "api";
export type FeedStatus = "active" | "paused" | "error";
export type FeedRunStatus = "running" | "completed" | "completed_with_errors" | "failed";

export interface Feed {
  id: string;
  agencyId: string;
  type: FeedType;
  url: string;
  usernameEncrypted?: string | null;
  passwordEncrypted?: string | null;
  status: FeedStatus;
  syncIntervalMinutes: number;
  lastSyncAt?: string | null;
  nextSyncAt?: string | null;
  syncLockedUntil?: string | null;
  retryCount?: number;
  maxRetries?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedRun {
  id: string;
  feedId: string;
  agencyId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: FeedRunStatus;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  itemsFailed: number;
  errorMessage?: string | null;
  createdAt: string;
}

export interface FeedError {
  id: string;
  feedRunId: string;
  externalId?: string | null;
  errorType: string;
  message: string;
  payload?: Record<string, any> | null;
  createdAt: string;
}

/**
 * Normalização intermediária conforme Seção 27 do MASTER_PLAN
 * O parser transforma o XML/formato proprietário neste tipo em memória,
 * sem escrever diretamente no banco.
 */
export interface NormalizedAddress {
  country?: string;
  state?: string; // UF ou nome do estado (ex: "SP", "São Paulo")
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  addressVisible?: boolean;
}

export interface NormalizedMedia {
  type: MediaType;
  url: string;
  caption?: string;
  isCover?: boolean;
}

export interface NormalizedProperty {
  externalId: string;
  code?: string; // Código interno / codigo_cliente opcional
  sourceUrl?: string; // link_cliente / URL de origem
  title: string;
  description?: string;

  transactionType: TransactionType;
  propertyType: PropertyType;

  price?: number;
  rentPrice?: number;
  condominiumFee?: number;
  iptu?: number;

  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  parkingSpaces?: number;

  usableArea?: number;
  totalArea?: number;
  lotArea?: number;

  address: NormalizedAddress;
  images: NormalizedMedia[];
  features: string[];

  sourceUpdatedAt?: Date | string;
}

export interface FeedWithLatestRun extends Feed {
  latestRun?: FeedRun | null;
}
