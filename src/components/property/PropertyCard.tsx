"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bed,
  Bath,
  Car,
  Maximize,
  Building2,
  Heart,
  Camera,
  MessageCircle,
} from "lucide-react";
import { VerifiedAgencyBadge, FeaturedPropertyBadge } from "@/components/ui/verified-badge";
import type { SearchPropertyItem } from "@/features/search/types";

interface PropertyCardProps {
  property: SearchPropertyItem;
  className?: string;
}

export function PropertyCard({ property, className = "" }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  const coverImage =
    property.media?.find((m) => m.isCover)?.url || property.media?.[0]?.url;
  const photoCount = property.media?.length || 0;

  const isRent = property.transactionType === "rent";
  const isSaleOrRent = property.transactionType === "sale_or_rent";

  const formatMoney = (val?: number | null) => {
    if (!val || val <= 0) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const salePriceFormatted = formatMoney(property.price);
  const rentPriceFormatted = formatMoney(property.rentPrice);
  const condFeeFormatted = formatMoney(property.condominiumFee);

  const neighborhoodName = property.neighborhood?.name;
  const cityName = property.city?.name;
  const stateCode = property.state?.code;

  const locationBold = (() => {
    const parts: string[] = [];
    if (neighborhoodName) parts.push(neighborhoodName);
    if (cityName) parts.push(cityName);
    const joined = parts.join(", ");
    return stateCode ? `${joined}/${stateCode}` : joined || "Brasil";
  })();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited((prev) => !prev);
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const phoneNumber = property.agency?.phone || "";
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const msg = encodeURIComponent(
        `Olá! Vi o anúncio do imóvel "${property.title}" na UPPA e gostaria de mais informações.`
      );
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
    } else {
      window.open(`/imovel/${property.slug}#contato`, "_blank");
    }
  };

  return (
    <article
      className={`group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 ${className}`}
    >
      {/* 1. MÍDIA / FOTO COM ASPECTO ELEGANTE */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {coverImage && !imageError ? (
          <Link
            href={`/imovel/${property.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={-1}
            prefetch={false}
          >
            <img
              src={coverImage}
              alt={property.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </Link>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 gap-1">
            <Building2 className="h-8 w-8 stroke-[1.5]" />
            <span className="text-[10px] font-medium">Foto indisponível</span>
          </div>
        )}

        {/* Badge de Finalidade e Destaque */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          {property.featured && <FeaturedPropertyBadge />}
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-950/85 text-white font-bold text-[10px] uppercase tracking-wider backdrop-blur-xs">
            {isRent ? "Locação" : isSaleOrRent ? "Venda/Loc." : "Venda"}
          </span>
        </div>

        {/* Contador de Fotos */}
        {photoCount > 1 && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-xs">
            <Camera className="h-3 w-3" />
            <span>{photoCount} fotos</span>
          </div>
        )}

        {/* Botão de Favorito */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={isFavorited ? "Remover dos favoritos" : "Salvar imóvel"}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-600 hover:text-red-500 transition-all shadow-xs backdrop-blur-xs cursor-pointer dark:bg-slate-900/90 dark:text-slate-300"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorited ? "fill-red-500 text-red-500" : ""
            }`}
          />
        </button>
      </div>

      {/* 2. CONTEÚDO DO CARD */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Logo ou Nome da Imobiliária (Com Selo Oficial Azul de Verificação) */}
          {property.agency?.name && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {property.agency.verifiedAt ? (
                <VerifiedAgencyBadge agencyName={property.agency.name} />
              ) : property.agency.logoUrl ? (
                <img
                  src={property.agency.logoUrl}
                  alt={property.agency.name}
                  className="h-3.5 max-w-[80px] object-contain"
                />
              ) : (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {property.agency.name}
                </span>
              )}
            </div>
          )}

          {/* Título do Imóvel */}
          <Link
            href={`/imovel/${property.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 leading-snug transition-colors">
              {property.title}
            </h3>
          </Link>

          {/* Localização em Destaque */}
          <p className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
            {locationBold}
          </p>

          {/* Especificações Físicas */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            {property.usableArea && property.usableArea > 0 && (
              <span className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.usableArea} m²</span>
              </span>
            )}
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"}</span>
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.bathrooms}</span>
              </span>
            )}
            {property.parkingSpaces > 0 && (
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.parkingSpaces}</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. PREÇOS E CTAS */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              {isRent
                ? rentPriceFormatted || "Sob consulta"
                : salePriceFormatted || "Sob consulta"}
            </div>
            {condFeeFormatted && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Cond. {condFeeFormatted}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {property.agency?.phone && (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                title="Falar no WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <Link
              href={`/imovel/${property.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              className="h-8 px-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center transition-colors"
            >
              Ver mais
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
