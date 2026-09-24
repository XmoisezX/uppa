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
  WebsiteCrawlOptions,
  WebsiteCrawlProgress,
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
    rateLimiterOptions = { maxConcurrency: 6, delayBetweenRequestsMs: 50 }
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
   * Executa a varredura completa, coleta e sincronização progressiva em banco de dados
   */
  public async runFullCrawlAndSync(
    agencyId: string,
    websiteSourceId: string,
    options?: number | WebsiteCrawlOptions
  ): Promise<CrawlResult> {
    const startTime = Date.now();
    const crawlOpts: WebsiteCrawlOptions =
      typeof options === "number"
        ? { customMaxListings: options }
        : options || {};

    const customMaxListings = crawlOpts.customMaxListings || 10000;
    const batchSize = Math.max(1, crawlOpts.batchSize || 15);
    const startIndex = Math.max(0, crawlOpts.startIndex || 0);
    const onProgress = crawlOpts.onProgress;

    // Em ambientes serverless (Vercel), cada invocação tem limite rígido (ex: 60s no Hobby).
    // Usamos um orçamento seguro (45s) para encerrar o chunk de forma limpa e permitir que o cliente encadeie o próximo.
    const isServerless =
      process.env.VERCEL === "1" ||
      Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

    const defaultMaxDurationMs = isServerless ? 45000 : 0;
    const maxChunkDurationMs =
      typeof crawlOpts.maxChunkDurationMs === "number"
        ? crawlOpts.maxChunkDurationMs
        : defaultMaxDurationMs;

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

    // 3. Inicia ou reaproveita registro de execução em crawl_runs
    let crawlRunId = crawlOpts.crawlRunId;
    let initialCounts = { created: 0, updated: 0, failed: 0 };
    let crawlRunStartedAt = new Date().toISOString();

    if (crawlRunId) {
      const { data: existingRun } = await this.supabase
        .from("crawl_runs")
        .select("id, items_created, items_updated, items_failed, started_at")
        .eq("id", crawlRunId)
        .maybeSingle();

      if (existingRun) {
        initialCounts = {
          created: existingRun.items_created || 0,
          updated: existingRun.items_updated || 0,
          failed: existingRun.items_failed || 0,
        };
        crawlRunStartedAt = existingRun.started_at;
      }
    } else if (startIndex > 0) {
      // Se estamos retomando um índice > 0 e não foi passado crawlRunId, busca última em execução
      const { data: latestRunning } = await this.supabase
        .from("crawl_runs")
        .select("id, items_created, items_updated, items_failed, started_at")
        .eq("website_source_id", source.id)
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRunning) {
        crawlRunId = latestRunning.id;
        initialCounts = {
          created: latestRunning.items_created || 0,
          updated: latestRunning.items_updated || 0,
          failed: latestRunning.items_failed || 0,
        };
        crawlRunStartedAt = latestRunning.started_at;
      }
    }

    if (!crawlRunId) {
      const { data: crawlRun, error: runErr } = await this.supabase
        .from("crawl_runs")
        .insert({
          website_source_id: source.id,
          agency_id: agencyId,
          status: "running",
          started_at: crawlRunStartedAt,
        })
        .select("id")
        .single();

      if (runErr || !crawlRun) {
        throw new Error(`Falha ao registrar execução em crawl_runs: ${runErr?.message}`);
      }

      crawlRunId = crawlRun.id;
    }

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
      const allReferences: ListingReference[] = await connector.discoverListings(context);
      const references = allReferences.slice(0, customMaxListings);
      const totalToCrawl = references.length;

      // 6. Inicializa WebsitePropertyImporter com contadores cumulativos
      const importer = new WebsitePropertyImporter(this.supabase, {
        agencyId,
        websiteSourceId: source.id,
        crawlRunId,
        initialCounts,
      });
      await importer.init();

      // Notifica início com contagem total de referências e ponto de partida
      if (onProgress) {
        await onProgress({
          current: startIndex,
          total: totalToCrawl,
          created: initialCounts.created,
          updated: initialCounts.updated,
          failed: initialCounts.failed,
          crawlRunId,
          currentProperty:
            startIndex > 0
              ? `Continuando sincronização a partir do anúncio #${startIndex + 1}...`
              : "Iniciando download dos anúncios...",
        });
      }

      // 7. Coleta e Persistência Progressiva em Lotes
      // Cada lote é extraído, normalizado e persistido imediatamente no banco
      let processedCount = startIndex;

      for (let i = startIndex; i < totalToCrawl; i += batchSize) {
        // Verifica se houve pedido de cancelamento explícito (ex: clique no X)
        if (crawlOpts.abortSignal?.aborted) {
          console.log(`[WebsiteCrawler] Crawl cancelado pelo usuário no índice ${i}.`);
          break;
        }

        const refBatch = references.slice(i, Math.min(i + batchSize, totalToCrawl));

        // Extrai lote em paralelo controlado via DomainRateLimiter
        const fetchResults = await Promise.all(
          refBatch.map(async (ref) => {
            try {
              const prop = await this.rateLimiter.execute(() =>
                connector.fetchListing(ref, context)
              );
              return { success: true as const, prop, ref };
            } catch (itemErr: any) {
              return {
                success: false as const,
                ref,
                error: itemErr?.message || "Falha ao extrair anúncio",
              };
            }
          })
        );

        const successfulProps: NormalizedProperty[] = [];

        for (const res of fetchResults) {
          if (res.success) {
            successfulProps.push(res.prop);
          } else {
            await importer.recordError(
              res.ref.url,
              res.ref.externalIdHint || null,
              "fetch_listing_error",
              res.error
            );
          }
        }

        // Persiste lote de imóveis normalizados no banco imediatamente
        if (successfulProps.length > 0) {
          await importer.importBatch(successfulProps);
        }

        processedCount = Math.min(i + refBatch.length, totalToCrawl);
        const lastPropTitle =
          successfulProps[successfulProps.length - 1]?.title ||
          refBatch[refBatch.length - 1]?.url;

        // Atualização intermediária do registro em crawl_runs para visibilidade em tempo real
        try {
          await this.supabase
            .from("crawl_runs")
            .update({
              items_found: totalToCrawl,
              items_created: importer.itemsCreated,
              items_updated: importer.itemsUpdated,
              items_failed: importer.itemsFailed,
              pages_crawled: processedCount,
            })
            .eq("id", crawlRunId);
        } catch {
          // Ignora falha de atualização intermediária
        }

        // Notifica progresso em tempo real (para SSE)
        if (onProgress) {
          await onProgress({
            current: processedCount,
            total: totalToCrawl,
            created: importer.itemsCreated,
            updated: importer.itemsUpdated,
            failed: importer.itemsFailed,
            crawlRunId,
            currentProperty: lastPropTitle,
          });
        }

        // Verifica se atingiu o orçamento de tempo do chunk serverless
        const elapsed = Date.now() - startTime;
        const isLastBatch = processedCount >= totalToCrawl;

        if (maxChunkDurationMs > 0 && elapsed >= maxChunkDurationMs && !isLastBatch) {
          console.log(
            `[WebsiteCrawler] Limite de chunk serverless atingido (${elapsed}ms). Progresso: ${processedCount}/${totalToCrawl}. Concluindo chunk para continuação.`
          );

          return {
            success: true,
            crawlRunId,
            itemsFound: totalToCrawl,
            itemsCreated: importer.itemsCreated,
            itemsUpdated: importer.itemsUpdated,
            itemsDeactivated: 0,
            itemsFailed: importer.itemsFailed,
            pagesCrawled: processedCount,
            durationMs: elapsed,
            status: "running",
            isChunkComplete: true,
            nextStartIndex: processedCount,
          };
        }
      }

      if (crawlOpts.abortSignal?.aborted) {
        await this.supabase
          .from("crawl_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: "Importação cancelada pelo usuário.",
            duration_ms: Date.now() - startTime,
          })
          .eq("id", crawlRunId);

        return {
          success: false,
          crawlRunId,
          itemsFound: totalToCrawl,
          itemsCreated: importer.itemsCreated,
          itemsUpdated: importer.itemsUpdated,
          itemsDeactivated: 0,
          itemsFailed: importer.itemsFailed,
          pagesCrawled: importer.itemsCreated + importer.itemsUpdated,
          durationMs: Date.now() - startTime,
          status: "failed",
          error: "Importação cancelada pelo usuário.",
        };
      }

      // 8. Finalização segura com desativação em 2 etapas de imóveis ausentes
      // Desativação apenas ocorre se o ciclo foi concluído até o fim
      const skipDeactivation = startIndex > 0 && processedCount < totalToCrawl;
      const importResult = await importer.finalize(
        totalToCrawl,
        totalToCrawl,
        skipDeactivation,
        crawlRunStartedAt
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

