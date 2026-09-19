"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bed,
  Bath,
  Car,
  Maximize,
  MapPin,
  Building2,
  Check,
  ShieldCheck,
  Heart,
  Camera,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  condo_house: "Casa de Condomínio",
  penthouse: "Cobertura",
  studio: "Studio",
  loft: "Loft",
  kitnet: "Kitnet",
  land: "Terreno",
  commercial: "Comercial",
  office: "Sala Comercial",
  warehouse: "Galpão",
  farm: "Chácara / Sítio",
  rural: "Rural",
  other: "Imóvel",
};

export function SearchPropertyCard({
  property,
  isHovered,
  onHover,
}: SearchPropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  const coverImage = property.media?.find((m) => m.isCover)?.url || property.media?.[0]?.url;
  const photoCount = property.media?.length || 0;

  const isSale = property.transactionType === "sale";
  const isRent = property.transactionType === "rent";
  const isSaleOrRent = property.transactionType === "sale_or_rent";

  // Formatação de preços conforme Seção 14 do MASTER_PLAN
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

  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || "Imóvel";

  // Localização rica: Bairro + Cidade - UF (Seção 13)
  const neighborhoodName = property.neighborhood?.name;
  const cityName = property.city?.name;
  const stateCode = property.state?.code;

  const locationText = (() => {
    if (neighborhoodName && cityName) {
      return `${neighborhoodName}, ${cityName}${stateCode ? ` - ${stateCode}` : ""}`;
    }
    if (cityName) {
      return `${cityName}${stateCode ? ` - ${stateCode}` : ""}`;
    }
    return "Brasil";
  })();

  // Badges discretos (Máximo 2)
  const badges: { label: string; icon?: any }[] = [];
  if (property.financiable) badges.push({ label: "Financiável", icon: Check });
  if (property.agency?.verifiedAt) badges.push({ label: "Verificado", icon: ShieldCheck });
  else if (property.acceptsExchange) badges.push({ label: "Permuta" });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited((prev) => !prev);
  };

  return (
    <article
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group relative rounded-2xl border bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md flex flex-col sm:flex-row ${
        isHovered
          ? "border-indigo-600 ring-2 ring-indigo-500/20"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <Link href={`/imovel/${property.slug}`} className="flex flex-col sm:flex-row w-full">
        {/* FOTO À ESQUERDA (DESKTOP) OU TOPO (MOBILE) */}
        <div className="relative sm:w-64 md:w-72 aspect-[16/10] sm:aspect-auto sm:h-auto overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          {coverImage && !imageError ? (
            <img
              src={coverImage}
              alt={property.title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 gap-1">
              <Building2 className="h-8 w-8 stroke-[1.5]" />
              <span className="text-[10px] font-medium">Foto indisponível</span>
            </div>
          )}

          {/* BADGES SUPERIORES SOBRE A FOTO */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
            <Badge className="bg-slate-900/90 text-white font-bold text-[10px] uppercase backdrop-blur-xs shadow-xs px-2 py-0.5">
              {isRent ? "Locação" : isSale ? "Venda" : "Venda/Locação"}
            </Badge>

            {badges.slice(0, 1).map((b, idx) => {
              const Icon = b.icon;
              return (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 text-[10px] font-semibold backdrop-blur-xs shadow-xs px-1.5 py-0.5"
                >
                  {Icon && <Icon className="h-2.5 w-2.5 mr-0.5 text-emerald-600 shrink-0" />}
                  {b.label}
                </Badge>
              );
            })}
          </div>

          {/* INDICADOR DE FOTOS */}
          {photoCount > 1 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-semibold backdrop-blur-xs">
              <Camera className="h-3 w-3" />
              <span>{photoCount} fotos</span>
            </div>
          )}

          {/* BOTÃO DE FAVORITO (Seção 16) */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorited ? "Remover dos favoritos" : "Salvar imóvel"}
            className="absolute top-2.5 right-2.5 z-20 h-8 w-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-500 hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorited ? "fill-red-600 text-red-600" : ""
              }`}
            />
          </button>
        </div>

        {/* DETALHES À DIREITA (DESKTOP) */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            {/* TIPO E PREÇO */}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                {/* PREÇO PRINCIPAL EM DESTAQUE (Seção 14) */}
                {isSaleOrRent ? (
                  <div className="space-y-0.5">
                    {salePriceFormatted && (
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        Venda {salePriceFormatted}
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
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {rentPriceFormatted || "Consulte"}
                    </span>
                    {rentPriceFormatted && (
                      <span className="text-xs font-medium text-slate-500">/mês</span>
                    )}
                  </div>
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {salePriceFormatted || "Consulte"}
                  </div>
                )}
              </div>

              {/* TAXA DE CONDOMÍNIO (Seção 14) */}
              {condFeeFormatted && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Cond. {condFeeFormatted}
                </span>
              )}
            </div>

            {/* TIPO E TÍTULO (Seção 13 e 15) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                {typeLabel}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {property.title}
              </h2>
            </div>

            {/* LOCALIZAÇÃO (BAIRRO, CIDADE - UF) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>

            {/* ESPECIFICAÇÕES DO IMÓVEL (SEÇÃO 13: Ocultar valores zero/ausentes!) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {property.usableArea && property.usableArea > 0 ? (
                <div className="flex items-center gap-1" title={`${property.usableArea} m² de área útil`}>
                  <Maximize className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{property.usableArea} m²</span>
                </div>
              ) : null}

              {property.bedrooms > 0 && (
                <div className="flex items-center gap-1" title={`${property.bedrooms} quartos`}>
                  <Bed className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"}</span>
                </div>
              )}

              {property.bathrooms > 0 && (
                <div className="flex items-center gap-1" title={`${property.bathrooms} banheiros`}>
                  <Bath className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{property.bathrooms} {property.bathrooms === 1 ? "banheiro" : "banheiros"}</span>
                </div>
              )}

              {property.parkingSpaces > 0 && (
                <div className="flex items-center gap-1" title={`${property.parkingSpaces} vagas de garagem`}>
                  <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{property.parkingSpaces} {property.parkingSpaces === 1 ? "vaga" : "vagas"}</span>
                </div>
              )}
            </div>
          </div>

          {/* RODAPÉ DO CARD: ANUNCIANTE E CTA (Seção 17 e 18) */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              {property.agency?.logoUrl ? (
                <img
                  src={property.agency.logoUrl}
                  alt={property.agency.name}
                  className="h-5 max-w-[80px] object-contain shrink-0"
                />
              ) : (
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px]">
                  {property.agency?.name || "Anunciante Credenciado"}
                </span>
              )}

              {property.agency?.creci && (
                <span className="hidden sm:inline font-mono text-[10px] text-slate-400 shrink-0">
                  CRECI {property.agency.creci}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>Ver detalhes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
