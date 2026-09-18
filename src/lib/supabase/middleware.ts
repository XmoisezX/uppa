import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza e sincroniza os cookies de autenticação do Supabase.
 * Permite renovação silenciosa de tokens e proteção de rotas privadas.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Rotas de API que usam service role ou autenticação própria por header
  if (
    pathname.startsWith("/api/feeds") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/internal")
  ) {
    return supabaseResponse;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.includes("auth-token") || c.name.startsWith("sb-")
  );

  // Se for rota privada (/painel) e não tem nenhum cookie de autenticação, redireciona de imediato
  if (!hasAuthCookie && pathname.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Se rota pública e sem cookie de autenticação, não precisa chamar rede externa
  if (
    !hasAuthCookie &&
    !pathname.startsWith("/painel") &&
    pathname !== "/entrar" &&
    pathname !== "/cadastrar"
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Atualiza a sessão e recupera o usuário com segurança
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteção da rota /painel: exige autenticação
  if (!user && pathname.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redireciona usuários já logados que acessarem páginas de login/cadastro
  if (user && (pathname === "/entrar" || pathname === "/cadastrar")) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
