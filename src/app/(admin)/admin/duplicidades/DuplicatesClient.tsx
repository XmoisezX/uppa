"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Building2,
  MapPin,
  Maximize,
  Bed,
  Car,
  Bath,
  ArrowRight,
  ShieldCheck,
  Filter,
} from "lucide-react";
import {
  approveCandidateMatchAction,
  rejectCandidateMatchAction,
  unmergePropertyAction,
} from "@/features/offers/actions/duplicates";

interface DuplicatesClientProps {
  initialCandidates: any[];
  total: number;
}

export function DuplicatesClient({ initialCandidates, total }: DuplicatesClientProps) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [statusFilter, setStatusFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatMoney = (val?: number | null) => {
    if (!val || val <= 0) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleApprove = (candidateId: string) => {
    startTransition(async () => {
      setActionMessage(null);
      const res = await approveCandidateMatchAction(candidateId);
      if (res.success) {
        setActionMessage({
          type: "success",
          text: `Agrupamento realizado com sucesso! Ofertas reatribuídas para a property canônica.`,
        });
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, status: "approved" } : c))
        );
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Erro ao aprovar agrupamento.",
        });
      }
    });
  };

  const handleReject = (candidateId: string) => {
    startTransition(async () => {
      setActionMessage(null);
      const res = await rejectCandidateMatchAction(candidateId);
      if (res.success) {
        setActionMessage({
          type: "success",
          text: "Candidato rejeitado. Imóveis mantidos independentes.",
        });
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, status: "rejected" } : c))
        );
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Erro ao rejeitar candidato.",
        });
      }
    });
  };

  const handleUnmerge = (mergedPropertyId: string) => {
    if (!confirm("Deseja realmente desfazer este agrupamento? As ofertas voltarão para a propriedade física original.")) {
      return;
    }

    startTransition(async () => {
      setActionMessage(null);
      const res = await unmergePropertyAction(mergedPropertyId);
      if (res.success) {
        setActionMessage({
          type: "success",
          text: `Agrupamento desfeito com sucesso! ${res.result?.reassignedOffersCount || 0} ofertas restauradas.`,
        });
        // Atualiza localmente
        setCandidates((prev) =>
          prev.map((c) =>
            c.property_a?.id === mergedPropertyId || c.property_b?.id === mergedPropertyId
              ? { ...c, status: "unmerged" }
              : c
          )
        );
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Erro ao desfazer agrupamento.",
        });
      }
    });
  };

  const filteredCandidates = candidates.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (confidenceFilter !== "all" && c.confidence !== confidenceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-600" />
            Revisão de Duplicidades (Property x Offer)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Auditoria e consolidação física de imóveis anunciados por múltiplas imobiliárias.
          </p>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-3 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendentes</option>
            <option value="auto_approved">Auto-aprovados (HIGH)</option>
            <option value="approved">Aprovados</option>
            <option value="rejected">Rejeitados</option>
            <option value="unmerged">Desfeitos</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Confiança:</label>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todas</option>
            <option value="HIGH">Alta (HIGH)</option>
            <option value="MEDIUM">Média (MEDIUM)</option>
            <option value="LOW">Baixa (LOW)</option>
          </select>
        </div>

        <div className="ml-auto text-xs font-medium text-slate-500">
          Exibindo {filteredCandidates.length} de {candidates.length} candidatos carregados
        </div>
      </div>

      {/* Lista de Candidatos */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Nenhum candidato encontrado</h3>
          <p className="text-sm text-slate-500 mt-1">
            Não há registros de duplicidade com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map((cand) => {
            const propA = cand.property_a;
            const propB = cand.property_b;
            const isMerged = propA?.status === "merged" || propB?.status === "merged";
            const mergedId = propA?.status === "merged" ? propA?.id : propB?.status === "merged" ? propB?.id : null;

            return (
              <div
                key={cand.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition-shadow space-y-4"
              >
                {/* Header do Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    {/* Badge de Confiança */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        cand.confidence === "HIGH"
                          ? "bg-emerald-100 text-emerald-800"
                          : cand.confidence === "MEDIUM"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Score {Math.round(cand.score)}% ({cand.confidence})
                    </span>

                    {/* Badge de Status */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        cand.status === "auto_approved" || cand.status === "approved"
                          ? "bg-blue-100 text-blue-800"
                          : cand.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : cand.status === "unmerged"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {cand.status === "auto_approved"
                        ? "Auto-Consolidado"
                        : cand.status === "approved"
                        ? "Aprovado"
                        : cand.status === "rejected"
                        ? "Rejeitado"
                        : cand.status === "unmerged"
                        ? "Desfeito"
                        : "Pendente"}
                    </span>
                  </div>

                  {/* Sinais em destaque */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    {cand.signals?.addressSimilarity && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        Endereço {Math.round(cand.signals.addressSimilarity * 100)}%
                      </span>
                    )}
                    {cand.signals?.areaDiffM2 !== undefined && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        Dif. Área {cand.signals.areaDiffM2}m²
                      </span>
                    )}
                    {cand.signals?.bedroomsDiff !== undefined && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        Quartos {cand.signals.bedroomsDiff === 0 ? "iguais" : `±${cand.signals.bedroomsDiff}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comparação Lado a Lado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                  {/* Property A */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
                      <span>Imóvel A {propA?.status === "merged" ? "(Consolidado)" : ""}</span>
                      <span className="font-mono text-slate-600">Cód: {propA?.external_id || "—"}</span>
                    </div>

                    <div className="font-semibold text-slate-900 text-sm line-clamp-1">
                      {propA?.title || "Sem título"}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-medium text-slate-700">{propA?.agency?.name || "Imobiliária A"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-1">
                        {propA?.street ? `${propA.street}, ${propA.number || "S/N"}` : "Endereço não informado"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Maximize className="h-3.5 w-3.5 text-slate-400" />
                        {propA?.usable_area || propA?.total_area || "—"}m²
                      </span>
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5 text-slate-400" />
                        {propA?.bedrooms ?? "—"} qts
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="h-3.5 w-3.5 text-slate-400" />
                        {propA?.parking_spaces ?? "—"} vgs
                      </span>
                    </div>

                    <div className="text-sm font-bold text-brand-700 pt-1">
                      {formatMoney(propA?.price || propA?.rent_price)}
                    </div>

                    {propA?.slug && (
                      <Link
                        href={`/imovel/${propA.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Ver página pública <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  {/* Property B */}
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
                      <span>Imóvel B {propB?.status === "merged" ? "(Consolidado)" : ""}</span>
                      <span className="font-mono text-slate-600">Cód: {propB?.external_id || "—"}</span>
                    </div>

                    <div className="font-semibold text-slate-900 text-sm line-clamp-1">
                      {propB?.title || "Sem título"}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-medium text-slate-700">{propB?.agency?.name || "Imobiliária B"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-1">
                        {propB?.street ? `${propB.street}, ${propB.number || "S/N"}` : "Endereço não informado"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Maximize className="h-3.5 w-3.5 text-slate-400" />
                        {propB?.usable_area || propB?.total_area || "—"}m²
                      </span>
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5 text-slate-400" />
                        {propB?.bedrooms ?? "—"} qts
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="h-3.5 w-3.5 text-slate-400" />
                        {propB?.parking_spaces ?? "—"} vgs
                      </span>
                    </div>

                    <div className="text-sm font-bold text-brand-700 pt-1">
                      {formatMoney(propB?.price || propB?.rent_price)}
                    </div>

                    {propB?.slug && (
                      <Link
                        href={`/imovel/${propB.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Ver página pública <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Ações Administrativas */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400">
                    Cadastrado em {new Date(cand.created_at).toLocaleDateString("pt-BR")}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ação de Desfazer se estiver mesclado */}
                    {isMerged && mergedId && (
                      <button
                        type="button"
                        onClick={() => handleUnmerge(mergedId)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Desfazer Agrupamento
                      </button>
                    )}

                    {/* Ação de Rejeição */}
                    {cand.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleReject(cand.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rejeitar (Manter Separados)
                      </button>
                    )}

                    {/* Ação de Aprovação */}
                    {(cand.status === "pending" || cand.status === "rejected") && (
                      <button
                        type="button"
                        onClick={() => handleApprove(cand.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aprovar Agrupamento
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
