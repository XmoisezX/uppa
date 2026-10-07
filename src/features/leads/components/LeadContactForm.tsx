"use client";

import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, AlertCircle, Phone, Mail, User } from "lucide-react";
import { submitLeadFormAction } from "../actions";

interface LeadContactFormProps {
  propertyId: string;
  offerId: string | null;
  agencyId: string;
  brokerId?: string | null;
  propertyTitle: string;
  snapshotPrice?: number | null;
  agencyName: string;
  className?: string;
}

export function LeadContactForm({
  propertyId,
  offerId,
  agencyId,
  brokerId,
  propertyTitle,
  snapshotPrice,
  agencyName,
  className = "",
}: LeadContactFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Olá! Tenho interesse no imóvel "${propertyTitle}" anunciado pela ${agencyName} e gostaria de receber mais informações.`
  );
  const [consent, setConsent] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Por favor, informe seu nome.");
      return;
    }
    if (!phone.trim()) {
      setError("Por favor, informe seu telefone com DDD.");
      return;
    }
    if (!consent) {
      setError("É necessário concordar com os termos de contato para prosseguir.");
      return;
    }

    setLoading(true);

    try {
      const result = await submitLeadFormAction({
        propertyId,
        offerId,
        agencyId,
        brokerId: brokerId || null,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        snapshotPrice: snapshotPrice || null,
        snapshotTitle: propertyTitle,
        snapshotAgencyName: agencyName,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Não foi possível enviar sua mensagem. Tente novamente.");
      }
    } catch {
      setError("Ocorreu uma instabilidade na comunicação. Tente novamente ou use o WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
          Mensagem enviada com sucesso!
        </h4>
        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed max-w-md mx-auto">
          A imobiliária <strong>{agencyName}</strong> recebeu seu interesse pelo anúncio e entrará em contato em breve através do seu telefone.
        </p>
      </div>
    );
  }

  return (
    <form
      id="contato"
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4 ${className}`}
    >
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Tenho interesse neste imóvel
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Envie sua mensagem diretamente para a anunciante <strong>{agencyName}</strong>.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Seu Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            Telefone / WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(53) 99999-9999"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          E-mail <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@exemplo.com"
          className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Mensagem
        </label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition resize-none"
        />
      </div>

      <div className="flex items-start gap-2 pt-1">
        <input
          type="checkbox"
          id="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="consent" className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          Concordo em compartilhar meus dados de contato exclusivamente com a anunciante <strong>{agencyName}</strong> para receber informações sobre este imóvel.
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {loading ? "Enviando mensagem..." : "Enviar Mensagem"}
      </button>
    </form>
  );
}
