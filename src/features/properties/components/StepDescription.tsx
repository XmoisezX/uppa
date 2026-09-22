"use client";

import React from "react";
import { FileText, Sparkles, Globe, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PropertyWithDetails } from "@/types/property";

interface StepDescriptionProps {
  property: PropertyWithDetails;
  onChange: (fields: Partial<PropertyWithDetails>) => void;
}

export function StepDescription({ property, onChange }: StepDescriptionProps) {
  const handleTitleChange = (title: string) => {
    // Gera slug amigável automaticamente a partir do título se for rascunho
    const cleanTitle = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const newSlug = cleanTitle ? `${cleanTitle}-${property.externalId.toLowerCase()}` : property.slug;

    onChange({
      title,
      slug: newSlug,
    });
  };

  const handleGenerateSuggestion = () => {
    const typeMap: Record<string, string> = {
      apartment: "Apartamento",
      house: "Casa",
      townhouse: "Sobrado",
      condo_house: "Casa em Condomínio",
      penthouse: "Cobertura",
      studio: "Studio",
      loft: "Loft",
      land: "Terreno",
      commercial: "Ponto Comercial",
      farm: "Chácara",
    };

    const typeName = typeMap[property.propertyType] || "Imóvel";
    const beds = property.bedrooms ? ` com ${property.bedrooms} Quartos` : "";
    const suites = property.suites ? ` (${property.suites} Suítes)` : "";
    const purpose = property.transactionType === "rent" ? "para Alugar" : "à Venda";
    const neighborhood = property.neighborhood?.name ? ` no ${property.neighborhood.name}` : "";

    const suggested = `${typeName}${beds}${suites} ${purpose}${neighborhood}`;
    handleTitleChange(suggested);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Título e Descrição do Imóvel
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Textos descritivos e bem redigidos melhoram o ranqueamento no Google (SEO) e atraem mais compradores.
        </p>
      </div>

      {/* 1. TÍTULO DO ANÚNCIO */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-xs font-bold text-slate-900 dark:text-white">
            Título do Anúncio *
          </Label>
          <button
            type="button"
            onClick={handleGenerateSuggestion}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            Gerar Sugestão Automática
          </button>
        </div>

        <Input
          id="title"
          placeholder="Ex: Apartamento de Alto Padrão com 3 Suítes e Vista Panorâmica"
          value={property.title || ""}
          onChange={(e) => handleTitleChange(e.target.value)}
          maxLength={120}
        />

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Títulos claros e objetivos geram até 40% mais cliques.</span>
          <span>{property.title?.length || 0}/120 caracteres</span>
        </div>
      </div>

      {/* 2. SLUG E URL AMIGÁVEL */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-slate-500" />
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Endereço Web do Imóvel (URL Amigável para SEO)
          </Label>
        </div>
        <p className="text-xs text-slate-500 font-mono break-all mt-1">
          uppa.com.br/imovel/<span className="text-indigo-600 dark:text-indigo-400 font-bold">{property.slug}</span>
        </p>
      </div>

      {/* 3. DESCRIÇÃO COMPLETA */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-bold text-slate-900 dark:text-white">
          Descrição Completa do Imóvel
        </Label>

        <Textarea
          id="description"
          rows={8}
          placeholder="Descreva detalhadamente o imóvel, diferenciais de acabamento, iluminação, vista, infraestrutura do condomínio e localização privilegiada..."
          value={property.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-h-[180px]"
        />

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs">
          <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Dica de Sucesso:</strong> Destaque pontos fortes como sol da manhã/tarde, armários embutidos, ventilação natural, vagas cobertas e facilidades próximas (metrô, escolas, supermercados).
          </span>
        </div>
      </div>
    </div>
  );
}
