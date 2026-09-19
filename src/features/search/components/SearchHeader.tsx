"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, MapPin, SlidersHorizontal, Map, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [locationInput, setLocationInput] = useState(
    neighborhoodName || cityName || filters.city || filters.state || ""
  );

  // Constrói o título dinâmico com contagem real (Seção 7)
  const buildDynamicTitle = () => {
    const transactionText = isRent ? "para alugar" : "à venda";
    const typeKey = typeof filters.propertyType === "string" ? filters.propertyType : undefined;
    const typePlural = typeKey ? PROPERTY_TYPE_NAMES[typeKey] || "Imóveis" : "Imóveis";

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

  // Submete busca de localização (Seção 3)
  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLocation = locationInput.trim();
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (!cleanLocation) {
      params.delete("city");
      params.delete("state");
      params.delete("neighborhood");
    } else {
      // Se for sigla de 2 letras, trata como estado
      if (cleanLocation.length === 2 && /^[a-zA-Z]+$/.test(cleanLocation)) {
        params.set("state", cleanLocation.toUpperCase());
        params.delete("city");
        params.delete("neighborhood");
      } else {
        params.set("city", cleanLocation);
        params.delete("neighborhood");
      }
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearLocation = () => {
    setLocationInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.delete("city");
    params.delete("state");
    params.delete("neighborhood");
    router.push(`${pathname}?${params.toString()}`);
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

        {/* BUSCA POR LOCALIZAÇÃO */}
        <form onSubmit={handleLocationSubmit} className="flex-1 relative flex items-center">
          <MapPin className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Cidade, bairro ou estado..."
            className="w-full h-10 pl-9.5 pr-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
          {locationInput && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="absolute right-12 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpar localização"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            Buscar
          </button>
        </form>

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
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">{total}</strong>{" "}
            {total === 1 ? "imóvel encontrado" : "imóveis encontrados"}
          </p>
        </div>
      </div>
    </div>
  );
}
