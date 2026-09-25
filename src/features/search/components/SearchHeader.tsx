"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationAutocomplete } from "./LocationAutocomplete";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";

const PROPERTY_TYPE_NAMES: Record<string, string> = {
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

interface SearchHeaderProps {
  filters: SearchFilters;
  total: number;
  activeFilterCount: number;
  onOpenMobileFilters: () => void;
  isMapMode: boolean;
  onToggleMapMode: () => void;
  cityName?: string;
  stateCode?: string;
  neighborhoodName?: string;
}

export function SearchHeader({
  filters,
  total,
  activeFilterCount,
  onOpenMobileFilters,
  isMapMode,
  onToggleMapMode,
  cityName,
  stateCode,
  neighborhoodName,
}: SearchHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isRent = filters.transactionType === "rent";

  // Constrói o título dinâmico com contagem real (Seção 7)
  const buildDynamicTitle = () => {
    const transactionText = isRent ? "para alugar" : "à venda";
    const rawTypes = Array.isArray(filters.propertyType)
      ? filters.propertyType
      : filters.propertyType
      ? [filters.propertyType]
      : [];

    let typePlural = "Imóveis";
    const mappedTypes = rawTypes.map((t) => PROPERTY_TYPE_NAMES[t] || t).filter(Boolean);
    if (mappedTypes.length === 1) {
      typePlural = mappedTypes[0];
    } else if (mappedTypes.length === 2) {
      typePlural = `${mappedTypes[0]} e ${mappedTypes[1]}`;
    } else if (mappedTypes.length > 2) {
      const last = mappedTypes[mappedTypes.length - 1];
      typePlural = `${mappedTypes.slice(0, -1).join(", ")} e ${last}`;
    }

    const parts: string[] = [];

    if (neighborhoodName && (cityName || filters.city)) {
      const city = cityName || filters.city;
      const uf = stateCode || filters.state;
      parts.push(`${typePlural} ${transactionText} em ${neighborhoodName}, ${city}${uf ? ` - ${uf.toUpperCase()}` : ""}`);
    } else if (cityName || filters.city) {
      const city = cityName || filters.city;
      const uf = stateCode || filters.state;
      parts.push(`${typePlural} ${transactionText} em ${city}${uf ? ` - ${uf.toUpperCase()}` : ""}`);
    } else if (filters.state) {
      parts.push(`${typePlural} ${transactionText} em ${filters.state.toUpperCase()}`);
    } else {
      parts.push(`${typePlural} ${transactionText} no Brasil`);
    }

    return parts.join("");
  };

  // Alterna entre Comprar e Alugar preservando filtros compatíveis (Seção 2)
  const handleToggleTransaction = (target: "sale" | "rent") => {
    if ((target === "sale" && !isRent) || (target === "rent" && isRent)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    // Remove filtros de preço incompatíveis entre compra e aluguel
    params.delete("priceMin");
    params.delete("priceMax");

    const targetRoute = target === "rent" ? "/alugar" : "/comprar";
    const query = params.toString();
    router.push(query ? `${targetRoute}?${query}` : targetRoute);
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR: ABAS COMPRAR/ALUGAR + BUSCA POR LOCALIZAÇÃO */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 sm:p-2.5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* ABAS COMPRAR / ALUGAR */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleTransaction("sale")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !isRent
                ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Comprar
          </button>
          <button
            type="button"
            onClick={() => handleToggleTransaction("rent")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isRent
                ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Alugar
          </button>
        </div>

        {/* BUSCA POR LOCALIZAÇÃO COM AUTOCOMPLETE */}
        <div className="flex-1 min-w-[240px]">
          <LocationAutocomplete
            initialCity={filters.city}
            initialNeighborhood={filters.neighborhood}
            cityName={cityName}
            neighborhoodName={neighborhoodName}
            placeholder="Digite cidade ou bairro..."
          />
        </div>

        {/* CONTROLES MOBILE / TABLET / MAPA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* BOTÃO MOBILE FILTROS */}
          <Button
            type="button"
            variant="outline"
            onClick={onOpenMobileFilters}
            className="lg:hidden h-10 px-3.5 gap-2 text-xs font-bold rounded-xl cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <Badge className="h-5 px-1.5 bg-indigo-600 text-white text-[10px] rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* BOTÃO DESKTOP ALTERNAR MAPA */}
          <Button
            type="button"
            variant={isMapMode ? "default" : "outline"}
            onClick={onToggleMapMode}
            className={`hidden lg:flex h-10 px-3.5 gap-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
              isMapMode
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {isMapMode ? (
              <>
                <List className="h-4 w-4" />
                <span>Ocultar Mapa</span>
              </>
            ) : (
              <>
                <Map className="h-4 w-4" />
                <span>Mostrar Mapa</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* TÍTULO H1 E QUANTIDADE DE RESULTADOS (Seção 7) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {buildDynamicTitle()}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">{total.toLocaleString("pt-BR")}</strong>{" "}
            {total === 1 ? "imóvel encontrado" : "imóveis encontrados"}
          </p>
        </div>
      </div>
    </div>
  );
}
