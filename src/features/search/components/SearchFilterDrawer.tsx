"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Home,
  Building2,
  ShieldCheck,
  LandPlot,
  Layers,
  Trees,
  Building,
  Crown,
  Maximize2,
  DoorOpen,
  Store,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { PriceRangeHistogramFilter } from "./PriceRangeHistogramFilter";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";

interface SearchFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (newFilters: Partial<SearchFilters>) => void;
  total?: number;
}

const PRIMARY_PROPERTY_TYPES: { id: PropertyType; label: string; icon: any }[] = [
  { id: "house", label: "Casa", icon: Home },
  { id: "apartment", label: "Apartamento", icon: Building2 },
  { id: "condo_house", label: "Casa em Condomínio", icon: ShieldCheck },
  { id: "land", label: "Terrenos", icon: LandPlot },
  { id: "loft", label: "Loft", icon: Layers },
  { id: "farm", label: "Chácara", icon: Trees },
];

const MORE_PROPERTY_TYPES: { id: PropertyType; label: string; icon: any }[] = [
  { id: "townhouse", label: "Sobrado", icon: Building },
  { id: "penthouse", label: "Cobertura", icon: Crown },
  { id: "studio", label: "Studio", icon: Maximize2 },
  { id: "kitnet", label: "Kitnet", icon: DoorOpen },
  { id: "commercial", label: "Comercial", icon: Store },
];

export function SearchFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  total,
}: SearchFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const [showAllTypes, setShowAllTypes] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  const selectedTypes: PropertyType[] = React.useMemo(() => {
    if (!localFilters.propertyType) return [];
    if (Array.isArray(localFilters.propertyType)) return localFilters.propertyType;
    return [localFilters.propertyType];
  }, [localFilters.propertyType]);

  const handleToggleType = (typeId: PropertyType) => {
    const next = selectedTypes.includes(typeId)
      ? selectedTypes.filter((t) => t !== typeId)
      : [...selectedTypes, typeId];
    setLocalFilters((prev) => ({
      ...prev,
      propertyType: next.length > 0 ? (next as any) : undefined,
    }));
  };

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
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* TOPO DO DRAWER */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Filtros
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CORPO DE FILTROS COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs bg-white">
          {/* LOCALIZAÇÃO (AUTOCOMPLETE CIDADES E BAIRROS) */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Localização
            </label>
            <LocationAutocomplete
              initialCity={localFilters.city}
              initialNeighborhood={localFilters.neighborhood}
              placeholder="Digite cidade ou bairro..."
              onLocationChange={({ city, neighborhood }) => {
                setLocalFilters((prev) => ({
                  ...prev,
                  city: city || undefined,
                  neighborhood: neighborhood || undefined,
                }));
              }}
            />
          </div>

          {/* 1. TIPO DE IMÓVEL (COM ÍCONES E MULTI-SELEÇÃO) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 block">
                Tipo do Imóvel
              </label>
              {selectedTypes.length > 0 && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selectedTypes.length} {selectedTypes.length === 1 ? "selecionado" : "selecionados"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_PROPERTY_TYPES.map((t) => {
                const isSelected = selectedTypes.includes(t.id);
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleType(t.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <IconComponent
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-indigo-600" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{t.label}</span>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ml-1.5 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}

              {showAllTypes &&
                MORE_PROPERTY_TYPES.map((t) => {
                  const isSelected = selectedTypes.includes(t.id);
                  const IconComponent = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleType(t.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer select-none animate-in fade-in duration-150 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <IconComponent
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? "text-indigo-600" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{t.label}</span>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ml-1.5 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setShowAllTypes((prev) => !prev)}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-xl transition-colors cursor-pointer"
            >
              <span>{showAllTypes ? "Ver menos tipos" : "Ver mais tipos de imóveis"}</span>
              {showAllTypes ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* 2. FAIXA DE PREÇO COM HISTOGRAMA E INPUTS (ESTILO CHAVES NA MÃO) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              Faixa de Preço {isRent ? "(Mensal)" : ""}
            </label>
            <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
              <PriceRangeHistogramFilter
                isRent={isRent}
                minPrice={localFilters.priceMin}
                maxPrice={localFilters.priceMax}
                onChange={({ priceMin, priceMax }) => {
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceMin,
                    priceMax,
                  }));
                }}
              />
            </div>
          </div>

          {/* 3. QUARTOS */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Quartos
            </label>
            <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, bedrooms: undefined }))}
                className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !localFilters.bedrooms
                    ? "bg-white text-slate-900 shadow-2xs"
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
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>

          {/* 4. BANHEIROS */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Banheiros
            </label>
            <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, bathrooms: undefined }))}
                className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !localFilters.bathrooms
                    ? "bg-white text-slate-900 shadow-2xs"
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
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>

          {/* 5. VAGAS */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Vagas de Garagem
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, parkingSpaces: undefined }))}
                className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !localFilters.parkingSpaces
                    ? "bg-white text-slate-900 shadow-2xs"
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
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>

          {/* 6. ÁREA ÚTIL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
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
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
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
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 7. CARACTERÍSTICAS */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Características
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
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
                <span className="text-xs font-medium text-slate-800">
                  Financiável
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
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
                <span className="text-xs font-medium text-slate-800">
                  Mobiliado
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
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
                <span className="text-xs font-medium text-slate-800">
                  Aceita Permuta
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RODAPÉ STICKY COM BOTÃO APLICAR */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-3 shadow-xs">
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
            {total !== undefined ? `Ver ${total.toLocaleString("pt-BR")} imóveis` : "Aplicar Filtros"}
          </Button>
        </div>
      </div>
    </div>
  );
}
