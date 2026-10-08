"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown, Map, List, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPropertyCard } from "./SearchPropertyCard";
import { SearchPropertyCardSkeleton } from "./SearchPropertyCardSkeleton";
import { SearchEmptyState } from "./SearchEmptyState";
import { SearchFilterChips } from "./SearchFilterChips";
import { SEARCH_BATCH_SIZE, SEARCH_SENTINEL_ROOT_MARGIN } from "../constants";
import type { SearchResult, SearchPropertyItem, SearchFilters } from "../types";

const PROPERTY_TYPE_PLURALS: Record<string, string> = {
  apartment: "Apartamentos",
  house: "Casas",
  townhouse: "Sobrados",
  condo_house: "Casas em Condomínio",
  penthouse: "Coberturas",
  studio: "Studios",
  loft: "Lofts",
  kitnet: "Kitnets",
  land: "Terrenos",
  commercial: "Imóveis Comerciais",
  office: "Salas Comerciais",
  warehouse: "Galpões",
  farm: "Chácaras e Sítios",
  rural: "Imóveis Rurais",
};

export function buildSearchSummaryTitle(
  filters: SearchFilters,
  total: number,
  cityName?: string,
  stateCode?: string,
  neighborhoodName?: string,
  firstProperty?: SearchPropertyItem
): string {
  const formattedCount = total.toLocaleString("pt-BR");
  const isRent = filters.transactionType === "rent";
  const transactionText = isRent ? "para alugar" : "à venda";

  // Formatar tipos de imóveis
  let typeLabel = "Imóveis";
  const rawTypes = Array.isArray(filters.propertyType)
    ? filters.propertyType
    : filters.propertyType
    ? [filters.propertyType]
    : [];

  const mappedTypes = rawTypes
    .map((t) => PROPERTY_TYPE_PLURALS[t] || t)
    .filter(Boolean);

  if (mappedTypes.length === 1) {
    typeLabel = mappedTypes[0];
  } else if (mappedTypes.length === 2) {
    typeLabel = `${mappedTypes[0]} e ${mappedTypes[1]}`;
  } else if (mappedTypes.length > 2) {
    const last = mappedTypes[mappedTypes.length - 1];
    const initial = mappedTypes.slice(0, -1).join(", ");
    typeLabel = `${initial} e ${last}`;
  }

  // Resolver localização
  // Bairro só deve aparecer se o filtro de bairro estiver explicitamente ativo pelo usuário
  const neighborhood = filters.neighborhood
    ? (neighborhoodName || (typeof filters.neighborhood === "string" ? filters.neighborhood : undefined))
    : undefined;

  const city = cityName || (filters.city ? filters.city : firstProperty?.city?.name);
  const uf = stateCode || (filters.state ? filters.state : firstProperty?.state?.code);

  let locationText = "";
  if (neighborhood && city) {
    locationText = ` em ${neighborhood}, ${city}${uf ? ` - ${uf.toUpperCase()}` : ""}`;
  } else if (city) {
    locationText = ` em ${city}${uf ? ` - ${uf.toUpperCase()}` : ""}`;
  } else if (uf) {
    locationText = ` em ${uf.toUpperCase()}`;
  }

  return `${formattedCount} ${typeLabel} ${transactionText}${locationText}`;
}

interface SearchPropertyListProps {
  result: SearchResult;
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
  isLoading?: boolean;
  isMapMode?: boolean;
  onToggleMapMode?: () => void;
  cityName?: string;
  stateCode?: string;
  neighborhoodName?: string;
}

export function SearchPropertyList({
  result,
  hoveredPropertyId,
  onHoverProperty,
  isLoading,
  isMapMode,
  onToggleMapMode,
  cityName,
  stateCode,
  neighborhoodName,
}: SearchPropertyListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { properties, total, page, totalPages, filters } = result;

  const storageKey = typeof window !== "undefined"
    ? `uppa_search_cache_${pathname}?${Array.from(searchParams.entries())
        .filter(([k]) => k !== "cursor" && k !== "page")
        .map(([k, v]) => `${k}=${v}`)
        .sort()
        .join("&")}`
    : "";

  // Estado interno para suportar carregamento infinito contínuo via Keyset Cursor
  const [propertiesList, setPropertiesList] = useState<SearchPropertyItem[]>(properties);
  const [currentCursor, setCurrentCursor] = useState<string | null>(result.nextCursor || null);
  const [hasMore, setHasMore] = useState<boolean>(Boolean(result.hasMore));
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  const activeAbortController = useRef<AbortController | null>(null);
  const inFlightCursor = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isRestoredFromSession = useRef<boolean>(false);

  // 1. BACK BUTTON: Restaura estado e posição do scroll do sessionStorage na montagem
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (
          cached &&
          Array.isArray(cached.items) &&
          cached.items.length >= result.properties.length &&
          cached.items[0]?.id === result.properties[0]?.id
        ) {
          isRestoredFromSession.current = true;
          setPropertiesList(cached.items);
          setCurrentCursor(cached.nextCursor || null);
          setHasMore(Boolean(cached.hasMore));

          if (typeof cached.scrollY === "number" && cached.scrollY > 0) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: cached.scrollY, behavior: "instant" });
            });
          }
          return;
        }
      }
    } catch {
      // Ignora erro no storage
    }
  }, [storageKey, result.properties]);

  // 2. Sincroniza estado quando a busca do servidor ou os filtros mudarem
  useEffect(() => {
    if (isRestoredFromSession.current) {
      isRestoredFromSession.current = false;
      return;
    }
    if (activeAbortController.current) {
      activeAbortController.current.abort();
      activeAbortController.current = null;
    }
    inFlightCursor.current = null;
    setPropertiesList(result.properties);
    setCurrentCursor(result.nextCursor || null);
    setHasMore(Boolean(result.hasMore));
    setIsLoadingMore(false);
    setLoadError(false);
  }, [result]);

  // 3. Salva estado e scroll no sessionStorage
  const persistSessionState = useCallback((items: SearchPropertyItem[], cursor: string | null, more: boolean) => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          items,
          nextCursor: cursor,
          hasMore: more,
          scrollY: window.scrollY,
        })
      );
    } catch {
      // Ignora estouro de cota
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const handleScroll = () => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.scrollY = window.scrollY;
          sessionStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch {}
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [storageKey]);

  // 4. Carregamento do próximo lote via Keyset Cursor
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !currentCursor) return;
    if (inFlightCursor.current === currentCursor) return;

    inFlightCursor.current = currentCursor;
    setIsLoadingMore(true);
    setLoadError(false);

    const controller = new AbortController();
    activeAbortController.current = controller;

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", currentCursor);
      params.set("limit", String(SEARCH_BATCH_SIZE));
      params.delete("page");

      const res = await fetch(`/api/properties?${params.toString()}`, {
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const incoming: SearchPropertyItem[] = data.properties || [];

        if (incoming.length > 0) {
          setPropertiesList((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = incoming.filter((p) => !existingIds.has(p.id));
            const updated = [...prev, ...newItems];
            const nextHasMore = Boolean(data.hasMore && newItems.length > 0);

            persistSessionState(updated, data.nextCursor || null, nextHasMore);
            return updated;
          });

          setCurrentCursor(data.nextCursor || null);
          setHasMore(Boolean(data.hasMore));
        } else {
          setHasMore(false);
          persistSessionState(propertiesList, null, false);
        }
      } else {
        setLoadError(true);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("[SearchPropertyList] Erro ao carregar mais imóveis:", err);
        setLoadError(true);
      }
    } finally {
      setIsLoadingMore(false);
      inFlightCursor.current = null;
      activeAbortController.current = null;
    }
  }, [currentCursor, hasMore, isLoadingMore, searchParams, persistSessionState, propertiesList]);

  // Observer do sentinel para acionar o carregamento infinito antecipado (1 a 2 viewports antes)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore || !currentCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: SEARCH_SENTINEL_ROOT_MARGIN,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore, currentCursor]);

  const handleOrderChange = (order: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("orderBy", order);
    params.set("page", "1");
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR: CHIPS + CONTROLE DE ORDENAÇÃO E MAPA */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {buildSearchSummaryTitle(
              filters,
              total,
              cityName,
              stateCode,
              neighborhoodName,
              propertiesList[0]
            )}
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
          {propertiesList.map((property, idx) => (
            <SearchPropertyCard
              key={property.id}
              property={property}
              isHovered={hoveredPropertyId === property.id}
              onHover={onHoverProperty}
              isPriority={idx < 3}
            />
          ))}
        </div>
      )}

      {/* SENTINELA PARA CARREGAMENTO INFINITO VIA INTERSECTION OBSERVER */}
      {hasMore && !isLoadingMore && (
        <div ref={sentinelRef} className="h-6 w-full pointer-events-none" />
      )}

      {/* SKELETON / INDICADOR DE CARREGAMENTO DO PRÓXIMO LOTE */}
      {isLoadingMore && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Carregando próximos imóveis...</span>
          </div>
          <SearchPropertyCardSkeleton />
        </div>
      )}

      {/* FEEDBACK E RETRY EM CASO DE ERRO */}
      {loadError && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-rose-500 font-medium">
            Não foi possível carregar o próximo lote de imóveis.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            className="gap-1.5 text-xs font-semibold rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tentar novamente</span>
          </Button>
        </div>
      )}

      {/* MENSAGEM DISCRETA QUANDO TODOS OS IMÓVEIS FOREM CARREGADOS */}
      {!hasMore && propertiesList.length > 0 && (
        <div className="py-8 text-center text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-6">
          Você chegou ao fim dos resultados. ({propertiesList.length} de {total} imóveis)
        </div>
      )}
    </div>
  );
}
