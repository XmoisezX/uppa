import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createOrUpdateWebsiteSource,
  confirmAndRunWebsiteImport,
} from "@/features/website-import/services";

export const dynamic = "force-dynamic";

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

    let agencyId: string | undefined;
    let websiteSourceId: string | undefined;
    let url: string | undefined;

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

      const body = await request.json();
      agencyId = body.agencyId;
      websiteSourceId = body.websiteSourceId;
      url = body.url;
    } else {
      const body = await request.json();
      agencyId = body.agencyId;
      websiteSourceId = body.websiteSourceId;
      url = body.url;
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

    // Executa a importação completa
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
