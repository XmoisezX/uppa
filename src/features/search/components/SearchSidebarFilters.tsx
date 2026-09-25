"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
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
  Check,
} from "lucide-react";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { PriceRangeHistogramFilter } from "./PriceRangeHistogramFilter";

interface SearchSidebarFiltersProps {
  filters: SearchFilters;
  cityName?: string;
  stateCode?: string;
  neighborhoodName?: string;
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

export function SearchSidebarFilters({
  filters,
  cityName,
  stateCode,
  neighborhoodName,
}: SearchSidebarFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Alterna entre Comprar e Alugar preservando filtros compatíveis
  const handleToggleTransaction = (target: "sale" | "rent") => {
    if ((target === "sale" && !isRent) || (target === "rent" && isRent)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.delete("priceMin");
    params.delete("priceMax");

    const targetRoute = target === "rent" ? "/alugar" : "/comprar";
    const query = params.toString();
    router.push(query ? `${targetRoute}?${query}` : targetRoute);
  };

  // Estados colapsáveis para cada seção
  const [openSections, setOpenSections] = useState({
    type: true,
    price: true,
    rooms: true,
    area: true,
    features: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [showMoreTypes, setShowMoreTypes] = useState(false);

  const selectedTypes: PropertyType[] = React.useMemo(() => {
    if (!filters.propertyType) return [];
    if (Array.isArray(filters.propertyType)) return filters.propertyType;
    return [filters.propertyType];
  }, [filters.propertyType]);

  const handleToggleType = (typeId: PropertyType) => {
    const next = selectedTypes.includes(typeId)
      ? selectedTypes.filter((t) => t !== typeId)
      : [...selectedTypes, typeId];
    updateFilters({
      propertyType: next.length > 0 ? (next as any) : undefined,
    });
  };

  const isRent = filters.transactionType === "rent";

  // Preço local para inputs numéricos
  const [minPrice, setMinPrice] = useState<string>(
    filters.priceMin ? String(filters.priceMin) : ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    filters.priceMax ? String(filters.priceMax) : ""
  );

  // Área local para inputs
  const [minArea, setMinArea] = useState<string>(
    filters.areaMin ? String(filters.areaMin) : ""
  );
  const [maxArea, setMaxArea] = useState<string>(
    filters.areaMax ? String(filters.areaMax) : ""
  );

  const updateFilters = (updates: Partial<SearchFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "" || val === false) {
        params.delete(key);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          params.delete(key);
        } else {
          params.set(key, val.join(","));
        }
      } else {
        params.set(key, String(val));
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePriceBlur = () => {
    updateFilters({
      priceMin: minPrice ? Number(minPrice) : undefined,
      priceMax: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  const handleAreaBlur = () => {
    updateFilters({
      areaMin: minArea ? Number(minArea) : undefined,
      areaMax: maxArea ? Number(maxArea) : undefined,
    });
  };

  const handleClearAll = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
    router.push(pathname);
  };

  return (
    <aside className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
      {/* 0. CABEÇALHO FILTROS (Igual screenshot Chaves na Mão) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-800 dark:text-white" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Filtros
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Limpar</span>
        </button>
      </div>

      {/* ABAS COMPRAR / ALUGAR */}
      <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => handleToggleTransaction("sale")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isRent
              ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Alugar
        </button>
      </div>

      {/* BUSCA DE LOCALIZAÇÃO COM AUTOCOMPLETE (CIDADES E BAIRROS) */}
      <div className="relative">
        <LocationAutocomplete
          initialCity={filters.city}
          initialNeighborhood={filters.neighborhood}
          cityName={cityName}
          neighborhoodName={neighborhoodName}
          placeholder="Digite cidade ou bairro..."
        />
      </div>

      {/* 1. TIPO DE IMÓVEL */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between py-1">
          <button
            type="button"
            onClick={() => toggleSection("type")}
            className="flex-1 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span>Tipo de Imóvel</span>
              {selectedTypes.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  {selectedTypes.length}
                </span>
              )}
            </div>
            {openSections.type ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {openSections.type && (
          <div className="mt-3 space-y-2">
            {/* GRID DE ÍCONES PRINCIPAIS: Casa, Apartamento, Casa em Condomínio, Terrenos, Loft, Chácara */}
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_PROPERTY_TYPES.map((t) => {
                const isSelected = selectedTypes.includes(t.id);
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleType(t.id)}
                    className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-indigo-600 text-white">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 mb-1 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className="text-[11px] font-bold leading-tight line-clamp-1">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DEMAIS TIPOS EXPANDÍVEIS (VER MAIS) */}
            {showMoreTypes && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                {MORE_PROPERTY_TYPES.map((t) => {
                  const isSelected = selectedTypes.includes(t.id);
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleType(t.id)}
                      className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-indigo-600 text-white">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                      )}
                      <Icon className={`w-5 h-5 mb-1 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                      <span className="text-[11px] font-bold leading-tight line-clamp-1">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* BOTÃO VER MAIS / VER MENOS */}
            <button
              type="button"
              onClick={() => setShowMoreTypes((prev) => !prev)}
              className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <span>{showMoreTypes ? "Ver menos tipos" : `Ver mais (+${MORE_PROPERTY_TYPES.length})`}</span>
              {showMoreTypes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* 2. FAIXA DE PREÇO COM VELAS VERTICAIS E RANGER */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => toggleSection("price")}
          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span>Faixa de Preço {isRent && "(Mensal)"}</span>
          {openSections.price ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {openSections.price && (
          <div className="mt-3">
            <PriceRangeHistogramFilter
              isRent={isRent}
              minPrice={filters.priceMin}
              maxPrice={filters.priceMax}
              onChange={updateFilters}
            />
          </div>
        )}
      </div>

      {/* 3. CÔMODOS & ESPECIFICAÇÕES (Quartos, Banheiros, Vagas) */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => toggleSection("rooms")}
          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span>Cômodos e Vagas</span>
          {openSections.rooms ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {openSections.rooms && (
          <div className="mt-3 space-y-3.5">
            {/* Quartos */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Quartos
              </span>
              <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => updateFilters({ bedrooms: undefined })}
                  className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !filters.bedrooms
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todos
                </button>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        bedrooms: filters.bedrooms === n ? undefined : n,
                      })
                    }
                    className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filters.bedrooms === n
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>

            {/* Banheiros */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Banheiros
              </span>
              <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => updateFilters({ bathrooms: undefined })}
                  className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !filters.bathrooms
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todos
                </button>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        bathrooms: filters.bathrooms === n ? undefined : n,
                      })
                    }
                    className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filters.bathrooms === n
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>

            {/* Vagas */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Vagas de Garagem
              </span>
              <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => updateFilters({ parkingSpaces: undefined })}
                  className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !filters.parkingSpaces
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todas
                </button>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        parkingSpaces: filters.parkingSpaces === n ? undefined : n,
                      })
                    }
                    className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filters.parkingSpaces === n
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. ÁREA ÚTIL (m²) */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => toggleSection("area")}
          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span>Área Útil (m²)</span>
          {openSections.area ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {openSections.area && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Mínima (m²)
              </label>
              <input
                type="number"
                placeholder="Ex: 50"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                onBlur={handleAreaBlur}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Máxima (m²)
              </label>
              <input
                type="number"
                placeholder="Ex: 300"
                value={maxArea}
                onChange={(e) => setMaxArea(e.target.value)}
                onBlur={handleAreaBlur}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. CARACTERÍSTICAS REAIS SUPORTADAS */}
      <div>
        <button
          type="button"
          onClick={() => toggleSection("features")}
          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span>Características</span>
          {openSections.features ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {openSections.features && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 py-1 px-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.financiable)}
                onChange={(e) =>
                  updateFilters({
                    financiable: e.target.checked ? true : undefined,
                  })
                }
                className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Financiável</span>
            </label>

            <label className="flex items-center gap-2 py-1 px-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.furnished)}
                onChange={(e) =>
                  updateFilters({
                    furnished: e.target.checked ? true : undefined,
                  })
                }
                className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Mobiliado</span>
            </label>

            <label className="flex items-center gap-2 py-1 px-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.acceptsExchange)}
                onChange={(e) =>
                  updateFilters({
                    acceptsExchange: e.target.checked ? true : undefined,
                  })
                }
                className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Aceita Permuta</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  );
}
