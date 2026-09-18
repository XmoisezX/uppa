"use client";

import React from "react";
import {
  Building2,
  Home,
  ShieldCheck,
  Sparkles,
  Maximize2,
  LayoutGrid,
  Compass,
  Briefcase,
  Trees,
  Warehouse,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PropertyWithDetails, TransactionType, PropertyType } from "@/types/property";

interface StepPurposeTypePriceProps {
  property: PropertyWithDetails;
  onChange: (fields: Partial<PropertyWithDetails>) => void;
}

const PROPERTY_TYPES: { id: PropertyType; label: string; icon: any }[] = [
  { id: "apartment", label: "Apartamento", icon: Building2 },
  { id: "house", label: "Casa", icon: Home },
  { id: "townhouse", label: "Sobrado", icon: Home },
  { id: "condo_house", label: "Casa de Condomínio", icon: ShieldCheck },
  { id: "penthouse", label: "Cobertura", icon: Sparkles },
  { id: "studio", label: "Studio", icon: Maximize2 },
  { id: "loft", label: "Loft", icon: LayoutGrid },
  { id: "land", label: "Terreno / Lote", icon: Compass },
  { id: "commercial", label: "Comercial / Sala", icon: Briefcase },
  { id: "farm", label: "Chácara / Sítio", icon: Trees },
  { id: "warehouse", label: "Galpão", icon: Warehouse },
];

export function StepPurposeTypePrice({ property, onChange }: StepPurposeTypePriceProps) {
  const transactionType = property.transactionType || "sale";
  const propertyType = property.propertyType || "apartment";

  const handleTransactionChange = (type: TransactionType) => {
    onChange({ transactionType: type });
  };

  const handleTypeChange = (type: PropertyType) => {
    onChange({ propertyType: type });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. FINALIDADE DO ANÚNCIO */}
      <div>
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Qual é a finalidade do anúncio?
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Selecione se o imóvel está disponível para venda, locação ou ambas as modalidades.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <button
            type="button"
            onClick={() => handleTransactionChange("sale")}
            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
              transactionType === "sale"
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-sm">Venda</span>
              {transactionType === "sale" && (
                <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Para compradores buscando aquisição definitiva.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleTransactionChange("rent")}
            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
              transactionType === "rent"
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-sm">Locação</span>
              {transactionType === "rent" && (
                <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Para locatários buscando aluguel mensal ou temporada.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleTransactionChange("sale_or_rent")}
            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
              transactionType === "sale_or_rent"
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-sm">Venda ou Locação</span>
              {transactionType === "sale_or_rent" && (
                <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Disponível para venda ou aluguel simultaneamente.
            </p>
          </button>
        </div>
      </div>

      {/* 2. TIPO DO IMÓVEL */}
      <div>
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Qual é o tipo de imóvel?
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Classificação essencial para filtros de busca dos compradores no portal.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {PROPERTY_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = propertyType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTypeChange(type.id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 font-semibold shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                }`}
              >
                <Icon className={`h-6 w-6 mb-2 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                <span className="text-xs leading-tight">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PREÇOS E VALORES */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Valores e Encargos
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Preencha os valores financeiros. Preços atualizados alimentam o histórico automático.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {(transactionType === "sale" || transactionType === "sale_or_rent") && (
            <div>
              <Label htmlFor="price" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Preço de Venda (R$) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
                <Input
                  id="price"
                  type="number"
                  placeholder="0,00"
                  className="pl-9"
                  value={property.price || ""}
                  onChange={(e) => onChange({ price: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          )}

          {(transactionType === "rent" || transactionType === "sale_or_rent") && (
            <div>
              <Label htmlFor="rentPrice" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Preço de Locação (R$ / mês) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
                <Input
                  id="rentPrice"
                  type="number"
                  placeholder="0,00"
                  className="pl-9"
                  value={property.rentPrice || ""}
                  onChange={(e) => onChange({ rentPrice: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="condominiumFee" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Taxa de Condomínio (R$ / mês)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
              <Input
                id="condominiumFee"
                type="number"
                placeholder="0,00"
                className="pl-9"
                value={property.condominiumFee || ""}
                onChange={(e) => onChange({ condominiumFee: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="iptu" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              IPTU Anual (R$)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
              <Input
                id="iptu"
                type="number"
                placeholder="0,00"
                className="pl-9"
                value={property.iptu || ""}
                onChange={(e) => onChange({ iptu: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
        </div>

        {/* Condições de Negociação */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-3">
            Condições Especiais de Negociação
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(property.financiable)}
                onChange={(e) => onChange({ financiable: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Aceita Financiamento
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(property.acceptsExchange)}
                onChange={(e) => onChange({ acceptsExchange: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Aceita Permuta / Troca
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(property.acceptsVehicle)}
                onChange={(e) => onChange({ acceptsVehicle: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Aceita Veículo na Negociação
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
