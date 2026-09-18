import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { getAgencyProperties } from "@/features/properties/services";
import { PropertiesListView } from "@/features/properties/components/PropertiesListView";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Gestão de Imóveis | Painel do Corretor",
  description: "Gerencie o portfólio de imóveis da sua imobiliária.",
};

export default async function PanelPropertiesPage() {
  const membership = await getCurrentUserAgency();

  // Se o usuário não possui imobiliária vinculada, exibe aviso e link de onboarding
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
            Vincule sua Imobiliária para Gerenciar Imóveis
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            O cadastro e a gestão de imóveis exigem vínculo com uma imobiliária parceira no portal.
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

  // Carrega imóveis da imobiliária
  const { properties, total } = await getAgencyProperties(membership.agency.id, {
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o Painel
      </Link>

      <PropertiesListView
        initialProperties={properties}
        total={total}
        agencyName={membership.agency.name}
      />
    </div>
  );
}
