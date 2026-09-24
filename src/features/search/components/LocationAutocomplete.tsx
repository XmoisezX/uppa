"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MapPin, Building2, X, Check, Loader2 } from "lucide-react";

export interface AutocompleteCity {
  id: string;
  name: string;
  slug: string;
  stateCode: string;
  stateName?: string;
  count?: number;
  type: "city";
}

export interface AutocompleteNeighborhood {
  id: string;
  name: string;
  slug: string;
  cityId: string;
  cityName: string;
  citySlug: string;
  stateCode: string;
  count?: number;
  type: "neighborhood";
}

export interface SuggestedCityItem {
  id: string;
  name: string;
  slug: string;
  stateCode: string;
  propertyCount?: number;
}

interface LocationAutocompleteProps {
  initialCity?: string;
  initialNeighborhood?: string;
  cityName?: string;
  neighborhoodName?: string;
  placeholder?: string;
  className?: string;
  suggestedCities?: SuggestedCityItem[];
  onLocationChange?: (location: {
    city?: string;
    neighborhood?: string;
    displayText?: string;
  }) => void;
  onInputChange?: (value: string) => void;
}

export function LocationAutocomplete({
  initialCity,
  initialNeighborhood,
  cityName,
  neighborhoodName,
  placeholder = "Digite cidade ou bairro...",
  className = "",
  suggestedCities,
  onLocationChange,
  onInputChange,
}: LocationAutocompleteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Valor textual exibido no input
  const getInitialDisplayText = () => {
    if (neighborhoodName && cityName) return `${neighborhoodName}, ${cityName}`;
    if (neighborhoodName) return neighborhoodName;
    if (cityName) return cityName;
    if (initialNeighborhood && initialCity) return `${initialNeighborhood}, ${initialCity}`;
    if (initialNeighborhood) return initialNeighborhood;
    if (initialCity) return initialCity;
    return "";
  };

  const [inputValue, setInputValue] = useState(getInitialDisplayText());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const mapSuggested = useCallback((items?: SuggestedCityItem[]): AutocompleteCity[] => {
    if (!items || items.length === 0) return [];
    return items.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      stateCode: c.stateCode,
      count: c.propertyCount,
      type: "city" as const,
    }));
  }, []);

  const [cities, setCities] = useState<AutocompleteCity[]>(() => mapSuggested(suggestedCities));
  const [neighborhoods, setNeighborhoods] = useState<AutocompleteNeighborhood[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza texto quando as props mudarem
  useEffect(() => {
    setInputValue(getInitialDisplayText());
  }, [initialCity, initialNeighborhood, cityName, neighborhoodName]);

  // Atualiza lista quando suggestedCities mudar
  useEffect(() => {
    if (suggestedCities && suggestedCities.length > 0 && !inputValue.trim()) {
      setCities(mapSuggested(suggestedCities));
    }
  }, [suggestedCities, mapSuggested, inputValue]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca dados de cidades e bairros no endpoint
  const fetchLocations = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/locations/autocomplete?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const apiCities = (data.cities || []).map((ac: any) => {
          const match = suggestedCities?.find(
            (sc) => sc.id === ac.id || sc.slug === ac.slug || sc.name.toLowerCase() === ac.name.toLowerCase()
          );
          return {
            ...ac,
            count: match?.propertyCount ?? ac.count,
          };
        });

        if (!query.trim() && suggestedCities && suggestedCities.length > 0) {
          setCities(mapSuggested(suggestedCities));
        } else if (apiCities.length > 0) {
          setCities(apiCities);
        }
        setNeighborhoods(data.neighborhoods || []);
      }
    } catch (err) {
      console.error("[LocationAutocomplete] Erro ao buscar localizações:", err);
    } finally {
      setIsLoading(false);
    }
  }, [suggestedCities, mapSuggested]);

  // Dispara busca com debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    onInputChange?.(value);

    // Se temos suggestedCities, filtra instantaneamente em memória
    if (suggestedCities && suggestedCities.length > 0) {
      const term = value.trim().toLowerCase();
      if (!term) {
        setCities(mapSuggested(suggestedCities));
        setNeighborhoods([]);
      } else {
        const filtered = suggestedCities.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.slug.toLowerCase().includes(term) ||
            c.stateCode.toLowerCase().includes(term)
        );
        setCities(mapSuggested(filtered));
      }
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchLocations(value);
    }, 180);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!inputValue.trim() && suggestedCities && suggestedCities.length > 0) {
      setCities(mapSuggested(suggestedCities));
      setNeighborhoods([]);
      return;
    }
    if (cities.length === 0 && neighborhoods.length === 0) {
      fetchLocations(inputValue);
    }
  };

  // Aplica filtro e atualiza URL ou callback
  const applyLocation = (citySlug?: string, neighborhoodSlug?: string, displayText?: string) => {
    if (displayText !== undefined) {
      setInputValue(displayText);
    }
    setIsOpen(false);

    if (onLocationChange) {
      onLocationChange({ city: citySlug, neighborhood: neighborhoodSlug, displayText });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (citySlug) {
      params.set("city", citySlug);
    } else {
      params.delete("city");
    }

    if (neighborhoodSlug) {
      params.set("neighborhood", neighborhoodSlug);
    } else {
      params.delete("neighborhood");
    }

    params.delete("state"); // limpa estado genérico quando seleciona cidade/bairro específica

    router.push(`${pathname}?${params.toString()}`);
  };

  // Seleciona Cidade
  const handleSelectCity = (city: AutocompleteCity) => {
    const isCurrentlySelected =
      (initialCity === city.slug || initialCity === city.id || cityName === city.name) &&
      !initialNeighborhood;

    if (isCurrentlySelected) {
      // Se já estava selecionada, desmarca
      applyLocation(undefined, undefined, "");
    } else {
      applyLocation(city.slug, undefined, city.name);
    }
  };

  // Seleciona Bairro
  const handleSelectNeighborhood = (neighborhood: AutocompleteNeighborhood) => {
    const isCurrentlySelected =
      (initialNeighborhood === neighborhood.slug ||
        initialNeighborhood === neighborhood.id ||
        neighborhoodName === neighborhood.name);

    if (isCurrentlySelected) {
      // Mantém apenas a cidade
      applyLocation(neighborhood.citySlug, undefined, neighborhood.cityName);
    } else {
      applyLocation(
        neighborhood.citySlug,
        neighborhood.slug,
        `${neighborhood.name}, ${neighborhood.cityName}`
      );
    }
  };

  // Limpa localização
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    onInputChange?.("");
    applyLocation(undefined, undefined, "");
    inputRef.current?.focus();
    if (suggestedCities && suggestedCities.length > 0) {
      setCities(mapSuggested(suggestedCities));
      setNeighborhoods([]);
    } else {
      fetchLocations("");
    }
    setIsOpen(true);
  };

  // Verifica seleções ativas para renderizar checkboxes
  const isCitySelected = (c: AutocompleteCity) => {
    return (
      (initialCity === c.slug ||
        initialCity === c.id ||
        cityName?.toLowerCase() === c.name.toLowerCase() ||
        inputValue.trim().toLowerCase() === c.name.toLowerCase()) &&
      !initialNeighborhood &&
      !neighborhoodName
    );
  };

  const isNeighborhoodSelected = (n: AutocompleteNeighborhood) => {
    return (
      initialNeighborhood === n.slug ||
      initialNeighborhood === n.id ||
      neighborhoodName?.toLowerCase() === n.name.toLowerCase()
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* INPUT CONTAINER (Estilo Chaves na Mão) */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`relative flex items-center w-full min-h-[46px] rounded-xl border transition-all cursor-text bg-white dark:bg-slate-900 ${
          isOpen
            ? "border-slate-400 dark:border-slate-600 shadow-sm ring-2 ring-slate-100 dark:ring-slate-800"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        }`}
      >
        {/* BADGE ROSA COM ÍCONE DE MAP PIN */}
        <div className="ml-2.5 mr-2 flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400 shrink-0">
          <MapPin className="h-4 w-4" />
        </div>

        {/* INPUT TEXTUAL */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-2.5 pr-2 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
        />

        {/* BOTÃO LIMPAR (X) OU SPINNER */}
        <div className="mr-3 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Limpar localização"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* DROPDOWN MENU COM CIDADES E EM SEQUÊNCIA OS BAIRROS */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 zoom-in-95 duration-150">
          {cities.length === 0 && neighborhoods.length === 0 && !isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Nenhuma cidade ou bairro encontrado.
            </div>
          ) : (
            <>
              {/* 1. SEÇÃO CIDADES */}
              {cities.length > 0 && (
                <div className="py-2">
                  <div className="px-3.5 py-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    Cidades
                  </div>
                  {cities.map((city) => {
                    const checked = isCitySelected(city);
                    return (
                      <div
                        key={city.id}
                        onClick={() => handleSelectCity(city)}
                        className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors select-none group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="h-4 w-4 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {city.name}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {city.count !== undefined
                                ? `${city.name} (${city.stateCode}) — ${city.count} imóveis`
                                : `Cidade · ${city.stateCode}`}
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
              )}

              {/* 2. SEÇÃO BAIRROS (EM SEQUÊNCIA) */}
              {neighborhoods.length > 0 && (
                <div className="py-2">
                  <div className="px-3.5 py-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    Bairros
                  </div>
                  {neighborhoods.map((bairro) => {
                    const checked = isNeighborhoodSelected(bairro);
                    return (
                      <div
                        key={bairro.id}
                        onClick={() => handleSelectNeighborhood(bairro)}
                        className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors select-none group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Building2 className="h-4 w-4 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {bairro.name}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              Bairro · {bairro.cityName}
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
