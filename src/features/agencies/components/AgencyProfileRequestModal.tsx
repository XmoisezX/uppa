"use client";

import React, { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  X,
  Send,
  HelpCircle,
  Trash2,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAgencyProfileRequestAction } from "@/features/agencies/actions";
import type { Agency } from "@/types/agency";

interface AgencyProfileRequestModalProps {
  agency: Agency;
  isOpen: boolean;
  initialType?: "correction" | "removal";
  onClose: () => void;
}

export function AgencyProfileRequestModal({
  agency,
  isOpen,
  initialType = "correction",
  onClose,
}: AgencyProfileRequestModalProps) {
  const [requestType, setRequestType] = useState<"correction" | "removal">(
    initialType
  );
  const [applicantName, setApplicantName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!applicantName.trim()) {
      setErrorNotice("Informe seu nome completo.");
      return;
    }

    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      setErrorNotice("Informe um e-mail válido para retorno.");
      return;
    }

    if (!description.trim()) {
      setErrorNotice(
        "Por favor, descreva detalhadamente os dados a corrigir ou o motivo da remoção."
      );
      return;
    }

    startTransition(async () => {
      const res = await submitAgencyProfileRequestAction({
        agencyId: agency.id,
        type: requestType,
        applicantName: applicantName.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim() || undefined,
        description: description.trim(),
      });

      if (res.error) {
        setErrorNotice((res as any).message || res.error || "Erro ao registrar solicitação.");
      } else {
        setSuccessNotice(
          requestType === "removal"
            ? "Solicitação de remoção registrada. Nossa equipe jurídica/administrativa analisará o pedido."
            : "Solicitação de correção de dados recebida. Analisaremos e atualizaremos as informações em breve."
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {requestType === "removal" ? (
              <Trash2 className="h-6 w-6 text-red-500" />
            ) : (
              <Edit3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {requestType === "removal"
                ? "Solicitar Remoção de Perfil"
                : "Solicitar Correção de Dados"}
            </h2>
            <p className="text-xs text-slate-500">
              Imobiliária: <span className="font-semibold">{agency.name}</span>
            </p>
          </div>
        </div>

        {/* Alternador de tipo */}
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 mb-5">
          <button
            type="button"
            onClick={() => setRequestType("correction")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              requestType === "correction"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Correção de Dados
          </button>
          <button
            type="button"
            onClick={() => setRequestType("removal")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              requestType === "removal"
                ? "bg-white text-red-600 shadow-xs dark:bg-slate-700 dark:text-red-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Remoção de Perfil
          </button>
        </div>

        {successNotice ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              Solicitação Registrada
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              {successNotice}
            </p>
            <Button onClick={onClose} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Seu nome completo *
              </label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Ex: Maria Santos"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  E-mail para contato *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(53) 99999-9999"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {requestType === "removal"
                  ? "Motivo do pedido de remoção *"
                  : "Detalhes das correções necessárias *"}
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  requestType === "removal"
                    ? "Explique a razão pela qual este perfil não deve constar no índice público da UPPA."
                    : "Informe telefones atualizados, endereço correto ou dados cadastrais que precisam ser retificados."
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Todas as solicitações passam por verificação prévia de nossa equipe para evitar alterações arbitrárias.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs gap-1.5"
              >
                {isPending ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
