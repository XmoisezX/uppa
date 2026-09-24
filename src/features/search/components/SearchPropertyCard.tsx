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
      className={`group relative bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col sm:flex-row min-h-[180px] ${
        isHovered
          ? "border-indigo-500 shadow-md"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="relative sm:w-[260px] md:w-[280px] aspect-[4/3] sm:aspect-auto overflow-hidden bg-slate-100 shrink-0 self-stretch">
        {coverImage && !imageError ? (
          <Link href={"/imovel/" + property.slug} tabIndex={-1} prefetch={false}>
            <img
              src={coverImage}
              alt={property.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </Link>
        ) : (
          <div className="h-full w-full min-h-[160px] sm:min-h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 gap-1">
            <Building2 className="h-8 w-8 stroke-[1.5]" />
            <span className="text-[10px] font-medium">Foto indisponivel</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900/85 text-white font-bold text-[10px] uppercase tracking-wide backdrop-blur-sm">
            {isRent ? "Locacao" : isSaleOrRent ? "Venda/Loc." : "Venda"}
          </span>
        </div>
        {photoCount > 1 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm">
            <Camera className="h-3 w-3" />
            <span>{photoCount} fotos</span>
          </div>
        )}
      </div>
      <Link
        href={"/imovel/" + property.slug}
        className="flex-1 p-4 flex flex-col justify-between min-w-0"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-slate-600 leading-snug line-clamp-2 flex-1 pr-1">
            {property.title}
          </p>
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorited ? "Remover dos favoritos" : "Salvar imovel"}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all cursor-pointer shrink-0"
          >
            <Heart
              className={"h-4 w-4 transition-colors " + (isFavorited ? "fill-red-500 text-red-500" : "")}
            />
          </button>
        </div>
        {property.agency?.name && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {property.agency.verifiedAt && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                Verificado
              </span>
            )}
            {property.agency.logoUrl ? (
              <img src={property.agency.logoUrl} alt={property.agency.name} className="h-4 max-w-[70px] object-contain" />
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 truncate">{property.agency.name}</span>
            )}
          </div>
        )}
        <div className="mt-2 space-y-0.5">
          <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{locationBold}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
          {property.usableArea && property.usableArea > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700">{property.usableArea}m2</span>
            </span>
          )}
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700">{property.bedrooms}</span>
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700">{property.bathrooms}</span>
            </span>
          )}
          {property.parkingSpaces > 0 && (
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700">{property.parkingSpaces}</span>
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
          <div>
            {isSaleOrRent ? (
              <div className="space-y-0.5">
                {salePriceFormatted && (
                  <div className="text-xl font-black text-slate-900 tracking-tight leading-none">{salePriceFormatted}</div>
                )}
                {rentPriceFormatted && (
                  <div className="text-sm font-bold text-slate-600">Aluguel {rentPriceFormatted}/mes</div>
                )}
              </div>
            ) : isRent ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 tracking-tight leading-none">{rentPriceFormatted || "Consulte"}</span>
                {rentPriceFormatted && <span className="text-xs text-slate-500 font-medium">/mes</span>}
              </div>
            ) : (
              <div className="text-xl font-black text-slate-900 tracking-tight leading-none">{salePriceFormatted || "Consulte"}</div>
            )}
            <div className="flex flex-wrap gap-x-2 mt-0.5">
              {condFeeFormatted && <span className="text-[11px] text-slate-500">Condominio {condFeeFormatted}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasPhone && (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                aria-label="Contato via WhatsApp"
                title="WhatsApp"
                className="h-10 w-11 flex items-center justify-center rounded-xl bg-[#25d366] hover:bg-[#20bd5c] text-white transition-colors cursor-pointer shrink-0"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleContactClick}
              className="h-10 px-3 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-[11px] sm:text-[12px] font-bold whitespace-nowrap transition-colors cursor-pointer"
            >
              Falar com o anunciante
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}
