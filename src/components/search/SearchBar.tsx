"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Building, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  const [activeTab, setActiveTab] = useState<"comprar" | "alugar">("comprar");
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${activeTab}?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(`/${activeTab}`);
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-2xl bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800">
      {/* Abas Comprar / Alugar */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <button
          type="button"
          onClick={() => setActiveTab("comprar")}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === "comprar"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Comprar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("alugar")}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === "alugar"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Alugar
        </button>
      </div>

      {/* Input de Busca */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 flex items-center">
          <MapPin className="absolute left-4 h-5 w-5 text-indigo-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Digite cidade, bairro ou condomínio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 transition-all"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-semibold shadow-md shadow-indigo-600/25 h-auto py-3.5"
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar Imóveis
        </Button>
      </form>

      {/* Sugestões Rápidas */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          Sugestões:
        </span>
        {["Pelotas - RS", "Porto Alegre - RS", "São Paulo - SP", "Curitiba - PR"].map(
          (city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setQuery(city);
              }}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              {city}
            </button>
          )
        )}
      </div>
    </div>
  );
}
