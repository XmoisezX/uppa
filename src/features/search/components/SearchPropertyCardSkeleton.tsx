import React from "react";

export function SearchPropertyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 overflow-hidden shadow-2xs animate-pulse flex flex-col sm:flex-row w-full">
      {/* FOTO SKELETON */}
      <div className="w-full sm:w-[340px] md:w-[380px] lg:w-[410px] xl:w-[440px] aspect-[16/10] sm:aspect-auto sm:min-h-[250px] bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* DADOS SKELETON */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Título */}
          <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded-md" />

          {/* Localização */}
          <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-md mt-2" />

          {/* Specs */}
          <div className="flex items-center gap-4 pt-3">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>

        {/* Rodapé: Preço e Botões */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-11 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
