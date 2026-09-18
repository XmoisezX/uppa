import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { AgencySettingsView } from "@/features/agencies/AgencySettingsView";

export default async function PanelSettingsPage() {
  const membership = await getCurrentUserAgency();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <Link
          href="/painel"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o Painel
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Configurações da Imobiliária
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gerencie os dados cadastrais da imobiliária, canais de contato de leads e informações do CRECI.
        </p>
      </div>

      <AgencySettingsView membership={membership} />
    </div>
  );
}
