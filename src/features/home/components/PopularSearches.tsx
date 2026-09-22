import React from "react";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import type { ActiveCitySummary } from "../services";

interface PopularSearchesProps {
  cities?: ActiveCitySummary[];
}

export function PopularSearches({ cities = [] }: PopularSearchesProps) {
  const commonSearches = [
    { label: "Apartamentos à venda", href: "/comprar?propertyType=apartment" },
    { label: "Casas em condomínio", href: "/comprar?propertyType=condo_house" },
    { label: "Casas para alugar", href: "/alugar?propertyType=house" },
    { label: "Studios e Kitnets", href: "/alugar?propertyType=studio" },
    { label: "Terrenos e Lotes", href: "/comprar?propertyType=land" },
    { label: "Imóveis financiáveis", href: "/comprar?financiable=true" },
    { label: "Salas comerciais", href: "/alugar?propertyType=commercial" },
    { label: "Casas com 3 quartos", href: "/comprar?propertyType=house&bedrooms=3" },
  ];

  // Gera buscas por cidades reais existentes no banco
  const citySearches = cities.slice(0, 4).flatMap((city) => [
    {
      label: `Apartamentos em ${city.name}`,
      href: `/comprar?city=${encodeURIComponent(city.name)}&propertyType=apartment`,
    },
    {
      label: `Casas em ${city.name}`,
      href: `/comprar?city=${encodeURIComponent(city.name)}&propertyType=house`,
    },
  ]);

  const allSearches = [...commonSearches, ...citySearches];

  return (
    <section className="py-12 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Descoberta de Imóveis</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Buscas Populares no Portal
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Acesse rapidamente os filtros e tipos mais procurados por compradores e locatários
        </p>

        <div className="flex flex-wrap gap-2.5">
          {allSearches.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 text-xs font-semibold text-slate-700 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              <Search className="h-3 w-3 text-slate-400" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
