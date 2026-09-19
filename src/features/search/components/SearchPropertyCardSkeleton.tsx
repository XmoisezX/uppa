import React from "react";

export function SearchPropertyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 overflow-hidden shadow-2xs animate-pulse flex flex-col sm:flex-row">
      {/* FOTO SKELETON */}
      <div className="sm:w-64 md:w-72 aspect-[16/10] sm:aspect-auto sm:h-52 bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* DADOS SKELETON */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3">
        <div className="space-y-2.5">
          {/* Preço */}
          <div className="flex items-center justify-between">
            <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-850 rounded-md" />
          </div>

          {/* Título */}
          <div className="h-4.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />

          {/* Localização */}
          <div className="h-3.5 w-1/2 bg-slate-100 dark:bg-slate-850 rounded-md" />

          {/* Specs */}
          <div className="flex items-center gap-4 pt-2">
            <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
