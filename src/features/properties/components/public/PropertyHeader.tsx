import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Calendar, Building2 } from "lucide-react";
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
  const transactionLabel =
    property.transactionType === "rent"
      ? "Locação"
      : property.transactionType === "sale_or_rent"
      ? "Venda e Locação"
      : "Venda";

  // Respeito à visibilidade de endereço (Seção 44 do MASTER_PLAN)
  const displayAddress = property.addressVisible && property.street
    ? `${property.street}${property.number ? `, ${property.number}` : ""}${property.neighborhood?.name ? ` - ${property.neighborhood.name}` : ""}`
    : property.neighborhood?.name || "Localização privilegiada";

  const cityState = property.city?.name
    ? `${property.city.name}${property.state?.code ? ` - ${property.state.code}` : ""}`
    : "";

  return (
    <div className="space-y-4">
      {/* BREADCRUMBS com links funcionais */}
      <nav
        aria-label="Localização do imóvel"
        className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto scrollbar-none py-1"
      >
        <Link href="/" className="hover:text-indigo-600 transition-colors whitespace-nowrap">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />

        <Link
          href={property.transactionType === "rent" ? "/alugar" : "/comprar"}
          className="hover:text-indigo-600 transition-colors whitespace-nowrap"
        >
          {property.transactionType === "rent" ? "Alugar" : "Comprar"}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />

        {property.state && (
          <>
            <Link
              href={`${property.transactionType === "rent" ? "/alugar" : "/comprar"}?state=${property.state.code?.toLowerCase()}`}
              className="hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              {property.state.name || property.state.code}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
          </>
        )}

        {property.city && (
          <>
            <Link
              href={`${property.transactionType === "rent" ? "/alugar" : "/comprar"}?state=${property.state?.code?.toLowerCase()}&city=${property.city.slug || property.city.name?.toLowerCase()}`}
              className="hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              {property.city.name}
            </Link>
          </>
        )}

        {property.neighborhood && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {property.neighborhood.name}
            </span>
          </>
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

      {/* IDENTIFICAÇÃO DO ANUNCIANTE (UPPA como Portal Nacional) */}
      {property.agency && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>Anunciado por:</span>
          <Link
            href={`/imobiliaria/${property.agency.slug}`}
            className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline-offset-2 hover:underline"
          >
            {property.agency.name}
          </Link>
          {property.agency.creci && (
            <span className="font-mono text-slate-400 text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              CRECI {property.agency.creci}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
