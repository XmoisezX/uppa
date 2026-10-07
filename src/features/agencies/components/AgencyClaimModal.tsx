"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Send,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAgencyClaimAction } from "@/features/agencies/actions";
import type { Agency } from "@/types/agency";

interface AgencyClaimModalProps {
  agency: Agency;
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; email?: string } | null;
}

export function AgencyClaimModal({
  agency,
  isOpen,
  onClose,
  currentUser,
}: AgencyClaimModalProps) {
  const [applicantName, setApplicantName] = useState("");
  const [applicantRole, setApplicantRole] = useState("");
  const [phone, setPhone] = useState("");
  const [professionalEmail, setProfessionalEmail] = useState(
    currentUser?.email || ""
  );
  const [documentNumber, setDocumentNumber] = useState(
    agency.document || agency.creci || ""
  );
  const [message, setMessage] = useState("");
  const [authorizedChecked, setAuthorizedChecked] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!currentUser) {
      setErrorNotice("Faça login antes de enviar a reivindicação.");
      return;
    }

    if (!applicantName.trim()) {
      setErrorNotice("Informe seu nome completo.");
      return;
    }

    if (!applicantRole.trim()) {
      setErrorNotice("Informe seu cargo ou vínculo com a imobiliária.");
      return;
    }

    if (!phone.trim()) {
      setErrorNotice("Informe um telefone / WhatsApp corporativo para contato.");
      return;
    }

    if (!professionalEmail.trim() || !professionalEmail.includes("@")) {
      setErrorNotice("Informe um e-mail profissional válido.");
      return;
    }

    if (!authorizedChecked) {
      setErrorNotice(
        "Você precisa confirmar que tem autorização legítima para representar a empresa."
      );
      return;
    }

    startTransition(async () => {
      const res = await submitAgencyClaimAction({
        agencyId: agency.id,
        applicantName: applicantName.trim(),
        applicantRole: applicantRole.trim(),
        phone: phone.trim(),
        professionalEmail: professionalEmail.trim(),
        documentNumber: documentNumber.trim() || undefined,
        message: message.trim() || undefined,
        agencySlug: agency.slug,
      });

      if (res.error) {
        if (res.error === "AUTH_REQUIRED") {
          setErrorNotice("Sua sessão expirou. Por favor, entre novamente.");
        } else {
          setErrorNotice((res as any).message || res.error || "Erro ao enviar solicitação.");
        }
      } else {
        setSuccessNotice(
          "Solicitação de reivindicação enviada com sucesso! Nossa equipe administrativa analisará os dados em até 24 horas úteis."
        );
      }
    });
  };

  const returnUrl = encodeURIComponent(`/imobiliaria/${agency.slug}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Reivindicar Perfil
            </h2>
            <p className="text-xs text-slate-500">
              Imobiliária: <span className="font-semibold text-slate-700 dark:text-slate-300">{agency.name}</span>
            </p>
          </div>
        </div>

        {/* Alerta informativo */}
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Processo de verificação seguro</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Ao reivindicar, você terá acesso à gestão de anúncios, dados institucionais e recebimento de leads assim que nossa equipe validar seu vínculo com a empresa. O processo é 100% gratuito.
              </p>
            </div>
          </div>
        </div>

        {/* Se usuário não autenticado */}
        {!currentUser ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/40 dark:bg-amber-950/30">
            <LogIn className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400 mb-2" />
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Autenticação necessária
            </h3>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Para garantir a titularidade do perfil, você precisa estar conectado a uma conta na UPPA.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href={`/entrar?returnUrl=${returnUrl}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Entrar na minha conta
                </Button>
              </Link>
              <Link href={`/cadastrar?returnUrl=${returnUrl}`}>
                <Button variant="outline" className="text-xs">
                  Criar conta
                </Button>
              </Link>
            </div>
          </div>
        ) : successNotice ? (
          /* Mensagem de sucesso */
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              Reivindicação enviada!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              {successNotice}
            </p>
            <Button onClick={onClose} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              Entendido
            </Button>
          </div>
        ) : (
          /* Formulário de claim */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Seu nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cargo / Função na empresa *
                </label>
                <input
                  type="text"
                  required
                  value={applicantRole}
                  onChange={(e) => setApplicantRole(e.target.value)}
                  placeholder="Ex: Diretor, Gerente Comercial, Corretor"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp corporativo *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(53) 99999-9999"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  E-mail profissional *
                </label>
                <input
                  type="email"
                  required
                  value={professionalEmail}
                  onChange={(e) => setProfessionalEmail(e.target.value)}
                  placeholder="contato@imobiliaria.com.br"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                CNPJ da empresa ou CRECI Jurídico
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00 ou CRECI 12345-J"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Informações adicionais ou evidências de representação
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Informe links do site oficial, endereço ou qualquer informação que auxilie na validação ágil do perfil."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                id="claim-authorize"
                type="checkbox"
                checked={authorizedChecked}
                onChange={(e) => setAuthorizedChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="claim-authorize"
                className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight cursor-pointer"
              >
                Declaro sob as penas da lei que sou representante legítimo desta imobiliária e tenho poderes legais para administrar seus imóveis e dados institucionais na plataforma UPPA.
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                disabled={isPending || !authorizedChecked}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                {isPending ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enviar Reivindicação
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
