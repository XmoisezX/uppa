"use client";

import React from "react";
import { MapProvider } from "@/features/maps";
import type { MapViewport } from "@/features/maps/types";
import type { SearchPropertyItem } from "../types";

export interface SearchMapProps {
  properties: SearchPropertyItem[];
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
  onSearchThisArea?: (viewport: MapViewport) => void;
  isSearchingArea?: boolean;
}

/**
 * Componente principal de Mapa de Busca da UPPA.
 * Utiliza a camada de abstração MapProvider (Leaflet + CartoDB)
 * com suporte a viewport, clusters, pins de preço e botão "Buscar nesta área".
 */
export function SearchMap({
  properties,
  hoveredPropertyId,
  onHoverProperty,
  onSearchThisArea,
  isSearchingArea,
}: SearchMapProps) {
  return (
    <div className="h-full w-full">
      <MapProvider
        properties={properties}
        hoveredPropertyId={hoveredPropertyId}
        onHoverProperty={onHoverProperty}
        onSearchThisArea={onSearchThisArea}
        isSearchingArea={isSearchingArea}
      />
    </div>
  );
}
