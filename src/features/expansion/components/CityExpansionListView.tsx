"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Globe,
  Building2,
  Users,
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { CityExpansionMetrics } from "../types";
import { updateCityPopulationAdminAction } from "../actions";

interface Props {
  initialCities: CityExpansionMetrics[];
}

export function CityExpansionListView({ initialCities }: Props) {
  const [cities, setCities] = useState(initialCities);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Filtragem local
  const filtered = cities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority =
      filterPriority === "all" || c.expansionPriority === filterPriority;
    const matchesStatus =
      filterStatus === "all" || c.expansionStatus === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const handleSyncIbge = (cityId: string) => {
    setSyncingId(cityId);
    startTransition(async () => {
      const res = await updateCityPopulationAdminAction(cityId);
      if (res.success) {
        setCities((prev) =>
          prev.map((item) =>
            item.id === cityId
              ? {
                  ...item,
                  population: res.population,
                  expansionScore: res.score ?? item.expansionScore,
                  expansionPriority: (res.priority as any) ?? item.expansionPriority,
                  populationUpdatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      }
      setSyncingId(null);
    });
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "A":
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40";
      case "B":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40";
      case "C":
        return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/40";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "crawling":
        return "bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse";
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "eligible":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "researching":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "paused":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Cidades no Plano</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {cities.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Prioridade A (Alta Oportunidade)</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {cities.filter((c) => c.expansionPriority === "A").length}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Imóveis Ativos Indexados</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {cities.reduce((acc, c) => acc + c.activePropertiesCount, 0).toLocaleString("pt-BR")}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Imobiliárias Conhecidas</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {cities.reduce((acc, c) => acc + c.knownAgenciesCount, 0)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cidade ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="A">Prioridade A</option>
            <option value="B">Prioridade B</option>
            <option value="C">Prioridade C</option>
            <option value="not_prioritized">Não Priorizadas</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="not_started">Não Iniciado</option>
            <option value="eligible">Elegível</option>
            <option value="crawling">Em Varredura</option>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Cidades */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Cidade / UF</th>
                <th className="px-4 py-3.5">População (IBGE)</th>
                <th className="px-4 py-3.5">Estoque UPPA</th>
                <th className="px-4 py-3.5">Imobiliárias</th>
                <th className="px-4 py-3.5">Expansion Score</th>
                <th className="px-4 py-3.5">Prioridade</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Nenhuma cidade encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {c.stateCode} {c.ibgeCode ? `• IBGE: ${c.ibgeCode}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {c.population ? (
                        <div>
                          <p className="text-slate-900 dark:text-white font-semibold">
                            {c.population.toLocaleString("pt-BR")}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.populationSource || "IBGE"} ({c.populationReferenceYear || 2022})
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSyncIbge(c.id)}
                          disabled={syncingId === c.id}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${syncingId === c.id ? "animate-spin" : ""}`}
                          />
                          Carregar IBGE
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-900 dark:text-white">
                        {c.activePropertiesCount.toLocaleString("pt-BR")} imóveis
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {c.activeOffersCount.toLocaleString("pt-BR")} ofertas
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-900 dark:text-white">
                        {c.knownAgenciesCount} mapeadas
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {c.claimedAgenciesCount} claimed
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${Math.min(100, c.expansionScore)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c.expansionScore}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadge(
                          c.expansionPriority
                        )}`}
                      >
                        Prioridade {c.expansionPriority}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadge(
                          c.expansionStatus
                        )}`}
                      >
                        {c.expansionStatus}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSyncIbge(c.id)}
                          disabled={syncingId === c.id}
                          title="Atualizar dados populacionais no IBGE"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${syncingId === c.id ? "animate-spin" : ""}`}
                          />
                        </button>
                        <Link
                          href={`/admin/expansao/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
                        >
                          Gerenciar
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
