import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { getAgencyFeeds, getFeedRuns } from "@/features/feeds/services";
import { FeedsDashboardView } from "@/features/feeds/components/FeedsDashboardView";
import { Button } from "@/components/ui/button";

import { getAgencyWebsiteSources } from "@/features/website-import/services";
import { WebsiteSourcesSection } from "@/features/website-import/components/WebsiteSourcesSection";

export const metadata = {
  title: "Integrações, Website Import & Feeds | Painel da Imobiliária",
  description: "Gerencie a importação via website próprio e sincronização de imóveis via feeds VRSync.",
};

export default async function PanelIntegrationsPage() {
  const membership = await getCurrentUserAgency();

  if (!membership) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/painel"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o Painel
        </Link>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="h-12 w-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Vincule sua Imobiliária para Configurar Integrações
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            A integração permite sincronizar seu portfólio completo automaticamente a partir do seu site oficial ou feeds de CRM.
          </p>
          <div className="mt-6">
            <Link href="/painel/configuracoes">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Cadastrar Imobiliária Agora
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const agencyId = membership.agency.id;
  const feeds = await getAgencyFeeds(agencyId);
  const websiteSources = await getAgencyWebsiteSources(agencyId);

  // Carrega histórico das últimas execuções
  const allRuns = feeds.length > 0 && feeds[0].id ? await getFeedRuns(feeds[0].id, 15) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o Painel
      </Link>

      {/* SEÇÃO 1: WEBSITE IMPORT (NOVO MÉTODO DE AQUISIÇÃO POR DOMÍNIO) */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <WebsiteSourcesSection
          agencyId={agencyId}
          agencyName={membership.agency.name}
          initialSources={websiteSources}
        />
      </div>

      {/* SEÇÃO 2: FEEDS XML & VRSYNC */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <FeedsDashboardView
          initialFeeds={feeds}
          initialRuns={allRuns}
          agencyName={membership.agency.name}
        />
      </div>
    </div>
  );
}
