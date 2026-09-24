"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, ShieldCheck, Plus, Minus, Navigation, ExternalLink } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface PropertyDetailMapProps {
  latitude?: number | null;
  longitude?: number | null;
  addressVisible: boolean;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

// Coordenadas centrais conhecidas para cidades e bairros comuns
const KNOWN_COORDS: Record<string, [number, number]> = {
  // Pelotas e Bairros
  "areal": [-31.7450, -52.3180],
  "laranjal": [-31.7760, -52.2280],
  "centro": [-31.7690, -52.3420],
  "três vendas": [-31.7280, -52.3450],
  "tres vendas": [-31.7280, -52.3450],
  "fragata": [-31.7580, -52.3850],
  "são gonçalo": [-31.7920, -52.3250],
  "sao goncalo": [-31.7920, -52.3250],
  "porto": [-31.7820, -52.3380],
  "recanto de portugal": [-31.7680, -52.2580],
  "colônia palma": [-31.1320, -52.4061],
  "pelotas": [-31.7654, -52.3376],
  "canguçu": [-31.3950, -52.6780],
  "cangucu": [-31.3950, -52.6780],
  "rio grande": [-32.0350, -52.0980],

  // Manaus e Bairros
  "ponta negra": [-3.0560, -60.1030],
  "novo aleixo": [-3.0420, -59.9670],
  "adrianópolis": [-3.1090, -60.0120],
  "adrianopolis": [-3.1090, -60.0120],
  "vieiralves": [-3.1020, -60.0210],
  "parque dez": [-3.0850, -60.0150],
  "dom pedro": [-3.0980, -60.0450],
  "distrito industrial": [-3.1134, -59.9452],
  "manaus": [-3.1190, -60.0210],

  // Capitais gerais
  "porto alegre": [-30.0346, -51.2177],
  "são paulo": [-23.5505, -46.6333],
  "rio de janeiro": [-22.9068, -43.1729],
  "curitiba": [-25.4284, -49.2733],
  "florianópolis": [-27.5954, -48.5480],
};

function resolveCoordinates(
  lat?: number | null,
  lng?: number | null,
  neighborhood?: string | null,
  city?: string | null,
  state?: string | null
): [number, number] | null {
  if (lat && lng && Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001) {
    return [lat, lng];
  }

  // Tenta por bairro normalizado
  if (neighborhood) {
    const key = neighborhood.trim().toLowerCase();
    if (KNOWN_COORDS[key]) return KNOWN_COORDS[key];
  }

  // Tenta por cidade
  if (city) {
    const key = city.trim().toLowerCase();
    if (KNOWN_COORDS[key]) return KNOWN_COORDS[key];
  }

  return null;
}

export function PropertyDetailMap({
  latitude,
  longitude,
  addressVisible,
  street,
  number,
  neighborhood,
  city,
  state,
}: PropertyDetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const coords = resolveCoordinates(latitude, longitude, neighborhood, city, state);
  const isExactLocation = Boolean(
    addressVisible && street && number && number !== "0" && number !== "0000"
  );

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current || !coords) return;

      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default || leafletModule;

        if (!isMounted || !mapContainerRef.current) return;

        const zoomLevel = isExactLocation ? 16 : 14;

        const map = L.map(mapContainerRef.current, {
          center: coords,
          zoom: zoomLevel,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
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
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            subdomains: "abc",
          }).addTo(map);
        });

        // Garante que o Leaflet preencha 100% da largura/altura do container
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {}
        }, 150);
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {}
        }, 600);

        if (isExactLocation) {
          // ==========================================
          // 1. MODO PONTUAL (Localização Exata)
          // ==========================================
          const pinIcon = L.divIcon({
            className: "uppa-exact-pin",
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
                <div style="width: 44px; height: 44px; border-radius: 18px; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4); border: 2.5px solid white;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div style="position: absolute; bottom: -5px; width: 10px; height: 10px; background: #4f46e5; transform: rotate(45deg); border-right: 2px solid white; border-bottom: 2px solid white;"></div>
              </div>
            `,
            iconSize: [44, 52],
            iconAnchor: [22, 52],
          });

          const marker = L.marker(coords, { icon: pinIcon }).addTo(map);

          const fullAddress = `${street}, ${number}${neighborhood ? ` - ${neighborhood}` : ""}, ${city || ""}${state ? ` - ${state}` : ""}`;
          marker.bindPopup(`
            <div style="font-family: inherit; padding: 4px; min-width: 180px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.5px; display: block;">Localização Exata</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-top: 2px;">${street}, ${number}</span>
              <span style="font-size: 11px; color: #64748b; display: block; margin-top: 1px;">${neighborhood || ""}${city ? ` • ${city}` : ""}${state ? ` - ${state}` : ""}</span>
            </div>
          `);
        } else {
          // ==========================================
          // 2. MODO REGIÃO / BAIRRO (Localização Aproximada)
          // ==========================================
          L.circle(coords, {
            radius: 550,
            color: "#4f46e5",
            fillColor: "#6366f1",
            fillOpacity: 0.18,
            weight: 2,
            dashArray: "6, 6",
          }).addTo(map);

          const radarIcon = L.divIcon({
            className: "uppa-radar-pin",
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
                <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(99, 102, 241, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; width: 18px; height: 18px; border-radius: 9999px; background: #4f46e5; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.5);"></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker(coords, { icon: radarIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: inherit; padding: 4px; min-width: 180px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.5px; display: block;">Localização por Região</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-top: 2px;">Região do ${neighborhood || city || "Bairro"}</span>
              <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">Por segurança e privacidade, o número exato é informado pelo corretor no agendamento da visita.</span>
            </div>
          `);
        }

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error("Erro ao carregar mapa do imóvel:", err);
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
  }, [coords, isExactLocation, street, number, neighborhood, city, state]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && coords) {
      mapInstanceRef.current.setView(coords, isExactLocation ? 16 : 14, { animate: true });
    }
  };

  const googleMapsUrl = coords
    ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${neighborhood || ""} ${city || ""} ${state || ""}`
      )}`;

  if (!coords) {
    return (
      <div className="relative aspect-[21/9] min-h-[260px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center p-6 space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
          <MapPin className="h-6 w-6" />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {neighborhood || city || "Localização Privilegiada"}
        </p>
        <p className="text-xs text-slate-500 max-w-sm">
          {city ? `${city} - ${state || "Brasil"}` : "Consulte a imobiliária anunciante para mais detalhes da região."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] md:aspect-[21/9] min-h-[300px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs bg-slate-100 dark:bg-slate-900">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Badge Flutuante no Topo-Esquerdo */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        {isExactLocation ? (
          <div className="inline-flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-md text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>Localização Exata</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-md text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Região Aproximada: {neighborhood || city || "Bairro"}</span>
          </div>
        )}
      </div>

      {/* Controles Flutuantes no Topo-Direito */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          className="h-8 w-8 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Aproximar zoom"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="h-8 w-8 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Afastar zoom"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleRecenter}
          className="h-8 w-8 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Recentralizar no imóvel"
        >
          <Navigation className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Faixa Informativa Inferior quando em Modo Região Aproximada */}
      {!isExactLocation && (
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] px-3.5 py-2 rounded-xl border border-slate-700/50 shadow-lg flex items-center justify-between gap-3">
            <span className="truncate">
              🔒 O endereço com número exato será disponibilizado pelo corretor no agendamento da visita.
            </span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto shrink-0 font-bold text-indigo-300 hover:text-indigo-200 underline inline-flex items-center gap-1"
            >
              <span>Abrir Mapa</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
