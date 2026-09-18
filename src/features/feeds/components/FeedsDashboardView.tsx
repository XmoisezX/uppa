"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Rss,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Database,
  Building2,
  FileCode,
  ShieldCheck,
  Upload,
  FileUp,
  FileText,
  Sparkles,
  Zap,
  X,
  Play,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveFeedAction,
  getFeedRunErrorsAction,
} from "@/features/feeds/actions";
import type { FeedWithLatestRun, FeedRun, FeedError } from "@/types/feed";

interface FeedsDashboardViewProps {
  initialFeeds: FeedWithLatestRun[];
  initialRuns: FeedRun[];
  agencyName: string;
}

interface StreamingProgressState {
  current: number;
  total: number;
  created: number;
  updated: number;
  failed: number;
  currentProperty?: {
    externalId: string;
    title: string;
    status: "created" | "updated" | "failed";
    error?: string;
  };
  logs: Array<{
    externalId: string;
    title: string;
    status: "created" | "updated" | "failed";
    error?: string;
  }>;
}

export function FeedsDashboardView({
  initialFeeds,
  initialRuns,
  agencyName,
}: FeedsDashboardViewProps) {
  const router = useRouter();
  const [feeds, setFeeds] = useState<FeedWithLatestRun[]>(initialFeeds);
  const [runs, setRuns] = useState<FeedRun[]>(initialRuns);

  // Estados de criação por URL
  const [showNewFeedModal, setShowNewFeedModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [isSavingFeed, setIsSavingFeed] = useState(false);

  // Estados de Upload de Arquivo XML
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStats, setFileStats] = useState<{
    itemCount: number;
    sizeFormatted: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Modal de Progresso em Tempo Real (Streaming)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<
    "idle" | "running" | "completed" | "completed_with_errors" | "failed"
  >("idle");
  const [importTitle, setImportTitle] = useState("");
  const [importSubtitle, setImportSubtitle] = useState("");
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<StreamingProgressState>({
    current: 0,
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
    logs: [],
  });

  // Estados de visualização de erros granulares no histórico
  const [selectedRunErrors, setSelectedRunErrors] = useState<{
    runId: string;
    errors: FeedError[];
    loading: boolean;
  } | null>(null);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Nunca sincronizado";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Processamento do arquivo selecionado (análise client-side de contagem prévia)
  const handleFileChange = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml") && file.type !== "text/xml") {
      alert("Por favor selecione um arquivo no formato .xml válido.");
      return;
    }

    setSelectedFile(file);
    const sizeStr = formatFileSize(file.size);

    try {
      // Lê os primeiros 2MB ou o arquivo inteiro para estimativa de anúncios
      const text = await file.text();
      const listingMatches = text.match(/<(Listing|Imovel)\b/gi) || [];
      setFileStats({
        itemCount: listingMatches.length,
        sizeFormatted: sizeStr,
      });
    } catch {
      setFileStats({
        itemCount: 0,
        sizeFormatted: sizeStr,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Motor Central de Streaming de Importação (Server-Sent Events)
  const startStreamingImport = async (params: {
    file?: File;
    xmlPayload?: string;
    feedId?: string;
    filename?: string;
    title: string;
    subtitle?: string;
  }) => {
    setImportTitle(params.title);
    setImportSubtitle(params.subtitle || "Acompanhamento granular em tempo real");
    setImportStatus("running");
    setImportErrorMessage(null);
    setImportProgress({
      current: 0,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      logs: [],
    });
    setIsImportModalOpen(true);
    setShowUploadModal(false);

    try {
      let response: Response;

      if (params.file) {
        const formData = new FormData();
        formData.append("file", params.file);
        if (params.feedId) formData.append("feedId", params.feedId);
        response = await fetch("/api/feeds/import-stream", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/feeds/import-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedId: params.feedId,
            xmlPayload: params.xmlPayload,
            filename: params.filename,
          }),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro de conexão (HTTP ${response.status})`);
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

            if (eventType === "progress") {
              setImportProgress((prev) => {
                const newLogs = data.currentProperty
                  ? [data.currentProperty, ...prev.logs.slice(0, 19)]
                  : prev.logs;

                return {
                  current: data.current,
                  total: data.total,
                  created: data.created,
                  updated: data.updated,
                  failed: data.failed,
                  currentProperty: data.currentProperty,
                  logs: newLogs,
                };
              });
            } else if (eventType === "complete") {
              const report = data.report;
              const finalStatus =
                report?.status === "completed"
                  ? "completed"
                  : report?.status === "completed_with_errors"
                  ? "completed_with_errors"
                  : "failed";

              setImportStatus(finalStatus);

              if (report?.feedRunId) {
                const newRun: FeedRun = {
                  id: report.feedRunId,
                  feedId: report.feedId,
                  agencyId: "",
                  startedAt: new Date().toISOString(),
                  finishedAt: new Date().toISOString(),
                  status: report.status,
                  itemsFound: report.itemsFound,
                  itemsCreated: report.itemsCreated,
                  itemsUpdated: report.itemsUpdated,
                  itemsDeactivated: report.itemsDeactivated,
                  itemsFailed: report.itemsFailed,
                  createdAt: new Date().toISOString(),
                };

                // Atualiza lista local
                setRuns((prev) => [newRun, ...prev]);
                setFeeds((prev) =>
                  prev.map((f) =>
                    f.id === report.feedId
                      ? { ...f, lastSyncAt: new Date().toISOString(), latestRun: newRun }
                      : f
                  )
                );
              }

              // Atualiza dados de Server Components em segundo plano
              router.refresh();
            } else if (eventType === "error") {
              setImportStatus("failed");
              setImportErrorMessage(data.message || "Falha durante o processamento.");
            }
          } catch (parseErr) {
            console.warn("Falha ao analisar chunk SSE:", parseErr);
          }
        }
      }
    } catch (err: any) {
      console.error("[startStreamingImport] Erro:", err);
      setImportStatus("failed");
      setImportErrorMessage(err?.message || "Erro inesperado durante a sincronização.");
    }
  };

  // Salvar novo Feed por URL
  const handleSaveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    setIsSavingFeed(true);
    try {
      const res = await saveFeedAction({ url: newFeedUrl.trim() });
      if (res.success && res.feed) {
        setFeeds((prev) => [res.feed!, ...prev]);
        setNewFeedUrl("");
        setShowNewFeedModal(false);
      } else {
        alert(res.error || "Erro ao salvar feed.");
      }
    } finally {
      setIsSavingFeed(false);
    }
  };

  // Carregar e exibir erros de uma execução no histórico
  const handleViewErrors = async (runId: string) => {
    if (selectedRunErrors?.runId === runId) {
      setSelectedRunErrors(null);
      return;
    }

    setSelectedRunErrors({ runId, errors: [], loading: true });
    const errors = await getFeedRunErrorsAction(runId);
    setSelectedRunErrors({ runId, errors, loading: false });
  };

  // XML de demonstração padrão VRSync para testes imediatos
  const sampleVRSyncXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync">
  <Header>
    <Provider>${agencyName}</Provider>
    <Email>contato@imobiliaria.com.br</Email>
  </Header>
  <Listings>
    <Listing>
      <ListingID>VR-SAMPLE-01</ListingID>
      <Title>Apartamento Luxo com Vista Panorâmica</Title>
      <TransactionType>For Sale</TransactionType>
      <PropertyType>Residential / Apartment</PropertyType>
      <Description>Apartamento impecável com varanda gourmet, 3 suítes e acabamento de alto padrão.</Description>
      <ListPrice currency="BRL">890000</ListPrice>
      <PropertyAdministrationFee currency="BRL">950</PropertyAdministrationFee>
      <YearlyTax currency="BRL">1800</YearlyTax>
      <Location>
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="SP">São Paulo</State>
        <City>São Paulo</City>
        <Neighborhood>Pinheiros</Neighborhood>
        <Address>Rua dos Pinheiros</Address>
        <StreetNumber>450</StreetNumber>
        <PostalCode>05422-000</PostalCode>
        <Latitude>-23.5671</Latitude>
        <Longitude>-46.6914</Longitude>
      </Location>
      <Details>
        <Bedrooms>3</Bedrooms>
        <Bathrooms>3</Bathrooms>
        <Suites>3</Suites>
        <Garage>2</Garage>
        <LivingArea unit="square metres">115</LivingArea>
        <TotalArea unit="square metres">145</TotalArea>
        <Features>
          <Feature>Piscina</Feature>
          <Feature>Elevador</Feature>
          <Feature>Churrasqueira</Feature>
          <Feature>Ar Condicionado</Feature>
        </Features>
      </Details>
      <Media>
        <Item medium="image" caption="Fachada Moderna">https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
        <Item medium="image" caption="Living Integrado">https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
      </Media>
    </Listing>
    <Listing>
      <ListingID>VR-SAMPLE-02</ListingID>
      <Title>Casa em Condomínio Fechado</Title>
      <TransactionType>For Rent</TransactionType>
      <PropertyType>Residential / Home</PropertyType>
      <Description>Casa ampla com quintal privativo, piscina e área verde em condomínio com segurança 24h.</Description>
      <RentalPrice currency="BRL">5500</RentalPrice>
      <PropertyAdministrationFee currency="BRL">600</PropertyAdministrationFee>
      <Location>
        <State abbreviation="SP">São Paulo</State>
        <City>Campinas</City>
        <Neighborhood>Nova Campinas</Neighborhood>
      </Location>
      <Details>
        <Bedrooms>4</Bedrooms>
        <Bathrooms>4</Bathrooms>
        <Suites>2</Suites>
        <Garage>3</Garage>
        <LivingArea unit="square metres">280</LivingArea>
      </Details>
      <Media>
        <Item medium="image">https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
      </Media>
    </Listing>
  </Listings>
</ListingDataFeed>`;

  const percentProgress =
    importProgress.total > 0
      ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))
      : 0;

  return (
    <div className="space-y-8">
      {/* CABEÇALHO COM BOTÕES DE AÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Integrações & Feeds XML
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {agencyName}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Importe seu estoque por arquivo XML local ou configure sincronização automática via VRSync (VivaReal, ZAP, Imovelweb).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Primário: Upload de Arquivo XML */}
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-10 gap-2 shadow-xs cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload de Arquivo XML
          </Button>

          {/* Botão Secundário: Configurar Feed por URL */}
          <Button
            variant="outline"
            onClick={() => setShowNewFeedModal(true)}
            className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs rounded-xl h-10 gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Configurar Feed por URL
          </Button>
        </div>
      </div>

      {/* ÁREA DE DESTAQUE: UPLOAD RÁPIDO DE ARQUIVO XML (DRAG & DROP) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border-2 transition-all p-6 sm:p-8 ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 scale-[1.005]"
            : "border-dashed border-slate-200 dark:border-slate-800 bg-linear-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/40"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".xml,text/xml"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
              <FileUp className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Arraste e solte seu arquivo XML aqui
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Padrão VRSync oficial aceito por portais e CRMs imobiliários. Acompanhe a importação imóvel a imóvel em tempo real.
              </p>
            </div>
            <div className="pt-1">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="text-xs font-bold rounded-xl h-9 px-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40 cursor-pointer"
              >
                Selecionar Arquivo do Computador
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 shrink-0">
                <FileCode className="h-6 w-6" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    ({fileStats?.sizeFormatted})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓ XML VRSync Válido
                  </span>
                  {fileStats && fileStats.itemCount > 0 && (
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      ~{fileStats.itemCount} anúncios identificados no arquivo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setFileStats(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="h-9 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>

              <Button
                type="button"
                onClick={() =>
                  startStreamingImport({
                    file: selectedFile,
                    title: selectedFile.name,
                    subtitle: `Importando arquivo local (${fileStats?.sizeFormatted || ""})`,
                  })
                }
                className="h-10 px-5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Iniciar Importação em Tempo Real
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE UPLOAD COMPLETO (CASO O USUÁRIO CLIQUE NO BOTÃO SUPERIOR) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Upload de Arquivo XML
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione o arquivo exportado pelo seu sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-400 dark:hover:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20 p-8 rounded-2xl text-center cursor-pointer transition-colors space-y-2"
            >
              <FileUp className="h-8 w-8 text-indigo-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedFile ? selectedFile.name : "Clique para escolher o arquivo .xml"}
              </p>
              <p className="text-[11px] text-slate-400">
                {fileStats
                  ? `${fileStats.sizeFormatted} • ~${fileStats.itemCount} anúncios identificados`
                  : "Suporte completo ao padrão VRSync"}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                disabled={!selectedFile}
                onClick={() => {
                  if (selectedFile) {
                    startStreamingImport({
                      file: selectedFile,
                      title: selectedFile.name,
                      subtitle: `Importando arquivo local (${fileStats?.sizeFormatted || ""})`,
                    });
                  }
                }}
                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer gap-1.5"
              >
                <Play className="h-3 w-3 fill-current" />
                Iniciar Importação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO DE FEED POR URL */}
      {showNewFeedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                  <Rss className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Configurar Feed por URL
                  </h3>
                  <p className="text-xs text-slate-500">
                    Para sincronização periódica contínua
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewFeedModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeed} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  URL Pública do XML / Feed VRSync
                </label>
                <Input
                  placeholder="https://meu-crm.com.br/feeds/vivareal.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  required
                  className="h-11 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  O portal sincronizará seu catálogo de forma automática e contínua a cada 6 horas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFeedModal(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingFeed}
                  size="sm"
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSavingFeed ? "Salvando..." : "Salvar e Ativar Feed"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PROCESSO EM TEMPO REAL (STREAMING GRANULAR ITEM A ITEM) */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-xl w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      importStatus === "running"
                        ? "bg-emerald-500 animate-ping"
                        : importStatus === "completed"
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {importStatus === "running"
                      ? "Importação em Andamento..."
                      : importStatus === "completed"
                      ? "Importação Concluída com Sucesso!"
                      : importStatus === "completed_with_errors"
                      ? "Importação Concluída com Avisos"
                      : "Falha na Importação"}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 max-w-sm truncate">
                  {importTitle} • {importSubtitle}
                </p>
              </div>

              {importStatus !== "running" && (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Barra de Progresso Animada */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {importStatus === "running" ? "Processando catálogo..." : "Progresso total"}
                </span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {importProgress.total > 0
                    ? `${importProgress.current} de ${importProgress.total} imóveis (${percentProgress}%)`
                    : "Lendo e validando XML..."}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    importStatus === "running"
                      ? "bg-linear-to-r from-indigo-500 via-blue-500 to-emerald-500 animate-pulse"
                      : importStatus === "completed"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${percentProgress}%` }}
                />
              </div>
            </div>

            {/* 4 Cartões de Métricas em Tempo Real */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Encontrados
                </span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                  {importProgress.total}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Novos
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {importProgress.created}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 block">
                  Atualizados
                </span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {importProgress.updated}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                  Erros
                </span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {importProgress.failed}
                </span>
              </div>
            </div>

            {/* Ticker do Imóvel Atualmente em Processamento */}
            {importStatus === "running" && importProgress.currentProperty && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-indigo-600 shrink-0 animate-spin" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                      Salvando agora:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      [{importProgress.currentProperty.externalId}]
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
                    {importProgress.currentProperty.title}
                  </p>
                </div>
              </div>
            )}

            {/* Mensagem de Erro Fatal */}
            {importErrorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Falha na execução:</span>
                  <span>{importErrorMessage}</span>
                </div>
              </div>
            )}

            {/* Histórico Recente de Itens Processados (Log Ticker) */}
            {importProgress.logs.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Últimos imóveis processados:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {importProgress.logs.slice(0, 5).map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                            log.status === "created"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : log.status === "updated"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {log.status === "created"
                            ? "Novo"
                            : log.status === "updated"
                            ? "Atualizado"
                            : "Erro"}
                        </span>
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-400 shrink-0">
                          {log.externalId}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                          {log.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações ao Concluir */}
            {importStatus !== "running" && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/painel/imoveis"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver Imóveis no Painel
                </Link>

                <Button
                  onClick={() => setIsImportModalOpen(false)}
                  className="h-10 px-6 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer"
                >
                  Concluir e Fechar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LISTAGEM DE FEEDS */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Feeds Cadastrados ({feeds.length})
        </h2>

        {feeds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center bg-white dark:bg-slate-900">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Rss className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhum feed cadastrado
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
              Você pode fazer o upload direto de arquivos XML na área acima ou cadastrar a URL fornecida pelo seu CRM.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {feeds.map((feed) => {
              const isUploadFeed = feed.url.startsWith("upload://");
              const lr = feed.latestRun;

              return (
                <div
                  key={feed.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30">
                          {feed.type.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {feed.status === "active" ? "Ativo" : feed.status}
                        </span>
                        {feed.syncLockedUntil && new Date(feed.syncLockedUntil) > new Date() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 animate-pulse">
                            🔒 Sincronização em execução
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {isUploadFeed
                            ? "(Origem: Upload de Arquivo XML)"
                            : `(Ciclo automático: a cada ${Math.round(feed.syncIntervalMinutes / 60)}h)`}
                        </span>
                      </div>

                      {isUploadFeed ? (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                          <FileCode className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Arquivo: {feed.url.replace("upload://", "")}</span>
                        </div>
                      ) : (
                        <a
                          href={feed.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-indigo-600 truncate block max-w-xl"
                        >
                          {feed.url}
                        </a>
                      )}

                      {feed.nextSyncAt && !isUploadFeed && (
                        <span className="text-[11px] text-slate-500 block">
                          Próximo agendamento automático: <strong>{formatDate(feed.nextSyncAt)}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão de Teste com Payload Exemplo */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          startStreamingImport({
                            feedId: feed.id,
                            xmlPayload: sampleVRSyncXml,
                            filename: "exemplo_vrsync.xml",
                            title: "XML Exemplo VRSync",
                            subtitle: "Simulação de 2 imóveis em tempo real",
                          })
                        }
                        className="h-10 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
                        title="Simula importação com 2 imóveis no padrão VRSync oficial"
                      >
                        <FileCode className="h-4 w-4 text-slate-500" />
                        Testar com XML Exemplo
                      </Button>

                      {/* Botão de Sincronização com Streaming em Tempo Real */}
                      {!isUploadFeed ? (
                        <Button
                          onClick={() =>
                            startStreamingImport({
                              feedId: feed.id,
                              title: feed.url,
                              subtitle: "Sincronizando feed remoto em tempo real",
                            })
                          }
                          className="h-10 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Sincronizar Agora
                        </Button>
                      ) : (
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="h-10 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs cursor-pointer"
                        >
                          <Upload className="h-4 w-4" />
                          Atualizar Arquivo
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* PAINEL DE MÉTRICAS DA ÚLTIMA SINCRONIZAÇÃO */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Última sincronização:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {formatDate(feed.lastSyncAt)}
                        </strong>
                      </div>
                      {lr && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Status:</span>
                          <span
                            className={`font-semibold text-xs ${
                              lr.status === "completed"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : lr.status === "completed_with_errors"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {lr.status === "completed"
                              ? "Sucesso"
                              : lr.status === "completed_with_errors"
                              ? "Com Avisos"
                              : "Falhou"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Encontrados
                        </span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                          {lr ? lr.itemsFound : 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                          Novos
                        </span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {lr ? lr.itemsCreated : 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
                          Atualizados
                        </span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {lr ? lr.itemsUpdated : 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Desativados
                        </span>
                        <span className="text-lg font-black text-slate-500">
                          {lr ? lr.itemsDeactivated : 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-500 block">
                          Erros
                        </span>
                        <span className="text-lg font-black text-rose-600">
                          {lr ? lr.itemsFailed : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTÓRICO DE EXECUÇÕES (feed_runs) */}
      {runs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Histórico de Execuções
          </h2>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Início</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Encontrados</th>
                    <th className="py-3 px-4 text-center">Criados</th>
                    <th className="py-3 px-4 text-center">Atualizados</th>
                    <th className="py-3 px-4 text-center">Erros</th>
                    <th className="py-3 px-4 text-right sm:pr-6">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {runs.map((run) => (
                    <React.Fragment key={run.id}>
                      <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {formatDate(run.startedAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              run.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : run.status === "completed_with_errors"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}
                          >
                            {run.status === "completed"
                              ? "Sucesso"
                              : run.status === "completed_with_errors"
                              ? "Com Avisos"
                              : "Falhou"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">{run.itemsFound}</td>
                        <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">
                          {run.itemsCreated}
                        </td>
                        <td className="py-3.5 px-4 text-center text-indigo-600 font-bold">
                          {run.itemsUpdated}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {run.itemsFailed > 0 ? (
                            <span className="font-bold text-rose-600">{run.itemsFailed}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 sm:pr-6 text-right whitespace-nowrap">
                          {run.itemsFailed > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewErrors(run.id)}
                              className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            >
                              Ver Erros ({run.itemsFailed})
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Sem erros</span>
                          )}
                        </td>
                      </tr>

                      {/* PAINEL EXPANSÍVEL DE ERROS (feed_errors) */}
                      {selectedRunErrors?.runId === run.id && (
                        <tr>
                          <td colSpan={7} className="p-4 bg-rose-50/40 dark:bg-rose-950/10 border-t border-rose-100 dark:border-rose-900/30">
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
                                Falhas registradas nesta execução (feed_errors):
                              </span>
                              {selectedRunErrors.loading ? (
                                <p className="text-xs text-slate-500">Carregando detalhes...</p>
                              ) : selectedRunErrors.errors.length === 0 ? (
                                <p className="text-xs text-slate-500">Nenhum detalhe encontrado.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                  {selectedRunErrors.errors.map((err) => (
                                    <div
                                      key={err.id}
                                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-[11px] flex items-start gap-2"
                                    >
                                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          {err.externalId && (
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                              Código: {err.externalId}
                                            </span>
                                          )}
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                            {err.errorType}
                                          </span>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                                          {err.message}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
