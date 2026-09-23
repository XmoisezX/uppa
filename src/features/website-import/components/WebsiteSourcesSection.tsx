"use client";

import React, { useState } from "react";
import {
  Globe,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WebsiteSource } from "../types";
import { WebsiteImportModal } from "./WebsiteImportModal";

interface WebsiteSourcesSectionProps {
  agencyId: string;
  agencyName: string;
  initialSources: WebsiteSource[];
}

export function WebsiteSourcesSection({
  agencyId,
  agencyName,
  initialSources,
}: WebsiteSourcesSectionProps) {
  const [sources, setSources] = useState<WebsiteSource[]>(initialSources);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSourceForSync, setSelectedSourceForSync] = useState<{
    id: string;
    domain: string;
  } | null>(null);

  const handleManualSync = (sourceId: string, domain: string) => {
    setSelectedSourceForSync({ id: sourceId, domain });
    setIsModalOpen(true);
  };

  const handleOpenNewWebsiteModal = () => {
    setSelectedSourceForSync(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Importação via Website Próprio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sincronização direta a partir do domínio e sitemap do site da sua imobiliária
          </p>
        </div>

        <Button
          onClick={handleOpenNewWebsiteModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 gap-1.5 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Importar Novo Website
        </Button>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/20">
          <Globe className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Nenhum website importado ainda
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Informe o domínio do seu site para que a UPPA descubra e sincronize seus
            imóveis automaticamente.
          </p>
          <Button
            onClick={handleOpenNewWebsiteModal}
            variant="outline"
            className="mt-4 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Configurar Website Agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source) => (
            <div
              key={source.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Ativo
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Conector: {source.connectorType}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
                  {source.domain}
                  <a
                    href={source.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-indigo-600 inline-block"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Última varredura:{" "}
                  {source.lastCrawlAt
                    ? new Date(source.lastCrawlAt).toLocaleString("pt-BR")
                    : "Nunca executada"}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Intervalo: a cada {source.crawlIntervalHours}h
                </span>

                <Button
                  size="sm"
                  onClick={() => handleManualSync(source.id, source.domain)}
                  className="rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sincronizar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Importação com Preview e Streaming em Tempo Real */}
      <WebsiteImportModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSourceForSync(null);
        }}
        agencyId={agencyId}
        agencyName={agencyName}
        initialSourceId={selectedSourceForSync?.id}
        initialDomain={selectedSourceForSync?.domain}
        autoStartSync={Boolean(selectedSourceForSync)}
        onSuccess={async () => {
          // Recarrega lista
          try {
            const res = await fetch(`/api/website-import/sources?agencyId=${agencyId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.sources) setSources(data.sources);
            }
          } catch {
            // Ignora erro de refresh silencioso
          }
        }}
      />
    </div>
  );
}
