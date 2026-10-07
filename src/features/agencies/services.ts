import { cache } from "react";
import { createClient, createPublicServerClient } from "@/lib/supabase/server";
import type {
  Agency,
  AgencyPublicProfile,
  AgencyStockOfferItem,
  AgencyClaim,
  CreateAgencyClaimInput,
  AgencyProfileRequest,
  CreateAgencyProfileRequestInput,
  UserAgencyMembership,
} from "@/types/agency";
import type { CreateAgencyInput } from "@/lib/validations/agency";
import type { Database } from "@/types/database.types";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  townhouse: "Sobrado",
  condo_house: "Casa de Condomínio",
  penthouse: "Cobertura",
  studio: "Studio",
  loft: "Loft",
  kitnet: "Kitnet",
  land: "Terreno",
  commercial: "Comercial",
  office: "Sala Comercial",
  warehouse: "Galpão",
  farm: "Chácara / Sítio",
  rural: "Rural",
  other: "Imóvel",
};

function mapAgencyRow(data: any): Agency {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    legalName: data.legal_name,
    document: data.document,
    creci: data.creci,
    phone: data.phone,
    whatsapp: data.whatsapp,
    email: data.email,
    website: data.website,
    logoUrl: data.logo_url,
    description: data.description,
    cityId: data.city_id,
    verifiedAt: data.verified_at,
    status: data.status,
    claimStatus: data.claim_status || "discovered",
    claimedAt: data.claimed_at,
    claimedBy: data.claimed_by,
    createdSource: data.created_source || "crawler",
    commercialAddress: data.commercial_address,
    isOfficialProfile: data.is_official_profile || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retorna a imobiliária e o papel do usuário autenticado no painel
 */
export async function getCurrentUserAgency(): Promise<UserAgencyMembership | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: memberData, error: memberError } = await supabase
    .from("agency_members")
    .select(`
      role,
      status,
      agency:agencies (*)
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !memberData || !memberData.agency) {
    return null;
  }

  return {
    agency: mapAgencyRow(memberData.agency),
    role: memberData.role as any,
    status: memberData.status as any,
  };
}

/**
 * Consulta pública de imobiliária por slug
 */
export const getAgencyBySlug = cache(
  async (slug: string): Promise<Agency | null> => {
    const supabase = createPublicServerClient();

    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;
    return mapAgencyRow(data);
  }
);

/**
 * Consulta o perfil público completo da imobiliária com estoque por offer e métricas
 */
export const getPublicAgencyProfileBySlug = cache(
  async (slug: string): Promise<AgencyPublicProfile | null> => {
    const supabase = createPublicServerClient();

    // 1. Busca a agência
    const { data: agencyData, error: agencyErr } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (agencyErr || !agencyData) return null;
    const agency = mapAgencyRow(agencyData);

    // 2. Busca todas as ofertas ativas desta imobiliária
    const { data: offersData, error: offersErr } = await supabase
      .from("property_offers")
      .select(`
        id,
        price,
        rent_price,
        status,
        property_id,
        property:properties!property_id (
          id,
          slug,
          title,
          property_type,
          transaction_type,
          bedrooms,
          bathrooms,
          parking_spaces,
          usable_area,
          total_area,
          address_visible,
          street,
          city:cities!city_id (
            id,
            name,
            slug
          ),
          state:states!state_id (
            code
          ),
          neighborhood:neighborhoods!neighborhood_id (
            id,
            name,
            slug
          ),
          media:property_media (
            url,
            is_cover,
            position
          )
        ),
        offer_media (
          url,
          is_cover,
          position
        )
      `)
      .eq("agency_id", agency.id)
      .eq("status", "active");

    if (offersErr || !offersData) {
      return {
        agency,
        totalProperties: 0,
        activeOffersCount: 0,
        saleCount: 0,
        rentCount: 0,
        topTypes: [],
        neighborhoods: [],
        stock: [],
        isIndexable: false,
      };
    }

    const uniquePropertyIds = new Set<string>();
    let saleCount = 0;
    let rentCount = 0;
    const typeCountMap = new Map<string, number>();
    const neighborhoodMap = new Map<string, { name: string; count: number }>();
    const stock: AgencyStockOfferItem[] = [];

    for (const row of offersData as any[]) {
      const prop = row.property;
      if (!prop || !prop.id) continue;

      uniquePropertyIds.add(prop.id);

      // Transação da oferta
      const isRent = prop.transaction_type === "rent" || (row.rent_price && !row.price);
      if (isRent) {
        rentCount++;
      } else {
        saleCount++;
      }

      // Tipo de imóvel
      if (prop.property_type) {
        typeCountMap.set(
          prop.property_type,
          (typeCountMap.get(prop.property_type) || 0) + 1
        );
      }

      // Bairro atendido
      if (prop.neighborhood?.name) {
        const nName = prop.neighborhood.name;
        const existing = neighborhoodMap.get(nName);
        if (existing) {
          existing.count++;
        } else {
          neighborhoodMap.set(nName, { name: nName, count: 1 });
        }
      }

      // Mídia específica da offer (com fallback para mídia da property)
      const offerCover =
        row.offer_media?.find((m: any) => m.is_cover)?.url ||
        row.offer_media?.[0]?.url ||
        prop.media?.find((m: any) => m.is_cover)?.url ||
        prop.media?.[0]?.url;

      const mediaCount =
        row.offer_media?.length > 0
          ? row.offer_media.length
          : prop.media?.length || 0;

      stock.push({
        propertyId: prop.id,
        propertySlug: prop.slug,
        propertyTitle: prop.title,
        propertyType: prop.property_type,
        transactionType: prop.transaction_type,
        offerId: row.id,
        offerPrice: row.price,
        offerRentPrice: row.rent_price,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        parkingSpaces: prop.parking_spaces,
        usableArea: prop.usable_area,
        totalArea: prop.total_area,
        addressVisible: prop.address_visible,
        street: prop.street,
        neighborhoodName: prop.neighborhood?.name,
        cityName: prop.city?.name,
        stateCode: prop.state?.code,
        coverImage: offerCover || null,
        imagesCount: mediaCount,
      });
    }

    const topTypes = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({
        type,
        label: PROPERTY_TYPE_LABELS[type] || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const neighborhoods = Array.from(neighborhoodMap.values()).sort(
      (a, b) => b.count - a.count
    );

    const isIndexable =
      agency.status === "active" &&
      stock.length > 0 &&
      Boolean(agency.name);

    return {
      agency,
      totalProperties: uniquePropertyIds.size,
      activeOffersCount: stock.length,
      saleCount,
      rentCount,
      topTypes,
      neighborhoods,
      stock,
      isIndexable,
    };
  }
);

/**
 * Busca agência existente por sinais (CNPJ, CRECI, nome, telefone) para evitar duplicidades no claim
 */
export async function findExistingAgencyBySignals(signals: {
  document?: string;
  creci?: string;
  name?: string;
  phone?: string;
}): Promise<Agency | null> {
  const supabase = createPublicServerClient();

  if (signals.document && signals.document.trim()) {
    const docClean = signals.document.trim();
    const { data } = await supabase
      .from("agencies")
      .select("*")
      .eq("document", docClean)
      .maybeSingle();
    if (data) return mapAgencyRow(data);
  }

  if (signals.creci && signals.creci.trim()) {
    const creciClean = signals.creci.trim().toUpperCase();
    const { data } = await supabase
      .from("agencies")
      .select("*")
      .eq("creci", creciClean)
      .maybeSingle();
    if (data) return mapAgencyRow(data);
  }

  if (signals.name && signals.name.trim()) {
    const nameClean = signals.name.trim();
    const { data } = await supabase
      .from("agencies")
      .select("*")
      .ilike("name", nameClean)
      .maybeSingle();
    if (data) return mapAgencyRow(data);
  }

  return null;
}

/**
 * Submete solicitação de reivindicação (claim) de perfil
 */
export async function submitAgencyClaim(
  input: CreateAgencyClaimInput,
  userId: string
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  const supabase = await createClient();

  // Verifica se o usuário já possui solicitação pendente para esta agência
  const { data: existingPending } = await supabase
    .from("agency_claims" as any)
    .select("id")
    .eq("agency_id", input.agencyId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return {
      success: false,
      error: "Você já possui uma solicitação de reivindicação pendente para esta imobiliária.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("agency_claims" as any)
    .insert({
      agency_id: input.agencyId,
      user_id: userId,
      status: "pending",
      applicant_name: input.applicantName.trim(),
      applicant_role: input.applicantRole.trim(),
      phone: input.phone.trim(),
      professional_email: input.professionalEmail.trim().toLowerCase(),
      document_number: input.documentNumber?.trim() || null,
      message: input.message?.trim() || null,
    })
    .select()
    .single();

  if (error || !inserted) {
    return {
      success: false,
      error: error?.message || "Erro ao registrar solicitação de reivindicação.",
    };
  }

  return { success: true, claimId: (inserted as any).id };
}

/**
 * Submete solicitação de correção de dados ou remoção de perfil não reivindicado (Seção 22)
 */
export async function submitAgencyProfileRequest(
  input: CreateAgencyProfileRequestInput,
  userId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agency_profile_requests" as any)
    .insert({
      agency_id: input.agencyId,
      user_id: userId || null,
      type: input.type,
      applicant_name: input.applicantName.trim(),
      contact_email: input.contactEmail.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      description: input.description.trim(),
      status: "pending",
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Consulta lista de solicitações de claim para o painel administrativo /admin/claims
 */
export async function getAdminClaimsList(statusFilter?: string): Promise<AgencyClaim[]> {
  const supabase = await createClient();

  let query = supabase
    .from("agency_claims" as any)
    .select(`
      *,
      agency:agencies (*)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    agencyId: row.agency_id,
    userId: row.user_id,
    status: row.status,
    applicantName: row.applicant_name,
    applicantRole: row.applicant_role,
    phone: row.phone,
    professionalEmail: row.professional_email,
    documentNumber: row.document_number,
    message: row.message,
    adminNotes: row.admin_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agency: row.agency ? mapAgencyRow(row.agency) : undefined,
  }));
}

/**
 * Executa revisão transacional de solicitação de claim (aprovar ou rejeitar)
 */
export async function reviewAgencyClaim(
  claimId: string,
  decision: "approved" | "rejected",
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Tenta utilizar a RPC nativa review_agency_claim criada na migration 22
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("review_agency_claim" as any, {
    p_claim_id: claimId,
    p_decision: decision,
    p_admin_notes: adminNotes || null,
  });

  if (!rpcErr && rpcRes) {
    return { success: true };
  }

  // Fallback transacional no Supabase Client caso a RPC ainda não esteja carregada
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  // 1. Busca claim
  const { data: claim, error: claimErr } = await supabase
    .from("agency_claims" as any)
    .select("*, agency:agencies(*)")
    .eq("id", claimId)
    .single();

  if (claimErr || !claim) {
    return { success: false, error: "Solicitação não encontrada." };
  }

  const claimRow = claim as any;
  const now = new Date().toISOString();

  if (decision === "approved") {
    // 1. Atualiza claim
    await supabase
      .from("agency_claims" as any)
      .update({
        status: "approved",
        admin_notes: adminNotes || null,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", claimId);

    // 2. Atualiza agency
    await supabase
      .from("agencies")
      .update({
        claim_status: "claimed",
        claimed_at: now,
        claimed_by: claimRow.user_id,
        is_official_profile: true,
        updated_at: now,
      } as any)
      .eq("id", claimRow.agency_id);

    // 3. Adiciona usuário a agency_members com role 'owner'
    const { data: existingMember } = await supabase
      .from("agency_members")
      .select("id")
      .eq("agency_id", claimRow.agency_id)
      .eq("user_id", claimRow.user_id)
      .maybeSingle();

    if (existingMember) {
      await supabase
        .from("agency_members")
        .update({ role: "owner", status: "active" })
        .eq("id", existingMember.id);
    } else {
      await supabase.from("agency_members").insert({
        agency_id: claimRow.agency_id,
        user_id: claimRow.user_id,
        role: "owner",
        status: "active",
      });
    }

    // 4. Auditoria
    await supabase.from("admin_audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action: "CLAIM_APPROVED",
      module: "agencies",
      record_id: claimRow.agency_id,
      record_title: claimRow.agency?.name || "Imobiliária",
      changes: {
        claim_id: claimId,
        claimant_user_id: claimRow.user_id,
        applicant_name: claimRow.applicant_name,
        notes: adminNotes,
      },
    });

    return { success: true };
  } else {
    // Rejeição
    await supabase
      .from("agency_claims" as any)
      .update({
        status: "rejected",
        admin_notes: adminNotes || null,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", claimId);

    await supabase.from("admin_audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action: "CLAIM_REJECTED",
      module: "agencies",
      record_id: claimRow.agency_id,
      record_title: claimRow.agency?.name || "Imobiliária",
      changes: {
        claim_id: claimId,
        claimant_user_id: claimRow.user_id,
        applicant_name: claimRow.applicant_name,
        notes: adminNotes,
      },
    });

    return { success: true };
  }
}

/**
 * Criação padrão de imobiliária
 */
export async function createAgency(input: CreateAgencyInput): Promise<Agency> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      legal_name: input.legalName?.trim() || null,
      document: input.document?.trim() || null,
      creci: input.creci.trim().toUpperCase(),
      phone: input.phone?.trim() || null,
      whatsapp: input.whatsapp.trim(),
      email: input.email.trim().toLowerCase(),
      website: input.website?.trim() || null,
      description: input.description?.trim() || null,
      city_id: input.cityId || null,
      status: "active",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Erro ao cadastrar imobiliária.");
  }

  return mapAgencyRow(data);
}

/**
 * Atualiza os dados da imobiliária (protegido por RLS - apenas owner/admin)
 */
export async function updateAgency(
  agencyId: string,
  input: Partial<CreateAgencyInput> & { commercialAddress?: string }
): Promise<Agency> {
  const supabase = await createClient();

  type AgencyUpdate = Database["public"]["Tables"]["agencies"]["Update"] & {
    commercial_address?: string | null;
    is_official_profile?: boolean;
  };

  const updatePayload: AgencyUpdate = {};
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.legalName !== undefined) updatePayload.legal_name = input.legalName?.trim() || null;
  if (input.document !== undefined) updatePayload.document = input.document?.trim() || null;
  if (input.creci !== undefined) updatePayload.creci = input.creci.trim().toUpperCase();
  if (input.phone !== undefined) updatePayload.phone = input.phone?.trim() || null;
  if (input.whatsapp !== undefined) updatePayload.whatsapp = input.whatsapp.trim();
  if (input.email !== undefined) updatePayload.email = input.email.trim().toLowerCase();
  if (input.website !== undefined) updatePayload.website = input.website?.trim() || null;
  if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
  if (input.cityId !== undefined) updatePayload.city_id = input.cityId || null;
  if (input.commercialAddress !== undefined) updatePayload.commercial_address = input.commercialAddress.trim() || null;

  // Marca que os dados foram atualizados oficialmente pelo responsável
  updatePayload.is_official_profile = true;

  const { data, error } = await supabase
    .from("agencies")
    .update(updatePayload as any)
    .eq("id", agencyId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Falha ao atualizar dados da imobiliária.");
  }

  return mapAgencyRow(data);
}
