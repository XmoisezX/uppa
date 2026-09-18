import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { FeedSyncManager } from "@/features/feeds/sync/feed-sync-manager";
import type { ImportProgressData } from "@/features/feeds/importer/property-importer";

export const dynamic = "force-dynamic";

/**
 * Route Handler com suporte a Streaming (Server-Sent Events) para:
 * 1. Upload e importação direta de arquivos XML locais (VRSync);
 * 2. Sincronização em tempo real de feeds existentes por URL.
 */
export async function POST(request: NextRequest) {
  try {
    const membership = await getCurrentUserAgency();
    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado ou sem vínculo com imobiliária." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const agencyId = membership.agency.id;
    const contentType = request.headers.get("content-type") || "";

    let xmlPayload: string | undefined;
    let feedId: string | undefined;
    let filename: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (file && typeof file.text === "function") {
        xmlPayload = await file.text();
        filename = file.name;
      }
      const rawPayload = formData.get("xmlPayload");
      if (typeof rawPayload === "string" && rawPayload.trim()) {
        xmlPayload = rawPayload;
      }
      const rawFeedId = formData.get("feedId");
      if (typeof rawFeedId === "string" && rawFeedId.trim()) {
        feedId = rawFeedId;
      }
      const rawFilename = formData.get("filename");
      if (typeof rawFilename === "string" && rawFilename.trim()) {
        filename = rawFilename;
      }
    } else {
      try {
        const body = await request.json();
        xmlPayload = body.xmlPayload;
        feedId = body.feedId;
        filename = body.filename;
      } catch {
        // Body não é JSON válido
      }
    }

    if (!feedId && !xmlPayload) {
      return new Response(
        JSON.stringify({
          error: "Nenhum arquivo XML enviado ou ID de feed fornecido.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createClient();

    // Se for upload direto de arquivo e não tiver feedId, localiza ou cria o registro em feeds
    let targetFeedId = feedId;
    if (!targetFeedId) {
      const displayFilename = filename || "arquivo_local.xml";
      const uploadUrl = `upload://${displayFilename}`;

      const { data: existingUploadFeed } = await supabase
        .from("feeds")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("type", "vrsync")
        .ilike("url", "upload://%")
        .limit(1)
        .maybeSingle();

      if (existingUploadFeed) {
        targetFeedId = existingUploadFeed.id;
        // Atualiza a URL com o nome do arquivo atual
        await supabase
          .from("feeds")
          .update({
            url: uploadUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetFeedId);
      } else {
        const { data: newFeed, error: feedErr } = await supabase
          .from("feeds")
          .insert({
            agency_id: agencyId,
            url: uploadUrl,
            type: "vrsync",
            status: "active",
            sync_interval_minutes: 360,
          })
          .select("id")
          .single();

        if (feedErr || !newFeed) {
          return new Response(
            JSON.stringify({ error: `Falha ao registrar feed: ${feedErr?.message}` }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        targetFeedId = newFeed.id;
      }
    }

    // Inicializa streaming Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          try {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch (e) {
            console.error("[import-stream] Erro ao enviar evento no stream:", e);
          }
        };

        try {
          sendEvent("init", {
            message: "Iniciando processamento...",
            feedId: targetFeedId,
            filename: filename || null,
          });

          const syncManager = new FeedSyncManager(supabase);

          // Executa sincronização repassando callback onProgress em tempo real
          const report = await syncManager.syncFeed(targetFeedId, {
            customXmlPayload: xmlPayload,
            onProgress: (progress: ImportProgressData) => {
              sendEvent("progress", progress);
            },
          });

          sendEvent("complete", {
            success: report.success,
            status: report.status,
            report,
          });
        } catch (err: any) {
          console.error("[import-stream] Erro durante streaming:", err);
          sendEvent("error", {
            message: err?.message || "Erro inesperado durante a importação.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Desativa buffering no Nginx caso utilizado
      },
    });
  } catch (err: any) {
    console.error("[POST /api/feeds/import-stream] Erro fatal:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro interno do servidor." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
