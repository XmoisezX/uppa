"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronLeft, ChevronRight, Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPropertyCard } from "./SearchPropertyCard";
import { SearchPropertyCardSkeleton } from "./SearchPropertyCardSkeleton";
import { SearchEmptyState } from "./SearchEmptyState";
import { SearchFilterChips } from "./SearchFilterChips";
import type { SearchResult } from "../types";

interface SearchPropertyListProps {
  result: SearchResult;
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
  isLoading?: boolean;
  isMapMode?: boolean;
  onToggleMapMode?: () => void;
}

export function SearchPropertyList({
  result,
  hoveredPropertyId,
  onHoverProperty,
  isLoading,
  isMapMode,
  onToggleMapMode,
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

  // Gera lista de números de páginas para paginação amigável
  const renderPaginationNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR: CHIPS + CONTROLE DE ORDENAÇÃO E MAPA */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500">
            Mostrando{" "}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {properties.length}
            </strong>{" "}
            de{" "}
            <strong className="text-slate-900 dark:text-white font-semibold">{total}</strong>{" "}
            imóveis
          </div>

          <div className="flex items-center gap-2">
            {/* SELECT DE ORDENAÇÃO (Seção 9) */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={filters.orderBy || "recent"}
                onChange={(e) => handleOrderChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
              >
                <option value="recent">Mais Recentes</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="area_desc">Maior Área</option>
              </select>
            </div>

            {/* BOTÃO ALTERNAR MAPA (DESKTOP) */}
            {onToggleMapMode && (
              <Button
                type="button"
                variant={isMapMode ? "default" : "outline"}
                size="sm"
                onClick={onToggleMapMode}
                className={`hidden sm:flex h-8 px-3 gap-1.5 text-xs font-bold rounded-xl cursor-pointer ${
                  isMapMode ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : ""
                }`}
              >
                {isMapMode ? (
                  <>
                    <List className="h-3.5 w-3.5" />
                    <span>Ocultar Mapa</span>
                  </>
                ) : (
                  <>
                    <Map className="h-3.5 w-3.5" />
                    <span>Ver no Mapa</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* CHIPS DE FILTROS APLICADOS (Seção 5) */}
        <SearchFilterChips filters={filters} />
      </div>

      {/* SKELETON LOADING, EMPTY STATE OU GRADE DE IMÓVEIS */}
      {isLoading ? (
        <div className="properties-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <SearchPropertyCardSkeleton key={n} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <div className="properties-grid">
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

      {/* PAGINAÇÃO NUMERADA INTELIGENTE (Seção 19) */}
      {totalPages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-center gap-1 pt-6 pb-2">
          {/* BOTÃO ANTERIOR */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1 cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          {/* NÚMEROS DE PÁGINA */}
          <div className="flex items-center gap-1 px-1">
            {renderPaginationNumbers().map((num, idx) => {
              if (num === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="h-9 w-9 flex items-center justify-center text-xs text-slate-400 select-none"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = page === num;
              return (
                <button
                  key={`page-${num}`}
                  type="button"
                  onClick={() => handlePageChange(Number(num))}
                  className={`h-9 w-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* BOTÃO PRÓXIMA */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1 cursor-pointer disabled:opacity-40"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
