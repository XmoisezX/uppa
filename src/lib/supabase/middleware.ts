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

  const isProtectedRoute =
    pathname.startsWith("/painel") || pathname.startsWith("/admin");
  const isAuthRoute = pathname === "/entrar" || pathname === "/cadastrar";

  // Se for rota pública (qualquer rota fora de /painel, /admin, /entrar, /cadastrar),
  // não bloqueia a requisição chamando rede externa do Supabase Auth.
  if (!isProtectedRoute && !isAuthRoute) {
    return supabaseResponse;
  }

  // Se for rota privada (/painel ou /admin) e não tem nenhum cookie de autenticação, redireciona de imediato
  if (!hasAuthCookie && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Se for página de login/cadastro e não tem cookie, exibe a página sem consultar rede
  if (!hasAuthCookie && isAuthRoute) {
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

  // Proteção das rotas privadas (/painel e /admin): exige autenticação
  if (
    !user &&
    (pathname.startsWith("/painel") || pathname.startsWith("/admin"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redireciona usuários já logados que acessarem páginas de login/cadastro
  if (user && (pathname === "/entrar" || pathname === "/cadastrar")) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    const url = request.nextUrl.clone();
    
    if (redirectTo && !redirectTo.startsWith("/entrar") && !redirectTo.startsWith("/cadastrar")) {
      url.pathname = redirectTo;
      url.search = "";
      return NextResponse.redirect(url);
    }

    const email = user.email?.toLowerCase() || "";
    if (email === "moiseztorres100@gmail.com") {
      url.pathname = "/admin";
    } else {
      url.pathname = "/painel";
    }
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
