"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import type { SearchFilters } from "../types";
import type { PropertyType } from "@/types/property";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  townhouse: "Sobrado",
  condo_house: "Casa em Condomínio",
  penthouse: "Cobertura",
  studio: "Studio",
  loft: "Loft",
  kitnet: "Kitnet",
  land: "Terreno",
  commercial: "Comercial",
  office: "Sala Comercial",
  warehouse: "Galpão",
  farm: "Chácara / Sítio",
  rural: "Rural",
};

interface SearchFilterChipsProps {
  filters: SearchFilters;
}

export function SearchFilterChips({ filters }: SearchFilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const removeFilter = (key: keyof SearchFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const removePriceFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("priceMin");
    params.delete("priceMax");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const removeAreaFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("areaMin");
    params.delete("areaMax");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    // Preserva apenas a cidade/estado se estiver no path
    router.push(pathname);
  };

  const chips: { label: string; onRemove: () => void }[] = [];

  // Tipo do Imóvel
  if (filters.propertyType) {
    if (Array.isArray(filters.propertyType)) {
      filters.propertyType.forEach((pType) => {
        const label = PROPERTY_TYPE_LABELS[pType] || pType;
        chips.push({
          label,
          onRemove: () => {
            const next = (filters.propertyType as PropertyType[]).filter((t) => t !== pType);
            const params = new URLSearchParams(searchParams.toString());
            if (next.length > 0) {
              params.set("propertyType", next.join(","));
            } else {
              params.delete("propertyType");
            }
            params.set("page", "1");
            router.push(`${pathname}?${params.toString()}`);
          },
        });
      });
    } else {
      const pType = filters.propertyType;
      const label = PROPERTY_TYPE_LABELS[pType] || pType;
      chips.push({
        label,
        onRemove: () => removeFilter("propertyType"),
      });
    }
  }

  // Preço
  const isRent = filters.transactionType === "rent";
  const formatMoney = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toLocaleString("pt-BR")}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toLocaleString("pt-BR")} mil`;
    return `R$ ${val.toLocaleString("pt-BR")}`;
  };

  if (filters.priceMin && filters.priceMax) {
    chips.push({
      label: `${formatMoney(filters.priceMin)} até ${formatMoney(filters.priceMax)}${isRent ? "/mês" : ""}`,
      onRemove: removePriceFilters,
    });
  } else if (filters.priceMin) {
    chips.push({
      label: `A partir de ${formatMoney(filters.priceMin)}${isRent ? "/mês" : ""}`,
      onRemove: removePriceFilters,
    });
  } else if (filters.priceMax) {
    chips.push({
      label: `Até ${formatMoney(filters.priceMax)}${isRent ? "/mês" : ""}`,
      onRemove: removePriceFilters,
    });
  }

  // Quartos
  if (filters.bedrooms) {
    chips.push({
      label: `${filters.bedrooms}+ quartos`,
      onRemove: () => removeFilter("bedrooms"),
    });
  }

  // Banheiros
  if (filters.bathrooms) {
    chips.push({
      label: `${filters.bathrooms}+ banheiros`,
      onRemove: () => removeFilter("bathrooms"),
    });
  }

  // Vagas
  if (filters.parkingSpaces) {
    chips.push({
      label: `${filters.parkingSpaces}+ vagas`,
      onRemove: () => removeFilter("parkingSpaces"),
    });
  }

  // Área
  if (filters.areaMin && filters.areaMax) {
    chips.push({
      label: `${filters.areaMin} m² a ${filters.areaMax} m²`,
      onRemove: removeAreaFilters,
    });
  } else if (filters.areaMin) {
    chips.push({
      label: `A partir de ${filters.areaMin} m²`,
      onRemove: removeAreaFilters,
    });
  } else if (filters.areaMax) {
    chips.push({
      label: `Até ${filters.areaMax} m²`,
      onRemove: removeAreaFilters,
    });
  }

  // Características
  if (filters.financiable) {
    chips.push({
      label: "Financiável",
      onRemove: () => removeFilter("financiable"),
    });
  }

  if (filters.furnished) {
    chips.push({
      label: "Mobiliado",
      onRemove: () => removeFilter("furnished"),
    });
  }

  if (filters.acceptsExchange) {
    chips.push({
      label: "Aceita permuta",
      onRemove: () => removeFilter("acceptsExchange"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-[11px] font-semibold text-slate-400 mr-1">Filtros ativos:</span>
      {chips.map((chip, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition-colors"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-0.5 rounded-full hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 transition-colors cursor-pointer"
            title={`Remover filtro ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={clearAllFilters}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer ml-1"
      >
        <Trash2 className="h-3 w-3" />
        <span>Limpar tudo</span>
      </button>
    </div>
  );
}
