/**
 * FeedSyncManager - Orquestrador central de sincronização automática de feeds
 * Conforme Seções 16, 24, 25, 26, 28, 29 e 89 do MASTER_PLAN:
 * - Lock concorrente atômico via RPC;
 * - Download com retry exponencial e timeout;
 * - Tolerância a falhas e logs detalhados;
 * - Desativação segura em duas etapas de imóveis ausentes;
 * - NUNCA apagar imóveis definitivamente.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { NormalizedProperty } from "@/types/feed";
import { VRSyncParser } from "../parser/vrsync-parser";
import { ChavesNaMaoParser } from "../parser/chaves-na-mao-parser";
import { detectFeedFormat } from "../parser/feed-detector";
import {
  PropertyImporter,
  type ImportProgressData,
} from "../importer/property-importer";
import { PropertyOfferIngestionService } from "@/features/offers";
import { FEED_SAFETY_CONFIG } from "../config";

export interface FeedSyncOptions {
  customXmlPayload?: string;
  maxRetries?: number;
  timeoutMs?: number;
  lockDurationSeconds?: number;
  onProgress?: (progress: ImportProgressData) => Promise<void> | void;
}

export interface SyncExecutionReport {
  success: boolean;
  isLocked?: boolean;
  feedId: string;
  feedRunId?: string;
  status: "completed" | "completed_with_errors" | "failed" | "locked";
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  itemsFailed: number;
  error?: string;
  durationMs: number;
}

export class FeedSyncManager {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Executa a sincronização segura de um feed com lock, retry e desativação em 2 etapas
   */
  public async syncFeed(
    feedId: string,
    options?: FeedSyncOptions
  ): Promise<SyncExecutionReport> {
    const startTime = Date.now();
    const maxRetries = options?.maxRetries ?? FEED_SAFETY_CONFIG.defaultMaxRetries;
    const timeoutMs = options?.timeoutMs ?? FEED_SAFETY_CONFIG.defaultTimeoutMs;
    const lockDuration = options?.lockDurationSeconds ?? FEED_SAFETY_CONFIG.defaultLockDurationSeconds;

    // =========================================================================
    // 1. LOCK ATÔMICO PARA IMPEDIR DUAS SINCRONIZAÇÕES SIMULTÂNEAS (Seção 89)
    // =========================================================================
    const { data: lockAcquired, error: lockError } = await this.supabase.rpc(
      "acquire_feed_sync_lock",
      {
        p_feed_id: feedId,
        p_lock_duration_seconds: lockDuration,
      }
    );

    if (lockError || !lockAcquired) {
      return {
        success: false,
        isLocked: true,
        feedId,
        status: "locked",
        itemsFound: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        itemsFailed: 0,
        error: "Sincronização já em andamento para este feed. Aguarde a finalização.",
        durationMs: Date.now() - startTime,
      };
    }

    let feedRunId: string | undefined = undefined;
    let currentFeedRecord: Database["public"]["Tables"]["feeds"]["Row"] | null = null;

    try {
      // 2. Busca dados do feed
      const { data: feed, error: feedFetchError } = await this.supabase
        .from("feeds")
        .select("*")
        .eq("id", feedId)
        .single();

      if (feedFetchError || !feed) {
        throw new Error("Feed não encontrado no banco de dados.");
      }

      currentFeedRecord = feed;

      // 3. Inicia registro de execução (feed_runs)
      const { data: feedRun, error: runInsertError } = await this.supabase
        .from("feed_runs")
        .insert({
          feed_id: feed.id,
          agency_id: feed.agency_id,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (runInsertError || !feedRun) {
        throw new Error(`Falha ao registrar execução: ${runInsertError?.message}`);
      }

      feedRunId = feedRun.id;

      // 4. Download do XML com Retry Exponencial e Timeout (Seção 89)
      let xmlContent = options?.customXmlPayload;

      if (!xmlContent) {
        xmlContent = await this.fetchFeedWithRetry(feed.url, maxRetries, timeoutMs);
      }

      // 5. Detecção automática de formato e Parser puro em memória (Seção 27)
      const feedFormat = detectFeedFormat(xmlContent);

      let properties: NormalizedProperty[] = [];
      let parseErrors: Array<{
        externalId?: string;
        errorType: string;
        message: string;
        payload?: any;
      }> = [];

      if (feedFormat === "vrsync") {
        const parser = new VRSyncParser();
        const result = parser.parse(xmlContent);
        properties = result.properties;
        parseErrors = result.parseErrors;
      } else if (feedFormat === "chaves_na_mao") {
        const parser = new ChavesNaMaoParser();
        const result = parser.parse(xmlContent);
        properties = result.properties;
        parseErrors = result.parseErrors;

        // Se o tipo do feed no banco não estiver como chaves_na_mao, atualiza automaticamente
        if (feed.type !== "chaves_na_mao") {
          await this.supabase
            .from("feeds")
            .update({ type: "chaves_na_mao", updated_at: new Date().toISOString() })
            .eq("id", feed.id);
        }
      } else {
        throw new Error(
          "Formato de feed XML não reconhecido. O conteúdo não corresponde aos padrões suportados (VRSync ou Chaves na Mão)."
        );
      }

      // 6. Persistência idempotente (PropertyImporter - Seção 28)
      const feedSource = (feedFormat === "chaves_na_mao" ? "chaves_na_mao" : "vrsync") as
        | "vrsync"
        | "chaves_na_mao";

      const importer = new PropertyImporter(this.supabase, {
        agencyId: feed.agency_id,
        feedId: feed.id,
        feedRunId,
        source: feedSource,
      });

      const importResult = await importer.importProperties(
        properties,
        parseErrors,
        options?.onProgress
      );

      // 7. Avaliação de segurança contra queda anormal de estoque ou feed vazio (Etapas 3 e 4 do MASTER_PLAN)
      const safetyCheck = await this.evaluateInventoryDropSafety(
        feed.id,
        feed.agency_id,
        feedSource,
        properties.length
      );

      let deactivatedCount = 0;
      let finalRunStatus = importResult.status;
      let safetyAlertMessage: string | null = null;

      if (safetyCheck.isSuspicious) {
        console.warn(`[FeedSyncManager] Trava de segurança acionada para o feed ${feed.id}: ${safetyCheck.reason}`);
        safetyAlertMessage = safetyCheck.reason || "Alerta de segurança: desativação em massa prevenida.";

        await this.supabase.from("feed_errors").insert({
          feed_run_id: feedRunId,
          error_type: properties.length === 0 ? "empty_feed_safety_lock" : "abnormal_drop_safety_lock",
          message: safetyCheck.reason || "Trava de segurança de estoque acionada",
          payload: {
            itemsFound: properties.length,
            baseline: safetyCheck.baseline,
            minimumInventoryRatio: FEED_SAFETY_CONFIG.minimumInventoryRatio,
            action: "mass_deactivation_prevented",
          },
        });

        if (finalRunStatus === "completed") {
          finalRunStatus = "completed_with_errors";
        }
      } else {
        // Desativação segura em duas etapas de imóveis ausentes SOMENTE se o feed for confiável (Seção 29)
        deactivatedCount = await this.handleMissingProperties(
          feed.agency_id,
          properties.map((p) => p.externalId),
          feedSource
        );
      }

      // 8. Atualiza contadores e status final na execução (feed_runs)
      await this.supabase
        .from("feed_runs")
        .update({
          items_deactivated: deactivatedCount,
          status: finalRunStatus,
          error_message: safetyAlertMessage ?? (importResult.itemsFailed > 0 ? `${importResult.itemsFailed} imóveis com erro de importação` : null),
        })
        .eq("id", feedRunId);

      // 9. Atualiza agendamento da próxima execução e zera retry_count
      const syncIntervalMinutes = feed.sync_interval_minutes || FEED_SAFETY_CONFIG.defaultSyncIntervalMinutes;
      const nextSyncAt = new Date(
        Date.now() + syncIntervalMinutes * 60 * 1000
      ).toISOString();

      await this.supabase
        .from("feeds")
        .update({
          last_sync_at: new Date().toISOString(),
          next_sync_at: nextSyncAt,
          retry_count: 0,
          status: finalRunStatus === "failed" ? "error" : "active",
        })
        .eq("id", feed.id);

      return {
        success: finalRunStatus !== "failed",
        feedId,
        feedRunId,
        status: finalRunStatus,
        itemsFound: importResult.itemsFound,
        itemsCreated: importResult.itemsCreated,
        itemsUpdated: importResult.itemsUpdated,
        itemsDeactivated: deactivatedCount,
        itemsFailed: importResult.itemsFailed,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro inesperado durante a sincronização.";
      console.error(`[FeedSyncManager] Falha crítica na sincronização do feed ${feedId}:`, errorMsg);

      if (feedRunId) {
        await this.supabase
          .from("feed_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: errorMsg,
            items_failed: 1,
          })
          .eq("id", feedRunId);

        await this.supabase.from("feed_errors").insert({
          feed_run_id: feedRunId,
          error_type: "critical_sync_error",
          message: errorMsg,
          payload: { error: String(err) },
        });
      }

      // Retry com backoff exponencial respeitando max_retries (Etapa 13)
      const feedObj = currentFeedRecord;
      const currentRetries = (feedObj?.retry_count ?? 0) + 1;
      const maxRetriesLimit = feedObj?.max_retries ?? FEED_SAFETY_CONFIG.defaultMaxRetries;
      const isMaxRetriesReached = currentRetries >= maxRetriesLimit;

      const backoffMinutes = Math.min(
        120,
        FEED_SAFETY_CONFIG.retryBackoffBaseMinutes * Math.pow(2, Math.max(0, currentRetries - 1))
      );
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

      await this.supabase
        .from("feeds")
        .update({
          status: isMaxRetriesReached ? "error" : "active",
          retry_count: currentRetries,
          next_sync_at: isMaxRetriesReached ? null : nextRetryAt,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", feedId);

      return {
        success: false,
        feedId,
        feedRunId,
        status: "failed",
        itemsFound: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        itemsFailed: 1,
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    } finally {
      // =========================================================================
      // LIBERAÇÃO GARANTIDA DO LOCK ATÔMICO
      // =========================================================================
      await this.supabase.rpc("release_feed_sync_lock", { p_feed_id: feedId });
    }
  }

  /**
   * Baixa o feed XML com retry exponencial e timeout controlado
   */
  private async fetchFeedWithRetry(
    url: string,
    maxRetries: number,
    timeoutMs: number
  ): Promise<string> {
    let lastError: any;
    let fetchUrl = url;
    if (url.includes("chavereserva.com") && !url.includes("_t=")) {
      const separator = url.includes("?") ? "&" : "?";
      fetchUrl = `${url}${separator}_t=${Date.now()}`;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(fetchUrl, {
          headers: {
            "User-Agent": "UPPA-AutoSync/1.0",
            Accept: "application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          // Erros 4xx não justificam retry (ex: 404, 401, 403)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Feed inacessível (HTTP ${response.status}: ${response.statusText})`);
          }
          throw new Error(`Erro do servidor do feed (HTTP ${response.status})`);
        }

        return await response.text();
      } catch (err: any) {
        lastError = err;
        console.warn(`[FeedSyncManager] Tentativa ${attempt}/${maxRetries} falhou: ${err?.message}`);

        // Se ainda restarem tentativas e não for erro permanente, aguarda com backoff exponencial
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(
      `Falha após ${maxRetries} tentativas de download do feed: ${lastError?.message || "Timeout de rede"}`
    );
  }

  /**
   * Implementa a desativação segura em duas etapas de imóveis ausentes (Seção 29 do MASTER_PLAN):
   * 1ª ausência: missing_from_feed_at = now() (permanece active)
   * 2ª ausência: status = inactive
   * Reaparecimento: status = active, missing_from_feed_at = null
   * NUNCA APAGAR DEFINITIVAMENTE (Zero DELETE)
   */
  private async handleMissingProperties(
    agencyId: string,
    presentExternalIds: string[],
    source: "vrsync" | "chaves_na_mao" = "vrsync"
  ): Promise<number> {
    const ingestionService = new PropertyOfferIngestionService(this.supabase);
    return await ingestionService.reconcileMissingOffers({
      agencyId,
      source,
      presentExternalIds,
    });
  }

  /**
   * Avalia métricas de integridade de estoque para evitar desativação massiva acidental
   * (Etapas 3 e 4 do MASTER_PLAN)
   */
  private async evaluateInventoryDropSafety(
    feedId: string,
    agencyId: string,
    source: "vrsync" | "chaves_na_mao",
    currentFoundCount: number
  ): Promise<{ isSuspicious: boolean; reason?: string; baseline: number }> {
    try {
      // 1. Quantidade de ofertas ativas no banco atualmente para esta imobiliária e fonte
      const { count: activeOffersCount } = await this.supabase
        .from("property_offers")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("source", source)
        .eq("status", "active");

      const activeDbCount = activeOffersCount ?? 0;

      // 2. Histórico da última corrida bem-sucedida deste feed
      const { data: previousRun } = await this.supabase
        .from("feed_runs")
        .select("items_found")
        .eq("feed_id", feedId)
        .in("status", ["completed", "completed_with_errors"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const baseline = Math.max(activeDbCount ?? 0, previousRun?.items_found ?? 0);

      // Caso 1: Feed retornou 0 imóveis, mas havia estoque ativo anterior
      if (currentFoundCount === 0 && baseline > 0) {
        return {
          isSuspicious: true,
          reason: `Trava de segurança: feed retornou 0 imóveis, mas existem ${baseline} imóveis no estoque ativo. Desativação em massa bloqueada.`,
          baseline,
        };
      }

      // Caso 2: Queda anormal em relação ao histórico recente (quando estoque histórico >= limiar mínimo)
      if (
        baseline >= FEED_SAFETY_CONFIG.minHistoricalItemsThreshold &&
        currentFoundCount / baseline < FEED_SAFETY_CONFIG.minimumInventoryRatio
      ) {
        const ratioPercent = Math.round((currentFoundCount / baseline) * 100);
        const thresholdPercent = Math.round(FEED_SAFETY_CONFIG.minimumInventoryRatio * 100);
        return {
          isSuspicious: true,
          reason: `Trava de segurança: queda anormal de estoque detectada (${currentFoundCount} encontrados vs histórico de ${baseline}, representando ${ratioPercent}% do total, abaixo da razão mínima de ${thresholdPercent}%). Desativação em massa bloqueada.`,
          baseline,
        };
      }

      return { isSuspicious: false, baseline };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[FeedSyncManager] Falha ao avaliar métricas de segurança de estoque:", errorMsg);
      return { isSuspicious: false, baseline: 0 };
    }
  }
}
