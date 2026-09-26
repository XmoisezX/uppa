/**
 * Tipos centrais do Módulo de Website Import da UPPA
 * Conforme MASTER_PLAN.md e arquitetura de aquisição de imóveis via website institucional
 */

import type { NormalizedProperty } from "@/types/feed";

export type WebsiteSourceStatus =
  | "active"
  | "paused"
  | "error"
  | "pending_authorization";

export type WebsiteAuthorizationStatus = "active" | "revoked";

export type CrawlRunStatus =
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface WebsiteSource {
  id: string;
  agencyId: string;
  baseUrl: string;
  domain: string;
  status: WebsiteSourceStatus;
  connectorType: string;
  crawlIntervalHours: number;
  metadata: Record<string, any>;
  lastCrawlAt?: string | null;
  nextCrawlAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteAuthorization {
  id: string;
  agencyId: string;
  domain: string;
  authorizedByUserId: string;
  authorizedAt: string;
  status: WebsiteAuthorizationStatus;
  termsVersion: string;
  declarationText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlRun {
  id: string;
  websiteSourceId: string;
  agencyId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: CrawlRunStatus;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  itemsFailed: number;
  pagesCrawled: number;
  durationMs?: number | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface CrawlError {
  id: string;
  crawlRunId: string;
  url?: string | null;
  externalId?: string | null;
  errorType: string;
  message: string;
  payload?: Record<string, any> | null;
  createdAt: string;
}

export interface ListingReference {
  url: string;
  externalIdHint?: string;
  sourceUpdatedAtHint?: string;
  lastmod?: string;
  titleHint?: string;
}

export interface ConnectorContext {
  agencyId: string;
  baseUrl: string;
  domain: string;
  sitemaps?: string[];
  listingPatterns?: string[];
  maxListings?: number;
  maxPages?: number;
  safeFetchOptions?: Record<string, any>;
}

export interface WebsiteConnector {
  id: string;
  name: string;
  canHandle(context: ConnectorContext): Promise<boolean>;
  discoverListings(context: ConnectorContext): Promise<ListingReference[]>;
  fetchListing(
    reference: ListingReference,
    context: ConnectorContext
  ): Promise<NormalizedProperty>;
}

export interface DetectionResult {
  domain: string;
  baseUrl: string;
  sitemaps: string[];
  listingPatterns: string[];
  hasJsonLd: boolean;
  detectedCms?: string | null;
  publicApiEndpoints: string[];
  recommendedConnector: "universal_structured_data" | "generic_website" | "jetimob" | string;
  sampleListingUrls: string[];
  status: "detected" | "unsupported";
  message?: string;
}

export interface PreviewReport {
  domain: string;
  detectedPlatform: string;
  pagesVisited: number;
  listingsFound: number;
  withPrice: number;
  withPhotos: number;
  withCode: number;
  withLocation: number;
  errors: string[];
  warnings: string[];
  sampleProperties: NormalizedProperty[];
}

export interface CrawlResult {
  success: boolean;
  crawlRunId: string;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  itemsFailed: number;
  pagesCrawled: number;
  durationMs: number;
  status: CrawlRunStatus;
  error?: string;
  isChunkComplete?: boolean;
  nextStartIndex?: number;
}

export interface WebsiteCrawlProgress {
  current: number;
  total: number;
  created: number;
  updated: number;
  failed: number;
  currentProperty?: string;
  crawlRunId?: string;
}

export interface WebsiteCrawlOptions {
  customMaxListings?: number;
  batchSize?: number;
  startIndex?: number;
  crawlRunId?: string;
  maxChunkDurationMs?: number;
  abortSignal?: AbortSignal;
  onProgress?: (progress: WebsiteCrawlProgress) => void | Promise<void>;
}

