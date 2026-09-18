"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Search, Loader2, Navigation, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCitiesByStateAction } from "@/features/properties/actions";
import type { PropertyWithDetails } from "@/types/property";
import type { State, City } from "@/types/geo";

interface StepLocationProps {
  property: PropertyWithDetails;
  states: State[];
  onChange: (fields: Partial<PropertyWithDetails>) => void;
}

export function StepLocation({ property, states, onChange }: StepLocationProps) {
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Carrega municípios quando o estado muda
  useEffect(() => {
    if (property.stateId) {
      setIsLoadingCities(true);
      fetchCitiesByStateAction(property.stateId)
        .then((res) => {
          if (res.success) {
            setCities(res.cities);
          }
        })
        .finally(() => setIsLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [property.stateId]);

  // Busca rápida por CEP no ViaCEP
  const handleCepSearch = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setCepError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError("CEP não localizado. Preencha o endereço manualmente.");
        return;
      }

      // Encontra o estado pelo código UF
      const matchedState = states.find((s) => s.code.toUpperCase() === data.uf.toUpperCase());
      const updates: Partial<PropertyWithDetails> = {
        zipcode: data.cep,
        street: data.logradouro || property.street,
        complement: data.complemento || property.complement,
      };

      if (matchedState) {
        updates.stateId = matchedState.id;
        // Carrega municípios do estado para tentar localizar a cidade
        const res = await fetchCitiesByStateAction(matchedState.id);
        if (res.success && res.cities.length > 0) {
          setCities(res.cities);
          const normalizedCityName = data.localidade.toLowerCase().trim();
          const matchedCity = res.cities.find(
            (c) => c.name.toLowerCase().trim() === normalizedCityName
          );
          if (matchedCity) {
            updates.cityId = matchedCity.id;
            if (matchedCity.latitude && matchedCity.longitude && !property.latitude) {
              updates.latitude = matchedCity.latitude;
              updates.longitude = matchedCity.longitude;
            }
          }
        }
      }

      onChange(updates);
    } catch (err) {
      setCepError("Erro ao consultar CEP. Preencha manualmente.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. BUSCA POR CEP */}
      <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <Label className="text-sm font-bold text-slate-900 dark:text-white">
            Busca Automática por CEP
          </Label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Digite o CEP para autopreencher rua, bairro, cidade e estado.
        </p>

        <div className="flex gap-2 max-w-sm">
          <div className="relative flex-1">
            <Input
              id="zipcode"
              placeholder="00000-000"
              maxLength={9}
              value={property.zipcode || ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ zipcode: val });
                const clean = val.replace(/\D/g, "");
                if (clean.length === 8) {
                  handleCepSearch(clean);
                }
              }}
              className="bg-white dark:bg-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={() => property.zipcode && handleCepSearch(property.zipcode)}
            disabled={isSearchingCep || !property.zipcode}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSearchingCep ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </button>
        </div>

        {cepError && (
          <p className="text-xs font-medium text-red-500 mt-2">{cepError}</p>
        )}
      </div>

      {/* 2. CAMPOS DE ENDEREÇO */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="stateId" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Estado (UF) *
            </Label>
            <select
              id="stateId"
              value={property.stateId || ""}
              onChange={(e) => {
                onChange({ stateId: e.target.value || null, cityId: null });
              }}
              className="mt-1 flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-indigo-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Selecione o Estado...</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="cityId" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Município *
            </Label>
            <select
              id="cityId"
              disabled={!property.stateId || isLoadingCities}
              value={property.cityId || ""}
              onChange={(e) => onChange({ cityId: e.target.value || null })}
              className="mt-1 flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-indigo-500 focus-visible:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">
                {isLoadingCities ? "Carregando municípios..." : "Selecione o Município..."}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="street" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Logradouro (Rua / Avenida / Travessa)
            </Label>
            <Input
              id="street"
              placeholder="Ex: Av. Paulista"
              className="mt-1"
              value={property.street || ""}
              onChange={(e) => onChange({ street: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Número
            </Label>
            <Input
              id="number"
              placeholder="Ex: 1000 ou S/N"
              className="mt-1"
              value={property.number || ""}
              onChange={(e) => onChange({ number: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="complement" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Complemento
            </Label>
            <Input
              id="complement"
              placeholder="Ex: Apto 42, Bloco B"
              className="mt-1"
              value={property.complement || ""}
              onChange={(e) => onChange({ complement: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 3. COORDENADAS ESPACIAIS (POSTGIS) */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 mb-1">
          <Navigation className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <Label className="text-sm font-bold text-slate-900 dark:text-white">
            Coordenadas Geográficas (PostGIS WGS84)
          </Label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          O portal gera automaticamente o ponto espacial geográfico para busca por raio, mapa interativo e proximidade.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Latitude
            </Label>
            <Input
              id="latitude"
              type="number"
              step="0.0000001"
              placeholder="Ex: -23.561684"
              className="mt-1"
              value={property.latitude || ""}
              onChange={(e) => onChange({ latitude: e.target.value ? Number(e.target.value) : null })}
            />
          </div>

          <div>
            <Label htmlFor="longitude" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Longitude
            </Label>
            <Input
              id="longitude"
              type="number"
              step="0.0000001"
              placeholder="Ex: -46.655981"
              className="mt-1"
              value={property.longitude || ""}
              onChange={(e) => onChange({ longitude: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
      </div>

      {/* 4. PRIVACIDADE DE ENDEREÇO */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
        <div className="mt-0.5">
          {property.addressVisible ? (
            <Eye className="h-5 w-5 text-indigo-600" />
          ) : (
            <EyeOff className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="addressVisible" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
              Exibir endereço completo no anúncio público
            </Label>
            <input
              id="addressVisible"
              type="checkbox"
              checked={Boolean(property.addressVisible)}
              onChange={(e) => onChange({ addressVisible: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Se desativado, os visitantes verão apenas o bairro e a cidade, garantindo a privacidade e segurança do proprietário.
          </p>
        </div>
      </div>
    </div>
  );
}
