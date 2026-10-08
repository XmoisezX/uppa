/**
 * Motor de Crawler Persistente e Tolerante a Falhas da UPPA (Seções 34 a 56)
 * Substitui a dependência de RAM do CrawlJobManager por persistência transacional no PostgreSQL.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { CrawlJob, CrawlTask, CrawlJobStatus } from "../types";
import { PropertyOfferIngestionService } from "@/features/offers";
import { computePropertyContentHash } from "@/features/website-import/utils/content-hash";

/**
 * Normaliza uma URL de anúncio ou catálogo removendo rastreadores e fragmentos (Seção 37)
 */
export function normalizeCrawlUrl(rawUrl: string, baseUrl: string): string {
  try {
    const parsed = new URL(rawUrl, baseUrl);
    // Remove parâmetros irrelevantes de tracking
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("utm_") ||
        lower === "fbclid" ||
        lower === "gclid" ||
        lower === "ref" ||
        lower === "source" ||
        lower === "_ga"
      ) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach((k) => parsed.searchParams.delete(k));

    // Remove hash fragment
    parsed.hash = "";

    // Remove trailing slash exceto na raiz
    let clean = parsed.toString();
    if (clean.endsWith("/") && parsed.pathname !== "/") {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Cria ou anexa a um Job Persistente de Crawler (Seções 34, 35 e 54)
 */
export async function createOrAttachCrawlJob(params: {
  websiteSourceId: string;
  agencyId: string;
  cityId?: string | null;
  trigger?: "manual" | "scheduled" | "admin_expansion";
  initialUrls?: string[];
}): Promise<{ job: CrawlJob; isExisting: boolean }> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Evita execuções duplicadas simultâneas da mesma fonte (Seção 54)
  const { data: activeJob } = await supabase
    .from("crawl_jobs" as any)
    .select("*")
    .eq("website_source_id", params.websiteSourceId)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeJob) {
    return { job: activeJob as any, isExisting: true };
  }

  // 2. Busca dados da fonte para validação de autorização
  const { data: source } = await supabase
    .from("website_sources")
    .select("id, domain, base_url, status, agency_id")
    .eq("id", params.websiteSourceId)
    .single();

  if (!source) {
    throw new Error("Fonte de website não encontrada.");
  }

  const jobId = crypto.randomUUID();

  // 3. Cria o job persistente
  const { data: createdJob, error: jobErr } = await supabase
    .from("crawl_jobs" as any)
    .insert({
      id: jobId,
      website_source_id: params.websiteSourceId,
      agency_id: params.agencyId,
      city_id: params.cityId || null,
      trigger: params.trigger || "manual",
      status: "pending",
      started_at: null,
      finished_at: null,
      heartbeat_at: nowIso,
      total_tasks: params.initialUrls?.length || 0,
      completed_tasks: 0,
      failed_tasks: 0,
      offers_found: 0,
      offers_created: 0,
      offers_updated: 0,
      offers_unchanged: 0,
      errors: [],
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select()
    .single();

  if (jobErr || !createdJob) {
    throw new Error(`Falha ao registrar job de crawler: ${jobErr?.message}`);
  }

  // 4. Enfileira tasks iniciais (com garantia de unicidade UNIQUE(job_id, normalized_url) - Seção 36 e 38)
  if (params.initialUrls && params.initialUrls.length > 0) {
    const tasksToInsert = params.initialUrls.map((url, idx) => ({
      job_id: jobId,
      normalized_url: normalizeCrawlUrl(url, source.base_url),
      task_type: idx === 0 ? "discovery_page" : "property_page",
      status: "pending",
      priority: idx === 0 ? 10 : 0,
      attempt_count: 0,
      available_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    await supabase.from("crawl_tasks" as any).upsert(tasksToInsert, {
      onConflict: "job_id,normalized_url",
      ignoreDuplicates: true,
    });
  }

  return { job: createdJob as any, isExisting: false };
}

/**
 * Reivindica tarefas atômica e concorrentemente com proteção FOR UPDATE SKIP LOCKED (Seções 39 e 40)
 */
export async function claimCrawlTasksBatch(
  jobId: string,
  batchSize = 10,
  leaseSeconds = 300
): Promise<CrawlTask[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const staleThreshold = new Date(Date.now() - leaseSeconds * 1000).toISOString();

  // 1. Tenta RPC nativa PostgreSQL se disponível
  const { data: rpcTasks, error: rpcErr } = await supabase.rpc("claim_crawl_tasks", {
    p_job_id: jobId,
    p_batch_size: batchSize,
    p_lease_seconds: leaseSeconds,
  });

  if (!rpcErr && Array.isArray(rpcTasks) && rpcTasks.length > 0) {
    return rpcTasks as CrawlTask[];
  }

  // 2. Fallback transacional com recuperação de lease / heartbeat expirado (Seção 40)
  await supabase
    .from("crawl_tasks" as any)
    .update({ status: "pending", started_at: null, updated_at: now })
    .eq("job_id", jobId)
    .eq("status", "running")
    .lt("started_at", staleThreshold);

  // Busca tarefas pendentes disponíveis
  const { data: candidates } = await supabase
    .from("crawl_tasks" as any)
    .select("*")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .lte("available_at", now)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const claimed: CrawlTask[] = [];

  // Compare-and-Swap atômico por linha
  for (const task of candidates as any[]) {
    const { data: updated } = await supabase
      .from("crawl_tasks" as any)
      .update({
        status: "running",
        attempt_count: (task.attempt_count || 0) + 1,
        started_at: now,
        updated_at: now,
      })
      .eq("id", task.id)
      .eq("status", "pending")
      .select();

    if (updated && updated.length > 0) {
      claimed.push(updated[0] as CrawlTask);
    }
  }

  // Atualiza heartbeat do job
  await supabase
    .from("crawl_jobs" as any)
    .update({ heartbeat_at: now, status: "running", started_at: now, updated_at: now })
    .eq("id", jobId)
    .eq("status", "pending");

  return claimed;
}

/**
 * Finaliza o processamento de uma task com sucesso ou erro sanitizado (Seções 41 e 59)
 */
export async function completeCrawlTask(params: {
  taskId: string;
  jobId: string;
  success: boolean;
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  contentHash?: string;
  isRetryable?: boolean;
}): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const isSuccess = params.success ?? (params as any).isSuccess ?? false;
  if (isSuccess) {
    await supabase
      .from("crawl_tasks" as any)
      .update({
        status: "completed",
        http_status: params.httpStatus || 200,
        content_hash: params.contentHash || null,
        finished_at: now,
        updated_at: now,
      })
      .eq("id", params.taskId);

    // Incrementa contagem de completed_tasks no job
    await supabase.rpc("increment_crawl_job_completed", { p_job_id: params.jobId });
  } else {
    // Avalia se o erro é temporário para aplicar retry com backoff (Seção 41)
    const isTemp = params.isRetryable ?? (
      params.errorCode === "timeout" ||
      params.httpStatus === 429 ||
      (params.httpStatus && params.httpStatus >= 500 && params.httpStatus <= 504)
    );

    const { data: currentTask } = await supabase
      .from("crawl_tasks" as any)
      .select("attempt_count")
      .eq("id", params.taskId)
      .single();

    const attempts = (currentTask as any)?.attempt_count || 1;

    if (isTemp && attempts < 3) {
      const retryDelayMs = attempts === 1 ? 60000 : 300000; // 1 min, depois 5 min
      const nextAvailable = new Date(Date.now() + retryDelayMs).toISOString();

      await supabase
        .from("crawl_tasks" as any)
        .update({
          status: "pending",
          available_at: nextAvailable,
          error_code: params.errorCode || "temporary_failure",
          error_message: params.errorMessage?.slice(0, 500) || "Erro temporário de conexão",
          http_status: params.httpStatus,
          updated_at: now,
        })
        .eq("id", params.taskId);
    } else {
      // Falha definitiva
      await supabase
        .from("crawl_tasks" as any)
        .update({
          status: "failed",
          error_code: params.errorCode || "permanent_failure",
          error_message: params.errorMessage?.slice(0, 500) || "Falha não recuperável",
          http_status: params.httpStatus,
          finished_at: now,
          updated_at: now,
        })
        .eq("id", params.taskId);

      await supabase.rpc("increment_crawl_job_failed", { p_job_id: params.jobId });
    }
  }
}

/**
 * Validação de Safety Locks antes da reconciliação de ausência (Seções 47, 48, 49 e 50)
 */
export function checkInventorySafetyLock(params: {
  baselineOffersCount: number;
  extractedOffersCount: number;
  jobStatus: CrawlJobStatus;
  hasErrors: boolean;
}): {
  allowedToReconcile: boolean;
  lockReason: string | null;
} {
  // 1. Job incompleto nunca reconcilia (Seção 49)
  if (params.jobStatus !== "completed") {
    return {
      allowedToReconcile: false,
      lockReason: `Job incompleto (status: ${params.jobStatus}): reconciliação bloqueada para proteger o estoque.`,
    };
  }

  // 2. Zero resultados com baseline existente (Seção 48)
  if (params.baselineOffersCount > 0 && params.extractedOffersCount === 0) {
    return {
      allowedToReconcile: false,
      lockReason: "empty_crawl_safety_lock: Baseline possuía estoque ativo mas o crawler retornou 0. Desativação em massa bloqueada.",
    };
  }

  // 3. Queda de inventário anormal (mais de 50% de ausência repentina - Seção 47)
  if (params.baselineOffersCount >= 20) {
    const dropRatio = (params.baselineOffersCount - params.extractedOffersCount) / params.baselineOffersCount;
    if (dropRatio > 0.50) {
      return {
        allowedToReconcile: false,
        lockReason: `abnormal_inventory_drop: Queda brusca de ${(dropRatio * 100).toFixed(0)}% do inventário (baseline=${params.baselineOffersCount}, extraído=${params.extractedOffersCount}). Estoque preservado.`,
      };
    }
  }

  return {
    allowedToReconcile: true,
    lockReason: null,
  };
}

/**
 * Pausa ou cancela um job de crawling (Seção 52)
 */
export async function updateCrawlJobStatus(
  jobId: string,
  newStatus: "paused" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("crawl_jobs" as any)
    .update({
      status: newStatus,
      finished_at: newStatus === "cancelled" ? now : null,
      updated_at: now,
    })
    .eq("id", jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
