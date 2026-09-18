import { createClient } from "@/lib/supabase/server";
import type { Agency, AgencyMember, UserAgencyMembership } from "@/types/agency";
import type { CreateAgencyInput, UpdateAgencyInput } from "@/lib/validations/agency";
import type { Database } from "@/types/database.types";


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

  const rawAgency = memberData.agency as any;

  return {
    agency: {
      id: rawAgency.id,
      name: rawAgency.name,
      slug: rawAgency.slug,
      legalName: rawAgency.legal_name,
      document: rawAgency.document,
      creci: rawAgency.creci,
      phone: rawAgency.phone,
      whatsapp: rawAgency.whatsapp,
      email: rawAgency.email,
      website: rawAgency.website,
      logoUrl: rawAgency.logo_url,
      description: rawAgency.description,
      cityId: rawAgency.city_id,
      verifiedAt: rawAgency.verified_at,
      status: rawAgency.status,
      createdAt: rawAgency.created_at,
      updatedAt: rawAgency.updated_at,
    },
    role: memberData.role as any,
    status: memberData.status as any,
  };
}

/**
 * Consulta pública de imobiliária por slug
 */
export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

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
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Cria uma nova imobiliária para o usuário atual
 * O trigger handle_new_agency_owner() associa o usuário automaticamente como 'owner'
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
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Atualiza os dados da imobiliária (protegido por RLS - apenas owner/admin)
 */
export async function updateAgency(agencyId: string, input: Partial<CreateAgencyInput>): Promise<Agency> {
  const supabase = await createClient();

  type AgencyUpdate = Database["public"]["Tables"]["agencies"]["Update"];
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

  const { data, error } = await supabase
    .from("agencies")
    .update(updatePayload)
    .eq("id", agencyId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Falha ao atualizar dados da imobiliária. Verifique suas permissões.");
  }

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
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
