"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { MapViewProps } from "./types";
import { Loader2 } from "lucide-react";

/**
 * Carregamento dinâmico do Leaflet com SSR desabilitado
 * para evitar erros de referência a window/document
 */
const DynamicLeafletMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Inicializando mapa imobiliário...
        </span>
      </div>
    ),
  }
);

/**
 * Abstração de Componente de Mapa conforme Seção 4 do MASTER_PLAN.md.
 * Isola o fornecedor atual (Leaflet) permitindo alternar para Mapbox ou outros
 * no futuro sem alterar o SearchMap ou a arquitetura de páginas.
 */
export function MapProvider(props: MapViewProps) {
  return <DynamicLeafletMap {...props} />;
}
