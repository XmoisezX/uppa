import React from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
import type { PropertyWithDetails } from "@/types/property";

const PropertyDetailMap = dynamic(
  () => import("./PropertyDetailMap").then((mod) => mod.PropertyDetailMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative aspect-[16/9] md:aspect-[21/9] min-h-[300px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-xs font-medium text-slate-400">Carregando mapa...</span>
      </div>
    ),
  }
);

interface PropertyLocationViewProps {
  property: PropertyWithDetails;
}

export function PropertyLocationView({ property }: PropertyLocationViewProps) {
  const isAddressVisible = property.addressVisible;
  const hasCoordinates = Boolean(property.latitude && property.longitude);

  const googleMapsUrl = isAddressVisible && hasCoordinates
    ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
    : isAddressVisible
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${property.street || ""} ${property.number || ""} ${property.neighborhood?.name || ""} ${property.city?.name || ""} ${property.state?.code || ""}`
      )}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${property.neighborhood?.name ? `${property.neighborhood.name}, ` : ""}${property.city?.name || ""} - ${property.state?.code || ""}`
      )}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Localização e Entorno
          </h2>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <span>{isAddressVisible ? "Abrir no Google Maps" : "Ver região no Google Maps"}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* CARD DE ENDEREÇO & PRIVACIDADE */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
        {isAddressVisible ? (
          <div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
              {property.street}
              {property.number ? `, ${property.number}` : ""}
              {property.complement ? ` - ${property.complement}` : ""}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {property.neighborhood?.name ? `${property.neighborhood.name} • ` : ""}
              {property.city?.name} - {property.state?.code}
              {property.zipcode ? ` • CEP: ${property.zipcode}` : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Localização aproximada: {property.neighborhood?.name ? `${property.neighborhood.name}, ` : ""}
                {property.city?.name} - {property.state?.code}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Por motivos de segurança e privacidade do proprietário, o endereço exato com número será informado pelo corretor no agendamento da visita.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MAPA INTERATIVO REAL DO IMÓVEL (PONTUAL OU REGIÃO/BAIRRO) */}
      <PropertyDetailMap
        latitude={property.latitude}
        longitude={property.longitude}
        addressVisible={Boolean(property.addressVisible)}
        street={property.street}
        number={property.number}
        neighborhood={property.neighborhood?.name}
        city={property.city?.name}
        state={property.state?.code}
      />
    </div>
  );
}
