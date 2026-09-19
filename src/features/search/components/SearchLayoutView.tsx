"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Map, List, Loader2 } from "lucide-react";
import { SearchFilterBar } from "./SearchFilterBar";
import { SearchPropertyList } from "./SearchPropertyList";
import { SearchMap } from "./SearchMap";
import type { MapViewport } from "@/features/maps/types";
import type { SearchResult } from "../types";

interface SearchLayoutViewProps {
  result: SearchResult;
}

export function SearchLayoutView({ result }: SearchLayoutViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentResult, setCurrentResult] = useState<SearchResult>(result);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [isSearchingArea, setIsSearchingArea] = useState(false);

  // Sincroniza quando os filtros de servidor mudarem (ex: alteração na SearchFilterBar)
  useEffect(() => {
    setCurrentResult(result);
  }, [result]);

  // Handler para busca de viewport acionada pelo botão "Buscar nesta área"
  const handleSearchThisArea = async (viewport: MapViewport) => {
    setIsSearchingArea(true);

    try {
      // Monta query params herdando os filtros já ativos
      const params = new URLSearchParams(searchParams.toString());
      params.set("north", viewport.north.toFixed(6));
      params.set("south", viewport.south.toFixed(6));
      params.set("east", viewport.east.toFixed(6));
      params.set("west", viewport.west.toFixed(6));
      params.set("zoom", String(viewport.zoom));
      params.set("page", "1");

      // Atualiza a URL suavemente no navegador sem recarregar a tela
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);

      // Executa consulta rápida no endpoint especializado de mapa
      const response = await fetch(`/api/search/map?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentResult((prev) => ({
          ...prev,
          properties: data.properties || [],
          total: data.total ?? data.properties?.length ?? 0,
          page: 1,
          totalPages: Math.ceil((data.total || data.properties?.length || 1) / (prev.limit || 12)),
          filters: {
            ...prev.filters,
            bbox: viewport,
          },
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar imóveis no viewport:", err);
    } finally {
      setIsSearchingArea(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE FILTROS */}
      <SearchFilterBar currentFilters={currentResult.filters} />

      {/* LAYOUT PRINCIPAL: DESKTOP SPLIT (LISTA ESQUERDA + MAPA DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DE IMÓVEIS (Desktop sempre visível, Mobile depende de mobileView) */}
        <div
          className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
            mobileView === "map" ? "hidden lg:block" : "block"
          }`}
        >
          {isSearchingArea && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 animate-in fade-in duration-150">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Atualizando imóveis dentro da área do mapa selecionada...</span>
            </div>
          )}

          <SearchPropertyList
            result={currentResult}
            hoveredPropertyId={hoveredPropertyId}
            onHoverProperty={setHoveredPropertyId}
          />
        </div>

        {/* COLUNA DIREITA: MAPA STICKY (Desktop sticky, Mobile tela cheia quando selecionado) */}
        <div
          className={`lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 ${
            mobileView === "list" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="h-[550px] lg:h-[calc(100vh-110px)] w-full">
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

      {/* ALTERNADOR MOBILE LISTA / MAPA (Seção 86 do MASTER_PLAN) */}
      <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setMobileView((prev) => (prev === "list" ? "map" : "list"))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-2xl backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          {mobileView === "list" ? (
            <>
              <Map className="h-4 w-4" />
              <span>Ver no Mapa</span>
            </>
          ) : (
            <>
              <List className="h-4 w-4" />
              <span>Ver em Lista ({currentResult.properties.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
