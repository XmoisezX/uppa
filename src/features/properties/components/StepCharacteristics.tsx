"use client";

import React from "react";
import { Bed, Bath, Car, Maximize, Calendar, Armchair, Dog, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PropertyWithDetails } from "@/types/property";

interface StepCharacteristicsProps {
  property: PropertyWithDetails;
  onChange: (fields: Partial<PropertyWithDetails>) => void;
}

interface CounterFieldProps {
  label: string;
  icon: any;
  value: number;
  min?: number;
  max?: number;
  onValueChange: (val: number) => void;
}

function CounterField({ label, icon: Icon, value, min = 0, max = 20, onValueChange }: CounterFieldProps) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onValueChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="w-8 text-center text-sm font-bold text-slate-900 dark:text-white">
          {value}
        </span>

        <button
          type="button"
          onClick={() => onValueChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function StepCharacteristics({ property, onChange }: StepCharacteristicsProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. CÔMODOS PRINCIPAIS */}
      <div>
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Distribuição dos Cômodos e Vagas
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Informe as quantidades essenciais para os filtros de busca dos compradores.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <CounterField
            label="Quartos / Dormitórios"
            icon={Bed}
            value={property.bedrooms || 0}
            onValueChange={(val) => onChange({ bedrooms: val })}
          />

          <CounterField
            label="Suítes"
            icon={Bed}
            value={property.suites || 0}
            onValueChange={(val) => onChange({ suites: val })}
          />

          <CounterField
            label="Banheiros"
            icon={Bath}
            value={property.bathrooms || 0}
            onValueChange={(val) => onChange({ bathrooms: val })}
          />

          <CounterField
            label="Vagas de Garagem"
            icon={Car}
            value={property.parkingSpaces || 0}
            onValueChange={(val) => onChange({ parkingSpaces: val })}
          />
        </div>
      </div>

      {/* 2. METRAGEM E DIMENSÕES */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Metragem e Dimensões
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Dimensões em metros quadrados (m²).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div>
            <Label htmlFor="usableArea" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Área Útil / Privativa (m²) *
            </Label>
            <div className="relative mt-1">
              <Input
                id="usableArea"
                type="number"
                placeholder="Ex: 85"
                value={property.usableArea || ""}
                onChange={(e) => onChange({ usableArea: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">m²</span>
            </div>
          </div>

          <div>
            <Label htmlFor="totalArea" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Área Total Construída (m²)
            </Label>
            <div className="relative mt-1">
              <Input
                id="totalArea"
                type="number"
                placeholder="Ex: 110"
                value={property.totalArea || ""}
                onChange={(e) => onChange({ totalArea: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">m²</span>
            </div>
          </div>

          <div>
            <Label htmlFor="lotArea" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Área do Terreno (m²)
            </Label>
            <div className="relative mt-1">
              <Input
                id="lotArea"
                type="number"
                placeholder="Ex: 300"
                value={property.lotArea || ""}
                onChange={(e) => onChange({ lotArea: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETALHES COMPLEMENTARES */}
      <div>
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Informações Adicionais
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Critérios de conforto valorizados por clientes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Label htmlFor="yearBuilt" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Ano de Construção
            </Label>
            <Input
              id="yearBuilt"
              type="number"
              placeholder="Ex: 2022"
              value={property.yearBuilt || ""}
              onChange={(e) => onChange({ yearBuilt: e.target.value ? Number(e.target.value) : null })}
            />
          </div>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={Boolean(property.furnished)}
              onChange={(e) => onChange({ furnished: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-2">
              <Armchair className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Imóvel Mobiliado
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={Boolean(property.petFriendly)}
              onChange={(e) => onChange({ petFriendly: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-2">
              <Dog className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Aceita Animais (Pet Friendly)
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
