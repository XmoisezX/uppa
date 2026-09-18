import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { getCurrentUserAgency } from "@/features/agencies/services";
import {
  getPropertyById,
  listFeatures,
  getStatesList,
} from "@/features/properties/services";
import { PropertyWizard } from "@/features/properties/components/PropertyWizard";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Editar Imóvel | Painel do Corretor",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: PageProps) {
  const { id } = await params;
  const membership = await getCurrentUserAgency();

  if (!membership) {
    redirect("/painel/configuracoes");
  }

  const property = await getPropertyById(id);

  // Verificação rigorosa de autorização: o imóvel deve existir e pertencer à imobiliária do usuário
  if (!property || property.agencyId !== membership.agency.id) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <div className="h-12 w-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Acesso Não Autorizado ou Imóvel Inexistente
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Este imóvel não foi encontrado ou pertence a outra imobiliária. Somente membros autorizados da imobiliária dona podem editar o cadastro.
          </p>
          <div className="mt-6">
            <Link href="/painel/imoveis">
              <Button variant="outline" className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Voltar para a Lista de Imóveis
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Carrega catálogo de comodidades e lista de estados brasileiros
  const [availableFeatures, states] = await Promise.all([
    listFeatures(),
    getStatesList(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PropertyWizard
        initialProperty={property}
        availableFeatures={availableFeatures}
        states={states}
      />
    </div>
  );
}
