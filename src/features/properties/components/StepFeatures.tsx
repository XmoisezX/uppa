"use client";

import React, { useState } from "react";
import { Sparkles, Search, Check, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Feature } from "@/types/property";

interface StepFeaturesProps {
  selectedFeatureIds: string[];
  availableFeatures: Feature[];
  onToggleFeature: (featureId: string) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  leisure: "Lazer e Bem-Estar",
  comfort: "Conforto e Ambientes",
  security: "Segurança e Portaria",
  infrastructure: "Infraestrutura e Acessibilidade",
  sustainability: "Sustentabilidade",
  general: "Geral",
};

export function StepFeatures({
  selectedFeatureIds,
  availableFeatures,
  onToggleFeature,
}: StepFeaturesProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFeatures = availableFeatures.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupamento por categoria
  const groupedFeatures = filteredFeatures.reduce((acc, feat) => {
    const cat = feat.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feat);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Label className="text-base font-bold text-slate-900 dark:text-white">
            Características e Comodidades
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Selecione todos os diferenciais do imóvel e do condomínio.
          </p>
        </div>

        <Badge variant="secondary" className="self-start sm:self-auto px-3 py-1 font-semibold text-xs">
          <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
          {selectedFeatureIds.length} selecionada{selectedFeatureIds.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
        <Input
          placeholder="Buscar característica (ex: Piscina, Varanda, Academia)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Categorias & Grid */}
      {Object.keys(groupedFeatures).length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <Tag className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma característica encontrada
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Tente outro termo de busca ou limpe o campo para ver o catálogo completo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFeatures).map(([catKey, feats]) => (
            <div key={catKey} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {CATEGORY_NAMES[catKey] || catKey}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {feats.map((feature) => {
                  const isSelected = selectedFeatureIds.includes(feature.id);
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => onToggleFeature(feature.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 font-semibold shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      <span className="text-xs">{feature.name}</span>
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
