"use client";

import React, { useState, useEffect } from "react";
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
  Activity,
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
  initialSourceId?: string;
  initialDomain?: string;
  autoStartSync?: boolean;
}

export function WebsiteImportModal({
  isOpen,
  onClose,
  agencyId,
  agencyName,
  onSuccess,
  initialSourceId,
  initialDomain,
  autoStartSync,
}: WebsiteImportModalProps) {
  const [step, setStep] = useState<"input" | "preview" | "syncing" | "completed">("input");
  const [url, setUrl] = useState(initialDomain || "");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | undefined>(initialSourceId);

  useEffect(() => {
    if (initialSourceId) {
      setActiveSourceId(initialSourceId);
    }
  }, [initialSourceId]);

  const [previewReport, setPreviewReport] = useState<PreviewReport | null>(null);
  const [syncResult, setSyncResult] = useState<CrawlResult | null>(null);

  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    created: number;
    updated: number;
    failed: number;
    currentProperty?: string;
    logs: string[];
  }>({
    current: 0,
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
    currentProperty: "",
    logs: [],
  });

  // 1. Checagem inicial de status ao abrir o modal (detecta se o servidor já está importando em 2º plano)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const checkRunningJob = async () => {
      const sourceId = activeSourceId || initialSourceId;
      if (!sourceId) {
        if (autoStartSync && initialDomain) {
          startSyncStream(undefined, initialDomain);
        }
        return;
      }

      try {
        const res = await fetch(`/api/website-import/sync?websiteSourceId=${sourceId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.running) {
            setStep("syncing");
            setIsLoading(true);
            if (data.jobProgress) {
              setImportProgress((prev) => ({
                ...prev,
                current: data.jobProgress.current,
                total: data.jobProgress.total || prev.total,
                created: data.jobProgress.created,
                updated: data.jobProgress.updated,
                failed: data.jobProgress.failed,
                currentProperty: data.jobProgress.currentProperty,
              }));
            } else if (data.latestRun) {
              setImportProgress((prev) => ({
                ...prev,
                current: data.latestRun.pages_crawled,
                total: data.latestRun.items_found || prev.total,
                created: data.latestRun.items_created,
                updated: data.latestRun.items_updated,
                failed: data.latestRun.items_failed,
                logs: ["Conectado ao processo de sincronização em segundo plano no servidor..."],
              }));
            }
            startSyncStream(sourceId, initialDomain);
            return;
          }
        }
      } catch {}

      if (autoStartSync && (sourceId || initialDomain)) {
        startSyncStream(sourceId, initialDomain);
      }
    };

    checkRunningJob();
    return () => {
      isMounted = false;
    };
  }, [isOpen, autoStartSync, initialSourceId, activeSourceId, initialDomain]);

  // 2. Polling contínuo de status enquanto step === "syncing" (garante progresso mesmo se SSE desconectar)
  useEffect(() => {
    const currentId = activeSourceId || initialSourceId;
    if (!isOpen || step !== "syncing" || !currentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/website-import/sync?websiteSourceId=${currentId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.jobProgress) {
          setImportProgress((prev) => ({
            ...prev,
            current: data.jobProgress.current,
            total: data.jobProgress.total || prev.total,
            created: data.jobProgress.created,
            updated: data.jobProgress.updated,
            failed: data.jobProgress.failed,
            currentProperty: data.jobProgress.currentProperty || prev.currentProperty,
            logs:
              data.jobProgress.currentProperty &&
              prev.logs[0] !== data.jobProgress.currentProperty
                ? [
                    data.jobProgress.currentProperty,
                    ...prev.logs
                      .filter((l) => l !== data.jobProgress.currentProperty)
                      .slice(0, 8),
                  ]
                : prev.logs,
          }));
        } else if (data.latestRun) {
          setImportProgress((prev) => ({
            ...prev,
            current: data.latestRun.pages_crawled,
            total: data.latestRun.items_found || prev.total,
            created: data.latestRun.items_created,
            updated: data.latestRun.items_updated,
            failed: data.latestRun.items_failed,
          }));

          if (
            data.latestRun.status === "completed" ||
            data.latestRun.status === "completed_with_errors"
          ) {
            setSyncResult({
              success: true,
              crawlRunId: data.latestRun.id,
              itemsFound: data.latestRun.items_found,
              itemsCreated: data.latestRun.items_created,
              itemsUpdated: data.latestRun.items_updated,
              itemsDeactivated: data.latestRun.items_deactivated || 0,
              itemsFailed: data.latestRun.items_failed,
              pagesCrawled: data.latestRun.pages_crawled,
              durationMs: data.latestRun.duration_ms || 0,
              status: data.latestRun.status,
            });
            setStep("completed");
            setIsLoading(false);
            if (onSuccess) onSuccess();
          }
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, step, initialSourceId, activeSourceId]);

  if (!isOpen) return null;

  const handleForceClose = () => {
    setStep("input");
    setUrl(initialDomain || "");
    setAuthChecked(false);
    setPreviewReport(null);
    setSyncResult(null);
    setErrorMessage(null);
    setIsLoading(false);
    setIsInterrupted(false);
    setShowCancelPrompt(false);
    setImportProgress({
      current: 0,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      currentProperty: "",
      logs: [],
    });
    onClose();
  };

  const handleClose = handleForceClose;

  const handleHeaderCloseClick = () => {
    // Se a importação estiver ativa no servidor, pergunta se o usuário quer parar ou manter em 2º plano
    if (step === "syncing" && !isInterrupted && isLoading) {
      setShowCancelPrompt(true);
      return;
    }
    handleForceClose();
  };

  const cancelActiveSync = async () => {
    setIsCancelling(true);
    const targetSourceId = activeSourceId || initialSourceId;
    try {
      if (targetSourceId) {
        await fetch("/api/website-import/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel",
            websiteSourceId: targetSourceId,
          }),
        });
      }
    } catch {}
    setIsCancelling(false);
    setShowCancelPrompt(false);
    handleForceClose();
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

  // Executa o streaming SSE para sincronização do website com suporte a retomada
  const startSyncStream = async (
    targetSourceId?: string,
    targetDomain?: string,
    resumeFromIndex?: number
  ) => {
    const domainToSync = targetDomain || previewReport?.domain || url;
    if (!domainToSync && !targetSourceId) return;

    const isResuming = typeof resumeFromIndex === "number" && resumeFromIndex > 0;

    setIsLoading(true);
    setIsInterrupted(false);
    setErrorMessage(null);
    setStep("syncing");

    const totalExpected =
      previewReport?.listingsFound || importProgress.total || 0;

    if (!isResuming) {
      setImportProgress({
        current: 0,
        total: totalExpected,
        created: 0,
        updated: 0,
        failed: 0,
        currentProperty: "Conectando ao crawler...",
        logs: ["Conexão estabelecida. Iniciando análise e normalização dos imóveis..."],
      });
    } else {
      setImportProgress((prev) => ({
        ...prev,
        currentProperty: `Retomando a partir do anúncio #${resumeFromIndex + 1}...`,
        logs: [
          `Retomando sincronização a partir do anúncio #${resumeFromIndex + 1} de ${totalExpected}...`,
          ...prev.logs.slice(0, 8),
        ],
      }));
    }

    let receivedComplete = false;

    try {
      const response = await fetch("/api/website-import/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          agencyId,
          websiteSourceId: targetSourceId,
          url: domainToSync,
          startIndex: isResuming ? resumeFromIndex : undefined,
          stream: true,
        }),
      });

      if (!response.ok) {
        let errorMsg = `Erro no servidor (HTTP ${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          const text = await response.text().catch(() => "");
          if (text.includes("504") || text.includes("Gateway Timeout")) {
            errorMsg =
              "O servidor demorou para responder (Gateway Timeout). A sincronização continua sendo processada em segundo plano.";
          }
        }
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error("O servidor não iniciou o fluxo de streaming.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;

          const eventMatch = rawEvent.match(/^event:\s*(.+)$/m);
          const dataMatch = rawEvent.match(/^data:\s*(.+)$/m);

          const eventType = eventMatch ? eventMatch[1].trim() : "message";
          const dataStr = dataMatch ? dataMatch[1].trim() : null;

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === "init") {
              if (data.websiteSourceId) {
                setActiveSourceId(data.websiteSourceId);
              }
            } else if (eventType === "progress") {
              setImportProgress((prev) => {
                const newLogs =
                  data.currentProperty &&
                  prev.logs[0] !== data.currentProperty
                    ? [
                        data.currentProperty,
                        ...prev.logs
                          .filter((l) => l !== data.currentProperty)
                          .slice(0, 8),
                      ]
                    : prev.logs;

                return {
                  current: data.current ?? prev.current,
                  total: data.total ?? prev.total,
                  created: data.created ?? prev.created,
                  updated: data.updated ?? prev.updated,
                  failed: data.failed ?? prev.failed,
                  currentProperty: data.currentProperty ?? prev.currentProperty,
                  logs: newLogs,
                };
              });
            } else if (eventType === "complete") {
              receivedComplete = true;
              setSyncResult(data.result);
              setStep("completed");
              if (onSuccess) onSuccess();
            } else if (eventType === "error") {
              throw new Error(data.message || "Erro durante a importação.");
            }
          } catch (parseErr: any) {
            if (eventType === "error") throw parseErr;
            console.warn("Falha ao analisar evento do stream:", parseErr);
          }
        }
      }

      // Se a conexão encerrou sem emitir o evento "complete", checa se o processo continua rodando no servidor
      if (!receivedComplete) {
        const sourceId = activeSourceId || initialSourceId;
        if (sourceId) {
          try {
            const checkRes = await fetch(`/api/website-import/sync?websiteSourceId=${sourceId}`);
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.running) {
                // O job no servidor continua firme e forte! O polling cuidará de atualizar a tela até 100%.
                setIsInterrupted(false);
                setIsLoading(true);
                return;
              }
              if (
                checkData.latestRun?.status === "completed" ||
                checkData.latestRun?.status === "completed_with_errors"
              ) {
                setSyncResult({
                  success: true,
                  crawlRunId: checkData.latestRun.id,
                  itemsFound: checkData.latestRun.items_found,
                  itemsCreated: checkData.latestRun.items_created,
                  itemsUpdated: checkData.latestRun.items_updated,
                  itemsDeactivated: checkData.latestRun.items_deactivated || 0,
                  itemsFailed: checkData.latestRun.items_failed,
                  pagesCrawled: checkData.latestRun.pages_crawled,
                  durationMs: checkData.latestRun.duration_ms || 0,
                  status: checkData.latestRun.status,
                });
                setStep("completed");
                setIsLoading(false);
                if (onSuccess) onSuccess();
                return;
              }
            }
          } catch {}
        }
        setIsInterrupted(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro inesperado durante a importação.");
      setIsInterrupted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Etapa 2: Confirmar e Importar
  const handleConfirmImport = async () => {
    if (!previewReport) return;
    await startSyncStream(activeSourceId || initialSourceId, previewReport.domain);
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
            onClick={handleHeaderCloseClick}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar ou Parar Importação"
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
          {/* ETAPA 3: PROCESSANDO IMPORTAÇÃO (STREAMING EM TEMPO REAL) */}
          {/* ========================================================================= */}
          {step === "syncing" && (
            <div className="py-6 space-y-6">
              <div className="text-center space-y-2">
                <div
                  className={`inline-flex p-3 rounded-2xl ${
                    isInterrupted
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                      : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  } mb-1`}
                >
                  {isInterrupted ? (
                    <AlertTriangle className="h-8 w-8" />
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isInterrupted
                    ? "Sincronização em Pausa"
                    : "Sincronizando Anúncios do Website..."}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isInterrupted
                    ? `A sincronização foi pausada. Seus dados já processados (${importProgress.current.toLocaleString(
                        "pt-BR"
                      )} de ${importProgress.total.toLocaleString(
                        "pt-BR"
                      )} imóveis) estão salvos com segurança no banco de dados.`
                    : "Importando em segundo plano no servidor. Você pode fechar esta tela ou navegar normalmente — o processo continua até o fim e só para se você clicar em 'Parar'."}
                </p>
              </div>

              {/* Barra de Progresso em Tempo Real */}
              <div className="space-y-2.5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Progresso da Importação
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {Math.min(
                      100,
                      Math.round(
                        (importProgress.current / Math.max(1, importProgress.total)) * 100
                      )
                    )}
                    %
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (importProgress.current / Math.max(1, importProgress.total)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    {importProgress.current.toLocaleString("pt-BR")} de{" "}
                    {importProgress.total.toLocaleString("pt-BR")} imóveis processados
                  </span>
                  {importProgress.currentProperty && (
                    <span className="truncate max-w-[280px] font-medium text-slate-500 dark:text-slate-400">
                      {importProgress.currentProperty}
                    </span>
                  )}
                </div>
              </div>

              {/* Indicadores Dinâmicos de Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Criados
                  </span>
                  <p className="mt-1 text-base font-black text-emerald-700 dark:text-emerald-300">
                    {importProgress.created.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-center">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Atualizados
                  </span>
                  <p className="mt-1 text-base font-black text-indigo-700 dark:text-indigo-300">
                    {importProgress.updated.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Falhas
                  </span>
                  <p className="mt-1 text-base font-black text-slate-700 dark:text-slate-300">
                    {importProgress.failed.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Log de Atividade ao Vivo */}
              {importProgress.logs.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-300 text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1.5">
                    <Activity className="h-3.5 w-3.5 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider">
                      Feed de Execução em Tempo Real
                    </span>
                  </div>
                  {importProgress.logs.map((log, idx) => (
                    <p key={idx} className="text-[11px] truncate text-slate-400">
                      › {log}
                    </p>
                  ))}
                </div>
              )}

              {/* Botões de Ação durante Sincronização ou Pausa */}
              {isInterrupted ? (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("completed");
                      if (onSuccess) onSuccess();
                    }}
                    className="rounded-xl h-11 px-5 text-xs font-semibold cursor-pointer"
                  >
                    Ver Imóveis Sincronizados ({importProgress.current})
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      startSyncStream(
                        activeSourceId || initialSourceId,
                        previewReport?.domain || initialDomain,
                        importProgress.current
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 text-xs font-bold gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Continuar Sincronização (a partir de {importProgress.current})
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCancelPrompt(true)}
                    disabled={isCancelling}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 rounded-xl h-11 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Parar Importação
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl h-11 px-5 text-xs font-semibold cursor-pointer"
                  >
                    Minimizar (Continuar em 2º Plano)
                  </Button>
                </div>
              )}
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

        {/* Modal de Confirmação para Parar ou Manter em Segundo Plano */}
        {showCancelPrompt && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Sincronização em Andamento
                </h4>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Já foram processados <strong className="text-slate-800 dark:text-slate-200">{importProgress.current}</strong> de{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{importProgress.total}</strong> imóveis.
                  A importação continua rodando no servidor mesmo se você fechar esta janela.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCancelPrompt(false);
                    onClose();
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 text-xs font-bold cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  Continuar em Segundo Plano (Fechar Janela)
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isCancelling}
                  onClick={cancelActiveSync}
                  className="w-full border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:hover:bg-rose-950/30 dark:text-rose-400 rounded-xl h-11 text-xs font-semibold cursor-pointer gap-2"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Interrompendo no Servidor...
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" />
                      Parar Importação Definitivamente
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCancelPrompt(false)}
                  className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs h-9 cursor-pointer"
                >
                  Voltar para o Progresso
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
