import React from "react";
import Link from "next/link";
import { MapPin, ArrowRight, Building, Key } from "lucide-react";
import type { ActiveCitySummary } from "../services";

interface PopularCitiesProps {
  cities: ActiveCitySummary[];
}

export function PopularCities({ cities }: PopularCitiesProps) {
  // Exibe apenas cidades que realmente possuem imóveis ativos
  const displayCities = cities.slice(0, 6);

  if (displayCities.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Imóveis nas Principais Cidades
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore anúncios disponíveis nos municípios com maior estoque ativo
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayCities.map((city) => {
            const cityParam = encodeURIComponent(city.slug || city.name);
            return (
              <div
                key={city.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {city.stateCode}
                      </span>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {city.propertyCount}{" "}
                      {city.propertyCount === 1 ? "imóvel" : "imóveis"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                    {city.name}
                  </h3>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <Link
                    href={`/comprar?city=${cityParam}`}
                    className="flex items-center justify-between font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-1 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      Comprar imóveis
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>

                  <Link
                    href={`/alugar?city=${cityParam}`}
                    className="flex items-center justify-between font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 py-1 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-slate-400" />
                      Alugar imóveis
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
