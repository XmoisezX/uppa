"use client";

import React, { useState, useEffect } from "react";
import { X, SlidersHorizontal, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";

interface SearchFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (newFilters: Partial<SearchFilters>) => void;
  total?: number;
}

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: "apartment", label: "Apartamento" },
  { id: "house", label: "Casa" },
  { id: "condo_house", label: "Casa em Condomínio" },
  { id: "townhouse", label: "Sobrado" },
  { id: "land", label: "Terreno" },
  { id: "penthouse", label: "Cobertura" },
  { id: "studio", label: "Studio" },
  { id: "kitnet", label: "Kitnet" },
  { id: "commercial", label: "Comercial" },
  { id: "farm", label: "Chácara / Sítio" },
];

export function SearchFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  total,
}: SearchFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const isRent = localFilters.transactionType === "rent";

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    const cleared: SearchFilters = {
      transactionType: filters.transactionType,
      city: filters.city,
      state: filters.state,
      neighborhood: filters.neighborhood,
    };
    setLocalFilters(cleared);
    onApply({
      propertyType: undefined,
      priceMin: undefined,
      priceMax: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      parkingSpaces: undefined,
      areaMin: undefined,
      areaMax: undefined,
      financiable: undefined,
      furnished: undefined,
      acceptsExchange: undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* TOPO DO DRAWER */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Filtros
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CORPO DE FILTROS COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. TIPO DE IMÓVEL */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Tipo do Imóvel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((t) => {
                const isSelected = localFilters.propertyType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        propertyType: isSelected ? undefined : t.id,
                      }))
                    }
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. FAIXA DE PREÇO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Faixa de Preço {isRent ? "(Mensal)" : ""}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Mínimo (R$)</span>
                <input
                  type="number"
                  placeholder="0"
                  value={localFilters.priceMin || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      priceMin: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Máximo (R$)</span>
                <input
                  type="number"
                  placeholder="Sem limite"
                  value={localFilters.priceMax || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      priceMax: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 3. QUARTOS */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Quartos
            </label>
            <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, bedrooms: undefined }))}
                className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !localFilters.bedrooms
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                Todos
              </button>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      bedrooms: prev.bedrooms === n ? undefined : n,
                    }))
                  }
                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    localFilters.bedrooms === n
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>

          {/* 4. BANHEIROS */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Banheiros
            </label>
            <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, bathrooms: undefined }))}
                className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !localFilters.bathrooms
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                Todos
              </button>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      bathrooms: prev.bathrooms === n ? undefined : n,
                    }))
                  }
                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    localFilters.bathrooms === n
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>

          {/* 5. VAGAS */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Vagas de Garagem
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, parkingSpaces: undefined }))}
                className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !localFilters.parkingSpaces
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                Todas
              </button>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      parkingSpaces: prev.parkingSpaces === n ? undefined : n,
                    }))
                  }
                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    localFilters.parkingSpaces === n
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>

          {/* 6. ÁREA ÚTIL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Área Útil (m²)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Mínima (m²)"
                value={localFilters.areaMin || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    areaMin: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="number"
                placeholder="Máxima (m²)"
                value={localFilters.areaMax || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    areaMax: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 7. CARACTERÍSTICAS */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Características
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(localFilters.financiable)}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      financiable: e.target.checked ? true : undefined,
                    }))
                  }
                  className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Financiável
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(localFilters.furnished)}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      furnished: e.target.checked ? true : undefined,
                    }))
                  }
                  className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Mobiliado
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(localFilters.acceptsExchange)}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      acceptsExchange: e.target.checked ? true : undefined,
                    }))
                  }
                  className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Aceita Permuta
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RODAPÉ STICKY COM BOTÃO APLICAR */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="flex-1 h-11 rounded-xl text-xs font-bold cursor-pointer"
          >
            Limpar Filtros
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-md"
          >
            {total !== undefined ? `Ver ${total} imóveis` : "Aplicar Filtros"}
          </Button>
        </div>
      </div>
    </div>
  );
}
