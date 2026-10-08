"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Globe,
  RefreshCw,
  Sparkles,
  MapPin,
  Play,
  Pause,
  XCircle,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { CityExpansionMetrics } from "../types";
import {
  updateCityPopulationAdminAction,
  updateCityStatusAdminAction,
  preRegisterAgencyAdminAction,
  startPersistentCrawlJobAction,
  updateCrawlJobStatusAction,
} from "../actions";

interface Props {
  city: CityExpansionMetrics;
  agencies: any[];
  sources: any[];
  jobs: any[];
}

export function CityExpansionDetailView({
  city,
  agencies: initialAgencies,
  sources: initialSources,
  jobs: initialJobs,
}: Props) {
  const [activeTab, setActiveTab] = useState<"agencies" | "sources" | "jobs">("agencies");
  const [cityData, setCityData] = useState(city);
  const [agencies, setAgencies] = useState(initialAgencies);
  const [sources, setSources] = useState(initialSources);
  const [jobs, setJobs] = useState(initialJobs);
  const [isPending, startTransition] = useTransition();

  // Modal de pré-cadastro de agência
  const [showPreRegisterModal, setShowPreRegisterModal] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyWebsite, setNewAgencyWebsite] = useState("");
  const [newAgencyCreci, setNewAgencyCreci] = useState("");
  const [newAgencyPhone, setNewAgencyPhone] = useState("");
  const [newAgencyEmail, setNewAgencyEmail] = useState("");

  const handleSyncIbge = () => {
    startTransition(async () => {
      const res = await updateCityPopulationAdminAction(cityData.id);
      if (res.success) {
        setCityData((prev) => ({
          ...prev,
          population: res.population,
          expansionScore: res.score ?? prev.expansionScore,
          expansionPriority: (res.priority as any) ?? prev.expansionPriority,
          populationUpdatedAt: new Date().toISOString(),
        }));
      }
    });
  };

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateCityStatusAdminAction(cityData.id, newStatus as any);
      if (res.success) {
        setCityData((prev) => ({ ...prev, expansionStatus: newStatus as any }));
      }
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    startTransition(async () => {
      const res = await updateCityStatusAdminAction(cityData.id, cityData.expansionStatus, newPriority as any);
      if (res.success) {
        setCityData((prev) => ({ ...prev, expansionPriority: newPriority as any }));
      }
    });
  };

  const handlePreRegisterAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyName.trim()) return;

    startTransition(async () => {
      const res = await preRegisterAgencyAdminAction({
        name: newAgencyName.trim(),
        website: newAgencyWebsite.trim() || undefined,
        creci: newAgencyCreci.trim() || undefined,
        phone: newAgencyPhone.trim() || undefined,
        email: newAgencyEmail.trim() || undefined,
        cityId: cityData.id,
      });

      if (res.success && res.result) {
        setAgencies((prev) => [
          {
            id: res.result.agencyId,
            name: newAgencyName.trim(),
            slug: res.result.agencySlug,
            creci: newAgencyCreci.trim() || null,
            phone: newAgencyPhone.trim() || null,
            website: newAgencyWebsite.trim() || null,
            claim_status: "discovered",
            is_official_profile: false,
            created_source: "uppa_discovery",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setShowPreRegisterModal(false);
        setNewAgencyName("");
        setNewAgencyWebsite("");
        setNewAgencyCreci("");
        setNewAgencyPhone("");
        setNewAgencyEmail("");
      }
    });
  };

  const handleStartCrawl = (websiteSourceId: string, agencyId: string) => {
    startTransition(async () => {
      const res = await startPersistentCrawlJobAction({
        websiteSourceId,
        agencyId,
        cityId: cityData.id,
      });

      if (res.success && res.job) {
        setJobs((prev) => [res.job, ...prev]);
        setActiveTab("jobs");
      }
    });
  };

  const handleCancelJob = (jobId: string) => {
    startTransition(async () => {
      const res = await updateCrawlJobStatusAction(jobId, "cancelled", cityData.id);
      if (res.success) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "cancelled" } : j))
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Botão de retorno */}
      <Link
        href="/admin/expansao"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para Cidades
      </Link>

      {/* Cartão de Resumo e Métricas Principais da Cidade */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <MapPin className="h-4 w-4" />
              Município de Referência
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {cityData.name} — {cityData.stateCode}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Código IBGE: {cityData.ibgeCode || "Não cadastrado"} • Slug: /{cityData.slug}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncIbge}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Atualizar IBGE
            </button>

            <select
              value={cityData.expansionStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            >
              <option value="not_started">Status: Não Iniciado</option>
              <option value="researching">Status: Pesquisa</option>
              <option value="eligible">Status: Elegível</option>
              <option value="crawling">Status: Em Varredura</option>
              <option value="active">Status: Ativo</option>
              <option value="paused">Status: Pausado</option>
            </select>

            <select
              value={cityData.expansionPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            >
              <option value="A">Prioridade A (Alta)</option>
              <option value="B">Prioridade B (Média)</option>
              <option value="C">Prioridade C (Baixa)</option>
              <option value="not_prioritized">Não Priorizada</option>
            </select>
          </div>
        </div>

        {/* Grade de Indicadores de Expansão */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500">População IBGE</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {cityData.population ? cityData.population.toLocaleString("pt-BR") : "—"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Censo {cityData.populationReferenceYear || 2022}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Expansion Score</p>
            <p className="text-xl font-black text-indigo-950 dark:text-indigo-200 mt-1">
              {cityData.expansionScore} / 100
            </p>
            <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400 mt-0.5">
              Prioridade {cityData.expansionPriority}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500">Estoque Indexado</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {cityData.activePropertiesCount} imóveis
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {cityData.activeOffersCount} ofertas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500">Imobiliárias</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {cityData.knownAgenciesCount} descobertas
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              {cityData.claimedAgenciesCount} oficiais (claimed)
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("agencies")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "agencies"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Imobiliárias Descobertas ({agencies.length})
        </button>

        <button
          onClick={() => setActiveTab("sources")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "sources"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Fontes de Websites ({sources.length})
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "jobs"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Jobs de Crawler Persistente ({jobs.length})
        </button>
      </div>

      {/* ABA 1: IMOBILIÁRIAS */}
      {activeTab === "agencies" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Imobiliárias pré-cadastradas na cidade sem login ou senha até serem reivindicadas.
            </p>
            <button
              onClick={() => setShowPreRegisterModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Pré-cadastrar Imobiliária
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Nome da Imobiliária</th>
                  <th className="px-4 py-3.5">CRECI</th>
                  <th className="px-4 py-3.5">Contatos</th>
                  <th className="px-4 py-3.5">Website</th>
                  <th className="px-4 py-3.5">Status do Perfil</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {agencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Nenhuma imobiliária cadastrada nesta cidade ainda.
                    </td>
                  </tr>
                ) : (
                  agencies.map((ag) => (
                    <tr key={ag.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {ag.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Origem: {ag.created_source || "uppa_discovery"}
                        </div>
                      </td>

                      <td className="px-4 py-4">{ag.creci || <span className="text-slate-400">—</span>}</td>

                      <td className="px-4 py-4 text-xs">
                        <p>{ag.phone || <span className="text-slate-400">—</span>}</p>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {ag.website ? (
                          <a
                            href={ag.website.startsWith("http") ? ag.website : `https://${ag.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                          >
                            {ag.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {ag.claim_status === "claimed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="h-3 w-3" />
                            Oficial (Claimed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Descoberto (Unclaimed)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/imobiliaria/${ag.slug}`}
                          target="_blank"
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Ver Perfil Público
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: FONTES DE WEBSITES */}
      {activeTab === "sources" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Domínio / Imobiliária</th>
                  <th className="px-4 py-3.5">Origem da Gestão</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Último Crawl</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      Nenhuma fonte de website vinculada a esta cidade ainda.
                    </td>
                  </tr>
                ) : (
                  sources.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {s.domain}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.agency?.name || "Agência vinculada"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-mono">
                        {s.ingestion_origin === "agency_managed" ? (
                          <span className="text-emerald-600 font-semibold">agency_managed</span>
                        ) : (
                          <span className="text-indigo-600 font-semibold">uppa_discovery</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs">{s.status}</td>

                      <td className="px-4 py-4 text-xs text-slate-400">
                        {s.last_crawl_at ? new Date(s.last_crawl_at).toLocaleDateString("pt-BR") : "Nunca"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleStartCrawl(s.id, s.agency_id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
                        >
                          <Play className="h-3 w-3" />
                          Iniciar Crawl
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: JOBS DE CRAWLER */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Job ID</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Tarefas</th>
                  <th className="px-4 py-3.5">Ofertas Criadas / Atualizadas</th>
                  <th className="px-4 py-3.5">Erros / Safety Lock</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Nenhum job de crawler executado para este município.
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {j.id.slice(0, 8)}...
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            j.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : j.status === "running"
                              ? "bg-indigo-100 text-indigo-800 animate-pulse"
                              : j.status === "failed"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {j.completed_tasks || 0} / {j.total_tasks || 0}
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {j.offers_created || 0} criadas • {j.offers_updated || 0} atualizadas
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {j.safety_lock_triggered ? (
                          <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {j.safety_lock_triggered}
                          </span>
                        ) : (
                          <span className="text-slate-400">Nenhum bloqueio</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {j.status === "running" && (
                          <button
                            onClick={() => handleCancelJob(j.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Pré-cadastro de Imobiliária */}
      {showPreRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Pré-cadastrar Imobiliária (Descoberta UPPA)
              </h3>
              <button
                onClick={() => setShowPreRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePreRegisterAgency} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Imobiliária *
                </label>
                <input
                  type="text"
                  required
                  value={newAgencyName}
                  onChange={(e) => setNewAgencyName(e.target.value)}
                  placeholder="Ex: Imobiliária Central"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CRECI (se houver)
                  </label>
                  <input
                    type="text"
                    value={newAgencyCreci}
                    onChange={(e) => setNewAgencyCreci(e.target.value)}
                    placeholder="Ex: 12345-J"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newAgencyPhone}
                    onChange={(e) => setNewAgencyPhone(e.target.value)}
                    placeholder="Ex: (53) 3222-1111"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Website Oficial
                </label>
                <input
                  type="text"
                  value={newAgencyWebsite}
                  onChange={(e) => setNewAgencyWebsite(e.target.value)}
                  placeholder="Ex: https://www.imobiliariacentral.com.br"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  value={newAgencyEmail}
                  onChange={(e) => setNewAgencyEmail(e.target.value)}
                  placeholder="Ex: contato@imobiliariacentral.com.br"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
                Nota: O perfil será criado como <strong>discovered</strong>. Nenhum login ou usuário auth será gerado. A posse será concedida no processo de claim.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Confirmar Pré-Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
