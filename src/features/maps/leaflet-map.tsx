"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  Loader2,
  Building2,
  ExternalLink,
  Plus,
  Minus,
  Navigation,
  Compass,
} from "lucide-react";
import Supercluster from "supercluster";
import { formatPricePin, getApproximateCoordinates } from "@/features/search/utils/price-formatter";
import type { SearchPropertyItem } from "@/features/search/types";
import type { MapViewport, MapViewProps } from "./types";
import "leaflet/dist/leaflet.css";

// Dynamic import of Leaflet on client-side
let L: typeof import("leaflet") | null = null;

export function LeafletMap({
  properties,
  hoveredPropertyId,
  onHoverProperty,
  onSearchThisArea,
  isSearchingArea = false,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const clusterIndexRef = useRef<Supercluster | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [showSearchBtn, setShowSearchBtn] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const lastSearchedBoundsRef = useRef<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Filtra e prepara imóveis com coordenadas válidas e mascaramento de privacidade
  const displayProperties = React.useMemo(() => {
    return properties
      .filter((p) => {
        if (!p.latitude || !p.longitude) return false;
        // Não utilizar 0,0 como localização válida (Requisito 11)
        if (Math.abs(p.latitude) < 0.0001 && Math.abs(p.longitude) < 0.0001) return false;
        return true;
      })
      .map((p) => {
        if (!p.addressVisible) {
          const approx = getApproximateCoordinates(p.id, p.latitude!, p.longitude!);
          return {
            ...p,
            latitude: approx.latitude,
            longitude: approx.longitude,
            street: null,
            number: null,
          };
        }
        return p;
      });
  }, [properties]);

  // Inicialização do Leaflet e do mapa
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const leafletModule = await import("leaflet");
        L = leafletModule.default || leafletModule;

        if (!isMounted || !mapContainerRef.current) return;

        // Ponto central inicial padrão: Manaus (ou média das propriedades)
        let initialCenter: [number, number] = [-3.119, -60.021];
        let initialZoom = 12;

        if (displayProperties.length > 0) {
          const avgLat =
            displayProperties.reduce((acc, p) => acc + (p.latitude || 0), 0) /
            displayProperties.length;
          const avgLng =
            displayProperties.reduce((acc, p) => acc + (p.longitude || 0), 0) /
            displayProperties.length;
          initialCenter = [avgLat, avgLng];
        }

        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          zoomControl: false,
          attributionControl: false,
        });

        // Camada de mapas CartoDB Voyager com chave oficial de autenticação
        const cartoKey =
          process.env.NEXT_PUBLIC_CARTO_API_KEY ||
          "cb1_3qa9_1_431f37359957466841c5e31b";

        const isLocalhost =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1");

        // No localhost usa o proxy para injetar o Referer autorizado; na Vercel vai direto à CDN
        const tileUrl = isLocalhost
          ? "/api/maps/tiles/{s}/{z}/{x}/{y}.png"
          : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`;

        const baseLayer = L.tileLayer(tileUrl, {
          maxZoom: 19,
          subdomains: "abcd",
        }).addTo(map);

        baseLayer.on("tileerror", () => {
          if (L) {
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              maxZoom: 19,
              subdomains: "abc",
            }).addTo(map);
          }
        });

        const markersGroup = L.layerGroup().addTo(map);
        markersLayerRef.current = markersGroup;
        mapInstanceRef.current = map;

        // Salva os limites iniciais
        const bounds = map.getBounds();
        lastSearchedBoundsRef.current = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };

        // Eventos de movimentação e zoom do usuário
        map.on("moveend", () => {
          if (!mapInstanceRef.current) return;
          const currentBounds = mapInstanceRef.current.getBounds();
          const last = lastSearchedBoundsRef.current;

          if (last) {
            const latDiff =
              Math.abs(currentBounds.getNorth() - last.north) +
              Math.abs(currentBounds.getSouth() - last.south);
            const lngDiff =
              Math.abs(currentBounds.getEast() - last.east) +
              Math.abs(currentBounds.getWest() - last.west);

            // Se o mapa se deslocou mais do que o limiar (~15% do viewport), mostra botão "Buscar nesta área"
            if (latDiff > 0.015 || lngDiff > 0.015) {
              setShowSearchBtn(true);
            }
          }
        });

        setIsMapReady(true);
      } catch (err: any) {
        console.error("Erro ao carregar Leaflet:", err);
        setMapError("Não foi possível carregar o mapa. Tente recarregar a página.");
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualiza os clusters no Supercluster
  useEffect(() => {
    if (displayProperties.length === 0) {
      clusterIndexRef.current = null;
      return;
    }

    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
    });

    const points = displayProperties.map((p) => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        propertyId: p.id,
        property: p,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude!, p.latitude!],
      },
    }));

    cluster.load(points);
    clusterIndexRef.current = cluster;
  }, [displayProperties]);

  // Renderiza os marcadores e clusters na camada do mapa
  const renderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !L) return;

    markersLayerRef.current.clearLayers();

    const map = mapInstanceRef.current;
    const bounds = map.getBounds();
    const zoom = Math.round(map.getZoom());

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    let features: any[] = [];
    if (clusterIndexRef.current) {
      try {
        features = clusterIndexRef.current.getClusters(bbox, zoom);
      } catch {
        features = [];
      }
    }

    features.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = feature.properties.cluster;

      if (isCluster) {
        const count = feature.properties.point_count;
        const clusterId = feature.properties.cluster_id;

        // Ícone de Cluster [18], [43], [127]
        const clusterIcon = L!.divIcon({
          className: "custom-cluster-icon",
          html: `
            <div class="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-600 text-white font-extrabold text-xs shadow-lg ring-4 ring-indigo-300/40 hover:scale-110 hover:bg-indigo-700 transition-transform cursor-pointer">
              ${count}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L!.marker([lat, lng], { icon: clusterIcon }).addTo(
          markersLayerRef.current
        );

        marker.on("click", () => {
          if (!clusterIndexRef.current) return;
          try {
            const expansionZoom = clusterIndexRef.current.getClusterExpansionZoom(clusterId);
            map.flyTo([lat, lng], Math.min(expansionZoom, 17), { duration: 0.5 });
          } catch {
            map.flyTo([lat, lng], zoom + 2, { duration: 0.5 });
          }
        });
      } else {
        const prop: SearchPropertyItem = feature.properties.property;
        const isHovered = hoveredPropertyId === prop.id;
        const isSelected = activePropertyId === prop.id;
        const priceLabel = formatPricePin(prop.price, prop.rentPrice, prop.transactionType);

        // Ícone de Preço do Imóvel
        const pinIcon = L!.divIcon({
          className: "custom-price-pin",
          html: `
            <div class="px-2.5 py-1 rounded-full font-bold text-[11px] shadow-md transition-all duration-150 cursor-pointer flex items-center gap-1 border ${
              isSelected || isHovered
                ? "bg-indigo-600 border-indigo-700 text-white scale-110 ring-4 ring-indigo-500/30 z-50"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-950 hover:text-white dark:hover:bg-white dark:hover:text-slate-950"
            }">
              <span>${priceLabel}</span>
            </div>
          `,
          iconSize: [80, 30],
          iconAnchor: [40, 15],
        });

        const marker = L!.marker([lat, lng], { icon: pinIcon, zIndexOffset: isSelected || isHovered ? 1000 : 0 }).addTo(
          markersLayerRef.current
        );

        marker.on("click", () => {
          setActivePropertyId(prop.id);
          onHoverProperty(prop.id);
        });

        marker.on("mouseover", () => {
          onHoverProperty(prop.id);
        });

        marker.on("mouseout", () => {
          onHoverProperty(null);
        });
      }
    });
  }, [hoveredPropertyId, activePropertyId, onHoverProperty]);

  // Atualiza os marcadores sempre que o mapa move ou as propriedades mudam
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    renderMarkers();

    const map = mapInstanceRef.current;
    map.on("move", renderMarkers);

    return () => {
      map.off("move", renderMarkers);
    };
  }, [isMapReady, renderMarkers]);

  // Executa busca nesta área
  const handleSearchThisAreaClick = () => {
    if (!mapInstanceRef.current || !onSearchThisArea) return;

    const bounds = mapInstanceRef.current.getBounds();
    const zoom = Math.round(mapInstanceRef.current.getZoom());

    const viewport: MapViewport = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom,
    };

    lastSearchedBoundsRef.current = {
      north: viewport.north,
      south: viewport.south,
      east: viewport.east,
      west: viewport.west,
    };

    setShowSearchBtn(false);
    onSearchThisArea(viewport);
  };

  // Zoom in / out controls
  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    const current = mapInstanceRef.current.getZoom();
    mapInstanceRef.current.setZoom(current + delta);
  };

  const activeProperty = properties.find((p) => p.id === activePropertyId);

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm flex flex-col">
      {/* MAPA CONTAINER */}
      <div ref={mapContainerRef} className="relative flex-1 w-full h-full z-0" />

      {/* OVERLAY DE CARREGAMENTO INICIAL DO MAPA */}
      {!isMapReady && !mapError && (
        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center z-30 space-y-2">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Carregando mapa interativo...
          </span>
        </div>
      )}

      {/* MENSAGEM DE ERRO DO MAPA */}
      {mapError && (
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-30">
          <Compass className="h-10 w-10 text-rose-500 mb-2 stroke-[1.5]" />
          <p className="text-xs font-bold text-slate-800 dark:text-white mb-2">{mapError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer hover:bg-indigo-700"
          >
            Recarregar
          </button>
        </div>
      )}

      {/* BOTÃO "BUSCAR NESTA ÁREA" (Requisito 5) */}
      {(showSearchBtn || isSearchingArea) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
          <button
            type="button"
            onClick={handleSearchThisAreaClick}
            disabled={isSearchingArea}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 font-bold text-xs shadow-xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-75"
          >
            {isSearchingArea ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 dark:text-indigo-600" />
                <span>Buscando imóveis na área...</span>
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-600" />
                <span>Buscar nesta área</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CONTROLES DE ZOOM */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => handleZoom(1)}
          className="h-8 w-8 rounded-lg bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
          title="Aumentar zoom"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          className="h-8 w-8 rounded-lg bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
          title="Diminuir zoom"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* MINI CARD DE PREVIEW AO CLICAR NO PINO (Requisito 6) */}
      {activeProperty && (
        <div className="absolute bottom-4 left-4 right-4 z-40 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="relative flex items-center gap-3 p-3 rounded-xl bg-white/98 dark:bg-slate-900/98 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActivePropertyId(null)}
              className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
            >
              ✕
            </button>

            <Link
              href={`/imovel/${activeProperty.slug}`}
              className="h-16 w-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 block"
            >
              {activeProperty.media?.[0]?.url ? (
                <img
                  src={activeProperty.media[0].url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-slate-400" />
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1 pr-4">
              <Link href={`/imovel/${activeProperty.slug}`} className="block group">
                <span className="text-xs font-black text-slate-900 dark:text-white block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {formatPricePin(
                    activeProperty.price,
                    activeProperty.rentPrice,
                    activeProperty.transactionType
                  )}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                  {activeProperty.title}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {activeProperty.city?.name}
                  {activeProperty.bedrooms ? ` • ${activeProperty.bedrooms} qtos` : ""}
                  {activeProperty.usableArea ? ` • ${activeProperty.usableArea}m²` : ""}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* AVISO SE NENHUM IMÓVEL POSSUI COORDENADAS */}
      {displayProperties.length === 0 && isMapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 z-10 pointer-events-none">
          <Navigation className="h-8 w-8 mb-2 opacity-50 stroke-[1.5]" />
          <span className="text-xs font-semibold">
            Nenhum imóvel com coordenadas válidas nesta região
          </span>
        </div>
      )}

      {/* BADGE POSTGIS GIST */}
      <div className="absolute bottom-2 right-3 z-20 text-[9px] font-mono text-slate-500/80 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200/50 dark:border-slate-800/50 shadow-xs pointer-events-none">
        PostGIS 4326 GiST
      </div>
    </div>
  );
}
