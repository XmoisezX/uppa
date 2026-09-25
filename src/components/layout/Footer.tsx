import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="container py-12">
        {/* Grid Principal com as 6 Seções do Portal Nacional */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Seção 1: Comprar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Comprar
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
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
                  Casas à venda
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar?propertyType=condo_house"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Em condomínio
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
                  Comerciais
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/comprar"
                  className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ver todos à venda &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção 2: Alugar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Alugar
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
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
                  Casas para alugar
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
                  className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ver todos para alugar &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção 3: Explorar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Explorar
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link
                  href="/#cidades"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Cidades com estoque
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Busca no mapa
                </Link>
              </li>
              <li>
                <Link
                  href="/comprar?propertyType=condo_house"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Lançamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/#recentes"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Imóveis recentes
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção 4: Conteúdo */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Conteúdo
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Dúvidas Frequentes
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Como funciona a UPPA
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Guia para Compradores
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Guia para Inquilinos
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção 5: Anunciantes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Anunciantes
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
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
                  href="/cadastrar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Anunciar Imóveis
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
                  href="/entrar"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Acessar Painel
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção 6: Institucional */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Institucional
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Sobre a UPPA
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior com Marca, Proposta de Valor e Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link href="/" className="inline-flex items-center group" title="Página Inicial da UPPA">
              <Image
                src="/logo-uppa.png"
                alt="UPPA"
                width={120}
                height={38}
                className="h-8 md:h-9 w-auto object-contain dark:brightness-0 dark:invert opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </Link>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              O portal imobiliário nacional para encontrar, comprar e alugar imóveis diretamente com anunciantes credenciados.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] shrink-0">
            <div className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Anúncios de fontes auditadas</span>
            </div>
            <span>&copy; {new Date().getFullYear()} UPPA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
