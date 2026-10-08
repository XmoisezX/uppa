import React from "react";
import { Globe, Plus } from "lucide-react";
import { getCitiesExpansionList } from "@/features/expansion";
import { CityExpansionListView } from "@/features/expansion/components/CityExpansionListView";

export const metadata = {
  title: "Expansão Territorial & Cidades | UPPA Admin",
  description: "Planejamento territorial, score de expansão e ingestão por município",
};

export default async function AdminExpansaoPage() {
  const cities = await getCitiesExpansionList({ limit: 100 });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Globe className="h-4 w-4" />
            Estratégia Territorial
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Expansão Territorial por Cidade
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            A unidade central de aquisição da UPPA é o município. Avalie scores de gap populacional, densidade imobiliária e orquestre a descoberta de fontes autorizadas.
          </p>
        </div>
      </div>

      {/* Lista e filtros */}
      <CityExpansionListView initialCities={cities} />
    </div>
  );
}
