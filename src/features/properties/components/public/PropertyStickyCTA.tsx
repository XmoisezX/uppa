"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Phone,
  Building2,
  ShieldCheck,
  Check,
  Send,
  CheckCircle2,
  AlertCircle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PropertyWithDetails } from "@/types/property";
import {
  trackWhatsAppLeadAction,
  submitLeadFormAction,
} from "@/features/leads/actions";

interface PropertyStickyCTAProps {
  property: PropertyWithDetails;
}

export function PropertyStickyCTA({ property }: PropertyStickyCTAProps) {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "form">("whatsapp");
  const [showPhone, setShowPhone] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const defaultMessage = `Olá! Tenho interesse no imóvel "${property.title}" (Cód: ${property.externalId}) e gostaria de agendar uma visita ou mais detalhes.`;
  const [formMessage, setFormMessage] = useState(defaultMessage);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const agencyPhone = property.agency?.whatsapp || property.agency?.phone || "5511999999999";
  const cleanPhone = agencyPhone.replace(/\D/g, "");

  const formatCurrency = (val?: number | null) => {
    if (!val) return "Consulte";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const primaryPrice =
    property.transactionType === "rent" ? property.rentPrice : property.price;

  // Mensagem personalizada do WhatsApp
  const messageText = `Olá! Vi o anúncio do imóvel "${property.title}" (Código: ${property.externalId}) na UPPA e gostaria de mais informações.`;
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(messageText)}`;

  const getUtmAndSession = () => {
    let utmSource: string | undefined;
    let utmMedium: string | undefined;
    let utmCampaign: string | undefined;
    let utmContent: string | undefined;

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      utmSource = searchParams.get("utm_source") || undefined;
      utmMedium = searchParams.get("utm_medium") || undefined;
      utmCampaign = searchParams.get("utm_campaign") || undefined;
      utmContent = searchParams.get("utm_content") || undefined;
    }

    let sessionId: string | undefined;
    try {
      if (typeof window !== "undefined") {
        sessionId = sessionStorage.getItem("portal_session_id") || undefined;
        if (!sessionId) {
          sessionId = "sess_" + Math.random().toString(36).substring(2, 9);
          sessionStorage.setItem("portal_session_id", sessionId);
        }
      }
    } catch {
      // Ignora erro de storage restrito
    }

    return { utmSource, utmMedium, utmCampaign, utmContent, sessionId };
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRedirecting(true);

    const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
    const { utmSource, utmMedium, utmCampaign, utmContent, sessionId } = getUtmAndSession();

    const trackPromise = trackWhatsAppLeadAction({
      propertyId: property.id,
      agencyId: property.agencyId,
      message: messageText,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      sessionId,
    }).catch((err) => {
      console.warn("[PropertyStickyCTA] Analytics failover:", err);
    });

    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 350));

    Promise.race([trackPromise, timeoutPromise]).finally(() => {
      setIsRedirecting(false);
      if (win) {
        win.location.href = whatsappUrl;
      } else if (typeof window !== "undefined") {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Por favor, digite seu nome.");
      return;
    }
    if (!formPhone.trim()) {
      setFormError("Por favor, informe seu telefone ou WhatsApp.");
      return;
    }

    setFormSubmitting(true);
    const { utmSource, utmMedium, utmCampaign, utmContent, sessionId } = getUtmAndSession();

    try {
      const res = await submitLeadFormAction({
        propertyId: property.id,
        agencyId: property.agencyId,
        name: formName,
        phone: formPhone,
        email: formEmail || undefined,
        message: formMessage,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        sessionId,
      });

      if (res.success) {
        setFormSuccess(true);
      } else {
        setFormError(res.error || "Não foi possível enviar a mensagem.");
      }
    } catch {
      setFormError("Erro de comunicação ao enviar mensagem. Tente pelo WhatsApp.");
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <>
      {/* DESKTOP STICKY SIDEBAR (Seção 43 do MASTER_PLAN) */}
      <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-6">
        {/* Preço de Destaque */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {property.transactionType === "rent" ? "Aluguel Mensal" : "Valor de Venda"}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(primaryPrice)}
            </span>
            {property.transactionType === "rent" && (
              <span className="text-xs text-slate-400">/mês</span>
            )}
          </div>

          {property.condominiumFee && (
            <span className="text-xs text-slate-500 block mt-1">
              Condomínio: {formatCurrency(property.condominiumFee)}/mês
            </span>
          )}
        </div>

        {/* Resumo da Imobiliária Anunciante */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="h-11 w-11 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
            {property.agency?.logoUrl ? (
              <img
                src={property.agency.logoUrl}
                alt={property.agency.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={property.agency?.slug ? `/imobiliaria/${property.agency.slug}` : "#"}
              className="text-xs font-bold text-slate-900 dark:text-white block truncate hover:text-indigo-600 transition-colors"
            >
              {property.agency?.name || "Imobiliária Parceira"}
            </Link>
            <span className="text-[11px] text-slate-400 block">
              {property.agency?.creci ? `CRECI: ${property.agency.creci}` : "Credenciada UPPA"}
            </span>
          </div>
        </div>

        {/* TABS DE CANAIS: WHATSAPP VS MENSAGEM */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "whatsapp"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "form"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Mensagem</span>
          </button>
        </div>

        {/* CONTEÚDO DA TAB WHATSAPP */}
        {activeTab === "whatsapp" && (
          <div className="space-y-3">
            <Button
              onClick={handleWhatsAppClick}
              disabled={isRedirecting}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <MessageSquare className="h-5 w-5 mr-2 fill-current" />
              {isRedirecting ? "Abrindo WhatsApp..." : "Conversar no WhatsApp"}
            </Button>

            {showPhone ? (
              <div className="p-3 text-center rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {property.agency?.phone || property.agency?.whatsapp || "Telefone não informado"}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowPhone(true)}
                className="w-full h-10 text-xs font-semibold cursor-pointer"
              >
                <Phone className="h-4 w-4 mr-2" />
                Ver Telefone da Imobiliária
              </Button>
            )}
          </div>
        )}

        {/* CONTEÚDO DA TAB FORMULÁRIO DE PROPOSTA */}
        {activeTab === "form" && (
          <div>
            {formSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Mensagem Enviada!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    A imobiliária <strong>{property.agency?.name}</strong> recebeu sua solicitação e entrará em contato em breve.
                  </p>
                </div>
                <Button
                  onClick={handleWhatsAppClick}
                  variant="outline"
                  className="w-full text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  Também falar no WhatsApp
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-3">
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Seu Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Mensagem
                  </label>
                  <textarea
                    rows={3}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {formSubmitting ? "Enviando mensagem..." : "Enviar Mensagem para Anunciante"}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Garantia e Segurança */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Contato direto com a imobiliária oficial. Sem intermediários.</span>
        </div>
      </div>

      {/* MOBILE BARRA FIXA INFERIOR (Seção 43 do MASTER_PLAN) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 p-3.5 backdrop-blur-md shadow-2xl flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
            {property.transactionType === "rent" ? "Locação" : "Venda"}
          </span>
          <span className="text-base font-black text-slate-900 dark:text-white truncate block">
            {formatCurrency(primaryPrice)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleWhatsAppClick}
            disabled={isRedirecting}
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer shrink-0"
          >
            <MessageSquare className="h-4 w-4 mr-1.5 fill-current" />
            {isRedirecting ? "Abrindo..." : "WhatsApp"}
          </Button>
        </div>
      </div>
    </>
  );
}
