"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { MapPin, Navigation, Plus, Minus, Building2, ExternalLink } from "lucide-react";
import type { SearchPropertyItem } from "../types";

interface SearchMapProps {
  properties: SearchPropertyItem[];
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
}

export function SearchMap({
  properties,
  hoveredPropertyId,
  onHoverProperty,
}: SearchMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePinId, setActivePinId] = useState<string | null>(null);

  // Filtra apenas imóveis com coordenadas válidas
  const geolocatedProperties = useMemo(() => {
    return properties.filter((p) => p.latitude && p.longitude);
  }, [properties]);

  // Calcula os limites geográficos para normalizar as posições no canvas
  const bounds = useMemo(() => {
    if (geolocatedProperties.length === 0) {
      return { minLat: -30, maxLat: -5, minLng: -55, maxLng: -35 };
    }

    const lats = geolocatedProperties.map((p) => p.latitude!);
    const lngs = geolocatedProperties.map((p) => p.longitude!);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Padding para evitar que os pinos fiquem colados na borda
    const latPadding = Math.max(0.01, (maxLat - minLat) * 0.15);
    const lngPadding = Math.max(0.01, (maxLng - minLng) * 0.15);

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    };
  }, [geolocatedProperties]);

  // Converte coordenadas reais para % dentro do container
  const getCoordinatesPercent = (lat: number, lng: number) => {
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;

    // Latitude é invertida (maior latitude fica mais para o topo/norte)
    const topPercent = ((bounds.maxLat - lat) / latRange) * 100;
    const leftPercent = ((lng - bounds.minLng) / lngRange) * 100;

    return {
      top: `${Math.min(90, Math.max(10, topPercent))}%`,
      left: `${Math.min(90, Math.max(10, leftPercent))}%`,
    };
  };

  const formatShortPrice = (val?: number | null) => {
    if (!val) return "Consulte";
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${Math.round(val / 1000)}k`;
    return `R$ ${val}`;
  };

  const activeProperty = properties.find((p) => p.id === activePinId);

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm flex flex-col">
      {/* MAPA VISUAL COM GRID CARTOGRÁFICO */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#e5e9ec] dark:bg-[#1a222d] select-none">
        {/* Malha sutil de coordenadas */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10 [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:32px_32px]" />

        {/* Marcadores de Imóveis (Pins) */}
        {geolocatedProperties.map((prop) => {
          const pos = getCoordinatesPercent(prop.latitude!, prop.longitude!);
          const isSelected = hoveredPropertyId === prop.id || activePinId === prop.id;
          const isRent = prop.transactionType === "rent";
          const displayPrice = formatShortPrice(isRent ? prop.rentPrice : prop.price);

          return (
            <div
              key={prop.id}
              style={{ top: pos.top, left: pos.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                type="button"
                onMouseEnter={() => {
                  onHoverProperty(prop.id);
                  setActivePinId(prop.id);
                }}
                onMouseLeave={() => onHoverProperty(null)}
                onClick={() => setActivePinId(prop.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs shadow-md transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white scale-110 ring-4 ring-indigo-500/30 z-30"
                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900"
                }`}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{displayPrice}</span>
              </button>
            </div>
          );
        })}

        {/* Aviso se não houver coordenadas cadastradas */}
        {geolocatedProperties.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 z-10">
            <Navigation className="h-10 w-10 mb-2 opacity-50 stroke-[1.5]" />
            <span className="text-xs font-semibold">
              Coordenadas espaciais dos imóveis em carregamento
            </span>
          </div>
        )}

        {/* Card Flutuante de Preview ao Clicar / Passar o mouse no Pino */}
        {activeProperty && (
          <div className="absolute bottom-4 left-4 right-4 z-40 max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Link
              href={`/imovel/${activeProperty.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md"
            >
              <div className="h-14 w-18 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                {activeProperty.media?.[0]?.url ? (
                  <img
                    src={activeProperty.media[0].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-slate-400 m-auto mt-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                  {formatShortPrice(
                    activeProperty.transactionType === "rent"
                      ? activeProperty.rentPrice
                      : activeProperty.price
                  )}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                  {activeProperty.title}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {activeProperty.city?.name} • {activeProperty.bedrooms} qtos • {activeProperty.usableArea}m²
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* Controles de Zoom */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
            className="h-8 w-8 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
            title="Aumentar zoom"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="h-8 w-8 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
            title="Diminuir zoom"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* Tag do PostGIS */}
        <div className="absolute bottom-2 right-3 z-10 text-[9px] font-mono text-slate-400/80 bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.5 rounded backdrop-blur-xs">
          PostGIS WGS84
        </div>
      </div>
    </div>
  );
}
