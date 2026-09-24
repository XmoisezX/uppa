/**
 * Crawl Job Manager
 * Gerenciador singleton de tarefas de varredura em segundo plano.
 * Permite que a importação continue executando no servidor mesmo que:
 * - O usuário feche o modal ou saia da tela
 * - A aba ou navegador seja fechado
 * - A conexão SSE caia ou atinja timeout de rede
 * A importação só é cancelada se o usuário clicar explicitamente para cancelar (ex: no 'X').
 */

import { confirmAndRunWebsiteImport } from "../services";
import type {
  CrawlResult,
  WebsiteCrawlOptions,
  WebsiteCrawlProgress,
} from "../types";

export interface ActiveCrawlJob {
  agencyId: string;
  websiteSourceId: string;
  startedAt: number;
  abortController: AbortController;
  lastProgress?: WebsiteCrawlProgress;
  promise: Promise<CrawlResult>;
  listeners: Set<(progress: WebsiteCrawlProgress) => void>;
  completionListeners: Set<(result: { success: boolean; result?: CrawlResult; error?: string }) => void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __activeWebsiteCrawlJobs: Map<string, ActiveCrawlJob> | undefined;
}

if (!globalThis.__activeWebsiteCrawlJobs) {
  globalThis.__activeWebsiteCrawlJobs = new Map<string, ActiveCrawlJob>();
}

const activeJobs = globalThis.__activeWebsiteCrawlJobs;

export class CrawlJobManager {
  /**
   * Obtém o job ativo para um determinado websiteSourceId
   */
  public static getJob(websiteSourceId: string): ActiveCrawlJob | undefined {
    return activeJobs.get(websiteSourceId);
  }

  /**
   * Verifica se existe um job em execução para a fonte
   */
  public static isRunning(websiteSourceId: string): boolean {
    return activeJobs.has(websiteSourceId);
  }

  /**
   * Retorna informações de todos os jobs atualmente em execução
   */
  public static getAllJobs(): {
    websiteSourceId: string;
    agencyId: string;
    startedAt: number;
    progress?: WebsiteCrawlProgress;
  }[] {
    const list: {
      websiteSourceId: string;
      agencyId: string;
      startedAt: number;
      progress?: WebsiteCrawlProgress;
    }[] = [];

    for (const [id, job] of activeJobs.entries()) {
      list.push({
        websiteSourceId: id,
        agencyId: job.agencyId,
        startedAt: job.startedAt,
        progress: job.lastProgress,
      });
    }

    return list;
  }

  /**
   * Inicia ou anexa a um job de crawling em segundo plano
   */
  public static startJob(
    agencyId: string,
    websiteSourceId: string,
    options?: {
      startIndex?: number;
      customMaxListings?: number;
      batchSize?: number;
    }
  ): ActiveCrawlJob {
    const existing = activeJobs.get(websiteSourceId);
    if (existing) {
      return existing;
    }

    const abortController = new AbortController();
    const listeners = new Set<(progress: WebsiteCrawlProgress) => void>();
    const completionListeners = new Set<
      (result: { success: boolean; result?: CrawlResult; error?: string }) => void
    >();

    const job: ActiveCrawlJob = {
      agencyId,
      websiteSourceId,
      startedAt: Date.now(),
      abortController,
      listeners,
      completionListeners,
      lastProgress: options?.startIndex
        ? {
            current: options.startIndex,
            total: 0,
            created: 0,
            updated: 0,
            failed: 0,
            currentProperty: "Retomando sincronização...",
          }
        : undefined,
      promise: null as any,
    };

    // Dispara a execução assíncrona em background desacoplada da requisição HTTP
    job.promise = (async () => {
      try {
        const crawlOpts: WebsiteCrawlOptions = {
          startIndex: options?.startIndex,
          customMaxListings: options?.customMaxListings,
          batchSize: options?.batchSize,
          abortSignal: abortController.signal,
          onProgress: (progress) => {
            job.lastProgress = progress;
            for (const listener of Array.from(listeners)) {
              try {
                listener(progress);
              } catch (e) {
                console.warn("[CrawlJobManager] Erro no listener de progresso:", e);
              }
            }
          },
        };

        const result = await confirmAndRunWebsiteImport(
          agencyId,
          websiteSourceId,
          crawlOpts
        );

        for (const compListener of Array.from(completionListeners)) {
          try {
            compListener({ success: result.success, result });
          } catch {}
        }

        return result;
      } catch (err: any) {
        console.error(
          `[CrawlJobManager] Erro no job de crawling para ${websiteSourceId}:`,
          err?.message
        );

        for (const compListener of Array.from(completionListeners)) {
          try {
            compListener({
              success: false,
              error: err?.message || "Erro durante o crawling em background.",
            });
          } catch {}
        }

        throw err;
      } finally {
        activeJobs.delete(websiteSourceId);
      }
    })();

    activeJobs.set(websiteSourceId, job);
    return job;
  }

  /**
   * Cancela formalmente um job em execução (ex: clique no X do modal)
   */
  public static cancelJob(websiteSourceId: string): boolean {
    const job = activeJobs.get(websiteSourceId);
    if (!job) return false;

    try {
      job.abortController.abort();
    } catch {}

    activeJobs.delete(websiteSourceId);
    return true;
  }

  /**
   * Inscreve um ouvinte para receber o progresso do job ativo
   */
  public static subscribe(
    websiteSourceId: string,
    onProgress: (progress: WebsiteCrawlProgress) => void,
    onComplete?: (result: { success: boolean; result?: CrawlResult; error?: string }) => void
  ): () => void {
    const job = activeJobs.get(websiteSourceId);
    if (!job) return () => {};

    job.listeners.add(onProgress);
    if (onComplete) job.completionListeners.add(onComplete);

    // Se já houver progresso acumulado, envia imediatamente
    if (job.lastProgress) {
      try {
        onProgress(job.lastProgress);
      } catch {}
    }

    return () => {
      job.listeners.delete(onProgress);
      if (onComplete) job.completionListeners.delete(onComplete);
    };
  }
}
