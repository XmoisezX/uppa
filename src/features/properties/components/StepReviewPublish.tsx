"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize,
  Sparkles,
  Send,
  Save,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PropertyWithDetails } from "@/types/property";

interface StepReviewPublishProps {
  property: PropertyWithDetails;
  isPublishing: boolean;
  onPublish: () => Promise<void>;
  onSaveDraft: () => Promise<void>;
}

export function StepReviewPublish({
  property,
  isPublishing,
  onPublish,
  onSaveDraft,
}: StepReviewPublishProps) {
  // Checklist de qualidade
  const hasValidTitle = Boolean(
    property.title &&
    property.title.trim() !== "" &&
    property.title !== "Novo Imóvel (Rascunho)"
  );

  const hasPrice = Boolean(
    (property.transactionType === "sale" && property.price && property.price > 0) ||
    (property.transactionType === "rent" && property.rentPrice && property.rentPrice > 0) ||
    (property.transactionType === "sale_or_rent" && (property.price || property.rentPrice))
  );

  const hasPhotos = Boolean(property.media && property.media.length > 0);
  const hasLocation = Boolean(property.cityId || property.stateId || property.street);
  const hasSpecs = Boolean(property.usableArea || property.bedrooms > 0);

  const isReadyToPublish = hasValidTitle && hasPrice && hasPhotos;

  const coverMedia = property.media?.find((m) => m.isCover) || property.media?.[0];

  const formatCurrency = (val?: number | null) => {
    if (!val) return "Consulte";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Revisão e Publicação do Anúncio
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Revise todas as informações antes de disponibilizar o imóvel no portal nacional.
        </p>
      </div>

      {/* CHECKLIST DE QUALIDADE DO ANÚNCIO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Checklist de Qualidade do Anúncio
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {hasValidTitle ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Título do Anúncio
              </span>
              <span className="text-[11px] text-slate-400">
                {hasValidTitle ? "Definido e adequado" : "Defina um título chamativo"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {hasPrice ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Valor do Imóvel
              </span>
              <span className="text-[11px] text-slate-400">
                {hasPrice ? "Preço informado" : "Preencha o valor de venda ou locação"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {hasPhotos ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Fotos do Imóvel
              </span>
              <span className="text-[11px] text-slate-400">
                {hasPhotos
                  ? `${property.media?.length} foto(s) cadastrada(s)`
                  : "Mínimo 1 foto necessária"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {hasLocation ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Localização
              </span>
              <span className="text-[11px] text-slate-400">
                {hasLocation ? "Localização informada" : "Informe estado ou cidade"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {hasSpecs ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Características Físicas
              </span>
              <span className="text-[11px] text-slate-400">
                {hasSpecs ? "Quartos ou área informados" : "Preencha metragem ou quartos"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PREVIEW DO CARD PÚBLICO */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Pré-visualização do Anúncio
          </span>
          <Badge
            variant="outline"
            className={
              property.status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }
          >
            {property.status === "active" ? "ATIVO NO PORTAL" : "RASCUNHO"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* Imagem de Capa */}
          <div className="md:col-span-5">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
              {coverMedia ? (
                <img
                  src={coverMedia.url}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                  <Building2 className="h-10 w-10 mb-1" />
                  <span className="text-xs font-medium">Sem imagem de capa</span>
                </div>
              )}
            </div>

            {/* Miniaturas */}
            {property.media && property.media.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {property.media.slice(1, 5).map((m) => (
                  <div key={m.id} className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informações Principais */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className="bg-indigo-600 text-white font-bold text-xs uppercase">
                  {property.transactionType === "rent" ? "Locação" : "Venda"}
                </Badge>
                <span className="text-xs text-slate-500 capitalize">{property.propertyType}</span>
              </div>

              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {property.title || "Novo Imóvel (Rascunho)"}
              </h1>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {property.street ? `${property.street}, ` : ""}
                  {property.city?.name || "Cidade não selecionada"} - {property.state?.code || ""}
                </span>
              </div>
            </div>

            {/* Valores */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">
                  {property.transactionType === "rent" ? "Valor de Aluguel" : "Valor de Venda"}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(
                    property.transactionType === "rent" ? property.rentPrice : property.price
                  )}
                </span>
              </div>

              {property.condominiumFee && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Condomínio</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(property.condominiumFee)}/mês
                  </span>
                </div>
              )}

              {property.iptu && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">IPTU</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(property.iptu)}/ano
                  </span>
                </div>
              )}
            </div>

            {/* Especificações Físicas */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {property.usableArea && (
                <div className="flex items-center gap-1.5">
                  <Maximize className="h-4 w-4 text-slate-400" />
                  <span>{property.usableArea} m² úteis</span>
                </div>
              )}
              {property.bedrooms > 0 && (
                <div className="flex items-center gap-1.5">
                  <Bed className="h-4 w-4 text-slate-400" />
                  <span>{property.bedrooms} quartos</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center gap-1.5">
                  <Bath className="h-4 w-4 text-slate-400" />
                  <span>{property.bathrooms} banheiros</span>
                </div>
              )}
              {property.parkingSpaces > 0 && (
                <div className="flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-slate-400" />
                  <span>{property.parkingSpaces} vagas</span>
                </div>
              )}
            </div>

            {/* Features pills */}
            {property.features && property.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {property.features.slice(0, 6).map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
                    {f.name}
                  </span>
                ))}
                {property.features.length > 6 && (
                  <span className="px-2 py-1 text-[11px] text-slate-400 font-medium">
                    +{property.features.length - 6} itens
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTÕES FINAIS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Tudo pronto para publicar?
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Você pode salvar como rascunho para finalizar depois ou publicar agora mesmo no portal.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isPublishing}
            className="flex-1 sm:flex-initial cursor-pointer"
          >
            <Save className="h-4 w-4 mr-1.5 text-slate-500" />
            Salvar Rascunho
          </Button>

          <Button
            type="button"
            onClick={onPublish}
            disabled={isPublishing || !isReadyToPublish}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Publicar Imóvel
          </Button>
        </div>
      </div>
    </div>
  );
}
