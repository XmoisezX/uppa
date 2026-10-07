"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminUser } from "@/features/admin/services/auth";
import { PropertyConsolidationService } from "../services/property-consolidation.service";
import { PropertyMatchingService, type PropertyPhysicalProfile } from "../services/property-matching.service";

/**
 * Consulta candidatos de duplicação com filtros e paginação para o painel admin (Fase 20)
 */
export async function getMatchCandidatesAction(params?: {
  status?: string;
  confidence?: string;
  page?: number;
  limit?: number;
}) {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    throw new Error("Não autorizado. Acesso restrito a administradores.");
  }

  const supabase = createAdminClient();
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(50, Math.max(1, params?.limit || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("property_match_candidates" as any)
    .select(`
      *,
      property_a:properties!property_a_id (
        id, title, slug, status, external_id, property_type,
        usable_area, total_area, bedrooms, suites, bathrooms, parking_spaces,
        street, number, complement, zipcode, latitude, longitude,
        price, rent_price, active_offers_count,
        agency:agencies(id, name, logo_url)
      ),
      property_b:properties!property_b_id (
        id, title, slug, status, external_id, property_type,
        usable_area, total_area, bedrooms, suites, bathrooms, parking_spaces,
        street, number, complement, zipcode, latitude, longitude,
        price, rent_price, active_offers_count,
        agency:agencies(id, name, logo_url)
      )
    `, { count: "exact" });

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params?.confidence && params.confidence !== "all") {
    query = query.eq("confidence", params.confidence);
  }

  const { data, count, error } = await query
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Falha ao carregar candidatos: ${error.message}`);
  }

  return {
    candidates: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Aprova agrupamento de duas propriedades (Fase 20 e 4)
 */
export async function approveCandidateMatchAction(candidateId: string, notes?: string) {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const supabase = createAdminClient();

    // 1. Carrega o candidato
    const { data: candidate, error: candErr } = await supabase
      .from("property_match_candidates" as any)
      .select("*, property_a:properties!property_a_id(*), property_b:properties!property_b_id(*)")
      .eq("id", candidateId)
      .single();

    if (candErr || !candidate) {
      return { success: false, error: "Candidato de duplicação não encontrado." };
    }

    const propA = candidate.property_a as any;
    const propB = candidate.property_b as any;

    if (!propA || !propB) {
      return { success: false, error: "Propriedades vinculadas não encontradas." };
    }

    const profileA: PropertyPhysicalProfile = {
      id: propA.id,
      title: propA.title,
      slug: propA.slug,
      propertyType: propA.property_type,
      street: propA.street,
      number: propA.number,
      complement: propA.complement,
      neighborhoodId: propA.neighborhood_id,
      cityId: propA.city_id,
      stateId: propA.state_id,
      zipcode: propA.zipcode,
      latitude: propA.latitude,
      longitude: propA.longitude,
      usableArea: propA.usable_area,
      totalArea: propA.total_area,
      lotArea: propA.lot_area ?? null,
      bedrooms: propA.bedrooms,
      suites: propA.suites,
      bathrooms: propA.bathrooms,
      parkingSpaces: propA.parking_spaces,
      createdAt: propA.created_at,
      activeOffersCount: propA.active_offers_count,
    };

    const profileB: PropertyPhysicalProfile = {
      id: propB.id,
      title: propB.title,
      slug: propB.slug,
      propertyType: propB.property_type,
      street: propB.street,
      number: propB.number,
      complement: propB.complement,
      neighborhoodId: propB.neighborhood_id,
      cityId: propB.city_id,
      stateId: propB.state_id,
      zipcode: propB.zipcode,
      latitude: propB.latitude,
      longitude: propB.longitude,
      usableArea: propB.usable_area,
      totalArea: propB.total_area,
      lotArea: propB.lot_area ?? null,
      bedrooms: propB.bedrooms,
      suites: propB.suites,
      bathrooms: propB.bathrooms,
      parkingSpaces: propB.parking_spaces,
      createdAt: propB.created_at,
      activeOffersCount: propB.active_offers_count,
    };

    const consolidationService = new PropertyConsolidationService(supabase);
    const result = await consolidationService.mergeProperties({
      propertyA: profileA,
      propertyB: profileB,
      candidateId,
      reviewedBy: adminUser.id,
      notes: notes || "Aprovado via painel de administração",
    });

    revalidatePath("/admin/duplicidades");
    revalidatePath("/admin/imoveis");

    return {
      success: true,
      result,
    };
  } catch (error: any) {
    console.error("[approveCandidateMatchAction] Erro:", error);
    return { success: false, error: error?.message || "Falha ao aprovar agrupamento" };
  }
}

/**
 * Rejeita candidato de duplicidade (Fase 20)
 */
export async function rejectCandidateMatchAction(candidateId: string, notes?: string) {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("property_match_candidates" as any)
      .update({
        status: "rejected",
        reviewed_by: adminUser.id,
        reviewed_at: nowIso,
        decision_notes: notes || "Rejeitado: imóveis mantidos separados",
        updated_at: nowIso,
      })
      .eq("id", candidateId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/duplicidades");
    return { success: true };
  } catch (error: any) {
    console.error("[rejectCandidateMatchAction] Erro:", error);
    return { success: false, error: error?.message || "Falha ao rejeitar candidato" };
  }
}

/**
 * Desfaz agrupamento revertendo as ofertas para a propriedade original (Fase 21)
 */
export async function unmergePropertyAction(mergedPropertyId: string) {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    return { success: false, error: "Acesso não autorizado." };
  }

  try {
    const supabase = createAdminClient();
    const consolidationService = new PropertyConsolidationService(supabase);
    const result = await consolidationService.unmergeProperty(mergedPropertyId);

    revalidatePath("/admin/duplicidades");
    revalidatePath("/admin/imoveis");

    return {
      success: true,
      result,
    };
  } catch (error: any) {
    console.error("[unmergePropertyAction] Erro:", error);
    return { success: false, error: error?.message || "Falha ao desfazer agrupamento" };
  }
}
