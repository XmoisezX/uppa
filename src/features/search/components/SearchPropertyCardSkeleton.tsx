import React from "react";

export function SearchPropertyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 overflow-hidden shadow-2xs animate-pulse flex flex-col w-full m-0">
      {/* FOTO SKELETON */}
      <div className="aspect-[16/10] w-full bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* DADOS SKELETON */}
      <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Título */}
          <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />

          {/* Localização */}
          <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-md" />

          {/* Specs */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>

        {/* Rodapé: Preço e Botão */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
