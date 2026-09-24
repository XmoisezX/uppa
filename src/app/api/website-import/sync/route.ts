import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createOrUpdateWebsiteSource,
  confirmAndRunWebsiteImport,
} from "@/features/website-import/services";
import { CrawlJobManager } from "@/features/website-import/crawler/crawl-job-manager";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Máximo suportado pelo plano Hobby da Vercel (5 minutos)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const websiteSourceId = searchParams.get("websiteSourceId");

    if (!websiteSourceId) {
      const runningJobs = CrawlJobManager.getAllJobs();
      return NextResponse.json({
        runningJobs,
      });
    }

    const isRunning = CrawlJobManager.isRunning(websiteSourceId);
    const job = CrawlJobManager.getJob(websiteSourceId);

    const { data: latestRun } = await supabase
      .from("crawl_runs")
      .select("*")
      .eq("website_source_id", websiteSourceId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      running: isRunning || latestRun?.status === "running",
      jobProgress: job?.lastProgress || null,
      latestRun: latestRun || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao consultar status da sincronização." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    let isCronAuth = false;
    if (cronSecret && authHeader) {
      const parts = authHeader.trim().split(" ");
      if (
        parts.length === 2 &&
        parts[0].toLowerCase() === "bearer" &&
        parts[1] === cronSecret.trim()
      ) {
        isCronAuth = true;
      }
    }

    if (!isCronAuth) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Acesso não autorizado. Faça login para continuar." },
          { status: 401 }
        );
      }
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const agencyId: string | undefined = body.agencyId;
    let websiteSourceId: string | undefined = body.websiteSourceId;
    const url: string | undefined = body.url;
    const action: string | undefined = body.action;

    // AÇÃO DE CANCELAMENTO EXPLÍCITO (ex: clique no botão X ou parar importação)
    if (action === "cancel" && websiteSourceId) {
      console.log(`[/api/website-import/sync] Solicitado cancelamento da fonte ${websiteSourceId}`);
      CrawlJobManager.cancelJob(websiteSourceId);

      const adminSupabase = createAdminClient();
      await adminSupabase
        .from("crawl_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: "Importação interrompida pelo usuário.",
        })
        .eq("website_source_id", websiteSourceId)
        .eq("status", "running");

      return NextResponse.json({ success: true, cancelled: true });
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: "agencyId é obrigatório." },
        { status: 400 }
      );
    }

    // Se websiteSourceId não foi passado mas url foi, cria/atualiza a fonte
    if (!websiteSourceId && url) {
      const source = await createOrUpdateWebsiteSource(agencyId, url);
      websiteSourceId = source.id;
    }

    if (!websiteSourceId) {
      return NextResponse.json(
        { error: "websiteSourceId ou url é obrigatório." },
        { status: 400 }
      );
    }

    const startIndex: number | undefined =
      typeof body.startIndex === "number" && body.startIndex >= 0
        ? body.startIndex
        : undefined;

    const wantsStream =
      body.stream === true ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (wantsStream) {
      const encoder = new TextEncoder();
      const targetAgencyId = agencyId;
      const targetWebsiteSourceId = websiteSourceId;

      // Inicia ou anexa ao job em segundo plano (desacoplado da requisição HTTP)
      const job = CrawlJobManager.startJob(targetAgencyId, targetWebsiteSourceId, {
        startIndex,
      });

      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (event: string, data: any) => {
            try {
              const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            } catch (e) {
              console.warn("[/api/website-import/sync] Erro ao enviar evento no stream:", e);
            }
          };

          // Heartbeat periódico (a cada 10 segundos) para manter o canal SSE aberto
          const keepAliveTimer = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
            } catch {}
          }, 10000);

          sendEvent("init", {
            message:
              startIndex && startIndex > 0
                ? `Retomando sincronização a partir do anúncio #${startIndex + 1}...`
                : "Iniciando varredura e importação em segundo plano...",
            websiteSourceId: targetWebsiteSourceId,
            startIndex: startIndex || 0,
          });

          // Inscreve no gerenciador de background job
          const unsubscribe = CrawlJobManager.subscribe(
            targetWebsiteSourceId,
            (progress) => {
              sendEvent("progress", progress);
            },
            (completion) => {
              clearInterval(keepAliveTimer);
              if (completion.success) {
                sendEvent("complete", {
                  success: true,
                  result: completion.result,
                });
              } else {
                sendEvent("error", {
                  message: completion.error || "Erro durante o crawling em background.",
                });
              }
              try {
                controller.close();
              } catch {}
            }
          );

          // Se a conexão for abortada pelo cliente/navegador, cancelamos apenas a inscrição do stream,
          // NUNCA o job de segundo plano no servidor!
          request.signal.addEventListener("abort", () => {
            console.log(
              `[/api/website-import/sync] Stream SSE desconectado pelo cliente para ${targetWebsiteSourceId}. O job continua rodando em segundo plano no servidor.`
            );
            clearInterval(keepAliveTimer);
            unsubscribe();
            try {
              controller.close();
            } catch {}
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Execução síncrona tradicional para chamadas que não utilizam streaming
    const result = await confirmAndRunWebsiteImport(agencyId, websiteSourceId);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/website-import/sync] Erro na execução do crawling:", err);
    return NextResponse.json(
      { error: err?.message || "Erro inesperado ao sincronizar website." },
      { status: 500 }
    );
  }
}
