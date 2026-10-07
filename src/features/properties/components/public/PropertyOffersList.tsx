"use client";

import React, { useState } from "react";
import {
  Building2,
  MessageCircle,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";
import { VerifiedAgencyBadge } from "@/components/ui/verified-badge";
import { trackWhatsAppLeadAction } from "@/features/leads/actions";

export interface PropertyOfferItem {
  id: string;
  property_id: string;
  agency_id: string;
  broker_id?: string | null;
  source: string;
  external_id: string;
  sale_price: number | null;
  rent_price: number | null;
  condominium_fee: number | null;
  iptu: number | null;
  title: string;
  description: string | null;
  original_url: string | null;
  updated_at: string;
  agency?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    creci?: string | null;
    verified_at?: string | null;
  } | null;
  media?: {
    id: string;
    url: string;
    thumbnail_url?: string | null;
    is_cover: boolean;
    position: number;
  }[];
}

interface PropertyOffersListProps {
  propertyId: string;
  propertyTitle: string;
  offers: PropertyOfferItem[];
}

export function PropertyOffersList({
  propertyId,
  propertyTitle,
  offers,
}: PropertyOffersListProps) {
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  if (!offers || offers.length === 0) return null;

  const formatMoney = (val?: number | null) => {
    if (!val || val <= 0) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatUpdatedDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) return "Atualizado hoje";
      if (diffDays === 1) return "Atualizado ontem";
      if (diffDays < 30) return `Atualizado há ${diffDays} dias`;
      return `Atualizado em ${date.toLocaleDateString("pt-BR")}`;
    } catch {
      return "Atualizado recentemente";
    }
  };

  const handleWhatsAppOfferClick = (offer: PropertyOfferItem) => {
    const agencyPhone = offer.agency?.whatsapp || offer.agency?.phone;
    if (!agencyPhone) return;

    const cleanPhone = agencyPhone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá! Vi o anúncio do imóvel "${offer.title || propertyTitle}" (Cód: ${offer.external_id}) na UPPA anunciado pela ${offer.agency?.name || "sua imobiliária"} e gostaria de mais informações.`
    );
    const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${msg}`;

    // Rastreia lead de forma atômica vinculando à oferta e imobiliária corretas (Fase 18)
    trackWhatsAppLeadAction({
      propertyId,
      offerId: offer.id,
      agencyId: offer.agency_id,
      message: `Contato via oferta ${offer.id} da imobiliária ${offer.agency?.name || offer.agency_id}`,
    }).catch(console.warn);

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="space-y-4 pt-2" id="ofertas">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Ofertas disponíveis ({offers.length})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {offers.length > 1
              ? "Este imóvel é anunciado por múltiplas imobiliárias parceiras. Escolha sua oferta preferida:"
              : "Anúncio comercial ativo por imobiliária parceira:"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {offers.map((offer, idx) => {
          const isExpanded = expandedOfferId === offer.id;
          const saleFormatted = formatMoney(offer.sale_price);
          const rentFormatted = formatMoney(offer.rent_price);
          const condFormatted = formatMoney(offer.condominium_fee);
          const agencyPhone = offer.agency?.whatsapp || offer.agency?.phone;
          const offerPhotos = offer.media || [];

          return (
            <div
              key={offer.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* 1. Informações da Imobiliária */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {offer.agency?.logo_url ? (
                    <img
                      src={offer.agency.logo_url}
                      alt={offer.agency.name || "Imobiliária"}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0 p-1"
                    />
                  ) : (
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Building2 className="h-6 w-6 stroke-[1.5]" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                        {offer.agency?.name || "Imobiliária parceira"}
                      </span>
                      {offer.agency?.verified_at && (
                        <VerifiedAgencyBadge agencyName={offer.agency.name} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {offer.agency?.creci && <span>CRECI: {offer.agency.creci}</span>}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatUpdatedDate(offer.updated_at)}
                      </span>
                      <span>•</span>
                      <span>Cód: {offer.external_id}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Preço e Ações */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    {saleFormatted && (
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {saleFormatted}
                      </div>
                    )}
                    {rentFormatted && (
                      <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
                        Aluguel {rentFormatted}/mês
                      </div>
                    )}
                    {condFormatted && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Cond. {condFormatted}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {agencyPhone && (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppOfferClick(offer)}
                        className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5C] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <MessageCircle className="h-4 w-4 fill-white stroke-none" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedOfferId(isExpanded ? null : offer.id)}
                      className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      title={isExpanded ? "Ocultar detalhes" : "Ver fotos e detalhes"}
                      aria-label="Expandir detalhes da oferta"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detalhes expandidos da oferta (Fotos e descrição da imobiliária específica - Fase 17) */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  {offerPhotos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Fotos desta imobiliária ({offerPhotos.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {offerPhotos.slice(0, 8).map((media, mIdx) => (
                          <div
                            key={media.id || mIdx}
                            className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700"
                          >
                            <img
                              src={media.thumbnail_url || media.url}
                              alt={`Foto da oferta ${offer.agency?.name}`}
                              className="h-full w-full object-cover hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {offer.description && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Descrição da imobiliária
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {offer.description}
                      </p>
                    </div>
                  )}

                  {offer.original_url && (
                    <div className="pt-1">
                      <a
                        href={offer.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                      >
                        <span>Ver anúncio original no site da imobiliária</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
