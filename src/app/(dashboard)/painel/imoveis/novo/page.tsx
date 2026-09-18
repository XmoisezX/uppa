import { redirect } from "next/navigation";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { createDraftProperty } from "@/features/properties/services";

export const metadata = {
  title: "Novo Imóvel | Painel do Corretor",
};

export default async function NewPropertyPage() {
  const membership = await getCurrentUserAgency();

  if (!membership) {
    redirect("/painel/configuracoes");
  }

  // Inicializa rascunho seguro vinculado à imobiliária do usuário
  const draft = await createDraftProperty(membership.agency.id);

  // Redireciona imediatamente para o Wizard de 7 etapas
  redirect(`/painel/imoveis/${draft.id}/editar`);
}
