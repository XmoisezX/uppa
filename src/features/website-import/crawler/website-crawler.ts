/**
 * WebsiteCrawler
 * Orquestrador responsável pelo crawling controlado, limites de segurança,
 * prevenção de loops, rate limiting por domínio e observabilidade.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { NormalizedProperty } from "@/types/feed";
import type {
  ConnectorContext,
  CrawlResult,
  ListingReference,
  PreviewReport,
} from "../types";
import { defaultConnectorRegistry } from "../connectors/connector-registry";
import { DomainRateLimiter } from "../utils/rate-limiter";
import { WebsitePropertyImporter } from "../importer/website-property-importer";
import { WebsiteSourceDetector } from "../detector/website-source-detector";

export class UnauthorizedCrawlError extends Error {
  constructor(domain: string) {
    super(
      `[WebsiteCrawler] Crawling não autorizado para o domínio "${domain}". A imobiliária deve confirmar formalmente a autorização antes de iniciar.`
    );
    this.name = "UnauthorizedCrawlError";
  }
}

export class WebsiteCrawler {
  private supabase: SupabaseClient<Database>;
  private rateLimiter: DomainRateLimiter;

  constructor(
    supabase: SupabaseClient<Database>,
    rateLimiterOptions = { maxConcurrency: 2, delayBetweenRequestsMs: 350 }
  ) {
    this.supabase = supabase;
    this.rateLimiter = new DomainRateLimiter(rateLimiterOptions);
  }

  /**
   * Valida se a imobiliária possui autorização ativa para o domínio
   */
  public async ensureAuthorization(
    agencyId: string,
    domain: string
  ): Promise<boolean> {
    const cleanDomain = domain.toLowerCase().trim();

    const { data: auth, error } = await this.supabase
      .from("website_authorizations")
      .select("id, status")
      .eq("agency_id", agencyId)
      .eq("domain", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (error || !auth) {
      throw new UnauthorizedCrawlError(cleanDomain);
    }

    return true;
  }

  /**
   * Executa a geração do relatório de PREVIEW antes da importação definitiva
   * NÃO persiste imóveis no banco de dados
   */
  public async runPreview(
    agencyId: string,
    baseUrl: string
  ): Promise<PreviewReport> {
    const parsed = new URL(baseUrl);
    const domain = parsed.hostname.toLowerCase();

    // 1. Verificação obrigatória de autorização
    await this.ensureAuthorization(agencyId, domain);

    // 2. Detecção automática de fonte
    const detector = new WebsiteSourceDetector();
    const detection = await detector.detect(baseUrl);

    const context: ConnectorContext = {
      agencyId,
      baseUrl: detection.baseUrl,
      domain: detection.domain,
      sitemaps: detection.sitemaps,
      listingPatterns: detection.listingPatterns,
      maxListings: 10000,
      maxPages: 10,
    };

    // 3. Resolução de Conector
    const connector = await defaultConnectorRegistry.resolveConnector(
      context,
      detection.recommendedConnector
    );

    // 4. Descoberta de catálogo
    const references = await connector.discoverListings(context);

    const properties: NormalizedProperty[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const isActiveProperty = (p: NormalizedProperty) => {
      const lower = p.title.toLowerCase();
      return (
        !lower.includes("indisponível") &&
        !lower.includes("indisponivel") &&
        !lower.includes("não está mais disponível") &&
        !lower.includes("nao esta mais disponivel") &&
        !lower.includes("desativado") &&
        Boolean(p.price || p.rentPrice || (p.images && p.images.length > 0))
      );
    };

    // 5. Coleta segura com Rate Limiting (procura coletar até 5 imóveis ativos para a amostra)
    const maxAttempts = Math.min(references.length, 25);
    for (let i = 0; i < maxAttempts; i++) {
      if (properties.filter(isActiveProperty).length >= 5) break;
      const ref = references[i];
      try {
        const prop = await this.rateLimiter.execute(() =>
          connector.fetchListing(ref, context)
        );
        properties.push(prop);
      } catch (err: any) {
        errors.push(`Erro ao processar ${ref.url}: ${err?.message}`);
      }
    }

    // Ordena para que os imóveis ativos com fotos e preço apareçam prioritariamente na amostra
    const sampleProperties = properties
      .sort((a, b) => {
        const aScore =
          (isActiveProperty(a) ? 10 : 0) +
          (a.price || a.rentPrice ? 5 : 0) +
          (a.images.length > 0 ? 3 : 0);
        const bScore =
          (isActiveProperty(b) ? 10 : 0) +
          (b.price || b.rentPrice ? 5 : 0) +
          (b.images.length > 0 ? 3 : 0);
        return bScore - aScore;
      })
      .slice(0, 5);

    // 6. Avaliação de Métricas de Qualidade da amostra exibida
    let withPrice = 0;
    let withPhotos = 0;
    let withCode = 0;
    let withLocation = 0;

    for (const p of sampleProperties) {
      if ((p.price && p.price > 0) || (p.rentPrice && p.rentPrice > 0)) withPrice++;
      if (p.images && p.images.length > 0) withPhotos++;
      if (p.code && p.code.trim().length > 0) withCode++;
      if (p.address && (p.address.city || p.address.neighborhood || p.address.state))
        withLocation++;
    }

    if (references.length === 0) {
      warnings.push(
        "Nenhum anúncio foi encontrado no domínio. Verifique se o sitemap está acessível."
      );
    }
    if (sampleProperties.length > 0 && withPhotos === 0) {
      warnings.push("Atenção: Nenhum dos imóveis da amostra possui fotos identificadas.");
    }
    if (sampleProperties.length > 0 && withPrice === 0) {
      warnings.push("Atenção: Nenhum dos imóveis da amostra possui preço identificado.");
    }

    return {
      domain,
      detectedPlatform: detection.detectedCms || "Plataforma Genérica",
      pagesVisited: Math.min(properties.length + 1, 15),
      listingsFound: references.length,
      withPrice,
      withPhotos,
      withCode,
      withLocation,
      errors,
      warnings,
      sampleProperties,
    };
  }

  /**
   * Executa a varredura completa, coleta e sincronização no banco de dados
   */
  public async runFullCrawlAndSync(
    agencyId: string,
    websiteSourceId: string,
    customMaxListings = 2000
  ): Promise<CrawlResult> {
    const startTime = Date.now();

    // 1. Busca dados da fonte de website
    const { data: source, error: sourceErr } = await this.supabase
      .from("website_sources")
      .select("*")
      .eq("id", websiteSourceId)
      .eq("agency_id", agencyId)
      .single();

    if (sourceErr || !source) {
      throw new Error("Fonte de website não encontrada.");
    }

    // 2. Validação estrita de autorização
    await this.ensureAuthorization(agencyId, source.domain);

    // 3. Inicia registro de execução em crawl_runs
    const { data: crawlRun, error: runErr } = await this.supabase
      .from("crawl_runs")
      .insert({
        website_source_id: source.id,
        agency_id: agencyId,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runErr || !crawlRun) {
      throw new Error(`Falha ao registrar execução em crawl_runs: ${runErr?.message}`);
    }

    const crawlRunId = crawlRun.id;

    try {
      // 4. Detecção e contexto
      const detector = new WebsiteSourceDetector();
      const detection = await detector.detect(source.base_url);

      const context: ConnectorContext = {
        agencyId,
        baseUrl: source.base_url,
        domain: source.domain,
        sitemaps: detection.sitemaps,
        listingPatterns: detection.listingPatterns,
        maxListings: customMaxListings,
        maxPages: 50,
      };

      const connector = await defaultConnectorRegistry.resolveConnector(
        context,
        source.connector_type || detection.recommendedConnector
      );

      // 5. Descoberta de URLs de imóveis
      const references: ListingReference[] = await connector.discoverListings(context);

      const properties: NormalizedProperty[] = [];
      const itemErrors: {
        url?: string;
        externalId?: string;
        errorType: string;
        message: string;
        payload?: any;
      }[] = [];

      // 6. Coleta e Parsing individual com Rate Limiting e Isolamento de Falhas
      // UM IMÓVEL RUIM NÃO PODE PARAR O CRAWL!
      for (const ref of references) {
        try {
          const prop = await this.rateLimiter.execute(() =>
            connector.fetchListing(ref, context)
          );
          properties.push(prop);
        } catch (itemErr: any) {
          itemErrors.push({
            url: ref.url,
            externalId: ref.externalIdHint,
            errorType: "fetch_listing_error",
            message: itemErr?.message || "Falha ao extrair anúncio",
          });
        }
      }

      // 7. Persistência idempotente via WebsitePropertyImporter (NormalizedProperty[])
      const importer = new WebsitePropertyImporter(this.supabase, {
        agencyId,
        websiteSourceId: source.id,
        crawlRunId,
      });

      const importResult = await importer.importProperties(
        properties,
        itemErrors,
        references.length
      );

      return importResult;
    } catch (criticalErr: any) {
      console.error("[WebsiteCrawler] Falha crítica de execução:", criticalErr?.message);

      await this.supabase
        .from("crawl_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: criticalErr?.message || "Erro crítico durante varredura.",
          items_failed: 1,
          duration_ms: Date.now() - startTime,
        })
        .eq("id", crawlRunId);

      throw criticalErr;
    }
  }
}
