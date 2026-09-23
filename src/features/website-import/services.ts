/**
 * Website Import Services
 * Camada de serviços para integração com o frontend e ações de backend
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  WebsiteSource,
  WebsiteAuthorization,
  WebsiteAuthorizationStatus,
  WebsiteSourceStatus,
  CrawlRun,
  PreviewReport,
  CrawlResult,
} from "./types";
import { WebsiteCrawler } from "./crawler/website-crawler";
import { WebsiteSourceDetector } from "./detector/website-source-detector";

/**
 * Registra a autorização formal da imobiliária para crawling do seu domínio
 */
export async function recordWebsiteAuthorization(
  agencyId: string,
  domain: string,
  declarationText: string
): Promise<WebsiteAuthorization> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const cleanDomain = domain.toLowerCase().trim();

  const { data, error } = await supabase
    .from("website_authorizations")
    .upsert(
      {
        agency_id: agencyId,
        domain: cleanDomain,
        authorized_by_user_id: user.id,
        authorized_at: new Date().toISOString(),
        status: "active",
        terms_version: "1.0",
        declaration_text: declarationText,
      },
      { onConflict: "agency_id,domain" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Falha ao registrar autorização: ${error?.message}`);
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    domain: data.domain,
    authorizedByUserId: data.authorized_by_user_id,
    authorizedAt: data.authorized_at,
    status: (data.status as WebsiteAuthorizationStatus) || "active",
    termsVersion: data.terms_version,
    declarationText: data.declaration_text,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Consulta autorização existente para um domínio
 */
export async function getWebsiteAuthorization(
  agencyId: string,
  domain: string
): Promise<WebsiteAuthorization | null> {
  const supabase = await createClient();
  const cleanDomain = domain.toLowerCase().trim();

  const { data, error } = await supabase
    .from("website_authorizations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("domain", cleanDomain)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    agencyId: data.agency_id,
    domain: data.domain,
    authorizedByUserId: data.authorized_by_user_id,
    authorizedAt: data.authorized_at,
    status: (data.status as WebsiteAuthorizationStatus) || "active",
    termsVersion: data.terms_version,
    declarationText: data.declaration_text,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Cadastra ou atualiza uma fonte de website para a imobiliária
 */
export async function createOrUpdateWebsiteSource(
  agencyId: string,
  baseUrl: string,
  connectorType?: string
): Promise<WebsiteSource> {
  const supabase = await createClient();

  let formattedUrl = baseUrl.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const parsed = new URL(formattedUrl);
  const domain = parsed.hostname.toLowerCase();

  // Executa detecção inicial para metadados
  const detector = new WebsiteSourceDetector();
  const detection = await detector.detect(formattedUrl);

  const selectedConnector =
    connectorType || detection.recommendedConnector || "universal_structured_data";

  const { data, error } = await supabase
    .from("website_sources")
    .upsert(
      {
        agency_id: agencyId,
        base_url: parsed.origin,
        domain,
        status: "active",
        connector_type: selectedConnector,
        metadata: {
          detectedCms: detection.detectedCms,
          sitemaps: detection.sitemaps,
          hasJsonLd: detection.hasJsonLd,
        },
        crawl_interval_hours: 24,
      },
      { onConflict: "agency_id,domain" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Falha ao registrar fonte de website: ${error?.message}`);
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    baseUrl: data.base_url,
    domain: data.domain,
    status: (data.status as WebsiteSourceStatus) || "active",
    connectorType: data.connector_type,
    crawlIntervalHours: data.crawl_interval_hours,
    metadata: (typeof data.metadata === "object" && data.metadata !== null ? data.metadata : {}) as Record<string, any>,
    lastCrawlAt: data.last_crawl_at,
    nextCrawlAt: data.next_crawl_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Consulta todas as fontes de websites configuradas para a imobiliária
 */
export async function getAgencyWebsiteSources(
  agencyId: string
): Promise<WebsiteSource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("website_sources")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((d: any) => ({
    id: d.id,
    agencyId: d.agency_id,
    baseUrl: d.base_url,
    domain: d.domain,
    status: d.status,
    connectorType: d.connector_type,
    crawlIntervalHours: d.crawl_interval_hours,
    metadata: d.metadata || {},
    lastCrawlAt: d.last_crawl_at,
    nextCrawlAt: d.next_crawl_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

/**
 * Gera relatório de preview com validação de qualidade e amostra de 5 imóveis
 */
export async function previewWebsiteImport(
  agencyId: string,
  baseUrl: string
): Promise<PreviewReport> {
  const adminClient = createAdminClient();
  const crawler = new WebsiteCrawler(adminClient);

  return crawler.runPreview(agencyId, baseUrl);
}

/**
 * Confirma a importação e executa o crawling / persistência completo
 */
export async function confirmAndRunWebsiteImport(
  agencyId: string,
  websiteSourceId: string
): Promise<CrawlResult> {
  const adminClient = createAdminClient();
  const crawler = new WebsiteCrawler(adminClient);

  return crawler.runFullCrawlAndSync(agencyId, websiteSourceId);
}

/**
 * Consulta o histórico de execuções de varredura (crawl_runs)
 */
export async function getCrawlRuns(
  websiteSourceId: string,
  limit = 15
): Promise<CrawlRun[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("crawl_runs")
    .select("*")
    .eq("website_source_id", websiteSourceId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    websiteSourceId: r.website_source_id,
    agencyId: r.agency_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status,
    itemsFound: r.items_found,
    itemsCreated: r.items_created,
    itemsUpdated: r.items_updated,
    itemsDeactivated: r.items_deactivated,
    itemsFailed: r.items_failed,
    pagesCrawled: r.pages_crawled,
    durationMs: r.duration_ms,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}
