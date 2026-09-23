import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyWebsiteSources } from "@/features/website-import/services";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");

    if (!agencyId) {
      return NextResponse.json(
        { error: "agencyId é obrigatório" },
        { status: 400 }
      );
    }

    const sources = await getAgencyWebsiteSources(agencyId);

    return NextResponse.json({ sources }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao consultar fontes de website." },
      { status: 500 }
    );
  }
}
