import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { syncEligibleFeeds } from "@/features/feeds/services";

export const dynamic = "force-dynamic";

/**
 * Comparação em tempo constante (timing-safe) para evitar ataques de timing na autenticação do cron
 */
function isTokenValidTimingSafe(providedToken: string, expectedToken: string): boolean {
  const bufA = Buffer.from(providedToken.trim(), "utf8");
  const bufB = Buffer.from(expectedToken.trim(), "utf8");

  if (bufA.length !== bufB.length) {
    // Mantém tempo constante antes de rejeitar
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Endpoint para acionamento periódico de sincronização automática de feeds (Cron / Webhook)
 * Conforme Seções 16, 24, 25, 26, 28, 29 e 89 do MASTER_PLAN.
 */
export async function POST(request: NextRequest) {
  return handleSyncRequest(request);
}

/**
 * Suportado para Vercel Cron (que envia GET por padrão) e agendadores externos
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
  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer" ||
    !isTokenValidTimingSafe(parts[1], cronSecret)
  ) {
    return NextResponse.json(
      { error: "Acesso não autorizado ao cron de feeds. Token inválido." },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // syncEligibleFeeds utiliza internamente createAdminClient() (service_role) com FeedSyncManager
    const { feedsEligible, reports } = await syncEligibleFeeds();

    const feedsProcessed = reports.length;
    const feedsSucceeded = reports.filter(
      (r) => r.status === "completed" || r.status === "completed_with_errors"
    ).length;
    const feedsFailed = reports.filter((r) => r.status === "failed").length;

    const itemsCreated = reports.reduce((acc, r) => acc + (r.itemsCreated || 0), 0);
    const itemsUpdated = reports.reduce((acc, r) => acc + (r.itemsUpdated || 0), 0);
    const itemsDeactivated = reports.reduce((acc, r) => acc + (r.itemsDeactivated || 0), 0);
    const itemsFailed = reports.reduce((acc, r) => acc + (r.itemsFailed || 0), 0);

    return NextResponse.json(
      {
        message: "Sincronização periódica de feeds executada com sucesso.",
        feedsEligible,
        feedsProcessed,
        feedsSucceeded,
        feedsFailed,
        itemsCreated,
        itemsUpdated,
        itemsDeactivated,
        itemsFailed,
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
