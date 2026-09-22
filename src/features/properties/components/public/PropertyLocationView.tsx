import React from "react";
import { MapPin, Navigation, ExternalLink, ShieldCheck } from "lucide-react";
import type { PropertyWithDetails } from "@/types/property";

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

      {/* CONTAINER VISUAL DE MAPA COM PONTO POSTGIS */}
      <div className="relative aspect-[21/9] min-h-[220px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 flex flex-col items-center justify-center text-center p-6 shadow-inner">
        {/* Fundo simulado de malha cartográfica */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5 [background-image:radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-bounce duration-1000 mb-2">
            <MapPin className="h-6 w-6" />
          </div>

          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {property.neighborhood?.name || property.city?.name || "Localização Privilegiada"}
          </span>

          <span className="text-xs text-slate-500 max-w-sm mt-0.5">
            {property.city?.name} - {property.state?.code || "Brasil"}
          </span>

          {hasCoordinates && isAddressVisible && (
            <span className="text-[10px] font-mono text-slate-400 mt-2 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded">
              WGS84: {property.latitude?.toFixed(5)}, {property.longitude?.toFixed(5)}
            </span>
          )}

          {!isAddressVisible && (
            <span className="text-[11px] font-medium text-slate-500 mt-2 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-800">
              Região do anúncio: {property.neighborhood?.name || property.city?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
