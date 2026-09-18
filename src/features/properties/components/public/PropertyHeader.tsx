import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PropertyWithDetails } from "@/types/property";

interface PropertyHeaderProps {
  property: PropertyWithDetails;
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

export function PropertyHeader({ property }: PropertyHeaderProps) {
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || "Imóvel";
  const transactionLabel = property.transactionType === "rent" ? "Locação" : "Venda";

  // Respeito à visibilidade de endereço (Seção 44 do MASTER_PLAN)
  const displayAddress = property.addressVisible && property.street
    ? `${property.street}${property.number ? `, ${property.number}` : ""}${property.neighborhood?.name ? ` - ${property.neighborhood.name}` : ""}`
    : property.neighborhood?.name || "Localização privilegiada";

  const cityState = property.city?.name
    ? `${property.city.name}${property.state?.code ? ` - ${property.state.code}` : ""}`
    : "";

  return (
    <div className="space-y-4">
      {/* BREADCRUMBS */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto scrollbar-none py-1">
        <Link href="/" className="hover:text-indigo-600 transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />

        <Link
          href={property.transactionType === "rent" ? "/alugar" : "/comprar"}
          className="hover:text-indigo-600 transition-colors"
        >
          {property.transactionType === "rent" ? "Alugar" : "Comprar"}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />

        {property.state && (
          <>
            <span className="hover:text-indigo-600 transition-colors cursor-pointer">
              {property.state.name}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
          </>
        )}

        {property.city && (
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {property.city.name}
          </span>
        )}
      </nav>

      {/* BADGES & METADADOS */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-indigo-600 text-white font-bold text-xs uppercase tracking-wide">
          {transactionLabel}
        </Badge>

        <Badge variant="secondary" className="font-semibold text-xs text-slate-700 dark:text-slate-200">
          {typeLabel}
        </Badge>

        <span className="text-xs font-mono text-slate-400 ml-1">
          Cód: {property.externalId}
        </span>
      </div>

      {/* TÍTULO PRINCIPAL DO ANÚNCIO (H1) */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
        {property.title}
      </h1>

      {/* ENDEREÇO E LOCALIZAÇÃO RESUMIDA */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            {displayAddress} {cityState ? ` • ${cityState}` : ""}
          </span>
        </div>

        {property.publishedAt && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              Publicado em {new Date(property.publishedAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
