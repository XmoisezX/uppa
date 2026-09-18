"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Building2,
  ListChecks,
  MapPin,
  Sparkles,
  Camera,
  FileText,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepPurposeTypePrice } from "./StepPurposeTypePrice";
import { StepCharacteristics } from "./StepCharacteristics";
import { StepLocation } from "./StepLocation";
import { StepFeatures } from "./StepFeatures";
import { StepMedia } from "./StepMedia";
import { StepDescription } from "./StepDescription";
import { StepReviewPublish } from "./StepReviewPublish";
import {
  autosavePropertyAction,
  syncPropertyFeaturesAction,
  addPropertyMediaAction,
  deletePropertyMediaAction,
  setCoverMediaAction,
  reorderMediaAction,
  publishPropertyAction,
  saveDraftPropertyAction,
} from "@/features/properties/actions";
import type { PropertyWithDetails, Feature, MediaType } from "@/types/property";
import type { State } from "@/types/geo";

interface PropertyWizardProps {
  initialProperty: PropertyWithDetails;
  availableFeatures: Feature[];
  states: State[];
}

const STEPS = [
  { id: 1, label: "Finalidade & Preço", icon: Building2 },
  { id: 2, label: "Características", icon: ListChecks },
  { id: 3, label: "Localização", icon: MapPin },
  { id: 4, label: "Features", icon: Sparkles },
  { id: 5, label: "Mídia & Fotos", icon: Camera },
  { id: 6, label: "Descrição", icon: FileText },
  { id: 7, label: "Revisão & Publicar", icon: Send },
];

export function PropertyWizard({
  initialProperty,
  availableFeatures,
  states,
}: PropertyWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [property, setProperty] = useState<PropertyWithDetails>(initialProperty);

  // Estados do Autosave
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Timer de debounce para o autosave
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<PropertyWithDetails>>({});

  // Efetua a gravação no backend com tratamento de erro
  const executeAutosave = async (changes: Partial<PropertyWithDetails>) => {
    setSaveStatus("saving");
    setErrorMessage(null);

    const res = await autosavePropertyAction(property.id, {
      title: changes.title !== undefined ? changes.title : property.title,
      description: changes.description !== undefined ? changes.description : property.description,
      transactionType: changes.transactionType !== undefined ? changes.transactionType : property.transactionType,
      propertyType: changes.propertyType !== undefined ? changes.propertyType : property.propertyType,
      price: changes.price !== undefined ? changes.price : property.price,
      rentPrice: changes.rentPrice !== undefined ? changes.rentPrice : property.rentPrice,
      condominiumFee: changes.condominiumFee !== undefined ? changes.condominiumFee : property.condominiumFee,
      iptu: changes.iptu !== undefined ? changes.iptu : property.iptu,
      bedrooms: changes.bedrooms !== undefined ? changes.bedrooms : property.bedrooms,
      suites: changes.suites !== undefined ? changes.suites : property.suites,
      bathrooms: changes.bathrooms !== undefined ? changes.bathrooms : property.bathrooms,
      parkingSpaces: changes.parkingSpaces !== undefined ? changes.parkingSpaces : property.parkingSpaces,
      usableArea: changes.usableArea !== undefined ? changes.usableArea : property.usableArea,
      totalArea: changes.totalArea !== undefined ? changes.totalArea : property.totalArea,
      lotArea: changes.lotArea !== undefined ? changes.lotArea : property.lotArea,
      yearBuilt: changes.yearBuilt !== undefined ? changes.yearBuilt : property.yearBuilt,
      financiable: changes.financiable !== undefined ? changes.financiable : property.financiable,
      acceptsExchange: changes.acceptsExchange !== undefined ? changes.acceptsExchange : property.acceptsExchange,
      acceptsVehicle: changes.acceptsVehicle !== undefined ? changes.acceptsVehicle : property.acceptsVehicle,
      furnished: changes.furnished !== undefined ? changes.furnished : property.furnished,
      petFriendly: changes.petFriendly !== undefined ? changes.petFriendly : property.petFriendly,
      addressVisible: changes.addressVisible !== undefined ? changes.addressVisible : property.addressVisible,
      street: changes.street !== undefined ? changes.street : property.street,
      number: changes.number !== undefined ? changes.number : property.number,
      complement: changes.complement !== undefined ? changes.complement : property.complement,
      zipcode: changes.zipcode !== undefined ? changes.zipcode : property.zipcode,
      stateId: changes.stateId !== undefined ? changes.stateId : property.stateId,
      cityId: changes.cityId !== undefined ? changes.cityId : property.cityId,
      neighborhoodId: changes.neighborhoodId !== undefined ? changes.neighborhoodId : property.neighborhoodId,
      latitude: changes.latitude !== undefined ? changes.latitude : property.latitude,
      longitude: changes.longitude !== undefined ? changes.longitude : property.longitude,
    });

    if (res.success) {
      setSaveStatus("saved");
      const timeStr = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedAt(timeStr);
      pendingChangesRef.current = {};
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Falha ao salvar alterações.");
    }
  };

  // Handler de alteração com debounce (Autosave em 1000ms)
  const handlePropertyChange = (fields: Partial<PropertyWithDetails>) => {
    setProperty((prev) => ({ ...prev, ...fields }));
    pendingChangesRef.current = { ...pendingChangesRef.current, ...fields };

    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeAutosave(pendingChangesRef.current);
    }, 1000);
  };

  // Força o salvamento imediato de qualquer alteração pendente
  const flushPendingAutosave = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (Object.keys(pendingChangesRef.current).length > 0) {
      await executeAutosave(pendingChangesRef.current);
    }
  };

  // Handler de comodidades (Features)
  const handleToggleFeature = async (featureId: string) => {
    const currentIds = (property.features || []).map((f) => f.id);
    const newIds = currentIds.includes(featureId)
      ? currentIds.filter((id) => id !== featureId)
      : [...currentIds, featureId];

    const updatedFeatures = availableFeatures.filter((f) => newIds.includes(f.id));
    setProperty((prev) => ({ ...prev, features: updatedFeatures }));

    setSaveStatus("saving");
    const res = await syncPropertyFeaturesAction(property.id, newIds);
    if (res.success) {
      setSaveStatus("saved");
      setLastSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao atualizar características.");
    }
  };

  // Handlers de Mídia
  const handleAddMedia = async (data: { url: string; type: MediaType; isCover: boolean }) => {
    setSaveStatus("saving");
    const res = await addPropertyMediaAction(property.id, data);
    if (res.success && res.media) {
      setProperty((prev) => {
        const prevMedia = prev.media || [];
        const newMediaList = data.isCover
          ? [res.media!, ...prevMedia.map((m) => ({ ...m, isCover: false }))]
          : [...prevMedia, res.media!];
        return { ...prev, media: newMediaList };
      });
      setSaveStatus("saved");
      setLastSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao adicionar foto.");
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    setSaveStatus("saving");
    const res = await deletePropertyMediaAction(property.id, mediaId);
    if (res.success) {
      setProperty((prev) => {
        const remaining = (prev.media || []).filter((m) => m.id !== mediaId);
        return { ...prev, media: remaining };
      });
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao excluir foto.");
    }
  };

  const handleSetCover = async (mediaId: string) => {
    setSaveStatus("saving");
    const res = await setCoverMediaAction(property.id, mediaId);
    if (res.success) {
      setProperty((prev) => ({
        ...prev,
        media: (prev.media || []).map((m) => ({
          ...m,
          isCover: m.id === mediaId,
        })),
      }));
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao definir capa.");
    }
  };

  const handleReorderMedia = async (orderedIds: string[]) => {
    setSaveStatus("saving");
    const res = await reorderMediaAction(property.id, orderedIds);
    if (res.success) {
      setProperty((prev) => {
        const mediaMap = new Map((prev.media || []).map((m) => [m.id, m]));
        const sorted = orderedIds.map((id) => mediaMap.get(id)!).filter(Boolean);
        return { ...prev, media: sorted };
      });
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      setErrorMessage(res.error || "Erro ao reordenar fotos.");
    }
  };

  // Publicação Final
  const handlePublish = async () => {
    await flushPendingAutosave();
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const res = await publishPropertyAction(property.id);
      if (res.success) {
        router.push("/painel/imoveis?status=published");
      } else {
        setErrorMessage(res.error || "Falha ao publicar anúncio.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro inesperado.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Salvar Rascunho
  const handleSaveDraft = async () => {
    await flushPendingAutosave();
    setIsPublishing(true);
    try {
      await saveDraftPropertyAction(property.id);
      router.push("/painel/imoveis?status=saved_draft");
    } finally {
      setIsPublishing(false);
    }
  };

  // Navegação entre etapas
  const handleNextStep = async () => {
    await flushPendingAutosave();
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = async () => {
    await flushPendingAutosave();
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR: NAVEGAÇÃO, AUTOSAVE E STATUS */}
      <div className="sticky top-16 z-20 -mx-4 -mt-8 mb-6 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Voltar e Título */}
          <div className="flex items-center gap-3">
            <Link
              href="/painel/imoveis"
              onClick={flushPendingAutosave}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Imóveis</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Etapa {currentStep} de 7:
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {STEPS[currentStep - 1]?.label}
                </h2>
              </div>
            </div>
          </div>

          {/* Indicadores de Autosave e Status */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Feedback Visual do Autosave */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  Salvando...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {lastSavedAt ? `Salvo às ${lastSavedAt}` : "Salvo"}
                </span>
              )}
              {saveStatus === "error" && (
                <button
                  type="button"
                  onClick={() => executeAutosave(pendingChangesRef.current)}
                  className="inline-flex items-center gap-1 text-red-500 hover:underline font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Erro ao salvar (tentar novamente)
                </button>
              )}
            </div>

            {/* Status do Imóvel */}
            <Badge
              variant="outline"
              className={
                property.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }
            >
              {property.status === "active" ? "ATIVO" : "RASCUNHO"}
            </Badge>

            {/* Código de Referência */}
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              Ref: {property.externalId}
            </span>
          </div>
        </div>

        {/* PROGRESSO EM ETAPAS (STEP TABS) */}
        <div className="mt-3 overflow-x-auto pb-1 max-w-7xl mx-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isCurrent = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={async () => {
                    await flushPendingAutosave();
                    setCurrentStep(step.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-xs"
                      : isCompleted
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 hover:bg-indigo-100"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <StepIcon className={`h-3.5 w-3.5 ${isCurrent ? "text-white" : ""}`} />
                  <span>{step.id}. {step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BANNER DE ERRO GLOBAL (SE HOUVER) */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* CONTEÚDO DA ETAPA ATIVA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {currentStep === 1 && (
          <StepPurposeTypePrice
            property={property}
            onChange={handlePropertyChange}
          />
        )}

        {currentStep === 2 && (
          <StepCharacteristics
            property={property}
            onChange={handlePropertyChange}
          />
        )}

        {currentStep === 3 && (
          <StepLocation
            property={property}
            states={states}
            onChange={handlePropertyChange}
          />
        )}

        {currentStep === 4 && (
          <StepFeatures
            selectedFeatureIds={(property.features || []).map((f) => f.id)}
            availableFeatures={availableFeatures}
            onToggleFeature={handleToggleFeature}
          />
        )}

        {currentStep === 5 && (
          <StepMedia
            media={property.media || []}
            onAddMedia={handleAddMedia}
            onDeleteMedia={handleDeleteMedia}
            onSetCover={handleSetCover}
            onReorder={handleReorderMedia}
          />
        )}

        {currentStep === 6 && (
          <StepDescription
            property={property}
            onChange={handlePropertyChange}
          />
        )}

        {currentStep === 7 && (
          <StepReviewPublish
            property={property}
            isPublishing={isPublishing}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
          />
        )}
      </div>

      {/* BARRA INFERIOR DE NAVEGAÇÃO ENTRE ETAPAS */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevStep}
          disabled={currentStep === 1}
          className="cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Etapa Anterior
        </Button>

        {currentStep < 7 ? (
          <Button
            type="button"
            onClick={handleNextStep}
            className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer font-semibold"
          >
            Salvar e Continuar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Publicar Imóvel
          </Button>
        )}
      </div>
    </div>
  );
}
