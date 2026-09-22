"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Building, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActiveCitySummary } from "../services";

interface PropertySearchHeroProps {
  suggestedCities?: ActiveCitySummary[];
}

export function PropertySearchHero({
  suggestedCities = [],
}: PropertySearchHeroProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"comprar" | "alugar" | "lancamentos">("comprar");
  const [propertyType, setPropertyType] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (activeTab === "lancamentos") {
      params.set("propertyType", propertyType || "condo_house");
      if (location.trim()) {
        params.set("city", location.trim());
      }
      router.push(`/comprar?${params.toString()}`);
      return;
    }

    if (propertyType) {
      params.set("propertyType", propertyType);
    }

    if (location.trim()) {
      params.set("city", location.trim());
    }

    const queryString = params.toString();
    const destination = queryString
      ? `/${activeTab}?${queryString}`
      : `/${activeTab}`;

    router.push(destination);
  };

  const topCities = suggestedCities.slice(0, 5);

  return (
    <section className="relative bg-gradient-to-b from-slate-50 via-white to-white border-b border-slate-200/80 pt-10 pb-12 sm:pt-16 sm:pb-20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:border-slate-800">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge do Portal Nacional */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4 border border-indigo-100 dark:border-indigo-900/50">
          <Sparkles className="h-3.5 w-3.5" />
          <span>O Portal Imobiliário Nacional da sua Próxima Conquista</span>
        </div>

        {/* Headline Protagonista */}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
          Encontre o imóvel ideal para comprar ou alugar
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Milhares de casas, apartamentos, terrenos e salas comerciais com informações 100% transparentes e contato direto com imobiliárias parceiras.
        </p>

        {/* Card de Busca Principal */}
        <div className="mt-8 mx-auto max-w-4xl text-left">
          {/* Abas de Operação */}
          <div className="inline-flex rounded-t-xl bg-slate-200/70 p-1 border border-b-0 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("comprar")}
              className={`rounded-lg px-6 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "comprar"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Comprar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("alugar")}
              className={`rounded-lg px-6 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "alugar"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Alugar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lancamentos")}
              className={`rounded-lg px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "lancamentos"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Lançamentos
            </button>
          </div>

          {/* Container do Formulário de Busca */}
          <div className="rounded-b-2xl rounded-tr-2xl sm:rounded-tr-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
            >
              {/* Seletor de Tipo de Imóvel */}
              <div className="sm:col-span-4 relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 px-1">
                  Tipo de imóvel
                </label>
                <div className="relative flex items-center">
                  <Building className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-8 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="apartment">Apartamento</option>
                    <option value="house">Casa</option>
                    <option value="condo_house">Casa em Condomínio</option>
                    <option value="land">Terreno / Lote</option>
                    <option value="studio">Studio / Kitnet</option>
                    <option value="penthouse">Cobertura</option>
                    <option value="commercial">Comercial</option>
                    <option value="farm">Chácara / Sítio</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Input de Localização com Suporte a Cidades do Banco */}
              <div className="sm:col-span-5 relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 px-1">
                  Onde você procura?
                </label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    list="suggested-cities-list"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Digite cidade, bairro ou estado..."
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 transition-all"
                  />
                  <datalist id="suggested-cities-list">
                    {suggestedCities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.stateCode}) — {c.propertyCount} imóveis
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Botão de Busca */}
              <div className="sm:col-span-3 sm:self-end">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Search className="h-4 w-4 mr-2 stroke-[2.5]" />
                  Buscar Imóveis
                </Button>
              </div>
            </form>

            {/* Chips Rápidos de Cidades Reais */}
            {topCities.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 px-1 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Cidades ativas:
                </span>
                {topCities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => setLocation(city.name)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {city.name} {city.stateCode ? `- ${city.stateCode}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
