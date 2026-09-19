import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SearchPropertyCard } from "@/features/search/components/SearchPropertyCard";
import type { SearchPropertyItem } from "@/features/search/types";

interface RecentPropertiesProps {
  properties: SearchPropertyItem[];
}

export function RecentProperties({ properties }: RecentPropertiesProps) {
  if (!properties || properties.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Estoque Atualizado</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Imóveis Recentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Últimas oportunidades cadastradas por imobiliárias parceiras
            </p>
          </div>
          <Link
            href="/comprar"
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 self-start sm:self-auto"
          >
            Ver todos os imóveis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <SearchPropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
}
