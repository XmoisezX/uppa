import React from "react";
import Link from "next/link";
import { MapPin, ArrowRight, Building2, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CityGuide } from "../types";

interface CityGuideCardProps {
  guide: CityGuide;
}

export function CityGuideCard({ guide }: CityGuideCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Cabeçalho da Cidade */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-base truncate">
              {guide.name} - {guide.stateCode}
            </span>
          </div>

          <Badge
            variant="secondary"
            className="text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0"
          >
            {guide.propertyCount} {guide.propertyCount === 1 ? "imóvel" : "imóveis"}
          </Badge>
        </div>

        {/* Tagline e Destaque */}
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
          {guide.tagline}
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
          {guide.highlightText}
        </p>
      </div>

      {/* Ações de Descoberta Diretas */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
        <Link
          href={`/comprar?city=${encodeURIComponent(guide.name)}`}
          className="inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-300"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Comprar</span>
        </Link>

        <Link
          href={`/alugar?city=${encodeURIComponent(guide.name)}`}
          className="inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Alugar</span>
        </Link>
      </div>
    </div>
  );
}
