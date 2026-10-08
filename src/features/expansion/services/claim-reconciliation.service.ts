/**
 * Serviço de Conciliação e Aprovação de Claims com Preservação de Estoque e Proveniência (Seções 22 a 31)
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Aprova uma solicitação de reivindicação (claim) de perfil de imobiliária:
 * 1. Atualiza a MESMA agência existente (não duplica, não cria nova agência);
 * 2. Transfere posse oficial criando vínculo em agency_members como 'owner';
 * 3. Preserva 100% das ofertas (property_offers), leads, mídias e SEO já existentes;
 * 4. Converte fontes descobertas para gerenciadas se aplicável.
 */
export async function approveAgencyClaim(claimId: string, reviewedByUserId: string): Promise<{
  success: boolean;
  agencyId: string;
  userId: string;
  offersPreservedCount: number;
  leadsPreservedCount: number;
}> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Busca a solicitação de claim
  const { data: claim, error: claimErr } = await supabase
    .from("agency_claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (claimErr || !claim) {
    throw new Error("Solicitação de reivindicação não encontrada.");
  }

  if (claim.status !== "pending") {
    throw new Error(`Esta solicitação já foi finalizada com status '${claim.status}'.`);
  }

  const agencyId = claim.agency_id;
  const targetUserId = claim.user_id;

  // 2. Confirma contagem de estoque e leads já existentes da agência
  const [{ count: offersCount }, { count: leadsCount }] = await Promise.all([
    supabase.from("property_offers").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
  ]);

  // 3. Atualiza o perfil da agência existente (NÃO cria agência nova - Seção 23 e 29)
  const { error: agencyUpdateErr } = await supabase
    .from("agencies")
    .update({
      claim_status: "claimed",
      is_official_profile: true,
      claimed_at: nowIso,
      claimed_by: targetUserId,
      updated_at: nowIso,
    } as any)
    .eq("id", agencyId);

  if (agencyUpdateErr) {
    throw new Error(`Falha ao atualizar status da agência: ${agencyUpdateErr.message}`);
  }

  // 4. Cria ou atualiza o vínculo de membro como 'owner' na agência (Seção 23)
  const { error: memberErr } = await supabase
    .from("agency_members")
    .upsert(
      {
        agency_id: agencyId,
        user_id: targetUserId,
        role: "owner",
        created_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "agency_id,user_id" }
    );

  if (memberErr) {
    throw new Error(`Falha ao vincular usuário como responsável da agência: ${memberErr.message}`);
  }

  // 5. Finaliza a solicitação em agency_claims
  await supabase
    .from("agency_claims")
    .update({
      status: "approved",
      reviewed_by: reviewedByUserId,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", claimId);

  // 6. Atualiza contador de claimed_agencies_count na cidade vinculada
  const { data: agencyData } = await supabase
    .from("agencies")
    .select("city_id")
    .eq("id", agencyId)
    .single();

  if (agencyData?.city_id) {
    const { data: cityData } = await supabase
      .from("cities")
      .select("claimed_agencies_count")
      .eq("id", agencyData.city_id)
      .single();

    if (cityData) {
      await supabase
        .from("cities")
        .update({ claimed_agencies_count: (cityData.claimed_agencies_count || 0) + 1 } as any)
        .eq("id", agencyData.city_id);
    }
  }

  return {
    success: true,
    agencyId,
    userId: targetUserId,
    offersPreservedCount: offersCount || 0,
    leadsPreservedCount: leadsCount || 0,
  };
}

/**
 * Converte uma fonte originalmente descoberta pela UPPA para integração gerenciada pela agência (Seção 31)
 */
export async function convertDiscoveredSourceToAgencyManaged(
  websiteSourceId: string,
  userId: string
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("website_sources")
    .update({
      ingestion_origin: "agency_managed",
      created_by: userId,
      updated_at: nowIso,
    } as any)
    .eq("id", websiteSourceId);

  if (error) {
    throw new Error(`Falha ao converter fonte para gestão da agência: ${error.message}`);
  }

  return { success: true };
}
