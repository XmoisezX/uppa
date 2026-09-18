import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { Lead, LeadWithDetails, CreateWhatsAppLeadInput, LeadSource } from "@/types/lead";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

/**
 * Registra um lead gerado por clique em WhatsApp na página do imóvel (Seção 87 do MASTER_PLAN)
 */
export async function recordWhatsAppLead(input: CreateWhatsAppLeadInput): Promise<Lead> {
  const supabase = await createClient();

  const leadId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const insertData: LeadInsert = {
    id: leadId,
    property_id: input.propertyId,
    agency_id: input.agencyId,
    source: "whatsapp",
    message: input.message || null,
    utm_source: input.utmSource || null,
    utm_medium: input.utmMedium || null,
    utm_campaign: input.utmCampaign || null,
    utm_content: input.utmContent || null,
    session_id: input.sessionId || null,
    created_at: nowIso,
  };

  const { error: leadError } = await supabase
    .from("leads")
    .insert(insertData);

  if (leadError) {
    throw new Error(leadError.message || "Falha ao registrar lead de WhatsApp.");
  }

  // Registra evento de criação do lead em lead_events
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event: "created",
    metadata: {
      source: "whatsapp",
      propertyId: input.propertyId,
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
    },
  });

  return {
    id: leadId,
    propertyId: input.propertyId,
    agencyId: input.agencyId,
    source: "whatsapp",
    message: input.message || null,
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    utmContent: input.utmContent || null,
    sessionId: input.sessionId || null,
    createdAt: nowIso,
  };
}

/**
 * Consulta os leads da imobiliária autenticada para o painel com paginação e dados do imóvel
 */
export async function getAgencyLeads(
  agencyId: string,
  options?: {
    page?: number;
    limit?: number;
    source?: LeadSource;
  }
): Promise<{ leads: LeadWithDetails[]; total: number }> {
  const supabase = await createClient();

  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("leads")
    .select(
      `
      *,
      property:properties (
        id,
        title,
        slug,
        external_id,
        price,
        rent_price
      ),
      events:lead_events (*)
    `,
      { count: "exact" }
    )
    .eq("agency_id", agencyId);

  if (options?.source) {
    query = query.eq("source", options.source);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    return { leads: [], total: 0 };
  }

  const leads: LeadWithDetails[] = data.map((row: any) => ({
    id: row.id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    brokerId: row.broker_id,
    consumerUserId: row.consumer_user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    message: row.message,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    sessionId: row.session_id,
    createdAt: row.created_at,
    property: row.property
      ? {
          id: row.property.id,
          title: row.property.title,
          slug: row.property.slug,
          externalId: row.property.external_id,
          price: row.property.price,
          rentPrice: row.property.rent_price,
        }
      : null,
    events: (row.events as any[]) || [],
  }));

  return { leads, total: count || 0 };
}

/**
 * Estatísticas resumidas de conversão de leads da imobiliária
 */
export async function getAgencyLeadStats(agencyId: string): Promise<{
  totalLeads: number;
  whatsappLeads: number;
  last7DaysLeads: number;
}> {
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysIso = sevenDaysAgo.toISOString();

  // Contagem total
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId);

  // Contagem via WhatsApp
  const { count: whatsappLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("source", "whatsapp");

  // Contagem nos últimos 7 dias
  const { count: last7DaysLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .gte("created_at", sevenDaysIso);

  return {
    totalLeads: totalLeads || 0,
    whatsappLeads: whatsappLeads || 0,
    last7DaysLeads: last7DaysLeads || 0,
  };
}
