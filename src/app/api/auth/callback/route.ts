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
      if (
        next === "/painel" &&
        data.session?.user?.email?.trim().toLowerCase() === "moiseztorres100@gmail.com"
      ) {
        destination = "/admin";
      }
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?error=auth-callback-error`);
}
