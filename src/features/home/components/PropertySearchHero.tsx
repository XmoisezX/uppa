"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
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
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/features/search/components/LocationAutocomplete";
import type { ActiveCitySummary } from "../services";

const PROPERTY_TYPE_OPTIONS = [
  {
    value: "",
    label: "Todos os tipos",
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

  const topCities = suggestedCities.slice(0, 5);

  return (
    <section
      className={`relative border-b border-slate-200/80 pt-10 pb-12 sm:pt-16 sm:pb-20 dark:border-slate-800 overflow-hidden ${
        backgroundImage
          ? "bg-slate-950"
          : "bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950"
      }`}
    >
      {/* Imagem de Fundo (Atrás do Filtro) com Scrim Elegante */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt="Portal Imobiliário UPPA"
            className="w-full h-full object-cover object-center scale-102 transform animate-in fade-in duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/90 backdrop-blur-[0.5px]" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge do Portal Nacional */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-4 border transition-colors ${
            backgroundImage
              ? "bg-white/10 text-white border-white/20 backdrop-blur-md"
              : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>O Portal Imobiliário Nacional da sua Próxima Conquista</span>
        </div>

        {/* Headline Protagonista */}
        <h1
          className={`text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl ${
            backgroundImage
              ? "text-white drop-shadow-md"
              : "text-slate-950 dark:text-white"
          }`}
        >
          {headline || "Encontre o imóvel ideal para comprar ou alugar"}
        </h1>
        <p
          className={`mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            backgroundImage
              ? "text-slate-200 drop-shadow-sm"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {subheadline ||
            "Milhares de casas, apartamentos, terrenos e salas comerciais com informações 100% transparentes e contato direto com imobiliárias parceiras."}
        </p>

        {/* Card de Busca Principal */}
        <div className="mt-8 mx-auto max-w-4xl text-left">
          {/* Abas de Operação (Estilo Pills da Página de Compra) */}
          <div
            className={`inline-flex rounded-xl p-1 border mb-2 ${
              backgroundImage
                ? "bg-slate-900/80 backdrop-blur-md border-white/20"
                : "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab("comprar")}
              className={`rounded-lg px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "comprar"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white"
                  : backgroundImage
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Comprar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("alugar")}
              className={`rounded-lg px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "alugar"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white"
                  : backgroundImage
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Alugar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lancamentos")}
              className={`rounded-lg px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "lancamentos"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white"
                  : backgroundImage
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Lançamentos
            </button>
          </div>

          {/* Container do Formulário de Busca */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
            >
              {/* Seletor de Tipo de Imóvel com Menu Customizado */}
              <div ref={typeDropdownRef} className="sm:col-span-4 relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 px-1">
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

                {/* DROPDOWN MENU COM CATEGORIAS (Estilo idêntico ao LocationAutocomplete) */}
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

                            {/* CHECKBOX */}
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

              {/* Input de Localização com Autocomplete idêntico ao da Página de Compra */}
              <div className="sm:col-span-5 relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 px-1">
                  Onde você procura?
                </label>
                <LocationAutocomplete
                  placeholder="Digite cidade, bairro ou estado..."
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

              {/* Botão de Busca */}
              <div className="sm:col-span-3 sm:self-end">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full min-h-[46px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Search className="h-4 w-4 mr-2 stroke-[2.5]" />
                  Buscar Imóveis
                </Button>
              </div>
            </form>

            {/* Chips Rápidos de Cidades Reais */}
            {topCities.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 px-1 text-xs">
                <span className="font-semibold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider mr-1">
                  Cidades ativas:
                </span>
                {topCities.map((city) => {
                  const isSelected =
                    selectedCitySlug === city.slug ||
                    selectedCityName.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCitySlug("");
                          setSelectedCityName("");
                        } else {
                          setSelectedCitySlug(city.slug);
                          setSelectedCityName(city.name);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-white dark:text-slate-900 dark:border-white"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <MapPin className="h-3 w-3 text-rose-500" />
                      <span>{city.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        ({city.stateCode})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

