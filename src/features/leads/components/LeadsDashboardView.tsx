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
  Phone,
  Mail,
  User,
  X,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LeadWithDetails, LeadStatus } from "@/types/lead";
import { updateLeadStatusAction, addLeadNoteAction } from "../actions";

interface LeadsDashboardViewProps {
  initialLeads: LeadWithDetails[];
  stats: {
    totalLeads: number;
    whatsappLeads: number;
    last7DaysLeads: number;
  };
  agencyName: string;
}

const STATUS_LABELS: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  contacted: { label: "Contatado", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  qualified: { label: "Qualificado", color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  visit_scheduled: { label: "Visita Agendada", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  proposal: { label: "Proposta", color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
  won: { label: "Ganho / Fechado", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  lost: { label: "Perdido", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  spam: { label: "Spam", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" },
};

export function LeadsDashboardView({
  initialLeads,
  stats,
  agencyName,
}: LeadsDashboardViewProps) {
  const [leadsList, setLeadsList] = useState<LeadWithDetails[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);

  // Note form state in detail modal
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

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
    return leadsList.filter((lead) => {
      // Filtro por canal
      if (channelFilter !== "all" && lead.source !== channelFilter) {
        return false;
      }

      // Filtro por status
      if (statusFilter !== "all" && (lead.status || "new") !== statusFilter) {
        return false;
      }

      // Filtro por termo de busca
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();

      const matchName = lead.name?.toLowerCase().includes(term);
      const matchPhone = lead.phone?.toLowerCase().includes(term);
      const matchEmail = lead.email?.toLowerCase().includes(term);
      const matchProperty =
        lead.property?.title?.toLowerCase().includes(term) ||
        lead.property?.externalId?.toLowerCase().includes(term);
      const matchUtm =
        lead.utmSource?.toLowerCase().includes(term) ||
        lead.utmCampaign?.toLowerCase().includes(term);
      const matchMessage = lead.message?.toLowerCase().includes(term);

      return Boolean(matchName || matchPhone || matchEmail || matchProperty || matchUtm || matchMessage);
    });
  }, [leadsList, searchTerm, channelFilter, statusFilter]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!selectedLead) return;
    setStatusUpdating(true);
    try {
      const res = await updateLeadStatusAction({
        leadId: selectedLead.id,
        status: newStatus,
      });

      if (res.success) {
        const updated = { ...selectedLead, status: newStatus };
        setSelectedLead(updated);
        setLeadsList((prev) =>
          prev.map((l) => (l.id === selectedLead.id ? updated : l))
        );
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !noteContent.trim()) return;

    setNoteSubmitting(true);
    try {
      const res = await addLeadNoteAction({
        leadId: selectedLead.id,
        content: noteContent.trim(),
      });

      if (res.success) {
        setNoteContent("");
        const newNoteItem = {
          id: Math.random().toString(),
          leadId: selectedLead.id,
          content: noteContent.trim(),
          createdAt: new Date().toISOString(),
          authorName: "Você",
        };
        const updated = {
          ...selectedLead,
          notesList: [newNoteItem, ...(selectedLead.notesList || [])],
        };
        setSelectedLead(updated);
        setLeadsList((prev) =>
          prev.map((l) => (l.id === selectedLead.id ? updated : l))
        );
      }
    } finally {
      setNoteSubmitting(false);
    }
  };

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
            Acompanhe contatos gerados, status comercial e detalhes dos interessados em tempo real.
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

      {/* FILTROS E BARRA DE PESQUISA (Seção 37) */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, telefone, imóvel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro de Canal */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Canais</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="form">Formulário de Interesse</option>
          </select>

          {/* Filtro de Status Comercial */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="new">Novo</option>
            <option value="contacted">Contatado</option>
            <option value="qualified">Qualificado</option>
            <option value="visit_scheduled">Visita Agendada</option>
            <option value="proposal">Proposta</option>
            <option value="won">Ganho / Fechado</option>
            <option value="lost">Perdido</option>
            <option value="spam">Spam</option>
          </select>
        </div>
      </div>

      {/* LISTAGEM DE LEADS (Seção 37) */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {stats.totalLeads === 0
              ? "Nenhum lead registrado ainda"
              : "Nenhum lead encontrado para os filtros selecionados"}
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
            {stats.totalLeads === 0
              ? "Quando clientes entrarem em contato pelo WhatsApp ou formulário nos seus anúncios da UPPA, os dados e o histórico aparecerão aqui."
              : "Tente redefinir os filtros ou o termo de pesquisa."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Data</th>
                  <th className="py-3.5 px-4">Interessado</th>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">Imóvel / Preço Origem</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredLeads.map((lead) => {
                  const currentStatus = (lead.status || "new") as LeadStatus;
                  const statusCfg = STATUS_LABELS[currentStatus] || STATUS_LABELS.new;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
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

                      {/* Interessado */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {lead.name || "Visitante anônimo"}
                          </p>
                          {lead.phone && (
                            <p className="text-[11px] text-slate-500 font-mono">
                              {lead.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Canal */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {lead.source === "whatsapp" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <MessageSquare className="h-3 w-3 fill-current" />
                            WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Mail className="h-3 w-3" />
                            Formulário
                          </span>
                        )}
                      </td>

                      {/* Imóvel e Preço de Origem (Seção 25 e 37) */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 max-w-sm">
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {lead.snapshotTitle || lead.property?.title || "Imóvel não especificado"}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {lead.snapshotPrice ? (
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                Preço origem: {formatCurrency(lead.snapshotPrice)}
                              </span>
                            ) : lead.property?.price ? (
                              <span>{formatCurrency(lead.property.price)}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Status Comercial (Seção 35) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-4 px-4 sm:pr-6 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER DE DETALHES DO LEAD (Seção 38) */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Detalhes do Lead
                </h3>
                <p className="text-xs text-slate-500">
                  Registrado em {formatDate(selectedLead.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Comercial Interativo (Seção 35) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Status Comercial:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((st) => {
                  const isCurrent = (selectedLead.status || "new") === st;
                  const cfg = STATUS_LABELS[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isCurrent
                          ? `${cfg.color} ring-2 ring-indigo-500`
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contato do Interessado (Seção 38) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informações de Contato
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nome</span>
                    <strong className="text-slate-900 dark:text-white">
                      {selectedLead.name || "Não informado"}
                    </strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Telefone</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {selectedLead.phone || "Não informado"}
                      </strong>
                    </div>
                  </div>
                  {selectedLead.phone && (
                    <a
                      href={`https://wa.me/55${selectedLead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#25D366] text-white font-bold text-[11px] hover:bg-[#20BD5C]"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>

                {selectedLead.email && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-2.5 sm:col-span-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">E-mail</span>
                      <a href={`mailto:${selectedLead.email}`} className="text-indigo-600 hover:underline">
                        {selectedLead.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Imóvel e Snapshot Comercial (Seção 25 e 38) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Imóvel e Snapshot Comercial
              </h4>
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedLead.snapshotTitle || selectedLead.property?.title || "Imóvel"}
                    </h5>
                    {selectedLead.snapshotPrice && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold mt-0.5">
                        Preço congelado no momento do lead: {formatCurrency(selectedLead.snapshotPrice)}
                      </p>
                    )}
                  </div>
                  {selectedLead.property && (
                    <Link
                      href={`/imovel/${selectedLead.property.slug}`}
                      target="_blank"
                      className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline shrink-0"
                    >
                      <span>Abrir Imóvel</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {selectedLead.message && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      Mensagem enviada:
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{selectedLead.message}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notas Internas (Seção 36) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Anotações Internas
              </h4>
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escreva uma observação sobre este cliente..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                />
                <Button
                  type="submit"
                  disabled={noteSubmitting || !noteContent.trim()}
                  size="sm"
                  className="bg-indigo-600 text-white rounded-xl text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Salvar
                </Button>
              </form>

              {selectedLead.notesList && selectedLead.notesList.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedLead.notesList.map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs space-y-1"
                    >
                      <p className="text-slate-800 dark:text-slate-200">{note.content}</p>
                      <span className="text-[10px] text-slate-400 block">
                        {note.authorName || "Equipe"} • {formatDate(note.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhuma anotação registrada ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
