/**
 * Configurações centrais de segurança e integridade de sincronização de feeds.
 * Conforme MASTER_PLAN e requisitos de proteção contra desativação massiva indevida.
 */

export interface FeedSafetyConfig {
  /**
   * Razão mínima de inventário aceitável entre a nova execução e o histórico recente / estoque ativo.
   * Se a nova execução encontrar menos de (baseline * minimumInventoryRatio), a desativação em lote é suspensa
   * e a execução é marcada com alerta de segurança / suspeita.
   * Exemplo: 0.5 (50%).
   */
  minimumInventoryRatio: number;

  /**
   * Quantidade mínima de imóveis no histórico para que a regra de proporção seja avaliada.
   * Evita falsos positivos em imobiliárias pequenas com poucos imóveis.
   */
  minHistoricalItemsThreshold: number;

  /**
   * Número padrão de tentativas de rede para download do XML
   */
  defaultMaxRetries: number;

  /**
   * Timeout padrão em milissegundos para download do XML
   */
  defaultTimeoutMs: number;

  /**
   * Duração padrão do lock atômico em segundos
   */
  defaultLockDurationSeconds: number;

  /**
   * Intervalo padrão de sincronização em minutos caso não informado no feed
   */
  defaultSyncIntervalMinutes: number;

  /**
   * Tempo base de backoff em minutos para feeds em falha
   */
  retryBackoffBaseMinutes: number;
}

export const FEED_SAFETY_CONFIG: FeedSafetyConfig = {
  minimumInventoryRatio: 0.5, // 50%
  minHistoricalItemsThreshold: 10,
  defaultMaxRetries: 3,
  defaultTimeoutMs: 60000,
  defaultLockDurationSeconds: 900,
  defaultSyncIntervalMinutes: 360,
  retryBackoffBaseMinutes: 15,
};
