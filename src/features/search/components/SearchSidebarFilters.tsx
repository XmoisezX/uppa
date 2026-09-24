"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";
import { LocationAutocomplete } from "./LocationAutocomplete";

interface SearchSidebarFiltersProps {
  filters: SearchFilters;
  cityName?: string;
  stateCode?: string;
  neighborhoodName?: string;
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

export function SearchSidebarFilters({ filters }: SearchSidebarFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    <aside className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
          Filtros de Busca
        </h2>
        <button
          type="button"
          onClick={handleClearAll}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Limpar</span>
        </button>
      </div>

      {/* 1. TIPO DE IMÓVEL */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => toggleSection("type")}
          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span>Tipo de Imóvel</span>
          {openSections.type ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {openSections.type && (
          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {PROPERTY_TYPES.map((t) => {
              const isChecked = filters.propertyType === t.id;
              return (
                <label
                  key={t.id}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      updateFilters({
                        propertyType: isChecked ? undefined : t.id,
                      })
                    }
                    className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{t.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. FAIXA DE PREÇO */}
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
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Mínimo (R$)
                </label>
                <input
                  type="number"
                  placeholder={isRent ? "500" : "100.000"}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onBlur={handlePriceBlur}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Máximo (R$)
                </label>
                <input
                  type="number"
                  placeholder={isRent ? "5.000" : "1.000.000"}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onBlur={handlePriceBlur}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {isRent ? (
                <>
                  {[1500, 2500, 4000, 6000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setMaxPrice(String(val));
                        updateFilters({ priceMax: val });
                      }}
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Até R$ {val.toLocaleString("pt-BR")}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[300000, 500000, 750000, 1000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setMaxPrice(String(val));
                        updateFilters({ priceMax: val });
                      }}
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Até R$ {val >= 1000000 ? "1M" : `${val / 1000}k`}
                    </button>
                  ))}
                </>
              )}
            </div>
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
