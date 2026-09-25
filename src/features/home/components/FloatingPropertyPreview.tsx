"use client";

import React from "react";
import { MapPin, ArrowRight, Home, Building2, Crown, Sparkles, Building } from "lucide-react";
import type { HeroBubbleProperty } from "../services";

interface FloatingPropertyPreviewProps {
  property: HeroBubbleProperty;
  align?: "left" | "right";
}

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  condo_house: "Casa em Condomínio",
  land: "Terreno",
  commercial: "Comercial",
  penthouse: "Cobertura",
  studio: "Studio",
  loft: "Loft",
  farm: "Sítio / Fazenda",
};

export function FloatingPropertyPreview({
  property,
  align = "left",
}: FloatingPropertyPreviewProps) {
  const typeLabel = TYPE_LABELS[property.propertyType] || "Imóvel";
  const isRent = property.transactionType === "rent";
  const displayPrice = isRent
    ? property.rentPrice
      ? `R$ ${property.rentPrice.toLocaleString("pt-BR")}/mês`
      : property.price
      ? `R$ ${property.price.toLocaleString("pt-BR")}`
      : "Consulte"
    : property.price
    ? `R$ ${property.price.toLocaleString("pt-BR")}`
    : "Consulte";

  const locationText = [property.neighborhoodName, property.cityName]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={`absolute z-50 w-64 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.20)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.60)] pointer-events-none transition-all duration-200 transform ${
        align === "left"
          ? "left-full ml-3.5 top-1/2 -translate-y-1/2"
          : "right-full mr-3.5 top-1/2 -translate-y-1/2"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Foto Thumbnail */}
        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-100">
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Informações Resumidas */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-tight">
              {typeLabel}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
              {isRent ? "Aluguel" : "Venda"}
            </span>
          </div>

          <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            {displayPrice}
          </div>

          {locationText && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
        <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
          {property.title}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
