"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Building2, FilterX, RotateCcw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchEmptyStateProps {
  onClearFilters?: () => void;
  hasFilters?: boolean;
}

export function SearchEmptyState({ onClearFilters, hasFilters }: SearchEmptyStateProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClear = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      router.push(pathname);
    }
  };

  return (
    <div className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-slate-900/40 space-y-5">
      <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
        <Building2 className="h-8 w-8 stroke-[1.5]" />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Nenhum imóvel encontrado com esses filtros
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tente ampliar sua busca ajustando a faixa de preço, reduzindo o número mínimo de quartos ou buscando em bairros vizinhos.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
        >
          <FilterX className="h-4 w-4 text-indigo-600" />
          <span>Limpar todos os filtros</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(pathname.includes("/alugar") ? "/alugar" : "/comprar")}
          className="h-9 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 gap-1.5 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Ver todos os imóveis</span>
        </Button>
      </div>
    </div>
  );
}
