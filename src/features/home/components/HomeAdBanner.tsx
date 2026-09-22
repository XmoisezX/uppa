import React from "react";
import Link from "next/link";
import { Megaphone, ArrowRight } from "lucide-react";

interface HomeAdBannerProps {
  className?: string;
}

export function HomeAdBanner({ className = "" }: HomeAdBannerProps) {
  return (
    <section className={`py-6 bg-slate-50 dark:bg-slate-900/50 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                  Publicidade & Parcerias
                </span>
              </div>
              <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Destaque seu empreendimento ou imobiliária na UPPA
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
                Conecte seus lançamentos e carteira de imóveis a milhares de compradores e locatários qualificados em todo o país.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              href="/cadastrar"
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-colors shadow-xs"
            >
              <span>Anunciar na UPPA</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
