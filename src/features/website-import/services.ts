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
  WebsiteCrawlOptions,
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
  const admin = createAdminClient();

  let formattedUrl = baseUrl.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const parsed = new URL(formattedUrl);
  const domain = parsed.hostname.toLowerCase();

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Validação de segurança anti-concorrente entre imobiliárias (Regra 8):
  // Não transferir domínio automaticamente entre agencies. Exigir resolução administrativa.
  const { data: conflictingSources } = await admin
    .from("website_sources")
    .select("id, agency_id, domain")
    .neq("agency_id", agencyId)
    .eq("domain", domain)
    .limit(1);

  if (conflictingSources && conflictingSources.length > 0) {
    throw new Error(
      "Este domínio já está vinculado a outra imobiliária no portal. Conflito requer resolução administrativa."
    );
  }

  const { data: conflictingAgency } = await admin
    .from("agencies")
    .select("id, name, claim_status, is_official_profile")
    .neq("id", agencyId)
    .ilike("website", `%${domain}%`)
    .eq("claim_status", "claimed")
    .limit(1)
    .maybeSingle();

  if (conflictingAgency) {
    throw new Error(
      `Este domínio já pertence ao perfil oficial de outra imobiliária (${conflictingAgency.name}).`
    );
  }

  // Executa detecção inicial para metadados
  const detector = new WebsiteSourceDetector();
  const detection = await detector.detect(formattedUrl);

  const selectedConnector =
    connectorType || detection.recommendedConnector || "universal_structured_data";

  // 2. Busca fonte existente da MESMA imobiliária com o MESMO domínio (Regras 2, 3 e 4)
  const { data: existingSource } = await admin
    .from("website_sources")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("domain", domain)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  let resultSourceData: any;

  if (existingSource) {
    // TRANSIÇÃO SEGURA DA FONTE EXISTENTE (Regra 3 & 4)
    // O ID da source permanece exatamente o mesmo, preservando estabilidade de ofertas e crawling.
    const existingMetadata =
      typeof existingSource.metadata === "object" && existingSource.metadata !== null
        ? existingSource.metadata
        : {};

    const previousOrigin = existingSource.ingestion_origin || "uppa_discovery";
    const isTransitioningFromDiscovery = previousOrigin === "uppa_discovery";

    const provenance = {
      ...(existingMetadata.provenance || {}),
      originalIngestionOrigin:
        existingMetadata.provenance?.originalIngestionOrigin || previousOrigin,
      discoveredAt:
        existingMetadata.provenance?.discoveredAt || existingSource.created_at,
      discoveredBy:
        existingMetadata.provenance?.discoveredBy || existingSource.created_by,
      agencyConfirmedAt: nowIso,
      agencyConfirmedBy: user?.id || null,
      transitionHistory: [
        ...(existingMetadata.provenance?.transitionHistory || []),
        {
          from: previousOrigin,
          to: "agency_managed",
          transitionedAt: nowIso,
          transitionedBy: user?.id || null,
          reason: isTransitioningFromDiscovery
            ? "agency_claim_confirmation"
            : "agency_configuration_update",
        },
      ],
    };

    const updatedMetadata = {
      ...existingMetadata,
      detectedCms: detection.detectedCms || existingMetadata.detectedCms,
      sitemaps:
        detection.sitemaps?.length ? detection.sitemaps : existingMetadata.sitemaps,
      hasJsonLd: detection.hasJsonLd ?? existingMetadata.hasJsonLd,
      provenance,
    };

    const { data: updated, error: updateErr } = await admin
      .from("website_sources")
      .update({
        base_url: parsed.origin,
        status: "active",
        connector_type: selectedConnector,
        metadata: updatedMetadata,
        ingestion_origin: "agency_managed",
        created_by: user?.id || existingSource.created_by,
        updated_at: nowIso,
      })
      .eq("id", existingSource.id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new Error(`Falha ao transicionar fonte existente: ${updateErr?.message}`);
    }

    resultSourceData = updated;

    // Registra auditoria administrativa da transição
    if (isTransitioningFromDiscovery) {
      await admin.from("admin_audit_logs").insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        action: "WEBSITE_SOURCE_TRANSITIONED",
        module: "website_sources",
        record_id: existingSource.id,
        record_title: domain,
        changes: {
          agency_id: agencyId,
          domain,
          previous_origin: previousOrigin,
          new_origin: "agency_managed",
          confirmed_by: user?.id || null,
          confirmed_at: nowIso,
        },
      });
    }
  } else {
    // NOVA FONTE PARA DOMÍNIO NÃO PREVIAMENTE REGISTRADO (Regra 7)
    const { data: inserted, error: insertErr } = await admin
      .from("website_sources")
      .insert({
        agency_id: agencyId,
        base_url: parsed.origin,
        domain,
        status: "active",
        connector_type: selectedConnector,
        metadata: {
          detectedCms: detection.detectedCms,
          sitemaps: detection.sitemaps,
          hasJsonLd: detection.hasJsonLd,
          provenance: {
            originalIngestionOrigin: "agency_managed",
            discoveredAt: null,
            discoveredBy: null,
            agencyConfirmedAt: nowIso,
            agencyConfirmedBy: user?.id || null,
            transitionHistory: [],
          },
        },
        crawl_interval_hours: 24,
        ingestion_origin: "agency_managed",
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Falha ao registrar nova fonte de website: ${insertErr?.message}`);
    }

    resultSourceData = inserted;
  }

  const meta =
    typeof resultSourceData.metadata === "object" && resultSourceData.metadata !== null
      ? resultSourceData.metadata
      : {};

  return {
    id: resultSourceData.id,
    agencyId: resultSourceData.agency_id,
    baseUrl: resultSourceData.base_url,
    domain: resultSourceData.domain,
    status: (resultSourceData.status as WebsiteSourceStatus) || "active",
    connectorType: resultSourceData.connector_type,
    crawlIntervalHours: resultSourceData.crawl_interval_hours,
    metadata: meta,
    provenance: meta.provenance,
    lastCrawlAt: resultSourceData.last_crawl_at,
    nextCrawlAt: resultSourceData.next_crawl_at,
    ingestionOrigin: resultSourceData.ingestion_origin || "agency_managed",
    createdBy: resultSourceData.created_by,
    cityId: resultSourceData.city_id,
    createdAt: resultSourceData.created_at,
    updatedAt: resultSourceData.updated_at,
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
    .eq("ingestion_origin", "agency_managed")
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
    ingestionOrigin: d.ingestion_origin || "agency_managed",
    createdBy: d.created_by,
    cityId: d.city_id,
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
  websiteSourceId: string,
  options?: WebsiteCrawlOptions
): Promise<CrawlResult> {
  const adminClient = createAdminClient();
  const crawler = new WebsiteCrawler(adminClient);

  return crawler.runFullCrawlAndSync(agencyId, websiteSourceId, options);
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
