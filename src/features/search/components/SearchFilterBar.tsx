"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchFilterDrawer } from "./SearchFilterDrawer";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";

interface SearchFilterBarProps {
  currentFilters: SearchFilters;
}

export function SearchFilterBar({ currentFilters }: SearchFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Calcula quantos filtros avançados estão ativos
  const countActiveFilters = () => {
    let count = 0;
    if (currentFilters.propertyType) count++;
    if (currentFilters.priceMin || currentFilters.priceMax) count++;
    if (currentFilters.bedrooms) count++;
    if (currentFilters.bathrooms) count++;
    if (currentFilters.parkingSpaces) count++;
    if (currentFilters.areaMin || currentFilters.areaMax) count++;
    if (currentFilters.financiable) count++;
    if (currentFilters.furnished) count++;
    if (currentFilters.acceptsExchange) count++;
    return count;
  };

  const activeCount = countActiveFilters();

  // Sincroniza alterações de filtro na URL query string
  const updateUrlFilters = (newFilters: Partial<SearchFilters>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reseta para página 1 ao alterar filtros
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

  const isRent = currentFilters.transactionType === "rent";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* ESQUERDA: ABAS COMPRAR / ALUGAR */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (pathname.includes("/alugar")) {
                router.push("/comprar");
              } else {
                updateUrlFilters({ transactionType: "sale" });
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !isRent
                ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Comprar
          </button>

          <button
            type="button"
            onClick={() => {
              if (pathname.includes("/comprar")) {
                router.push("/alugar");
              } else {
                updateUrlFilters({ transactionType: "rent" });
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isRent
                ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Alugar
          </button>
        </div>

        {/* CENTRO: FILTROS RÁPIDOS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo de Imóvel Rápido */}
          <select
            value={typeof currentFilters.propertyType === "string" ? currentFilters.propertyType : ""}
            onChange={(e) => updateUrlFilters({ propertyType: (e.target.value as PropertyType) || undefined })}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">Todos os Tipos</option>
            <option value="apartment">Apartamento</option>
            <option value="house">Casa</option>
            <option value="townhouse">Sobrado</option>
            <option value="condo_house">Casa em Condomínio</option>
            <option value="penthouse">Cobertura</option>
            <option value="studio">Studio</option>
            <option value="land">Terreno</option>
            <option value="commercial">Comercial</option>
          </select>

          {/* Faixa de Preço Rápida */}
          <select
            value={currentFilters.priceMax ? String(currentFilters.priceMax) : ""}
            onChange={(e) => updateUrlFilters({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">Preço Máximo</option>
            {isRent ? (
              <>
                <option value="1500">Até R$ 1.500/mês</option>
                <option value="2500">Até R$ 2.500/mês</option>
                <option value="4000">Até R$ 4.000/mês</option>
                <option value="6000">Até R$ 6.000/mês</option>
                <option value="10000">Até R$ 10.000/mês</option>
              </>
            ) : (
              <>
                <option value="300000">Até R$ 300 mil</option>
                <option value="500000">Até R$ 500 mil</option>
                <option value="750000">Até R$ 750 mil</option>
                <option value="1000000">Até R$ 1 milhão</option>
                <option value="2000000">Até R$ 2 milhões</option>
              </>
            )}
          </select>

          {/* Quartos Rápido */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <span className="text-[11px] text-slate-400 px-1 font-medium">Quartos:</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => updateUrlFilters({ bedrooms: currentFilters.bedrooms === n ? undefined : n })}
                className={`h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentFilters.bedrooms === n
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        {/* DIREITA: BOTÃO TODOS OS FILTROS */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDrawerOpen(true)}
            className="h-9 gap-2 text-xs font-bold cursor-pointer rounded-xl"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Mais Filtros</span>
            {activeCount > 0 && (
              <Badge className="h-5 px-1.5 bg-indigo-600 text-white text-[10px] rounded-full">
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* DRAWER LATERAL DE FILTROS AVANÇADOS */}
      <SearchFilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={currentFilters}
        onApply={updateUrlFilters}
      />
    </div>
  );
}
