"use client";

import React, { useState } from "react";
import { MessageSquare, Phone, Building2, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PropertyWithDetails } from "@/types/property";
import { trackWhatsAppLeadAction } from "@/features/leads/actions";

interface PropertyStickyCTAProps {
  property: PropertyWithDetails;
}

export function PropertyStickyCTA({ property }: PropertyStickyCTAProps) {
  const [showPhone, setShowPhone] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
  const messageText = `Olá! Vi o anúncio do imóvel "${property.title}" (Código: ${property.externalId}) no Portal Imobiliário e gostaria de mais informações.`;
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(messageText)}`;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRedirecting(true);

    // Abre a janela imediatamente para manter o contexto do gesto do usuário e evitar bloqueadores de pop-up
    const win = typeof window !== "undefined" ? window.open("", "_blank") : null;

    // 1. Extrai UTMs da query string atual
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

    // 2. Identificador de sessão simples
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

    // 3. Dispara Server Action com garantia de timeout para NUNCA bloquear o usuário
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

    // Timeout de 350ms máximo para o analytics antes de redirecionar
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

        {/* Resumo da Imobiliária */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
            {property.agency?.logoUrl ? (
              <img
                src={property.agency.logoUrl}
                alt={property.agency.name}
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <Building2 className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
              {property.agency?.name || "Imobiliária Parceira"}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {property.agency?.creci ? `CRECI: ${property.agency.creci}` : "Credenciada"}
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2.5">
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

        {/* Garantia e Segurança */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Contato direto com a imobiliária oficial. Sem intermediários.</span>
        </div>
      </div>

      {/* MOBILE BARRA FIXA INFERIOR (Seção 43 do MASTER_PLAN) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 p-3.5 backdrop-blur-md shadow-2xl flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
            {property.transactionType === "rent" ? "Locação" : "Venda"}
          </span>
          <span className="text-base font-black text-slate-900 dark:text-white">
            {formatCurrency(primaryPrice)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleWhatsAppClick}
            disabled={isRedirecting}
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 mr-1.5 fill-current" />
            {isRedirecting ? "Abrindo..." : "WhatsApp"}
          </Button>
        </div>
      </div>
    </>
  );
}
