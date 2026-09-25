import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAgency } from "@/features/agencies/services";
import { AgencyProfileView } from "@/features/agencies/components/AgencyProfileView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meu Perfil | Painel da Imobiliária",
  description: "Gerencie seu perfil de corretor, dados profissionais e credenciais de acesso",
};

export default async function PanelProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirectTo=/painel/perfil");
  }

  const membership = await getCurrentUserAgency();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <AgencyProfileView user={user} membership={membership} />
    </div>
  );
}
