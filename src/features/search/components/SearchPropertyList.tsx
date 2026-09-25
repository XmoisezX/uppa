"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown, Map, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPropertyCard } from "./SearchPropertyCard";
import { SearchPropertyCardSkeleton } from "./SearchPropertyCardSkeleton";
import { SearchEmptyState } from "./SearchEmptyState";
import { SearchFilterChips } from "./SearchFilterChips";
import type { SearchResult, SearchPropertyItem } from "../types";

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

  // Estado interno para suportar carregamento infinito contínuo
  const [propertiesList, setPropertiesList] = useState<SearchPropertyItem[]>(properties);
  const [currentPage, setCurrentPage] = useState<number>(page || 1);
  const [hasMore, setHasMore] = useState<boolean>(properties.length < total);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sincroniza estado quando a busca do servidor ou os filtros mudarem
  useEffect(() => {
    setPropertiesList(result.properties);
    setCurrentPage(result.page || 1);
    setHasMore(result.properties.length < result.total);
    setIsLoadingMore(false);
  }, [result]);

  // Função assíncrona para buscar a próxima página de imóveis
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      params.set("limit", "12");

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const incoming: SearchPropertyItem[] = data.properties || [];

        if (incoming.length > 0) {
          setPropertiesList((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = incoming.filter((p) => !existingIds.has(p.id));
            const updated = [...prev, ...newItems];
            if (updated.length >= data.total || incoming.length === 0) {
              setHasMore(false);
            }
            return updated;
          });
          setCurrentPage(nextPage);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[SearchPropertyList] Erro ao carregar mais imóveis:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore, searchParams]);

  // Observer do sentinel para acionar o carregamento infinito ao rolar
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: "350px", // Pré-carrega suavemente antes de chegar ao fim
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleOrderChange = (order: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("orderBy", order);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR: CHIPS + CONTROLE DE ORDENAÇÃO E MAPA */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500">
            Mostrando{" "}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {propertiesList.length}
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

      {/* SKELETON LOADING, EMPTY STATE OU LISTA DE CARDS */}
      {isLoading ? (
        <div className="properties-list space-y-4 w-full">
          {[1, 2, 3, 4].map((n) => (
            <SearchPropertyCardSkeleton key={n} />
          ))}
        </div>
      ) : propertiesList.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <div className="properties-list space-y-4 w-full">
          {propertiesList.map((property) => (
            <SearchPropertyCard
              key={property.id}
              property={property}
              isHovered={hoveredPropertyId === property.id}
              onHover={onHoverProperty}
            />
          ))}
        </div>
      )}

      {/* SENTINELA PARA CARREGAMENTO INFINITO VIA INTERSECTION OBSERVER */}
      <div ref={sentinelRef} className="h-4 w-full pointer-events-none" />

      {/* SKELETON / INDICADOR DE CARREGAMENTO DE NOVOS IMÓVEIS */}
      {isLoadingMore && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Carregando mais imóveis...</span>
          </div>
          <SearchPropertyCardSkeleton />
        </div>
      )}

      {/* MENSAGEM QUANDO TODOS OS IMÓVEIS FOREM CARREGADOS */}
      {!hasMore && propertiesList.length > 0 && propertiesList.length >= total && (
        <div className="py-8 text-center text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-6">
          Você visualizou todos os {total} imóveis encontrados.
        </div>
      )}
    </div>
  );
}
