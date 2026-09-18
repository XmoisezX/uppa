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
import { VRSyncParser } from "../parser/vrsync-parser";
import {
  PropertyImporter,
  type ImportResult,
  type ImportProgressData,
} from "../importer/property-importer";

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
    const maxRetries = options?.maxRetries ?? 3;
    const timeoutMs = options?.timeoutMs ?? 60000;
    const lockDuration = options?.lockDurationSeconds ?? 900; // 15 minutos

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

      // 5. Parser puro em memória (VRSyncParser - Seção 27)
      const parser = new VRSyncParser();
      const { properties, parseErrors } = parser.parse(xmlContent);

      // 6. Persistência idempotente (PropertyImporter - Seção 28)
      const importer = new PropertyImporter(this.supabase, {
        agencyId: feed.agency_id,
        feedId: feed.id,
        feedRunId,
      });

      const importResult = await importer.importProperties(
        properties,
        parseErrors,
        options?.onProgress
      );

      // 7. Desativação segura em duas etapas de imóveis ausentes (Seção 29)
      const deactivatedCount = await this.handleMissingProperties(
        feed.agency_id,
        properties.map((p) => p.externalId)
      );

      // 8. Atualiza contadores e status final na execução (feed_runs)
      await this.supabase
        .from("feed_runs")
        .update({
          items_deactivated: deactivatedCount,
        })
        .eq("id", feedRunId);

      // 9. Atualiza agendamento da próxima execução e zera retry_count
      const syncIntervalMinutes = feed.sync_interval_minutes || 360;
      const nextSyncAt = new Date(
        Date.now() + syncIntervalMinutes * 60 * 1000
      ).toISOString();

      await this.supabase
        .from("feeds")
        .update({
          last_sync_at: new Date().toISOString(),
          next_sync_at: nextSyncAt,
          retry_count: 0,
          status: importResult.status === "failed" ? "error" : "active",
        })
        .eq("id", feed.id);

      return {
        success: importResult.status !== "failed",
        feedId,
        feedRunId,
        status: importResult.status,
        itemsFound: importResult.itemsFound,
        itemsCreated: importResult.itemsCreated,
        itemsUpdated: importResult.itemsUpdated,
        itemsDeactivated: deactivatedCount,
        itemsFailed: importResult.itemsFailed,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.error(`[FeedSyncManager] Falha crítica na sincronização do feed ${feedId}:`, err?.message);

      if (feedRunId) {
        await this.supabase
          .from("feed_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: err?.message || "Erro inesperado durante a sincronização.",
            items_failed: 1,
          })
          .eq("id", feedRunId);

        await this.supabase.from("feed_errors").insert({
          feed_run_id: feedRunId,
          error_type: "critical_sync_error",
          message: err?.message || "Falha crítica de execução",
          payload: { error: String(err) },
        });
      }

      // Incrementa retry_count no feed
      await this.supabase
        .from("feeds")
        .update({
          status: "error",
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
        error: err?.message || "Erro inesperado durante a sincronização.",
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

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "PortalImobiliario-AutoSync/1.0",
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
    presentExternalIds: string[]
  ): Promise<number> {
    const presentSet = new Set(presentExternalIds);

    // Consulta todos os imóveis da imobiliária originados do feed
    const { data: dbProperties, error } = await this.supabase
      .from("properties")
      .select("id, external_id, status, missing_from_feed_at")
      .eq("agency_id", agencyId)
      .eq("source", "vrsync");

    if (error || !dbProperties) {
      console.warn("[FeedSyncManager] Falha ao consultar imóveis para detecção de ausência:", error?.message);
      return 0;
    }

    let deactivatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const prop of dbProperties) {
      const isPresent = presentSet.has(prop.external_id);

      if (isPresent) {
        // =========================================================================
        // IMÓVEL PRESENTE NO FEED
        // Se estava marcado como ausente ou inativo, restaura para active
        // =========================================================================
        if (prop.missing_from_feed_at !== null || prop.status === "inactive") {
          await this.supabase
            .from("properties")
            .update({
              missing_from_feed_at: null,
              status: "active",
              updated_at: nowIso,
            })
            .eq("id", prop.id);
          // Histórico de reativação registrado automaticamente pela trigger trg_property_status_history no PostgreSQL
        }
      } else {
        // =========================================================================
        // IMÓVEL AUSENTE NO FEED
        // =========================================================================
        if (prop.missing_from_feed_at === null) {
          // ETAPA 1: Primeira ausência detectada -> apenas marca timestamp, MANTÉM ACTIVE
          await this.supabase
            .from("properties")
            .update({
              missing_from_feed_at: nowIso,
            })
            .eq("id", prop.id);
        } else {
          // ETAPA 2: Ausência confirmada em sincronização subsequente -> DESATIVA
          if (prop.status === "active") {
            await this.supabase
              .from("properties")
              .update({
                status: "inactive",
                updated_at: nowIso,
              })
              .eq("id", prop.id);

            // Histórico de desativação registrado automaticamente pela trigger trg_property_status_history no PostgreSQL
            deactivatedCount++;
          }
        }
      }
    }

    return deactivatedCount;
  }
}
