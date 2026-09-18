import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import type {
  Feed,
  FeedRun,
  FeedError,
  FeedWithLatestRun,
  FeedType,
  FeedStatus,
} from "@/types/feed";
import { VRSyncParser } from "./parser/vrsync-parser";
import { PropertyImporter, type ImportResult } from "./importer/property-importer";

type FeedInsert = Database["public"]["Tables"]["feeds"]["Insert"];

/**
 * Consulta os feeds configurados para a imobiliária
 */
export async function getAgencyFeeds(agencyId: string): Promise<FeedWithLatestRun[]> {
  const supabase = await createClient();

  const { data: feeds, error } = await supabase
    .from("feeds")
    .select(
      `
      *,
      feed_runs (
        id,
        feed_id,
        agency_id,
        started_at,
        finished_at,
        status,
        items_found,
        items_created,
        items_updated,
        items_deactivated,
        items_failed,
        error_message,
        created_at
      )
    `
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error || !feeds) {
    return [];
  }

  return feeds.map((f: any) => {
    // Ordena as execuções para obter a mais recente
    const rawRuns = (f.feed_runs || []) as any[];
    rawRuns.sort(
      (a: any, b: any) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    const firstRun = rawRuns[0];
    const latest: FeedRun | null = firstRun
      ? {
          id: firstRun.id,
          feedId: firstRun.feed_id,
          agencyId: firstRun.agency_id,
          startedAt: firstRun.started_at,
          finishedAt: firstRun.finished_at,
          status: firstRun.status,
          itemsFound: firstRun.items_found ?? 0,
          itemsCreated: firstRun.items_created ?? 0,
          itemsUpdated: firstRun.items_updated ?? 0,
          itemsDeactivated: firstRun.items_deactivated ?? 0,
          itemsFailed: firstRun.items_failed ?? 0,
          errorMessage: firstRun.error_message,
          createdAt: firstRun.created_at,
        }
      : null;

    return {
      id: f.id,
      agencyId: f.agency_id,
      type: f.type as FeedType,
      url: f.url,
      usernameEncrypted: f.username_encrypted,
      passwordEncrypted: f.password_encrypted,
      status: f.status as FeedStatus,
      syncIntervalMinutes: f.sync_interval_minutes,
      lastSyncAt: f.last_sync_at,
      nextSyncAt: f.next_sync_at,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      latestRun: latest,
    };
  });
}

/**
 * Consulta o histórico de execuções de um feed específico
 */
export async function getFeedRuns(feedId: string, limit = 20): Promise<FeedRun[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feed_runs")
    .select("*")
    .eq("feed_id", feedId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((r) => ({
    id: r.id,
    feedId: r.feed_id,
    agencyId: r.agency_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status as FeedRun["status"],
    itemsFound: r.items_found,
    itemsCreated: r.items_created,
    itemsUpdated: r.items_updated,
    itemsDeactivated: r.items_deactivated,
    itemsFailed: r.items_failed,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}

/**
 * Consulta os erros registrados em uma execução de feed
 */
export async function getFeedRunErrors(feedRunId: string): Promise<FeedError[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feed_errors")
    .select("*")
    .eq("feed_run_id", feedRunId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return data.map((e) => ({
    id: e.id,
    feedRunId: e.feed_run_id,
    externalId: e.external_id,
    errorType: e.error_type,
    message: e.message,
    payload: e.payload as Record<string, any> | null,
    createdAt: e.created_at,
  }));
}

/**
 * Cadastra ou atualiza um feed XML/VRSync
 */
export async function createOrUpdateFeed(
  agencyId: string,
  input: {
    id?: string;
    url: string;
    type?: FeedType;
    syncIntervalMinutes?: number;
    status?: FeedStatus;
  }
): Promise<Feed> {
  const supabase = await createClient();

  if (input.id) {
    const { data, error } = await supabase
      .from("feeds")
      .update({
        url: input.url,
        type: input.type || "vrsync",
        sync_interval_minutes: input.syncIntervalMinutes || 360,
        status: input.status || "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Falha ao atualizar feed.");
    }

    return {
      id: data.id,
      agencyId: data.agency_id,
      type: data.type as FeedType,
      url: data.url,
      status: data.status as FeedStatus,
      syncIntervalMinutes: data.sync_interval_minutes,
      lastSyncAt: data.last_sync_at,
      nextSyncAt: data.next_sync_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const insertData: FeedInsert = {
    agency_id: agencyId,
    url: input.url,
    type: input.type || "vrsync",
    sync_interval_minutes: input.syncIntervalMinutes || 360,
    status: input.status || "active",
  };

  const { data, error } = await supabase
    .from("feeds")
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Falha ao criar feed.");
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    type: data.type as FeedType,
    url: data.url,
    status: data.status as FeedStatus,
    syncIntervalMinutes: data.sync_interval_minutes,
    lastSyncAt: data.last_sync_at,
    nextSyncAt: data.next_sync_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

import { FeedSyncManager, type SyncExecutionReport } from "./sync/feed-sync-manager";

/**
 * Executa a sincronização manual de um feed acionada pelo usuário via FeedSyncManager
 */
export async function executeManualFeedSync(
  feedId: string,
  options?: {
    customXmlPayload?: string;
  }
): Promise<SyncExecutionReport> {
  const supabase = await createClient();
  const manager = new FeedSyncManager(supabase);

  return await manager.syncFeed(feedId, {
    customXmlPayload: options?.customXmlPayload,
    maxRetries: 3,
    timeoutMs: 60000,
  });
}

/**
 * Executa a sincronização automática de todos os feeds elegíveis no momento (usado pelo Cron / Background Worker)
 * Utiliza createAdminClient() (service_role) pois processos em background não possuem sessão de usuário.
 */
export async function syncEligibleFeeds(): Promise<SyncExecutionReport[]> {
  const supabase = createAdminClient();

  const nowIso = new Date().toISOString();

  // Localiza feeds ativos cuja próxima sincronização já venceu ou nunca foram sincronizados
  const { data: eligibleFeeds, error } = await supabase
    .from("feeds")
    .select("id, agency_id, url")
    .eq("status", "active")
    .or(`next_sync_at.is.null,next_sync_at.lte.${nowIso}`)
    .limit(10); // Lote de segurança de até 10 feeds por execução

  if (error || !eligibleFeeds || eligibleFeeds.length === 0) {
    return [];
  }

  const manager = new FeedSyncManager(supabase);
  const reports: SyncExecutionReport[] = [];

  for (const feed of eligibleFeeds) {
    const report = await manager.syncFeed(feed.id);
    reports.push(report);
  }

  return reports;
}
