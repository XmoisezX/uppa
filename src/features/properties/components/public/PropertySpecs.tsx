import React from "react";
import {
  Maximize,
  Bed,
  Bath,
  Car,
  Calendar,
  Armchair,
  Dog,
  Layers,
} from "lucide-react";
import type { PropertyWithDetails } from "@/types/property";

interface PropertySpecsProps {
  property: PropertyWithDetails;
}

export function PropertySpecs({ property }: PropertySpecsProps) {
  const specs = [
    {
      label: "Área Útil",
      value: property.usableArea ? `${property.usableArea} m²` : null,
      icon: Maximize,
    },
    {
      label: "Área Total",
      value: property.totalArea ? `${property.totalArea} m²` : null,
      icon: Layers,
    },
    {
      label: "Quartos",
      value: property.bedrooms > 0 ? `${property.bedrooms} ${property.bedrooms === 1 ? "quarto" : "quartos"}` : null,
      icon: Bed,
    },
    {
      label: "Suítes",
      value: property.suites > 0 ? `${property.suites} ${property.suites === 1 ? "suíte" : "suítes"}` : null,
      icon: Bed,
    },
    {
      label: "Banheiros",
      value: property.bathrooms > 0 ? `${property.bathrooms} ${property.bathrooms === 1 ? "banheiro" : "banheiros"}` : null,
      icon: Bath,
    },
    {
      label: "Vagas",
      value: property.parkingSpaces > 0 ? `${property.parkingSpaces} ${property.parkingSpaces === 1 ? "vaga" : "vagas"}` : null,
      icon: Car,
    },
    {
      label: "Ano",
      value: property.yearBuilt ? String(property.yearBuilt) : null,
      icon: Calendar,
    },
    {
      label: "Mobília",
      value: property.furnished ? "Mobiliado" : null,
      icon: Armchair,
    },
    {
      label: "Pets",
      value: property.petFriendly ? "Aceita animais" : null,
      icon: Dog,
    },
  ].filter((s) => s.value !== null);

  if (specs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Características do Imóvel
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {specs.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
