"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Map, List, Loader2 } from "lucide-react";
import { SearchBreadcrumb } from "./SearchBreadcrumb";
import { SearchHeader } from "./SearchHeader";
import { SearchSidebarFilters } from "./SearchSidebarFilters";
import { SearchPropertyList } from "./SearchPropertyList";
import { SearchFilterDrawer } from "./SearchFilterDrawer";
import { SearchMap } from "./SearchMap";
import type { MapViewport } from "@/features/maps/types";
import type { SearchResult, SearchFilters } from "../types";

interface SearchLayoutViewProps {
  result: SearchResult;
}

export function SearchLayoutView({ result }: SearchLayoutViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Guarda exclusivamente resultados gerados dinamicamente via mapa interativo ("buscar nesta área")
  const [spatialResult, setSpatialResult] = useState<SearchResult | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [isMapMode, setIsMapMode] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSearchingArea, setIsSearchingArea] = useState<boolean>(false);

  // Limpa busca espacial sempre que os resultados do Server Component mudarem
  useEffect(() => {
    setSpatialResult(null);
  }, [result]);

  // Se houver busca manual no mapa, utiliza spatialResult; caso contrário, consome result diretamente do servidor
  const currentResult = spatialResult ?? result;

  // Se houver parâmetro bbox na URL inicial, ativa modo mapa
  useEffect(() => {
    if (searchParams.get("north") && searchParams.get("south")) {
      setIsMapMode(true);
    }
  }, [searchParams]);

  // Contagem de filtros ativos
  const countActiveFilters = (filters: SearchFilters) => {
    let count = 0;
    if (filters.propertyType) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.parkingSpaces) count++;
    if (filters.areaMin || filters.areaMax) count++;
    if (filters.financiable) count++;
    if (filters.furnished) count++;
    if (filters.acceptsExchange) count++;
    return count;
  };

  const activeCount = countActiveFilters(currentResult.filters);

  // Extrai nome de cidade / estado / bairro exclusivamente se houver filtro ativo na busca
  const firstProperty = currentResult.properties[0];
  const cityName = currentResult.filters.city
    ? (firstProperty?.city?.name || currentResult.filters.city)
    : undefined;
  const stateCode = currentResult.filters.state
    ? (firstProperty?.state?.code || currentResult.filters.state)
    : undefined;
  const neighborhoodName = currentResult.filters.neighborhood
    ? (firstProperty?.neighborhood?.name || currentResult.filters.neighborhood)
    : undefined;

  // Atualiza query string na URL ao aplicar filtros do drawer mobile
  const handleApplyDrawerFilters = (newFilters: Partial<SearchFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "" || val === false) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  // Busca por viewport espacial do mapa (Seção 10 e 26)
  const handleSearchThisArea = async (viewport: MapViewport) => {
    setIsSearchingArea(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("north", viewport.north.toFixed(6));
      params.set("south", viewport.south.toFixed(6));
      params.set("east", viewport.east.toFixed(6));
      params.set("west", viewport.west.toFixed(6));
      params.set("zoom", String(viewport.zoom));
      params.set("page", "1");

      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);

      const response = await fetch(`/api/search/map?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSpatialResult({
          ...currentResult,
          properties: data.properties || [],
          total: data.total ?? data.properties?.length ?? 0,
          page: 1,
          totalPages: Math.ceil((data.total || data.properties?.length || 1) / (result.limit || 12)),
          filters: {
            ...currentResult.filters,
            bbox: viewport,
          },
        });
      }
    } catch (err) {
      console.error("Erro ao buscar no viewport do mapa:", err);
    } finally {
      setIsSearchingArea(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. BREADCRUMB NAVEGÁVEL (Seção 8) */}
      <SearchBreadcrumb
        filters={currentResult.filters}
        cityName={cityName}
        stateCode={stateCode}
        neighborhoodName={neighborhoodName}
      />

      {/* 2. CABEÇALHO DA BUSCA: TÍTULO, COUNT, ABAS COMPRAR/ALUGAR, LOCALIZAÇÃO (Seção 2, 3, 7) */}
      <SearchHeader
        filters={currentResult.filters}
        total={currentResult.total}
        activeFilterCount={activeCount}
        onOpenMobileFilters={() => setIsDrawerOpen(true)}
        isMapMode={isMapMode}
        onToggleMapMode={() => setIsMapMode((prev) => !prev)}
        cityName={cityName}
        stateCode={stateCode}
        neighborhoodName={neighborhoodName}
      />

      {/* 3. LAYOUT PRINCIPAL: MODO PADRÃO PORTAL OU MODO MAPA (Seção 1 e 10) */}
      {!isMapMode ? (
        /* MODO PADRÃO PORTAL: SIDEBAR ESQUERDA + RESULTADOS HORIZONTAIS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR DE FILTROS (DESKTOP) - ROLAGEM INDEPENDENTE */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overflow-x-hidden pr-1.5 overscroll-contain [scrollbar-width:thin]">
            <SearchSidebarFilters
              filters={currentResult.filters}
              cityName={cityName}
              stateCode={stateCode}
              neighborhoodName={neighborhoodName}
            />
          </div>

          {/* LISTA DE RESULTADOS HORIZONTAIS */}
          <div className="lg:col-span-9 xl:col-span-9">
            <SearchPropertyList
              result={currentResult}
              hoveredPropertyId={hoveredPropertyId}
              onHoverProperty={setHoveredPropertyId}
              isMapMode={isMapMode}
              onToggleMapMode={() => setIsMapMode(true)}
            />
          </div>
        </div>
      ) : (
        /* MODO MAPA ATIVO: LISTA DE IMÓVEIS (SCROLL) + MAPA STICKY LADO A LADO */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LISTA DE IMÓVEIS */}
          <div
            className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
              mobileView === "map" ? "hidden lg:block" : "block"
            }`}
          >
            {isSearchingArea && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 animate-in fade-in duration-150">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Atualizando imóveis dentro da área selecionada...</span>
              </div>
            )}

            <SearchPropertyList
              result={currentResult}
              hoveredPropertyId={hoveredPropertyId}
              onHoverProperty={setHoveredPropertyId}
              isMapMode={isMapMode}
              onToggleMapMode={() => setIsMapMode(false)}
            />
          </div>

          {/* MAPA STICKY */}
          <div
            className={`lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="h-[550px] lg:h-[calc(100vh-110px)] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <SearchMap
                properties={currentResult.properties}
                hoveredPropertyId={hoveredPropertyId}
                onHoverProperty={setHoveredPropertyId}
                onSearchThisArea={handleSearchThisArea}
                isSearchingArea={isSearchingArea}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. ALTERNADOR FLUTUANTE MOBILE LISTA / MAPA (Seção 10) */}
      <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => {
            if (!isMapMode) {
              setIsMapMode(true);
              setMobileView("map");
            } else {
              setMobileView((prev) => (prev === "list" ? "map" : "list"));
            }
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-2xl backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          {mobileView === "list" && !isMapMode ? (
            <>
              <Map className="h-4 w-4" />
              <span>Ver no Mapa</span>
            </>
          ) : mobileView === "map" ? (
            <>
              <List className="h-4 w-4" />
              <span>Ver em Lista ({currentResult.properties.length})</span>
            </>
          ) : (
            <>
              <Map className="h-4 w-4" />
              <span>Ver no Mapa</span>
            </>
          )}
        </button>
      </div>

      {/* 5. DRAWER MOBILE DE FILTROS (Seção 6) */}
      <SearchFilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={currentResult.filters}
        onApply={handleApplyDrawerFilters}
        total={currentResult.total}
      />
    </div>
  );
}
