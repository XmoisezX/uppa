"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Building2,
  Home,
  ShieldCheck,
  LandPlot,
  Sparkles,
  Crown,
  Store,
  Trees,
  ChevronDown,
  Check,
} from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { LocationAutocomplete } from "@/features/search/components/LocationAutocomplete";
import type { ActiveCitySummary } from "../services";

const PROPERTY_TYPE_OPTIONS = [
  {
    value: "",
    label: "Todos os imóveis",
    description: "Casas, apartamentos, terrenos e mais",
    icon: Building,
  },
  {
    value: "apartment",
    label: "Apartamento",
    description: "Apartamentos padrão, duplex e flats",
    icon: Building2,
  },
  {
    value: "house",
    label: "Casa",
    description: "Casas de rua, térreas e assobradadas",
    icon: Home,
  },
  {
    value: "condo_house",
    label: "Casa em Condomínio",
    description: "Villas e casas fechadas com segurança",
    icon: ShieldCheck,
  },
  {
    value: "land",
    label: "Terreno / Lote",
    description: "Lotes residenciais e comerciais",
    icon: LandPlot,
  },
  {
    value: "studio",
    label: "Studio / Kitnet",
    description: "Ambientes integrados e compactos",
    icon: Sparkles,
  },
  {
    value: "penthouse",
    label: "Cobertura",
    description: "Coberturas lineares e duplex",
    icon: Crown,
  },
  {
    value: "commercial",
    label: "Comercial",
    description: "Salas, prédios comerciais e lojas",
    icon: Store,
  },
  {
    value: "farm",
    label: "Chácara / Sítio",
    description: "Propriedades rurais, sítios e fazendas",
    icon: Trees,
  },
];

interface PropertySearchHeroProps {
  suggestedCities?: ActiveCitySummary[];
  backgroundImage?: string | null;
  headline?: string;
  subheadline?: string;
}

export function PropertySearchHero({
  suggestedCities = [],
  backgroundImage,
  headline,
  subheadline,
}: PropertySearchHeroProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"comprar" | "alugar" | "lancamentos">("comprar");
  const [propertyType, setPropertyType] = useState<string>("");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>("");
  const [selectedCityName, setSelectedCityName] = useState<string>("");
  const [selectedNeighborhoodSlug, setSelectedNeighborhoodSlug] = useState<string>("");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTypeOption =
    PROPERTY_TYPE_OPTIONS.find((t) => t.value === propertyType) ||
    PROPERTY_TYPE_OPTIONS[0];
  const SelectedTypeIcon = selectedTypeOption.icon;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (activeTab === "lancamentos") {
      params.set("propertyType", propertyType || "condo_house");
      if (selectedCitySlug) params.set("city", selectedCitySlug);
      else if (selectedCityName.trim()) params.set("city", selectedCityName.trim().toLowerCase());
      if (selectedNeighborhoodSlug) params.set("neighborhood", selectedNeighborhoodSlug);
      router.push(`/comprar?${params.toString()}`);
      return;
    }

    if (propertyType) {
      params.set("propertyType", propertyType);
    }

    if (selectedCitySlug) {
      params.set("city", selectedCitySlug);
    } else if (selectedCityName.trim()) {
      const cleanCity = selectedCityName.replace(/\s*\([A-Za-z]{2}\)\s*$/i, "").trim().toLowerCase();
      if (cleanCity) params.set("city", cleanCity);
    }

    if (selectedNeighborhoodSlug) {
      params.set("neighborhood", selectedNeighborhoodSlug);
    }

    const queryString = params.toString();
    const destination = queryString
      ? `/${activeTab}?${queryString}`
      : `/${activeTab}`;

    router.push(destination);
  };

  return (
    <section className="relative w-full min-h-[580px] sm:min-h-[620px] lg:min-h-[660px] flex items-center overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
      {/* 1. IMAGEM DE FUNDO (Atrás do Filtro, Natural e Nítida sem blur) */}
      {backgroundImage ? (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt="Portal Imobiliário UPPA"
            className="w-full h-full object-cover object-center"
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      )}

      {/* 2. CONTEÚDO SOBRE A IMAGEM: Card Flutuante Estilo Zap com Sombra Suave Realista */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="w-full max-w-[480px]">
          {/* Card Flutuante com Sombra Suave e Profunda (Parece estar na frente da imagem) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.24),0_12px_28px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.05] dark:ring-white/[0.08] transition-all">
            {/* Título Principal Integrado Dentro do Card */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white leading-tight mb-5 tracking-tight">
              {headline || "Encontre o imóvel ideal para você."}{" "}
              <span className="font-normal text-slate-600 dark:text-slate-300">
                {subheadline || "Só na UPPA você encontra as melhores opções."}
              </span>
            </h1>

            {/* Abas Horizontais com Indicador Inferior (Estilo Zap) */}
            <div className="flex items-center gap-6 border-b border-slate-100 dark:border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("comprar")}
                className={`pb-3 text-sm sm:text-base font-bold transition-all relative cursor-pointer ${
                  activeTab === "comprar"
                    ? "text-indigo-600 dark:text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:after:bg-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("alugar")}
                className={`pb-3 text-sm sm:text-base font-bold transition-all relative cursor-pointer ${
                  activeTab === "alugar"
                    ? "text-indigo-600 dark:text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:after:bg-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Alugar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("lancamentos")}
                className={`pb-3 text-sm sm:text-base font-bold transition-all relative cursor-pointer ${
                  activeTab === "lancamentos"
                    ? "text-indigo-600 dark:text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:after:bg-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Imóvel novo
              </button>
            </div>

            {/* Formulário Vertical Limpo */}
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Campo 1: Onde deseja morar? */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 px-0.5">
                  Onde deseja morar?
                </label>
                <LocationAutocomplete
                  placeholder="Busque uma localização"
                  suggestedCities={suggestedCities}
                  cityName={selectedCityName}
                  initialCity={selectedCitySlug}
                  onLocationChange={(loc) => {
                    setSelectedCitySlug(loc.city || "");
                    setSelectedCityName(loc.displayText || loc.city || "");
                    setSelectedNeighborhoodSlug(loc.neighborhood || "");
                  }}
                  onInputChange={(val) => {
                    setSelectedCityName(val);
                    if (!val) {
                      setSelectedCitySlug("");
                      setSelectedNeighborhoodSlug("");
                    }
                  }}
                />
              </div>

              {/* Campo 2: Tipo de imóvel */}
              <div ref={typeDropdownRef} className="relative">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 px-0.5">
                  Tipo de imóvel
                </label>
                <div
                  onClick={() => setIsTypeOpen((prev) => !prev)}
                  className={`relative flex items-center w-full min-h-[46px] rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-900 select-none ${
                    isTypeOpen
                      ? "border-slate-400 dark:border-slate-600 shadow-sm ring-2 ring-slate-100 dark:ring-slate-800"
                      : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                  }`}
                >
                  <div className="ml-2.5 mr-2 flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shrink-0">
                    <SelectedTypeIcon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {selectedTypeOption.label}
                  </span>
                  <ChevronDown
                    className={`mr-3.5 h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isTypeOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                    }`}
                  />
                </div>

                {/* Dropdown Menu com Categorias */}
                {isTypeOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="py-2">
                      <div className="px-3.5 py-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                        Categorias
                      </div>
                      {PROPERTY_TYPE_OPTIONS.map((item) => {
                        const checked = propertyType === item.value;
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={item.value}
                            onClick={() => {
                              setPropertyType(item.value);
                              setIsTypeOpen(false);
                            }}
                            className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors select-none group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ItemIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
                              <div className="flex flex-col truncate">
                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {item.label}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                  {item.description}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                checked
                                  ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900"
                                  : "border-slate-300 dark:border-slate-600 group-hover:border-slate-400"
                              }`}
                            >
                              {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Buscar (Estilo Zap Pill Roxo/Índigo com Efeito Interativo) */}
              <div className="pt-2">
                <InteractiveHoverButton
                  type="submit"
                  text="Buscar"
                  variant="solid"
                  className="w-full h-12 min-h-[48px] text-base cursor-pointer"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
