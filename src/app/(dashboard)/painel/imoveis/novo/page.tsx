import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { createDraftProperty } from "@/features/properties/services";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Novo Imóvel | Painel do Corretor",
};

export default async function NewPropertyPage() {
  const membership = await getCurrentUserAgency();

  if (!membership) {
    redirect("/painel/configuracoes");
  }

  let draftId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const draft = await createDraftProperty(membership.agency.id);
    draftId = draft.id;
  } catch (err: any) {
    console.error("[NewPropertyPage] Falha ao criar rascunho:", err);
    errorMessage = err?.message || "Não foi possível inicializar o rascunho de imóvel.";
  }

  if (draftId) {
    redirect(`/painel/imoveis/${draftId}/editar`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
        <div className="h-12 w-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Falha ao Criar Novo Imóvel
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {errorMessage}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
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

