"use client";

import React, { useState } from "react";
import { X, SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";

interface SearchFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (newFilters: Partial<SearchFilters>) => void;
}

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: "apartment", label: "Apartamento" },
  { id: "house", label: "Casa" },
  { id: "townhouse", label: "Sobrado" },
  { id: "condo_house", label: "Casa em Condomínio" },
  { id: "penthouse", label: "Cobertura" },
  { id: "studio", label: "Studio" },
  { id: "loft", label: "Loft" },
  { id: "land", label: "Terreno / Lote" },
  { id: "commercial", label: "Comercial" },
  { id: "farm", label: "Chácara / Sítio" },
];

export function SearchFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
}: SearchFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      transactionType: filters.transactionType, // mantém se estiver em /comprar ou /alugar
    });
    onApply({
      transactionType: filters.transactionType,
      state: undefined,
      city: undefined,
      neighborhood: undefined,
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
              Todos os Filtros
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CORPO DE FILTROS COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. TIPO DE IMÓVEL */}
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Tipo do Imóvel
            </Label>
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
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. VALORES (PREÇO MÍN E MÁX) */}
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Faixa de Preço (R$)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Mínimo</span>
                <Input
                  type="number"
                  placeholder="R$ 0"
                  value={localFilters.priceMin || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      priceMin: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Máximo</span>
                <Input
                  type="number"
                  placeholder="Sem limite"
                  value={localFilters.priceMax || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      priceMax: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 3. DORMITÓRIOS */}
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Quartos
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      bedrooms: prev.bedrooms === num ? undefined : num,
                    }))
                  }
                  className={`flex-1 py-2 rounded-lg border text-center font-bold transition-all ${
                    localFilters.bedrooms === num
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                  }`}
                >
                  {num}+
                </button>
              ))}
            </div>
          </div>

          {/* 4. BANHEIROS & VAGAS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                Banheiros
              </Label>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        bathrooms: prev.bathrooms === num ? undefined : num,
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg border text-center font-semibold ${
                      localFilters.bathrooms === num
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                Vagas
              </Label>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        parkingSpaces: prev.parkingSpaces === num ? undefined : num,
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg border text-center font-semibold ${
                      localFilters.parkingSpaces === num
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. METRAGEM ÚTIL (M²) */}
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Área Útil Privativa (m²)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Mín m²"
                value={localFilters.areaMin || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    areaMin: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Máx m²"
                value={localFilters.areaMax || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    areaMax: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* 6. CONDIÇÕES ESPECIAIS */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(localFilters.financiable)}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    financiable: e.target.checked || undefined,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Aceita Financiamento Imobiliário
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(localFilters.furnished)}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    furnished: e.target.checked || undefined,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Imóvel Mobiliado
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(localFilters.acceptsExchange)}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    acceptsExchange: e.target.checked || undefined,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Aceita Permuta / Troca
              </span>
            </label>
          </div>
        </div>

        {/* RODAPÉ DO DRAWER: LIMPAR E APLICAR */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Limpar Filtros
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 cursor-pointer"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
