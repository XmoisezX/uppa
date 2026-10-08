/**
 * Serviço de Descoberta, Pré-Cadastro de Imobiliárias e Proveniência de Dados (Seções 16 a 21 e 26-27)
 * Implementa o Fluxo B de Expansão Territorial da UPPA.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PreRegisterAgencyInput,
  AgencyDataSource,
  AgencyDataSourceType,
} from "../types";

/**
 * Normaliza um domínio web (remove protocolo, www e trailing slashes)
 */
export function normalizeDomain(urlOrDomain: string): string {
  try {
    let clean = urlOrDomain.trim().toLowerCase();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return urlOrDomain.trim().toLowerCase().replace(/^www\./, "");
  }
}

/**
 * Normaliza um número de telefone para busca e correspondência
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normaliza um nome de imobiliária para comparação de similaridade
 */
export function normalizeAgencyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(imobiliaria|imoveis|imobiliarias|negocios|consultoria|imobiliario|ltda|me|eireli)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Busca agência existente para evitar duplicações usando sinais confiáveis (Seção 21)
 */
export async function findExistingAgencyMatch(input: {
  cnpj?: string | null;
  creci?: string | null;
  website?: string | null;
  phone?: string | null;
  name: string;
  cityId?: string | null;
}): Promise<{
  matchedAgency: any | null;
  confidence: number;
  matchReason: string | null;
}> {
  const supabase = createAdminClient();

  // 1. Sinal com confiança absoluta: CNPJ exato
  if (input.cnpj && input.cnpj.trim()) {
    const cleanCnpj = input.cnpj.replace(/\D/g, "");
    if (cleanCnpj.length >= 14) {
      const { data: byCnpj } = await supabase
        .from("agencies")
        .select("id, name, slug, document, creci, website, phone, claim_status, is_official_profile")
        .eq("document", input.cnpj.trim())
        .limit(1)
        .maybeSingle();

      if (byCnpj) {
        return { matchedAgency: byCnpj, confidence: 1.0, matchReason: "CNPJ idêntico" };
      }
    }
  }

  // 2. Sinal forte: Domínio oficial idêntico
  if (input.website && input.website.trim()) {
    const domain = normalizeDomain(input.website);
    if (domain) {
      // Busca em agencies.website ou website_sources
      const { data: byWebsite } = await supabase
        .from("agencies")
        .select("id, name, slug, document, creci, website, phone, claim_status, is_official_profile")
        .ilike("website", `%${domain}%`)
        .limit(1)
        .maybeSingle();

      if (byWebsite) {
        return { matchedAgency: byWebsite, confidence: 0.95, matchReason: "Domínio web idêntico" };
      }

      const { data: bySource } = await supabase
        .from("website_sources")
        .select("agency:agencies!agency_id(id, name, slug, document, creci, website, phone, claim_status, is_official_profile)")
        .eq("domain", domain)
        .limit(1)
        .maybeSingle();

      if (bySource && (bySource.agency as any)?.id) {
        return { matchedAgency: bySource.agency, confidence: 0.95, matchReason: "Fonte de domínio cadastrada" };
      }
    }
  }

  // 3. Sinal forte: CRECI idêntico no mesmo estado/cidade
  if (input.creci && input.creci.trim()) {
    const cleanCreci = input.creci.trim();
    const { data: byCreci } = await supabase
      .from("agencies")
      .select("id, name, slug, document, creci, website, phone, claim_status, is_official_profile")
      .eq("creci", cleanCreci)
      .limit(1)
      .maybeSingle();

    if (byCreci) {
      return { matchedAgency: byCreci, confidence: 0.90, matchReason: "CRECI idêntico" };
    }
  }

  // 4. Sinal combinado: Telefone idêntico + mesmo município
  if (input.phone && input.phone.trim() && input.cityId) {
    const cleanPhone = normalizePhone(input.phone);
    if (cleanPhone.length >= 8) {
      const { data: byPhone } = await supabase
        .from("agencies")
        .select("id, name, slug, document, creci, website, phone, claim_status, is_official_profile")
        .eq("city_id", input.cityId)
        .or(`phone.ilike.%${cleanPhone}%,whatsapp.ilike.%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (byPhone) {
        return { matchedAgency: byPhone, confidence: 0.85, matchReason: "Telefone e cidade idênticos" };
      }
    }
  }

  // 5. Sinal contextual: Nome normalizado na mesma cidade
  if (input.cityId && input.name) {
    const norm = normalizeAgencyName(input.name);
    if (norm.length >= 3) {
      const { data: candidates } = await supabase
        .from("agencies")
        .select("id, name, slug, document, creci, website, phone, claim_status, is_official_profile")
        .eq("city_id", input.cityId)
        .limit(20);

      for (const cand of candidates || []) {
        if (normalizeAgencyName(cand.name) === norm) {
          return { matchedAgency: cand, confidence: 0.80, matchReason: "Nome e município correspondentes" };
        }
      }
    }
  }

  return { matchedAgency: null, confidence: 0, matchReason: null };
}

/**
 * Realiza o pré-cadastro de uma imobiliária descoberta pela UPPA (Seções 16 a 21)
 * ATENÇÃO: NÃO cria usuário auth, NÃO cria senha e NÃO cria agency_members.
 */
export async function preRegisterDiscoveredAgency(input: PreRegisterAgencyInput): Promise<{
  agencyId: string;
  isNew: boolean;
  agencySlug: string;
  confidence: number;
  matchReason?: string | null;
}> {
  const supabase = createAdminClient();

  // 1. Verificação de correspondência/duplicidade existente
  const match = await findExistingAgencyMatch(input);
  if (match.matchedAgency && match.confidence >= 0.80) {
    // Registra a proveniência da fonte para a agência existente
    if (input.sourceUrl) {
      await recordAgencyFieldProvenance({
        agencyId: match.matchedAgency.id,
        fieldName: "website",
        value: input.website || input.sourceUrl,
        sourceType: "website",
        sourceUrl: input.sourceUrl,
        confidence: match.confidence,
        isOfficial: match.matchedAgency.is_official_profile,
      });
    }

    return {
      agencyId: match.matchedAgency.id,
      isNew: false,
      agencySlug: match.matchedAgency.slug,
      confidence: match.confidence,
      matchReason: match.matchReason,
    };
  }

  // 2. Gera slug único para a nova agência descoberta
  const baseSlug = input.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug || "imobiliaria";
  const { data: existingSlug } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const nowIso = new Date().toISOString();
  const agencyId = crypto.randomUUID();

  // 3. Insere APENAS o perfil em public.agencies (zero auth, zero login)
  const { data: createdAgency, error: createErr } = await supabase
    .from("agencies")
    .insert({
      id: agencyId,
      name: input.name.trim(),
      legal_name: input.legalName ? input.legalName.trim() : null,
      slug,
      document: input.cnpj ? input.cnpj.trim() : null,
      creci: input.creci ? input.creci.trim() : null,
      logo_url: input.logo || null,
      website: input.website ? input.website.trim() : null,
      phone: input.phone ? input.phone.trim() : null,
      whatsapp: input.whatsapp ? input.whatsapp.trim() : (input.phone ? input.phone.trim() : ""),
      email: input.email ? input.email.trim().toLowerCase() : "",
      commercial_address: input.commercialAddress ? input.commercialAddress.trim() : null,
      city_id: input.cityId || null,
      claim_status: "discovered",
      is_official_profile: false,
      created_source: "uppa_discovery",
      status: "active",
      created_at: nowIso,
      updated_at: nowIso,
    } as any)
    .select("id, slug")
    .single();

  if (createErr || !createdAgency) {
    throw new Error(`Falha ao criar pré-cadastro da agência: ${createErr?.message}`);
  }

  // 4. Registra proveniência de cada campo capturado (Seção 20)
  const fieldsToRecord: Array<{ field: string; value?: string | null }> = [
    { field: "name", value: input.name },
    { field: "creci", value: input.creci },
    { field: "cnpj", value: input.cnpj },
    { field: "website", value: input.website },
    { field: "phone", value: input.phone },
    { field: "whatsapp", value: input.whatsapp },
    { field: "email", value: input.email },
    { field: "commercial_address", value: input.commercialAddress },
    { field: "logo_url", value: input.logo },
  ];

  for (const item of fieldsToRecord) {
    if (item.value) {
      await recordAgencyFieldProvenance({
        agencyId,
        fieldName: item.field,
        value: item.value,
        sourceType: "website",
        sourceUrl: input.sourceUrl || input.website || null,
        confidence: 1.0,
        isOfficial: false,
      });
    }
  }

  // 5. Atualiza o contador de known_agencies na cidade se vinculada
  if (input.cityId) {
    const { error: rpcErr } = await supabase.rpc("increment_city_known_agencies", { p_city_id: input.cityId });
    if (rpcErr) {
      // Fallback: update direto
      const { data } = await supabase
        .from("cities")
        .select("known_agencies_count")
        .eq("id", input.cityId)
        .single();
      if (data) {
        await supabase
          .from("cities")
          .update({ known_agencies_count: ((data as any).known_agencies_count || 0) + 1 } as any)
          .eq("id", input.cityId);
      }
    }
  }

  return {
    agencyId,
    isNew: true,
    agencySlug: createdAgency.slug,
    confidence: 1.0,
  };
}

/**
 * Registra a proveniência granular de um campo da agência (Seção 20)
 */
export async function recordAgencyFieldProvenance(params: {
  agencyId: string;
  fieldName: string;
  value: string;
  sourceType: AgencyDataSourceType;
  sourceUrl?: string | null;
  confidence?: number;
  isOfficial?: boolean;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("agency_data_sources" as any).insert({
      agency_id: params.agencyId,
      field_name: params.fieldName,
      source_type: params.sourceType,
      source_url: params.sourceUrl || null,
      captured_value: params.value,
      confidence: params.confidence ?? 1.0,
      is_official: params.isOfficial ?? false,
      captured_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[recordAgencyFieldProvenance] Erro ao registrar proveniência para ${params.fieldName}:`, err);
  }
}

/**
 * Resolução com regra de precedência (Seção 26):
 * DADOS OFICIAIS DA IMOBILIÁRIA > DADOS DESCOBERTOS AUTOMATICAMENTE
 */
export async function resolveAgencyDisplayData(agencyId: string): Promise<{
  agency: any;
  sources: AgencyDataSource[];
}> {
  const supabase = createAdminClient();

  const [{ data: agency }, { data: sources }] = await Promise.all([
    supabase.from("agencies").select("*").eq("id", agencyId).single(),
    supabase.from("agency_data_sources" as any).select("*").eq("agency_id", agencyId).order("captured_at", { ascending: false }),
  ]);

  return {
    agency,
    sources: (sources as any[]) || [],
  };
}
