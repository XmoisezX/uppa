import React from "react";
import Link from "next/link";
import { Building2, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Coluna 1: Marca e Visão */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                PORTAL<span className="text-indigo-400">IMO</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Infraestrutura nacional para descoberta, distribuição e transação
              imobiliária. Conectando compradores, locatários e imobiliárias em todo
              o Brasil.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Ambiente seguro e verificado</span>
            </div>
          </div>

          {/* Coluna 2: Comprar */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Comprar
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/comprar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Apartamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Casas em condomínio
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Terrenos e Lotes
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Comercial
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Alugar */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Alugar
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/alugar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Apartamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/alugar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Casas
                </Link>
              </li>
              <li>
                <Link
                  href="/alugar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Studios e Kitchenettes
                </Link>
              </li>
              <li>
                <Link
                  href="/alugar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Salas e Escritórios
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Para Parceiros */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Imobiliárias
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/cadastrar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Cadastrar Imobiliária
                </Link>
              </li>
              <li>
                <Link
                  href="/entrar"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Painel de Controle
                </Link>
              </li>
              <li>
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  Integração XML/VRSync (em breve)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior */}
        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} PORTAL IMO BRASIL. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <span>Termos de Uso</span>
            <span>Privacidade</span>
            <span>Segurança</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
