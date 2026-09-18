import { NextRequest, NextResponse } from "next/server";
import { syncEligibleFeeds } from "@/features/feeds/services";

/**
 * Endpoint para acionamento periódico de sincronização automática de feeds (Cron / Webhook)
 * Conforme Seção 89 do MASTER_PLAN.
 * Pode ser invocado por: Vercel Cron, Supabase pg_net / pg_cron ou agendadores externos.
 */
export async function GET(request: NextRequest) {
  return handleSyncRequest(request);
}

export async function POST(request: NextRequest) {
  return handleSyncRequest(request);
}

async function handleSyncRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // FAIL CLOSED: Se CRON_SECRET não estiver configurado no servidor, o endpoint rejeita a execução
  if (!cronSecret || cronSecret.trim() === "") {
    console.error("[/api/feeds/sync] Configuração do CRON_SECRET ausente no ambiente do servidor.");
    return NextResponse.json(
      { error: "Serviço de sincronização de feeds indisponível devido a erro de configuração do servidor." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Acesso não autorizado ao cron de feeds." },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const reports = await syncEligibleFeeds();

    return NextResponse.json(
      {
        message: "Sincronização periódica de feeds executada.",
        feedsProcessed: reports.length,
        durationMs: Date.now() - startTime,
        reports,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/feeds/sync] Falha na execução do cron:", err);
    return NextResponse.json(
      {
        error: err?.message || "Erro inesperado ao executar cron de feeds.",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
