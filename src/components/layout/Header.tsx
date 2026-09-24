"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Heart,
  PlusCircle,
  Building,
  Key,
  Briefcase,
  Layers,
  Shield,
} from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imoveisDropdownOpen, setImoveisDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === "moiseztorres100@gmail.com";

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setImoveisDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fecha menus ao trocar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
    setImoveisDropdownOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <div className="container flex h-16 items-center justify-between">
        {/* Lado Esquerdo: Marca UPPA + Navegação Principal */}
        <div className="flex items-center gap-8">
          {/* Logo UPPA */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              UPPA
            </span>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-semibold">
            {/* Dropdown "Comprar" */}
            <div className="relative group">
              <Link
                href="/comprar"
                className="flex items-center gap-1 py-2 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
              >
                <span>Comprar</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform duration-150 group-hover:rotate-180" />
              </Link>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute top-full left-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50">
                <Link
                  href="/comprar?propertyType=apartment"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Apartamentos à venda
                </Link>
                <Link
                  href="/comprar?propertyType=house"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Casas à venda
                </Link>
                <Link
                  href="/comprar?propertyType=condo_house"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Casas em condomínio
                </Link>
                <Link
                  href="/comprar?propertyType=land"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Terrenos e Lotes
                </Link>
                <Link
                  href="/comprar?propertyType=commercial"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Imóveis comerciais
                </Link>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  href="/comprar"
                  className="block px-3 py-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ver todos à venda &rarr;
                </Link>
              </div>
            </div>

            {/* Dropdown "Alugar" */}
            <div className="relative group">
              <Link
                href="/alugar"
                className="flex items-center gap-1 py-2 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
              >
                <span>Alugar</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform duration-150 group-hover:rotate-180" />
              </Link>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute top-full left-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50">
                <Link
                  href="/alugar?propertyType=apartment"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Apartamentos para alugar
                </Link>
                <Link
                  href="/alugar?propertyType=house"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Casas para alugar
                </Link>
                <Link
                  href="/alugar?propertyType=studio"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Kitnets e Studios
                </Link>
                <Link
                  href="/alugar?propertyType=commercial"
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Salas e Comerciais
                </Link>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  href="/alugar"
                  className="block px-3 py-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ver todos para alugar &rarr;
                </Link>
              </div>
            </div>

            {/* Lançamentos */}
            <Link
              href="/comprar?propertyType=condo_house"
              className="text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
            >
              Lançamentos
            </Link>

            {/* Explorar */}
            <Link
              href="/#cidades"
              className="text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
            >
              Explorar
            </Link>

            {/* Anunciar */}
            <Link
              href="/cadastrar"
              className="text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
            >
              Anunciar
            </Link>
          </nav>
        </div>

        {/* Lado Direito: Favoritos + Auth */}
        <div className="hidden md:flex items-center gap-3">
          {/* Botão Favoritos */}
          <Link
            href={user ? "/painel" : "/entrar"}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Meus Favoritos"
          >
            <Heart className="h-4 w-4 text-slate-500 hover:text-rose-600" />
            <span>Favoritos</span>
          </Link>

          {/* Autenticação */}
          {user ? (
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Link href="/admin">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-500/40 text-xs font-bold rounded-xl shadow-xs"
                    title="Administração Geral do Portal (Master)"
                  >
                    <Shield className="h-3.5 w-3.5 text-amber-400" />
                    Painel Admin
                  </Button>
                </Link>
              )}
              <Link href="/painel">
                <Button variant="outline" size="sm" className="gap-2 text-xs font-bold rounded-xl" title="Painel da sua Imobiliária">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Painel Imobiliária
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-slate-600 hover:text-rose-600 rounded-xl"
                title="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sair</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/entrar">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-700 hover:text-indigo-600 rounded-xl">
                  <UserIcon className="h-3.5 w-3.5 mr-1" />
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastrar">
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Botão Menu Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href={user ? "/painel" : "/entrar"}
            className="p-2 text-slate-700 hover:text-indigo-600 dark:text-slate-300"
            title="Favoritos"
          >
            <Heart className="h-5 w-5" />
          </Link>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Drawer Mobile Organizado e Compacto */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-8 dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-top duration-200">
          {/* Ações de Usuário no Topo do Drawer */}
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
            {user ? (
              <>
                {isSuperAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 rounded-xl border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-300"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>Painel Administrativo Master</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 rounded">/admin</span>
                  </Link>
                )}
                <div className="flex items-center justify-between">
                  <Link
                    href="/painel"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <span>Painel da Imobiliária</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline p-2"
                  >
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/entrar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="outline" className="w-full h-11 text-xs font-bold rounded-xl">
                    Entrar
                  </Button>
                </Link>
                <Link
                  href="/cadastrar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Seções de Navegação Mobile com Touch Targets Confortáveis */}
          <div className="space-y-4">
            {/* Bloco Comprar */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                Comprar
              </span>
              <div className="space-y-1">
                <Link
                  href="/comprar"
                  className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-800 rounded-xl hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Todos os imóveis à venda</span>
                </Link>
                <Link
                  href="/comprar?propertyType=apartment"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Apartamentos</span>
                </Link>
                <Link
                  href="/comprar?propertyType=house"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Casas</span>
                </Link>
                <Link
                  href="/comprar?propertyType=condo_house"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Casas em condomínio</span>
                </Link>
                <Link
                  href="/comprar?propertyType=land"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Terrenos e Lotes</span>
                </Link>
              </div>
            </div>

            {/* Bloco Alugar */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                Alugar
              </span>
              <div className="space-y-1">
                <Link
                  href="/alugar"
                  className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-800 rounded-xl hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Todos os imóveis para alugar</span>
                </Link>
                <Link
                  href="/alugar?propertyType=apartment"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Apartamentos</span>
                </Link>
                <Link
                  href="/alugar?propertyType=house"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Casas</span>
                </Link>
                <Link
                  href="/alugar?propertyType=studio"
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Studios e Kitnets</span>
                </Link>
              </div>
            </div>

            {/* Atalhos Diretos */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <Link
                href="/comprar?propertyType=condo_house"
                className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-800 rounded-xl hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Lançamentos</span>
              </Link>
              <Link
                href="/#cidades"
                className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-800 rounded-xl hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Explorar Cidades</span>
              </Link>
            </div>

            {/* Bloco Profissionais */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/cadastrar"
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-indigo-600 rounded-xl hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Anunciar seu Imóvel</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
