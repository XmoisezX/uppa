import { NextRequest, NextResponse } from "next/server";
import { syncEligibleFeeds } from "@/features/feeds/services";

export const dynamic = "force-dynamic";

/**
 * Endpoint para acionamento periódico de sincronização automática de feeds (Cron / Webhook)
 * Conforme Seções 16, 24, 25, 26, 28, 29 e 89 do MASTER_PLAN.
 * Invocado via HTTP POST pelo Supabase Cron (pg_net / pg_cron) ou agendadores externos.
 */
export async function POST(request: NextRequest) {
  return handleSyncRequest(request);
}

/**
 * Mantido para retrocompatibilidade com agendadores legados e testes manuais
 */
export async function GET(request: NextRequest) {
  return handleSyncRequest(request);
}

async function handleSyncRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // FAIL CLOSED: Se CRON_SECRET não estiver configurado no servidor, o endpoint rejeita a execução com 500
  if (!cronSecret || cronSecret.trim() === "") {
    console.error(
      "[/api/feeds/sync] Configuração do CRON_SECRET ausente no ambiente do servidor."
    );
    return NextResponse.json(
      {
        error:
          "Serviço de sincronização de feeds indisponível devido a erro de configuração do servidor.",
      },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Acesso não autorizado ao cron de feeds. Cabeçalho Authorization ausente." },
      { status: 401 }
    );
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || parts[1] !== cronSecret.trim()) {
    return NextResponse.json(
      { error: "Acesso não autorizado ao cron de feeds. Token inválido." },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // syncEligibleFeeds utiliza internamente createAdminClient() (service_role) com FeedSyncManager
    const reports = await syncEligibleFeeds();

    return NextResponse.json(
      {
        message: "Sincronização periódica de feeds executada com sucesso.",
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
