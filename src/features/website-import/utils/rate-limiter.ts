/**
 * Rate Limiter Responsável para Crawling de Websites
 * Garante concorrência limitada e delay configurável entre requisições
 * para evitar sobrecarga no servidor da imobiliária.
 */

export interface RateLimiterOptions {
  maxConcurrency?: number; // Requisições simultâneas por domínio (padrão: 2)
  delayBetweenRequestsMs?: number; // Intervalo mínimo entre requisições (padrão: 350ms)
}

export class DomainRateLimiter {
  private maxConcurrency: number;
  private delayBetweenRequestsMs: number;
  private currentRunning = 0;
  private lastRequestTimestamp = 0;
  private queue: Array<() => void> = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 2;
    this.delayBetweenRequestsMs = options.delayBetweenRequestsMs ?? 350;
  }

  /**
   * Executa uma função assíncrona respeitando o limite de concorrência e delay
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireSlot();

    try {
      // Garante delay mínimo desde a última requisição
      const now = Date.now();
      const elapsed = now - this.lastRequestTimestamp;
      if (elapsed < this.delayBetweenRequestsMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayBetweenRequestsMs - elapsed)
        );
      }
      this.lastRequestTimestamp = Date.now();

      return await fn();
    } finally {
      this.releaseSlot();
    }
  }

  private acquireSlot(): Promise<void> {
    if (this.currentRunning < this.maxConcurrency) {
      this.currentRunning++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.currentRunning++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.currentRunning--;

    if (this.queue.length > 0 && this.currentRunning < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
