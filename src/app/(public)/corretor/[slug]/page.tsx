import React from "react";
import Link from "next/link";
import { ArrowLeft, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrokerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BrokerPage({ params }: BrokerPageProps) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para a busca
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Perfil do Corretor (Estrutura Preparada)
            </h1>
            <p className="text-xs font-mono text-slate-500">Slug: {slug}</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Esta rota pública exibirá as credenciais de CRECI e imóveis administrados
          pelo corretor de imóveis credenciado (conforme Seção 6 do MASTER_PLAN).
        </p>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Link href="/">
            <Button variant="outline">Retornar à Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
