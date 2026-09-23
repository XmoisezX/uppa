import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createOrUpdateWebsiteSource,
  confirmAndRunWebsiteImport,
} from "@/features/website-import/services";

export const dynamic = "force-dynamic";
export const maxDuration = 900; // Permite execuções de até 15 minutos em ambientes compatíveis

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

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: any) => {
            try {
              const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            } catch (e) {
              console.error("[/api/website-import/sync] Erro ao enviar evento no stream:", e);
            }
          };

          // Heartbeat periódico (a cada 10 segundos) para manter o canal SSE aberto
          // e evitar timeouts agressivos de proxies (Cloudflare, Nginx, browser)
          const keepAliveTimer = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
            } catch {}
          }, 10000);

          try {
            sendEvent("init", {
              message:
                startIndex && startIndex > 0
                  ? `Retomando sincronização a partir do anúncio #${startIndex + 1}...`
                  : "Iniciando varredura e importação...",
              websiteSourceId: targetWebsiteSourceId,
              startIndex: startIndex || 0,
            });

            const result = await confirmAndRunWebsiteImport(
              targetAgencyId,
              targetWebsiteSourceId,
              {
                startIndex,
                onProgress: (progress) => {
                  sendEvent("progress", progress);
                },
              }
            );

            sendEvent("complete", {
              success: result.success,
              result,
            });
          } catch (err: any) {
            console.error("[/api/website-import/sync] Erro durante streaming:", err);
            sendEvent("error", {
              message: err?.message || "Erro inesperado durante a importação.",
            });
          } finally {
            clearInterval(keepAliveTimer);
            try {
              controller.close();
            } catch {}
          }
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
