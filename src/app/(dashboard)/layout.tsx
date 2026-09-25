import React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  ExternalLink,
  Shield,
  ArrowRight,
  LogOut,
  Home,
  Layers,
  Users,
  MessageSquare,
  FileCode,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: {
    default: "Painel da Imobiliária | UPPA",
    template: "%s | UPPA",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirectTo=/painel");
  }

  const isSuperAdmin =
    user.email?.trim().toLowerCase() === "moiseztorres100@gmail.com";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Banner de Alternância para Super Admin */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 text-slate-950 px-4 py-2 text-xs font-semibold shadow-inner">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-amber-400 text-[10px] font-bold">
                👑
              </div>
              <span className="text-white font-medium">
                Você está conectado como <strong>Super Administrador</strong> ({user.email}).
                Este é o ambiente da sua Imobiliária.
              </span>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-slate-900 transition-colors shadow-sm"
            >
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Acessar Painel de Administração Master (/admin)</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Header Superior do Painel da Imobiliária */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Lado Esquerdo: Logo UPPA + Badge de Contexto */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center group" title="Ir para a página inicial">
              <Image
                src="/logo-uppa.png"
                alt="UPPA"
                width={130}
                height={42}
                priority
                className="h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:inline-block" />

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Painel da Imobiliária</span>
            </div>
          </div>

          {/* Navegação Central */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Link
              href="/painel"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Visão Geral
            </Link>
            <Link
              href="/painel/imoveis"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Meus Imóveis
            </Link>
            <Link
              href="/painel/leads"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Leads
            </Link>
            <Link
              href="/painel/integracoes"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              XML / Feeds
            </Link>
            <Link
              href="/painel/configuracoes"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Configurações
            </Link>
            <Link
              href="/painel/perfil"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors font-semibold"
            >
              Meu Perfil
            </Link>
          </nav>

          {/* Lado Direito: Ações & Perfil */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSuperAdmin && (
              <Link href="/admin">
                <Button
                  size="sm"
                  className="gap-1.5 bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-500/30 text-xs font-bold rounded-xl shadow-xs"
                >
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Painel</span> Admin
                </Button>
              </Link>
            )}

            <Link
              href="/painel/perfil"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:bg-slate-800 transition-colors"
              title="Meu Perfil de Corretor"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Perfil</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Portal</span>
            </Link>

            <form action="/api/auth/logout" method="POST">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-slate-500 hover:text-rose-600 rounded-xl text-xs cursor-pointer"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Painel */}
      <main className="flex-1">{children}</main>

      {/* Rodapé Simples do Painel */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UPPA — Sistema de Gestão da Imobiliária</span>
          {isSuperAdmin && (
            <Link
              href="/admin"
              className="text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
            >
              Alternar para Administração Master (/admin) &rarr;
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
