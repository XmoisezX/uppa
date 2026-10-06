import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route handler para troca de código de autorização por sessão Supabase
 * Utilizado em confirmação de e-mail e fluxos OAuth
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/painel";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let destination = next;
      if (next === "/painel" && data.session?.user?.id) {
        const { data: adminRecord } = await supabase
          .from("admin_users")
          .select("id")
          .eq("id", data.session.user.id)
          .eq("status", "active")
          .maybeSingle();

        if (adminRecord) {
          destination = "/admin";
        }
      }
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?error=auth-callback-error`);
}
