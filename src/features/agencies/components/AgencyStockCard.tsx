"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bed,
  Bath,
  Car,
  Maximize2,
  MapPin,
  MessageCircle,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackWhatsAppLeadAction } from "@/features/leads/actions";
import type { AgencyStockOfferItem, Agency } from "@/types/agency";

interface AgencyStockCardProps {
  item: AgencyStockOfferItem;
  agency: Agency;
}

export function AgencyStockCard({ item, agency }: AgencyStockCardProps) {
  const formatMoney = (val?: number | null) => {
    if (!val || val <= 0) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isSale =
    item.transactionType === "sale" ||
    item.transactionType === "sale_or_rent" ||
    (item.offerPrice && item.offerPrice > 0);
  const isRent =
    item.transactionType === "rent" ||
    item.transactionType === "sale_or_rent" ||
    (item.offerRentPrice && item.offerRentPrice > 0);

  const salePriceFormatted = formatMoney(item.offerPrice);
  const rentPriceFormatted = formatMoney(item.offerRentPrice);

  const displayPrice = isRent && !isSale
    ? `${rentPriceFormatted}/mês`
    : isSale && !isRent
    ? salePriceFormatted
    : isSale && isRent
    ? `${salePriceFormatted} • Aluguel: ${rentPriceFormatted}/mês`
    : "Sob consulta";

  // URL canônica da propriedade com query params não indexáveis preservando contexto
  const propertyUrl = `/imovel/${item.propertySlug}?agency=${agency.slug}&offer=${item.offerId}`;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetPhone = agency.whatsapp || agency.phone;
    if (!targetPhone) return;

    const cleanPhone = targetPhone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá! Vi o imóvel "${item.propertyTitle}" anunciado pela ${agency.name} no Portal UPPA e gostaria de mais informações. (Ref: ${item.propertySlug})`
    );
    const whatsappUrl = `https://wa.me/${
      cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
    }?text=${msg}`;

    // Registra lead de forma segura vinculado estritamente a esta agência e oferta (Seções 22 e 25)
    trackWhatsAppLeadAction({
      propertyId: item.propertyId,
      offerId: item.offerId,
      agencyId: agency.id,
      snapshotPrice: item.offerPrice ?? item.offerRentPrice ?? null,
      snapshotTitle: item.propertyTitle,
      snapshotAgencyName: agency.name,
      message: `Contato via vitrine pública da imobiliária ${agency.name}`,
    }).catch(console.warn);

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* Imagem de Capa com badge */}
      <Link href={propertyUrl} className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.propertyTitle}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-700">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        {/* Badges de Finalidade */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {item.transactionType === "sale" && (
            <Badge className="bg-slate-900/80 text-white backdrop-blur-xs text-[10px] uppercase font-bold">
              Venda
            </Badge>
          )}
          {item.transactionType === "rent" && (
            <Badge className="bg-indigo-600/90 text-white backdrop-blur-xs text-[10px] uppercase font-bold">
              Aluguel
            </Badge>
          )}
          {item.transactionType === "sale_or_rent" && (
            <Badge className="bg-emerald-600/90 text-white backdrop-blur-xs text-[10px] uppercase font-bold">
              Venda e Aluguel
            </Badge>
          )}
        </div>
      </Link>

      {/* Conteúdo Principal */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Preço Comercial da Oferta da Imobiliária (SEM "A partir de") */}
        <div className="mb-2">
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {displayPrice}
          </p>
        </div>

        {/* Título do Imóvel */}
        <Link href={propertyUrl}>
          <h3 className="line-clamp-2 text-sm font-bold text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors">
            {item.propertyTitle}
          </h3>
        </Link>

        {/* Localização */}
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {[item.neighborhoodName, item.cityName, item.stateCode]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>

        {/* Atributos Físicos */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {item.bedrooms !== undefined && item.bedrooms !== null && item.bedrooms > 0 && (
            <div className="flex items-center gap-1" title={`${item.bedrooms} quartos`}>
              <Bed className="h-4 w-4 text-slate-400" />
              <span>{item.bedrooms}</span>
            </div>
          )}

          {item.bathrooms !== undefined && item.bathrooms !== null && item.bathrooms > 0 && (
            <div className="flex items-center gap-1" title={`${item.bathrooms} banheiros`}>
              <Bath className="h-4 w-4 text-slate-400" />
              <span>{item.bathrooms}</span>
            </div>
          )}

          {item.parkingSpaces !== undefined && item.parkingSpaces !== null && item.parkingSpaces > 0 && (
            <div className="flex items-center gap-1" title={`${item.parkingSpaces} vagas`}>
              <Car className="h-4 w-4 text-slate-400" />
              <span>{item.parkingSpaces}</span>
            </div>
          )}

          {(item.usableArea || item.totalArea) && (
            <div className="flex items-center gap-1 ml-auto" title="Área útil">
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
              <span>{Math.round(item.usableArea || item.totalArea || 0)} m²</span>
            </div>
          )}
        </div>

        {/* Rodapé do Card com Ações */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Link
            href={propertyUrl}
            className="text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 inline-flex items-center gap-1"
          >
            Ver detalhes
            <ExternalLink className="h-3 w-3" />
          </Link>

          {(agency.whatsapp || agency.phone) && (
            <Button
              size="sm"
              onClick={handleWhatsAppClick}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 px-3 rounded-lg"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Contato
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
