"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import type { PopularSearchGroup } from "../types";

interface PopularSearchesProps {
  groups: PopularSearchGroup[];
  title?: string;
  subtitle?: string;
}

export function PopularSearches({
  groups,
  title = "Buscas Populares no Portal",
  subtitle = "Acesse rapidamente os filtros, tipos e cidades mais procurados no momento",
}: PopularSearchesProps) {
  if (!groups || groups.length === 0) return null;

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const currentGroup = groups[activeGroupIndex] || groups[0];

  return (
    <section className="py-12 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Descoberta & SEO</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
            {subtitle}
          </p>
        )}

        {/* Abas de Grupos de Busca */}
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            {groups.map((group, idx) => (
              <button
                key={group.title}
                type="button"
                onClick={() => setActiveGroupIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeGroupIndex === idx
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {group.title}
              </button>
            ))}
          </div>
        )}

        {/* Lista de Termos da Aba Ativa */}
        <div className="flex flex-wrap gap-2.5">
          {currentGroup.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 text-xs font-semibold text-slate-700 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 shadow-2xs hover:shadow-xs"
            >
              <Search className="h-3 w-3 text-slate-400" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-mono font-medium text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
