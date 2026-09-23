import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  previewWebsiteImport,
  recordWebsiteAuthorization,
} from "@/features/website-import/services";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { agencyId, url, authorizationConfirmed } = body;

    if (!agencyId || !url) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios ausentes: agencyId e url." },
        { status: 400 }
      );
    }

    if (!authorizationConfirmed) {
      return NextResponse.json(
        {
          error:
            "É obrigatório confirmar que a imobiliária possui autorização explícita para coleta dos anúncios deste domínio.",
        },
        { status: 403 }
      );
    }

    // Extrai domínio
    let parsed: URL;
    try {
      parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "URL inválida." }, { status: 400 });
    }

    const domain = parsed.hostname.toLowerCase();

    // Registra autorização formal
    await recordWebsiteAuthorization(
      agencyId,
      domain,
      `Autorização formal declarada pelo usuário ${user.email || user.id} para coleta e sincronização contínua de anúncios do domínio ${domain} no portal UPPA.`
    );

    // Executa preview seguro
    const report = await previewWebsiteImport(agencyId, parsed.origin);

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/website-import/preview] Erro no preview:", err);
    return NextResponse.json(
      { error: err?.message || "Erro inesperado ao gerar preview do website." },
      { status: 500 }
    );
  }
}
