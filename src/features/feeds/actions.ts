"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAgency } from "@/features/agencies/services";
import {
  executeManualFeedSync,
  createOrUpdateFeed,
  getFeedRunErrors,
} from "./services";
import type { SyncExecutionReport } from "./sync/feed-sync-manager";
import type { Feed, FeedError } from "@/types/feed";

export interface SyncFeedActionResult {
  success: boolean;
  result?: SyncExecutionReport;
  error?: string;
  isLocked?: boolean;
}

export interface SaveFeedActionResult {
  success: boolean;
  feed?: Feed;
  error?: string;
}

/**
 * Server Action para disparo manual da sincronização de feed pelo usuário
 */
export async function runManualFeedImportAction(
  feedId: string,
  customXmlPayload?: string
): Promise<SyncFeedActionResult> {
  try {
    const membership = await getCurrentUserAgency();
    if (!membership) {
      return { success: false, error: "Usuário não vinculado a uma imobiliária." };
    }

    const result = await executeManualFeedSync(feedId, { customXmlPayload });

    revalidatePath("/painel/integracoes");
    revalidatePath("/painel/imoveis");

    return { success: true, result };
  } catch (err: any) {
    console.error("[runManualFeedImportAction] Falha ao executar sincronização:", err);
    return {
      success: false,
      error: err?.message || "Erro inesperado ao sincronizar feed.",
    };
  }
}

/**
 * Server Action para criar ou atualizar configuração de feed
 */
export async function saveFeedAction(input: {
  id?: string;
  url: string;
  type?: FeedType;
  syncIntervalMinutes?: number;
}): Promise<SaveFeedActionResult> {
  try {
    const membership = await getCurrentUserAgency();
    if (!membership) {
      return { success: false, error: "Usuário não vinculado a uma imobiliária." };
    }

    if (!input.url || !input.url.startsWith("http")) {
      return { success: false, error: "URL inválida. Informe uma URL HTTP ou HTTPS completa." };
    }

    const feed = await createOrUpdateFeed(membership.agency.id, {
      id: input.id,
      url: input.url,
      type: input.type || "vrsync",
      syncIntervalMinutes: input.syncIntervalMinutes || 360,
    });

    revalidatePath("/painel/integracoes");

    return { success: true, feed };
  } catch (err: any) {
    console.error("[saveFeedAction] Erro ao salvar feed:", err);
    return {
      success: false,
      error: err?.message || "Erro ao salvar configuração do feed.",
    };
  }
}

/**
 * Server Action para buscar erros granulares de uma execução
 */
export async function getFeedRunErrorsAction(feedRunId: string): Promise<FeedError[]> {
  try {
    return await getFeedRunErrors(feedRunId);
  } catch (err) {
    console.error("[getFeedRunErrorsAction] Erro:", err);
    return [];
  }
}
