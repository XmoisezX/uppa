"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, FilterX, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPropertyCard } from "./SearchPropertyCard";
import type { SearchResult } from "../types";

interface SearchPropertyListProps {
  result: SearchResult;
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
}

export function SearchPropertyList({
  result,
  hoveredPropertyId,
  onHoverProperty,
}: SearchPropertyListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { properties, total, page, totalPages, filters } = result;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOrderChange = (order: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("orderBy", order);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE CONTROLE: TOTAL E ORDENAÇÃO */}
      <div className="flex items-center justify-between text-xs text-slate-500 py-1">
        <div>
          <span>
            Exibindo{" "}
            <strong className="text-slate-900 dark:text-white">{properties.length}</strong> de{" "}
            <strong className="text-slate-900 dark:text-white">{total}</strong> imóveis encontrados
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={filters.orderBy || "recent"}
            onChange={(e) => handleOrderChange(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="recent">Mais Recentes</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
          </select>
        </div>
      </div>

      {/* EMPTY STATE OU GRID DE CARDS */}
      {properties.length === 0 ? (
        <div className="p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-slate-900/40 space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="h-8 w-8 stroke-[1.5]" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhum imóvel encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Tente ampliar a faixa de preço, diminuir o número de quartos ou remover alguns filtros aplicados.
            </p>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="cursor-pointer gap-1.5 text-xs font-semibold"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpar Filtros de Busca
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {properties.map((property) => (
            <SearchPropertyCard
              key={property.id}
              property={property}
              isHovered={hoveredPropertyId === property.id}
              onHover={onHoverProperty}
            />
          ))}
        </div>
      )}

      {/* PAGINAÇÃO */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="cursor-pointer h-9 px-3 text-xs"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-3">
            Página {page} de {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="cursor-pointer h-9 px-3 text-xs"
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
