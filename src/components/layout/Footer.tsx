import React from "react";
import Link from "next/link";
import { ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Coluna 1: Marca e Visão */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                UPPA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              O portal imobiliário nacional para encontrar, comprar e alugar
              imóveis de forma simples, objetiva e transparente. Conectamos quem
              busca às melhores imobiliárias e corretores credenciados do país.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Plataforma segura com anúncios de fontes auditadas</span>
            </div>
          </div>

          {/* Coluna 2: Comprar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Comprar
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link
                  href="/comprar?propertyType=apartment"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Apartamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar?propertyType=house"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Casas
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar?propertyType=condo_house"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Casas em condomínio
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar?propertyType=land"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Terrenos e Lotes
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar?propertyType=commercial"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Imóveis Comerciais
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/comprar"
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ver todos à venda
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Alugar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Alugar
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link
                  href="/alugar?propertyType=apartment"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Apartamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/alugar?propertyType=house"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Casas
                </Link>
              </li>
              <li>
                <Link
                  href="/alugar?propertyType=studio"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Studios e Kitnets
                </Link>
              </li>
              <li>
                <Link
                  href="/alugar?propertyType=commercial"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Salas Comerciais
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/alugar"
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ver todos para alugar
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Para Profissionais */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Anunciantes
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link
                  href="/cadastrar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Cadastrar Imobiliária
                </Link>
              </li>
              <li>
                <Link
                  href="/entrar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Acessar Painel
                </Link>
              </li>
              <li>
                <Link
                  href="/cadastrar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Integração XML/feed
                </Link>
              </li>
              <li>
                <Link
                  href="/cadastrar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Seja nosso parceiro
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior com Copyright e Menção */}
        <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} UPPA — Portal Imobiliário Nacional.
            Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Feito para conectar pessoas ao seu próximo imóvel</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
