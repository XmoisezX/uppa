"use client";

import React from "react";
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
  const coverImage = property.media?.find((m) => m.isCover)?.url || property.media?.[0]?.url;
  const isRent = property.transactionType === "rent";
  const rawPrice = isRent ? property.rentPrice : property.price;

  const formattedPrice = rawPrice
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(rawPrice)
    : "Consulte";

  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || "Imóvel";

  // Badges conforme Seção 41 do MASTER_PLAN (Máximo 3)
  const badges: { label: string; icon?: any }[] = [];
  if (property.financiable) badges.push({ label: "Financiável", icon: Check });
  if (property.agency?.verifiedAt) badges.push({ label: "Verificado", icon: ShieldCheck });
  if (property.acceptsExchange) badges.push({ label: "Permuta" });

  const locationLabel = property.city?.name
    ? `${property.city.name}${property.state?.code ? ` - ${property.state.code}` : ""}`
    : "Brasil";

  return (
    <div
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group rounded-2xl border bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md ${
        isHovered
          ? "border-indigo-600 ring-2 ring-indigo-500/20"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <Link href={`/imovel/${property.slug}`} className="block">
        {/* FOTO E BADGES */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {coverImage ? (
            <img
              src={coverImage}
              alt={property.title}
              className="h-full w-full object-cover group-hover:scale-104 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400">
              <Building2 className="h-10 w-10 stroke-[1.5]" />
            </div>
          )}

          {/* Badges superiores */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <Badge className="bg-slate-900/90 text-white font-bold text-[10px] uppercase backdrop-blur-xs">
              {isRent ? "Locação" : "Venda"}
            </Badge>

            {badges.slice(0, 2).map((b, idx) => {
              const Icon = b.icon;
              return (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 text-[10px] font-semibold backdrop-blur-xs shadow-xs"
                >
                  {Icon && <Icon className="h-3 w-3 mr-1 text-emerald-600" />}
                  {b.label}
                </Badge>
              );
            })}
          </div>

          {/* Tipo de Imóvel */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-md bg-black/60 text-white text-[11px] font-semibold backdrop-blur-xs">
              {typeLabel}
            </span>
          </div>
        </div>

        {/* DADOS PRINCIPAIS */}
        <div className="p-4 space-y-2.5">
          {/* Preço em destaque */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {formattedPrice}
              </span>
              {isRent && (
                <span className="text-xs text-slate-400 font-normal">/mês</span>
              )}
            </div>

            {property.condominiumFee && (
              <span className="text-[11px] text-slate-400">
                Cond: R$ {property.condominiumFee}
              </span>
            )}
          </div>

          {/* Título do Anúncio */}
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {property.title}
          </h3>

          {/* Localização */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </div>

          {/* Especificações Físicas (Dormitórios, Vagas, Metragem) */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1" title={`${property.bedrooms} quartos`}>
                <Bed className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.bedrooms}</span>
              </div>
            )}

            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1" title={`${property.bathrooms} banheiros`}>
                <Bath className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.bathrooms}</span>
              </div>
            )}

            {property.parkingSpaces > 0 && (
              <div className="flex items-center gap-1" title={`${property.parkingSpaces} vagas de garagem`}>
                <Car className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.parkingSpaces}</span>
              </div>
            )}

            {property.usableArea && (
              <div className="flex items-center gap-1" title={`${property.usableArea} m² de área útil`}>
                <Maximize className="h-3.5 w-3.5 text-slate-400" />
                <span>{property.usableArea} m²</span>
              </div>
            )}
          </div>

          {/* Imobiliária Anunciante */}
          {property.agency && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              <span className="truncate font-medium text-slate-600 dark:text-slate-400">
                {property.agency.name}
              </span>
              {property.agency.creci && (
                <span className="font-mono text-[10px] shrink-0">
                  CRECI {property.agency.creci}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
