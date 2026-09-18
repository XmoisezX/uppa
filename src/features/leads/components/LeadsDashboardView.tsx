"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Calendar,
  ExternalLink,
  Search,
  Filter,
  Tag,
  Clock,
  Sparkles,
  Building,
  BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LeadWithDetails, LeadSource } from "@/types/lead";

interface LeadsDashboardViewProps {
  initialLeads: LeadWithDetails[];
  stats: {
    totalLeads: number;
    whatsappLeads: number;
    last7DaysLeads: number;
  };
  agencyName: string;
}

export function LeadsDashboardView({
  initialLeads,
  stats,
  agencyName,
}: LeadsDashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const formatCurrency = (val?: number | null) => {
    if (!val) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Filtragem local
  const filteredLeads = useMemo(() => {
    return initialLeads.filter((lead) => {
      // Filtro por origem
      if (sourceFilter !== "all" && lead.source !== sourceFilter) {
        return false;
      }

      // Filtro por termo de busca
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();

      const matchProperty =
        lead.property?.title?.toLowerCase().includes(term) ||
        lead.property?.externalId?.toLowerCase().includes(term);

      const matchUtm =
        lead.utmSource?.toLowerCase().includes(term) ||
        lead.utmCampaign?.toLowerCase().includes(term) ||
        lead.utmMedium?.toLowerCase().includes(term);

      const matchMessage = lead.message?.toLowerCase().includes(term);

      return Boolean(matchProperty || matchUtm || matchMessage);
    });
  }, [initialLeads, searchTerm, sourceFilter]);

  const whatsappPercent =
    stats.totalLeads > 0
      ? Math.round((stats.whatsappLeads / stats.totalLeads) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestão de Leads
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {agencyName}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe contatos gerados, conversões no WhatsApp e o desempenho de campanhas UTM.
          </p>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total de Contatos
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.totalLeads}
            </span>
            <span className="text-xs text-slate-400">leads registrados</span>
          </div>
        </div>

        {/* WhatsApp Conversions */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs dark:border-emerald-950/40 dark:bg-emerald-950/10 transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Via WhatsApp
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 fill-current" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.whatsappLeads}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ({whatsappPercent}% do total)
            </span>
          </div>
        </div>

        {/* Recent (Last 7 Days) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Últimos 7 Dias
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.last7DaysLeads}
            </span>
            <span className="text-xs text-slate-400">novas oportunidades</span>
          </div>
        </div>
      </div>

      {/* FILTROS E BARRA DE PESQUISA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por imóvel, código ou UTM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={sourceFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("all")}
            className="h-9 text-xs rounded-xl font-semibold cursor-pointer"
          >
            Todos ({stats.totalLeads})
          </Button>
          <Button
            variant={sourceFilter === "whatsapp" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("whatsapp")}
            className="h-9 text-xs rounded-xl font-semibold gap-1.5 cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 fill-current" />
            WhatsApp ({stats.whatsappLeads})
          </Button>
        </div>
      </div>

      {/* LISTAGEM DE LEADS */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {stats.totalLeads === 0
              ? "Nenhum lead registrado ainda"
              : "Nenhum lead encontrado para esta busca"}
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
            {stats.totalLeads === 0
              ? "Quando clientes clicarem no botão WhatsApp dos seus anúncios publicados, o contato, o imóvel e os parâmetros UTM de campanha aparecerão aqui em tempo real."
              : "Tente remover os filtros ou buscar por outros termos como código do imóvel ou UTM."}
          </p>
          {stats.totalLeads === 0 && (
            <div className="mt-6">
              <Link href="/painel/imoveis">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl">
                  Ver Imóveis Cadastrados
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Data / Horário</th>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">Imóvel de Interesse</th>
                  <th className="py-3.5 px-4">Campanha / UTM</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Data */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatDate(lead.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Origem */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {lead.source === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          <MessageSquare className="h-3 w-3 fill-current" />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {lead.source}
                        </span>
                      )}
                    </td>

                    {/* Imóvel */}
                    <td className="py-4 px-4">
                      {lead.property ? (
                        <div className="space-y-1 max-w-sm">
                          <Link
                            href={`/imovel/${lead.property.slug}`}
                            target="_blank"
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 flex items-center gap-1 group"
                          >
                            <span>{lead.property.title}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              Ref: {lead.property.externalId}
                            </span>
                            {lead.property.price && (
                              <span>Venda: {formatCurrency(lead.property.price)}</span>
                            )}
                            {lead.property.rentPrice && (
                              <span>Aluguel: {formatCurrency(lead.property.rentPrice)}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Contato geral (sem imóvel)</span>
                      )}
                    </td>

                    {/* UTM / Rastreamento */}
                    <td className="py-4 px-4">
                      {lead.utmSource || lead.utmCampaign || lead.utmMedium ? (
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {lead.utmSource && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                              src: {lead.utmSource}
                            </span>
                          )}
                          {lead.utmMedium && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              med: {lead.utmMedium}
                            </span>
                          )}
                          {lead.utmCampaign && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30">
                              cmp: {lead.utmCampaign}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tráfego Direto / Orgânico</span>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="py-4 px-4 sm:pr-6 text-right whitespace-nowrap">
                      {lead.property && (
                        <Link
                          href={`/imovel/${lead.property.slug}`}
                          target="_blank"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
                          >
                            Ver Imóvel
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
