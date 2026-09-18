"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Menu,
  X,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
  PlusCircle,
} from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                PORTAL<span className="text-indigo-600">IMO</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Brasil
              </span>
            </div>
          </Link>
        </div>

        {/* Navegação Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/comprar"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            Comprar
          </Link>
          <Link
            href="/alugar"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            Alugar
          </Link>
          <Link
            href="/cadastrar"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <PlusCircle className="h-4 w-4 text-indigo-500" />
            Anunciar imóvel
          </Link>
        </nav>

        {/* Ações / Auth Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/painel">
                <Button variant="outline" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Painel
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="gap-2 text-slate-600 hover:text-red-600"
                title="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sair</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/entrar">
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastrar">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Botão Menu Mobile */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col space-y-3 pt-2">
            <Link
              href="/comprar"
              className="px-3 py-2 text-base font-medium text-slate-700 rounded-lg hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              Comprar
            </Link>
            <Link
              href="/alugar"
              className="px-3 py-2 text-base font-medium text-slate-700 rounded-lg hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              Alugar
            </Link>
            <Link
              href="/cadastrar"
              className="px-3 py-2 text-base font-medium text-slate-700 rounded-lg hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <PlusCircle className="h-4 w-4 text-indigo-500" />
              Anunciar imóvel
            </Link>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/painel"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Acessar Painel
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/entrar"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="outline" className="w-full justify-center">
                      Entrar
                    </Button>
                  </Link>
                  <Link
                    href="/cadastrar"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white">
                      Cadastrar Grátis
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
