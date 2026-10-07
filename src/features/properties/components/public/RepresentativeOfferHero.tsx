"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Phone,
  MessageCircle,
  ExternalLink,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { VerifiedAgencyBadge, VerifiedIcon } from "@/components/ui/verified-badge";
import { LeadContactForm } from "@/features/leads/components/LeadContactForm";
import { trackWhatsAppLeadAction } from "@/features/leads/actions";
import type { ResolvedRepresentativeOffer } from "@/features/offers/services/representative-offer.service";
import type { PropertyWithDetails } from "@/types/property";

interface RepresentativeOfferHeroProps {
  property: PropertyWithDetails;
  offer: ResolvedRepresentativeOffer;
}

export function RepresentativeOfferHero({
  property,
  offer,
}: RepresentativeOfferHeroProps) {
  const isRent = property.transactionType === "rent";
  const effectivePrice = isRent
    ? offer.rentPrice ?? property.rentPrice
    : offer.salePrice ?? property.price;

  const formatMoney = (val?: number | null) => {
    if (!val || val <= 0) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const priceFormatted = formatMoney(effectivePrice);
  const condoFormatted = formatMoney(offer.condominiumFee ?? property.condominiumFee);
  const iptuFormatted = formatMoney(offer.iptu ?? property.iptu);

  const agencyPhone = offer.agency.whatsapp || offer.agency.phone || "";
  const cleanPhone = agencyPhone.replace(/\D/g, "");

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cleanPhone) {
      const el = document.getElementById("contato");
      if (el) el.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const msg = encodeURIComponent(
      `Olá! Vi o anúncio do imóvel "${property.title}" na UPPA anunciado por ${offer.agency.name} e gostaria de mais informações.`
    );

    // Registra lead de intenção vinculado à representative offer (Seção 22 e 25)
    trackWhatsAppLeadAction({
      propertyId: property.id,
      offerId: offer.offerId,
      agencyId: offer.agency.id,
      brokerId: offer.brokerId || null,
      snapshotPrice: effectivePrice,
      snapshotTitle: property.title,
      snapshotAgencyName: offer.agency.name,
      message: `Contato via página do imóvel para ${property.title}`,
    }).catch(console.warn);

    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <section className="space-y-6">
      {/* CARD DA OFERTA COMERCIAL ÚNICA (Seções 1, 2 e 5) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Oferta Comercial Selecionada
            </span>
          </div>

          {offer.externalId && (
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Ref: {offer.externalId}
            </span>
          )}
        </div>

        {/* DADOS DA IMOBILIÁRIA E PREÇO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Anunciante */}
          <div className="flex items-start gap-3.5">
            <div className="h-14 w-14 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
              {offer.agency.logoUrl ? (
                <img
                  src={offer.agency.logoUrl}
                  alt={offer.agency.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-7 w-7 text-slate-400" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                Anunciado por
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/imobiliaria/${offer.agency.slug}`}
                  className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate"
                >
                  {offer.agency.name}
                </Link>
                {offer.agency.verifiedAt && <VerifiedIcon className="w-4 h-4 shrink-0" />}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {offer.agency.creci && (
                  <span className="font-mono text-[11px]">CRECI {offer.agency.creci}</span>
                )}
                {offer.agency.isOfficialProfile && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Perfil Oficial
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preço Exato e Encargos */}
          <div className="md:text-right space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isRent ? "Valor de Locação" : "Valor de Venda"}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {priceFormatted || "Sob consulta"}
              {isRent && <span className="text-xs font-normal text-slate-400"> /mês</span>}
            </div>

            {(condoFormatted || iptuFormatted) && (
              <div className="flex items-center md:justify-end gap-3 text-xs text-slate-500 dark:text-slate-400">
                {condoFormatted && <span>Cond. {condoFormatted}</span>}
                {iptuFormatted && <span>IPTU {iptuFormatted}</span>}
              </div>
            )}
          </div>
        </div>

        {/* BOTÕES DE AÇÃO DA REPRESENTATIVE OFFER */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {cleanPhone && (
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="w-full sm:flex-1 h-12 rounded-xl bg-[#25D366] hover:bg-[#20BD5C] text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white stroke-none" />
              Falar no WhatsApp com {offer.agency.name}
            </button>
          )}

          <a
            href="#contato"
            className="w-full sm:flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs"
          >
            Tenho interesse neste imóvel
          </a>
        </div>
      </div>

      {/* FORMULÁRIO DE INTERESSE (Seção 31) */}
      <LeadContactForm
        propertyId={property.id}
        offerId={offer.offerId}
        agencyId={offer.agency.id}
        brokerId={offer.brokerId}
        propertyTitle={property.title}
        snapshotPrice={effectivePrice}
        agencyName={offer.agency.name}
      />
    </section>
  );
}
