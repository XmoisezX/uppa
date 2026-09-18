import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PanelTeamPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o Painel
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Equipe da Imobiliária
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Gerenciamento de membros, corretores e permissões da imobiliária (Prompt 3).
        </p>
      </div>
    </div>
  );
}
