"use client";

import React, { useState } from "react";
import { Map, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchFilterBar } from "./SearchFilterBar";
import { SearchPropertyList } from "./SearchPropertyList";
import { SearchMap } from "./SearchMap";
import type { SearchResult } from "../types";

interface SearchLayoutViewProps {
  result: SearchResult;
}

export function SearchLayoutView({ result }: SearchLayoutViewProps) {
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE FILTROS */}
      <SearchFilterBar currentFilters={result.filters} />

      {/* LAYOUT PRINCIPAL: DESKTOP SPLIT (LISTA ESQUERDA + MAPA DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DE IMÓVEIS (Desktop sempre visível, Mobile depende de mobileView) */}
        <div
          className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
            mobileView === "map" ? "hidden lg:block" : "block"
          }`}
        >
          <SearchPropertyList
            result={result}
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
              properties={result.properties}
              hoveredPropertyId={hoveredPropertyId}
              onHoverProperty={setHoveredPropertyId}
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
              <span>Ver em Lista</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
