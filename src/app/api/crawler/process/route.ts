import { NextRequest, NextResponse } from "next/server";
import { claimCrawlTasksBatch, completeCrawlTask } from "@/features/expansion/services/persistent-crawler.service";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Endpoint de processamento do crawler persistente protegido por CRON_SECRET (Seção 56)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Proteção rigorosa por CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = Number(body.batchSize) || 10;
    const jobId = body.jobId;

    const supabase = createAdminClient();

    // Se nenhum jobId específico foi fornecido, busca o próximo job ativo
    let targetJobId = jobId;
    if (!targetJobId) {
      const { data: nextJob } = await supabase
        .from("crawl_jobs" as any)
        .select("id")
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      targetJobId = (nextJob as any)?.id;
    }

    if (!targetJobId) {
      return NextResponse.json({
        message: "Nenhum job de crawler pendente no momento.",
        processed: 0,
      });
    }

    // Reivindica lote de tarefas atomicamente com SKIP LOCKED
    const tasks = await claimCrawlTasksBatch(targetJobId, batchSize);

    return NextResponse.json({
      jobId: targetJobId,
      tasksClaimed: tasks.length,
      tasks: tasks.map((t) => ({ id: t.id, url: t.normalizedUrl, status: t.status })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro no worker de crawler." }, { status: 500 });
  }
}
