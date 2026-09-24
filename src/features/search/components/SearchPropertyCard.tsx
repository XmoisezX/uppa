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
import type { SearchPropertyItem } from "../types";

interface SearchPropertyCardProps {
  property: SearchPropertyItem;
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  townhouse: "Sobrado",
  condo_house: "Casa de Condominio",
  penthouse: "Cobertura",
  studio: "Studio",
  loft: "Loft",
  kitnet: "Kitnet",
  land: "Terreno",
  commercial: "Comercial",
  office: "Sala Comercial",
  warehouse: "Galpao",
  farm: "Chacara / Sitio",
  rural: "Rural",
  other: "Imovel",
};

export function SearchPropertyCard({
  property,
  isHovered,
  onHover,
}: SearchPropertyCardProps) {
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
    return stateCode ? joined + "/" + stateCode : joined || "Brasil";
  })();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited((prev) => !prev);
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const agencyAny = property.agency;
    const phoneNumber = agencyAny?.phone || "";
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const msg = encodeURIComponent('Ola! Vi o imovel "' + property.title + '" na UPPA e tenho interesse.');
      window.open("https://wa.me/55" + cleanPhone + "?text=" + msg, "_blank");
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = "/imovel/" + property.slug + "#contato";
  };

  const hasPhone = Boolean(property.agency?.phone);

  return (
    <article
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col w-full m-0 ${
        isHovered
          ? "border-indigo-500 shadow-md"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
      }`}
    >
      {/* 1. MÍDIA / FOTO */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
        {coverImage && !imageError ? (
          <Link href={"/imovel/" + property.slug} tabIndex={-1} prefetch={false}>
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
          <div className="h-full w-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 gap-1">
            <Building2 className="h-8 w-8 stroke-[1.5]" />
            <span className="text-[10px] font-medium">Foto indisponível</span>
          </div>
        )}

        {/* Badge de Finalidade */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-950/85 text-white font-bold text-[10px] uppercase tracking-wide backdrop-blur-xs">
            {isRent ? "Locação" : isSaleOrRent ? "Venda/Loc." : "Venda"}
          </span>
        </div>

        {/* Contador de Fotos */}
        {photoCount > 1 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-xs">
            <Camera className="h-3 w-3" />
            <span>{photoCount} fotos</span>
          </div>
        )}

        {/* Botão de Favorito */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={isFavorited ? "Remover dos favoritos" : "Salvar imóvel"}
          className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-600 hover:text-red-500 transition-all shadow-xs backdrop-blur-xs cursor-pointer dark:bg-slate-900/90 dark:text-slate-300"
        >
          <Heart
            className={"h-4 w-4 transition-colors " + (isFavorited ? "fill-red-500 text-red-500" : "")}
          />
        </button>
      </div>

      {/* 2. CONTEÚDO DO CARD */}
      <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Logo / Nome da Imobiliária */}
          {property.agency?.name && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {property.agency.verifiedAt && (
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                  Verificado
                </span>
              )}
              {property.agency.logoUrl ? (
                <img
                  src={property.agency.logoUrl}
                  alt={property.agency.name}
                  className="h-3.5 max-w-[70px] object-contain"
                />
              ) : (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {property.agency.name}
                </span>
              )}
            </div>
          )}

          {/* Título do Imóvel */}
          <Link href={"/imovel/" + property.slug} className="block group/title">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 line-clamp-2 leading-snug transition-colors">
              {property.title}
            </h3>
          </Link>

          {/* Localização */}
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
            {locationBold}
          </p>

          {/* Especificações Físicas */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            {property.usableArea && property.usableArea > 0 && (
              <span className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{property.usableArea} m²</span>
              </span>
            )}
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"}</span>
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{property.bathrooms}</span>
              </span>
            )}
            {property.parkingSpaces > 0 && (
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{property.parkingSpaces}</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. PREÇOS E CTAS */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-2">
          <div>
            {isSaleOrRent ? (
              <div className="space-y-0.5">
                {salePriceFormatted && (
                  <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {salePriceFormatted}
                  </div>
                )}
                {rentPriceFormatted && (
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Aluguel {rentPriceFormatted}/mês
                  </div>
                )}
              </div>
            ) : isRent ? (
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {rentPriceFormatted || "Sob consulta"}
                </span>
                {rentPriceFormatted && <span className="text-[10px] text-slate-500 font-medium">/mês</span>}
              </div>
            ) : (
              <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {salePriceFormatted || "Sob consulta"}
              </div>
            )}
            {condFeeFormatted && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Cond. {condFeeFormatted}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasPhone && (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                aria-label="Contato via WhatsApp"
                title="WhatsApp"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#25d366] hover:bg-[#20bd5c] text-white transition-colors cursor-pointer shrink-0"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleContactClick}
              className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer"
            >
              Falar com o anunciante
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
