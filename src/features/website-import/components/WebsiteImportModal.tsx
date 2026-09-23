"use client";

import React, { useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building,
  Image as ImageIcon,
  DollarSign,
  MapPin,
  Tag,
  Maximize2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PreviewReport, CrawlResult } from "../types";

interface WebsiteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId: string;
  agencyName: string;
  onSuccess?: () => void;
}

export function WebsiteImportModal({
  isOpen,
  onClose,
  agencyId,
  agencyName,
  onSuccess,
}: WebsiteImportModalProps) {
  const [step, setStep] = useState<"input" | "preview" | "syncing" | "completed">("input");
  const [url, setUrl] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [previewReport, setPreviewReport] = useState<PreviewReport | null>(null);
  const [syncResult, setSyncResult] = useState<CrawlResult | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading) return;
    setStep("input");
    setUrl("");
    setAuthChecked(false);
    setPreviewReport(null);
    setSyncResult(null);
    setErrorMessage(null);
    onClose();
  };

  // Etapa 1: Gerar Preview
  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMessage("Por favor, informe a URL do website da imobiliária.");
      return;
    }
    if (!authChecked) {
      setErrorMessage(
        "É obrigatório confirmar a declaração de autorização legal antes de prosseguir."
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/website-import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          url: url.trim(),
          authorizationConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar o preview do website.");
      }

      setPreviewReport(data.report);
      setStep("preview");
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro inesperado ao analisar website.");
    } finally {
      setIsLoading(false);
    }
  };

  // Etapa 2: Confirmar e Importar
  const handleConfirmImport = async () => {
    if (!previewReport) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStep("syncing");

    try {
      const res = await fetch("/api/website-import/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          url: previewReport.domain,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao executar a importação do website.");
      }

      setSyncResult(data.result);
      setStep("completed");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro inesperado durante a importação.");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Website Import (Importação por Domínio)
              </h2>
              <p className="text-xs text-slate-500">
                Coleta automática de anúncios e fotos do site oficial de {agencyName}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 text-xs flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Não foi possível prosseguir</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 1: ENTRADA DE URL E AUTORIZAÇÃO */}
          {/* ========================================================================= */}
          {step === "input" && (
            <form onSubmit={handleGeneratePreview} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  URL do Website da Imobiliária
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="https://www.suaimobiliaria.com.br"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    className="h-12 pl-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                  <Globe className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  A UPPA irá analisar o sitemap.xml, tags Schema.org / JSON-LD e
                  estruturas do catálogo sem sobrecarregar seu servidor.
                </p>
              </div>

              {/* Termo Obrigatório de Autorização Legal */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="legal-auth"
                    checked={authChecked}
                    onChange={(e) => setAuthChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="legal-auth"
                    className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer"
                  >
                    <span className="font-bold text-slate-900 dark:text-white">
                      Declaração de Autorização e Titularidade:
                    </span>{" "}
                    Declaro formalmente sob as penas da lei que sou proprietário ou
                    representante legal autorizado da imobiliária vinculada a este domínio e
                    possuo plena autorização para permitir a coleta, normalização e
                    republicação dos anúncios, fotografias e descrições na plataforma UPPA.
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="rounded-xl h-11 px-5 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !url.trim() || !authChecked}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 text-xs font-bold gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analisando Website...
                    </>
                  ) : (
                    <>
                      Analisar Website & Gerar Preview
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 2: RELATÓRIO DE PREVIEW E AMOSTRA DE 5 IMÓVEIS */}
          {/* ========================================================================= */}
          {step === "preview" && previewReport && (
            <div className="space-y-6">
              {/* Resumo da Detecção */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Domínio
                  </span>
                  <p className="mt-1 text-xs font-black text-slate-900 dark:text-white truncate">
                    {previewReport.domain}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Plataforma
                  </span>
                  <p className="mt-1 text-xs font-black text-indigo-600 dark:text-indigo-400 truncate">
                    {previewReport.detectedPlatform}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Páginas Visitadas
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {previewReport.pagesVisited}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Imóveis Detectados
                  </span>
                  <p className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {previewReport.listingsFound}
                  </p>
                </div>
              </div>

              {/* Métricas de Qualidade */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Indicadores de Qualidade da Amostra
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Com Preço:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {previewReport.withPrice}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <ImageIcon className="h-4 w-4 text-sky-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Com Fotos:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {previewReport.withPhotos}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <Tag className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Com Código:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {previewReport.withCode}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Com Localização:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {previewReport.withLocation}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings / Erros se houver */}
              {previewReport.warnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-xs space-y-1">
                  {previewReport.warnings.map((w, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Amostra dos 5 Imóveis */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Amostra dos 5 Imóveis Extraídos
                </h4>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {previewReport.sampleProperties.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum imóvel disponível para exibição na amostra.
                    </p>
                  ) : (
                    previewReport.sampleProperties.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                      >
                        <div className="h-14 w-18 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images && p.images[0] ? (
                            <img
                              src={p.images[0].url}
                              alt={p.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {p.price
                                ? `R$ ${p.price.toLocaleString("pt-BR")}`
                                : p.rentPrice
                                ? `R$ ${p.rentPrice.toLocaleString("pt-BR")}/mês`
                                : "Sob consulta"}
                            </span>
                            <span>•</span>
                            <span>Cód: {p.externalId}</span>
                            <span>•</span>
                            <span>
                              {p.address?.city || "Cidade não especificada"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("input")}
                  disabled={isLoading}
                  className="rounded-xl h-11 px-5 text-xs font-semibold"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 text-xs font-bold gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Confirmar e Iniciar Importação
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 3: PROCESSANDO IMPORTAÇÃO */}
          {/* ========================================================================= */}
          {step === "syncing" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sincronizando Anúncios do Website...
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Nosso crawler está baixando, normalizando e gravando os imóveis
                com persistência idempotente e content hash.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 4: CONCLUSÃO COM SUCESSO */}
          {/* ========================================================================= */}
          {step === "completed" && syncResult && (
            <div className="py-8 text-center space-y-6">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Importação Concluída com Sucesso!
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Os imóveis foram cadastrados e estarão ativos no portal UPPA.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Encontrados
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {syncResult.itemsFound}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Criados
                  </span>
                  <p className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {syncResult.itemsCreated}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Atualizados
                  </span>
                  <p className="mt-1 text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {syncResult.itemsUpdated}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Falhas
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {syncResult.itemsFailed}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleClose}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 text-xs font-bold cursor-pointer"
                >
                  Concluir e Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
