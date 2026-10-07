"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reviewAgencyClaimAction } from "@/features/agencies/actions";
import type { AgencyClaim } from "@/types/agency";

interface ClaimsClientProps {
  initialClaims: AgencyClaim[];
}

export function ClaimsClient({ initialClaims }: ClaimsClientProps) {
  const [claims, setClaims] = useState<AgencyClaim[]>(initialClaims);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de Ação (Aprovar / Rejeitar)
  const [selectedClaim, setSelectedClaim] = useState<AgencyClaim | null>(null);
  const [decisionType, setDecisionType] = useState<"approved" | "rejected">("approved");
  const [adminNotes, setAdminNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingCount = claims.filter((c) => c.status === "pending").length;

  const filteredClaims = claims.filter((claim) => {
    if (statusFilter !== "all" && claim.status !== statusFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchAgency = claim.agency?.name.toLowerCase().includes(term);
      const matchApplicant = claim.applicantName.toLowerCase().includes(term);
      const matchEmail = claim.professionalEmail.toLowerCase().includes(term);
      const matchDoc = claim.documentNumber?.toLowerCase().includes(term);
      if (!matchAgency && !matchApplicant && !matchEmail && !matchDoc) {
        return false;
      }
    }
    return true;
  });

  const openReviewModal = (claim: AgencyClaim, decision: "approved" | "rejected") => {
    setSelectedClaim(claim);
    setDecisionType(decision);
    setAdminNotes("");
    setActionError(null);
  };

  const closeReviewModal = () => {
    setSelectedClaim(null);
    setAdminNotes("");
    setActionError(null);
  };

  const handleConfirmDecision = () => {
    if (!selectedClaim) return;

    startTransition(async () => {
      const res = await reviewAgencyClaimAction({
        claimId: selectedClaim.id,
        decision: decisionType,
        adminNotes: adminNotes.trim() || undefined,
        agencySlug: selectedClaim.agency?.slug,
      });

      if (res.error) {
        setActionError(res.error);
      } else {
        // Atualiza a lista local
        setClaims((prev) =>
          prev.map((c) =>
            c.id === selectedClaim.id
              ? {
                  ...c,
                  status: decisionType,
                  adminNotes: adminNotes.trim() || null,
                  reviewedAt: new Date().toISOString(),
                }
              : c
          )
        );
        closeReviewModal();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Reivindicações de Imobiliárias (Claims)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie pedidos de representantes legais para assumir a administração de seus perfis cadastrados.
          </p>
        </div>

        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 text-xs px-3 py-1 font-semibold">
            {pendingCount} {pendingCount === 1 ? "solicitação pendente" : "solicitações pendentes"}
          </Badge>
        )}
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Todos ({claims.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "pending"
                ? "bg-white text-amber-700 shadow-xs dark:bg-slate-700 dark:text-amber-300"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "approved"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Aprovados ({claims.filter((c) => c.status === "approved").length})
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "rejected"
                ? "bg-white text-red-700 shadow-xs dark:bg-slate-700 dark:text-red-300"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Rejeitados ({claims.filter((c) => c.status === "rejected").length})
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por agência, nome, doc..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Lista de Reivindicações */}
      {filteredClaims.length > 0 ? (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const isPendingClaim = claim.status === "pending";
            const isApproved = claim.status === "approved";
            const isRejected = claim.status === "rejected";

            return (
              <div
                key={claim.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  {/* Agência */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                          {claim.agency?.name || "Imobiliária"}
                        </h2>
                        {claim.agency?.slug && (
                          <Link
                            href={`/imobiliaria/${claim.agency.slug}`}
                            target="_blank"
                            className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            Ver página
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        ID: {claim.agencyId} • Solicitado em: {new Date(claim.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Badge de Status */}
                  <div className="flex items-center gap-2">
                    {isPendingClaim && (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 text-xs gap-1">
                        <Clock className="h-3 w-3" />
                        Pendente de Análise
                      </Badge>
                    )}
                    {isApproved && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Aprovado (Oficial)
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 text-xs gap-1">
                        <XCircle className="h-3 w-3" />
                        Rejeitado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Dados do Solicitante e Evidências */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block">
                      Dados do Solicitante
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold">{claim.applicantName}</span>
                      <span className="text-slate-500">({claim.applicantRole})</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{claim.professionalEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{claim.phone}</span>
                    </div>
                    {claim.documentNumber && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Documento/CRECI: <strong>{claim.documentNumber}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block">
                      Mensagem / Evidências Apresentadas
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {claim.message || "Nenhuma mensagem adicional informada pelo solicitante."}
                    </p>

                    {claim.adminNotes && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Notas do Admin:</span>{" "}
                        {claim.adminNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações Administrativas (Transacionais) */}
                {isPendingClaim && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewModal(claim, "rejected")}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/40"
                    >
                      Rejeitar Solicitação
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openReviewModal(claim, "approved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovar e Conceder Acesso
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhuma reivindicação encontrada
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Nenhuma solicitação de perfil corresponde aos critérios de filtro selecionados.
          </p>
        </div>
      )}

      {/* Modal de Confirmação de Decisão */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {decisionType === "approved" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Aprovar Reivindicação
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejeitar Reivindicação
                </>
              )}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {decisionType === "approved" ? (
                <>
                  Ao aprovar, o usuário <strong>{selectedClaim.applicantName}</strong> será vinculado como <strong>owner</strong> em <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">agency_members</code> e o perfil da imobiliária <strong>{selectedClaim.agency?.name}</strong> se tornará oficialmente administrado.
                </>
              ) : (
                <>
                  A solicitação para a imobiliária <strong>{selectedClaim.agency?.name}</strong> será marcada como rejeitada e o perfil continuará como não reivindicado.
                </>
              )}
            </p>

            {actionError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Observações internas do Administrador {decisionType === "rejected" ? "(recomendado)" : "(opcional)"}
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Vínculo verificado via cartão CNPJ / Contrato social..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={closeReviewModal}
                disabled={isPending}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDecision}
                disabled={isPending}
                className={`text-xs text-white font-semibold ${
                  decisionType === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isPending
                  ? "Processando..."
                  : decisionType === "approved"
                  ? "Confirmar Aprovação"
                  : "Confirmar Rejeição"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
