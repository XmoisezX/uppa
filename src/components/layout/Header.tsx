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
} from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imoveisDropdownOpen, setImoveisDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Lado Esquerdo: Marca UPPA + Navegação Principal */}
        <div className="flex items-center gap-8">
          {/* Logo UPPA */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              UPPA
            </span>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {/* Dropdown "Imóveis" */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setImoveisDropdownOpen(!imoveisDropdownOpen)}
                className={`flex items-center gap-1 py-2 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors cursor-pointer ${
                  imoveisDropdownOpen ? "text-indigo-600 dark:text-indigo-400" : ""
                }`}
                aria-expanded={imoveisDropdownOpen}
              >
                <span>Imóveis</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    imoveisDropdownOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              {/* Menu Flyout Dropdown */}
              {imoveisDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[540px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 grid grid-cols-2 gap-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Coluna 1: Venda */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Building className="h-4 w-4" />
                      <span>Comprar</span>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs font-medium">
                      <li>
                        <Link
                          href="/comprar?propertyType=apartment"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Apartamentos à venda
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/comprar?propertyType=house"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Casas à venda
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/comprar?propertyType=condo_house"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Casas em condomínio
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/comprar?propertyType=land"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Terrenos e Lotes
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/comprar?propertyType=commercial"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Imóveis comerciais
                        </Link>
                      </li>
                      <li className="pt-1">
                        <Link
                          href="/comprar"
                          className="text-indigo-600 font-bold hover:underline flex items-center gap-1 dark:text-indigo-400"
                        >
                          Ver todos à venda &rarr;
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Coluna 2: Aluguel */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Key className="h-4 w-4" />
                      <span>Alugar</span>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs font-medium">
                      <li>
                        <Link
                          href="/alugar?propertyType=apartment"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Apartamentos para alugar
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/alugar?propertyType=house"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Casas para alugar
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/alugar?propertyType=studio"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Kitnets e Studios
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/alugar?propertyType=commercial"
                          className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-0.5"
                        >
                          Salas e Comerciais
                        </Link>
                      </li>
                      <li className="pt-1">
                        <Link
                          href="/alugar"
                          className="text-indigo-600 font-bold hover:underline flex items-center gap-1 dark:text-indigo-400"
                        >
                          Ver todos para alugar &rarr;
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Links Diretos */}
            <Link
              href="/comprar"
              className="text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
            >
              Comprar
            </Link>

            <Link
              href="/alugar"
              className="text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
            >
              Alugar
            </Link>

            <Link
              href="/cadastrar"
              className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors"
            >
              <span>Anuncie</span>
            </Link>
          </nav>
        </div>

        {/* Lado Direito: Favoritos + Auth */}
        <div className="hidden md:flex items-center gap-4">
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
              <Link href="/painel">
                <Button variant="outline" size="sm" className="gap-2 text-xs font-bold rounded-xl">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Painel
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

      {/* Drawer Mobile Organizado */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-8 dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-top duration-200">
          {/* Ações de Usuário no Topo do Drawer */}
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            {user ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/painel"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <span>Acessar Painel</span>
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

          {/* Seções de Navegação com Touch Targets Confortáveis */}
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

            {/* Bloco Profissionais */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/cadastrar"
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-indigo-600 rounded-xl hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Anuncie seu Imóvel</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
