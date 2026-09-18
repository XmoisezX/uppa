import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { getAgencyFeeds, getFeedRuns } from "@/features/feeds/services";
import { FeedsDashboardView } from "@/features/feeds/components/FeedsDashboardView";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Integrações & Feeds XML | Painel da Imobiliária",
  description: "Gerencie a sincronização de imóveis via feeds VRSync e CRMs parceiros.",
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
            Vincule sua Imobiliária para Configurar Feeds
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            A integração de feeds XML/VRSync permite sincronizar seu portfólio completo diretamente do seu CRM para o portal.
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

  // Carrega histórico das últimas execuções
  const allRuns = feeds.length > 0 && feeds[0].id ? await getFeedRuns(feeds[0].id, 15) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o Painel
      </Link>

      <FeedsDashboardView
        initialFeeds={feeds}
        initialRuns={allRuns}
        agencyName={membership.agency.name}
      />
    </div>
  );
}
