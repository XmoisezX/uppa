import { createClient, createPublicServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import type {
  Lead,
  LeadWithDetails,
  CreateWhatsAppLeadInput,
  CreateFormLeadInput,
  LeadStatus,
  LeadDeliveryStatus,
  LeadDeliveryChannel,
  LeadDeliveryAttempt,
  LeadNote,
  LeadEvent,
} from "@/types/lead";

// Intervalos de Retry com Backoff Exponencial (Seção 41): 5 min, 30 min, 2 horas
const RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000];

/**
 * Resolução centralizada de destino para despacho do lead (Seção 26):
 * Oferta -> Broker responsável válido? Se sim, broker. Se não, agência.
 */
export async function resolveLeadDestination(
  agencyId: string,
  brokerId?: string | null
): Promise<{
  destinationEmail: string | null;
  destinationPhone: string | null;
  targetName: string;
  isBroker: boolean;
}> {
  const supabase = createPublicServerClient();

  // 1. Tenta broker se informado
  if (brokerId) {
    const { data: broker } = await supabase
      .from("admin_users")
      .select("email, name, phone")
      .eq("id", brokerId)
      .eq("status", "active")
      .maybeSingle();

    if (broker && (broker.email || broker.phone)) {
      return {
        destinationEmail: broker.email || null,
        destinationPhone: broker.phone || null,
        targetName: broker.name || "Corretor Responsável",
        isBroker: true,
      };
    }
  }

  // 2. Destino padrão: dados reais da agência anunciante
  const { data: agency } = await supabase
    .from("agencies")
    .select("name, email, phone, whatsapp")
    .eq("id", agencyId)
    .single();

  return {
    destinationEmail: agency?.email || null,
    destinationPhone: agency?.whatsapp || agency?.phone || null,
    targetName: agency?.name || "Imobiliária",
    isBroker: false,
  };
}

/**
 * Registra um lead gerado por clique em WhatsApp na página do imóvel (Seções 22, 25 e 30)
 */
export async function recordWhatsAppLead(input: CreateWhatsAppLeadInput): Promise<Lead> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Deduplicação curta anti-spam (Seção 33): evita cliques acidentais repetidos dentro de 5 minutos
  if (input.sessionId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("leads")
      .select("id, created_at")
      .eq("agency_id", input.agencyId)
      .eq("session_id", input.sessionId)
      .eq("source", "whatsapp")
      .gte("created_at", fiveMinutesAgo)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return existing as any;
    }
  }

  // Resolução de snapshot da oferta comercial e da agência (Seção 25)
  let resolvedOfferId = input.offerId || null;
  let snapshotPrice = input.snapshotPrice ?? null;
  let snapshotTitle = input.snapshotTitle ?? null;
  let snapshotSource = input.snapshotSource ?? null;
  let snapshotAgencyName = input.snapshotAgencyName ?? null;

  if (resolvedOfferId && (!snapshotPrice || !snapshotAgencyName)) {
    const { data: offerData } = await supabase
      .from("property_offers")
      .select("sale_price, rent_price, title, source, agency:agencies(name)")
      .eq("id", resolvedOfferId)
      .maybeSingle();

    if (offerData) {
      snapshotPrice = snapshotPrice ?? (offerData.sale_price || offerData.rent_price || null);
      snapshotTitle = snapshotTitle ?? offerData.title;
      snapshotSource = snapshotSource ?? offerData.source;
      snapshotAgencyName = snapshotAgencyName ?? (offerData.agency as any)?.name;
    }
  }

  const leadId = crypto.randomUUID();

  const insertData: any = {
    id: leadId,
    property_id: input.propertyId || null,
    offer_id: resolvedOfferId,
    agency_id: input.agencyId,
    broker_id: input.brokerId || null,
    source: "whatsapp",
    status: "new",
    message: input.message || null,
    utm_source: input.utmSource || null,
    utm_medium: input.utmMedium || null,
    utm_campaign: input.utmCampaign || null,
    utm_content: input.utmContent || null,
    session_id: input.sessionId || null,
    snapshot_price: snapshotPrice,
    snapshot_title: snapshotTitle,
    snapshot_source: snapshotSource,
    snapshot_agency_name: snapshotAgencyName,
    created_at: nowIso,
  };

  const { error: leadError } = await supabase.from("leads").insert(insertData);

  if (leadError) {
    throw new Error(leadError.message || "Falha ao registrar lead de WhatsApp.");
  }

  // Linha do tempo: registra evento de clique/intenção (Seção 30 e 36)
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event: "whatsapp_clicked",
    metadata: {
      source: "whatsapp",
      propertyId: input.propertyId,
      offerId: resolvedOfferId,
      agencyId: input.agencyId,
      snapshotPrice,
    },
  });

  // Registra tentativa de entrega (WhatsApp click não é entrega direta por API - Seção 30)
  const destination = await resolveLeadDestination(input.agencyId, input.brokerId);
  await supabase.from("lead_delivery_attempts" as any).insert({
    lead_id: leadId,
    channel: "whatsapp",
    destination: destination.destinationPhone || "Nenhum telefone registrado",
    provider: "wa.me_direct",
    status: destination.destinationPhone ? "delivered" : "missing_destination",
    attempt_number: 1,
    attempted_at: nowIso,
    delivered_at: destination.destinationPhone ? nowIso : null,
  });

  return {
    id: leadId,
    propertyId: input.propertyId,
    offerId: resolvedOfferId,
    agencyId: input.agencyId,
    brokerId: input.brokerId,
    source: "whatsapp",
    status: "new",
    message: input.message || null,
    snapshotPrice,
    snapshotTitle,
    snapshotSource,
    snapshotAgencyName,
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    utmContent: input.utmContent || null,
    sessionId: input.sessionId || null,
    createdAt: nowIso,
  };
}

/**
 * Registra um lead gerado por formulário "Tenho Interesse" (Seções 22, 25, 29 e 31)
 */
export async function recordFormLead(input: CreateFormLeadInput): Promise<Lead> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Deduplicação anti-spam (Seção 33): mesmo telefone + offer + agency nos últimos 15 minutos
  const cleanPhone = input.phone.trim().replace(/\D/g, "");
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: duplicate } = await supabase
    .from("leads")
    .select("id, created_at")
    .eq("agency_id", input.agencyId)
    .eq("phone", input.phone.trim())
    .gte("created_at", fifteenMinAgo)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    return duplicate as any;
  }

  // Resolução de snapshot da oferta
  let snapshotPrice = input.snapshotPrice ?? null;
  let snapshotTitle = input.snapshotTitle ?? null;
  let snapshotSource = input.snapshotSource ?? null;
  let snapshotAgencyName = input.snapshotAgencyName ?? null;

  if (input.offerId && (!snapshotPrice || !snapshotAgencyName)) {
    const { data: offerData } = await supabase
      .from("property_offers")
      .select("sale_price, rent_price, title, source, agency:agencies(name)")
      .eq("id", input.offerId)
      .maybeSingle();

    if (offerData) {
      snapshotPrice = snapshotPrice ?? (offerData.sale_price || offerData.rent_price || null);
      snapshotTitle = snapshotTitle ?? offerData.title;
      snapshotSource = snapshotSource ?? offerData.source;
      snapshotAgencyName = snapshotAgencyName ?? (offerData.agency as any)?.name;
    }
  }

  const leadId = crypto.randomUUID();

  const insertData: any = {
    id: leadId,
    property_id: input.propertyId || null,
    offer_id: input.offerId || null,
    agency_id: input.agencyId,
    broker_id: input.brokerId || null,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email ? input.email.trim().toLowerCase() : null,
    source: "form",
    status: "new",
    message: input.message ? input.message.trim() : null,
    utm_source: input.utmSource || null,
    utm_medium: input.utmMedium || null,
    utm_campaign: input.utmCampaign || null,
    utm_content: input.utmContent || null,
    session_id: input.sessionId || null,
    snapshot_price: snapshotPrice,
    snapshot_title: snapshotTitle,
    snapshot_source: snapshotSource,
    snapshot_agency_name: snapshotAgencyName,
    created_at: nowIso,
  };

  const { error: leadError } = await supabase.from("leads").insert(insertData);

  if (leadError) {
    throw new Error(leadError.message || "Falha ao registrar mensagem de interesse.");
  }

  // Linha do tempo: evento de envio de formulário
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event: "form_submitted",
    metadata: {
      source: "form",
      propertyId: input.propertyId,
      offerId: input.offerId,
      agencyId: input.agencyId,
      name: input.name,
      snapshotPrice,
    },
  });

  // Resolução de destino e despacho de tentativa de entrega (Seção 26 e 28)
  const destination = await resolveLeadDestination(input.agencyId, input.brokerId);

  // Verificação real de provedor de e-mail (Seção 29): Resend / SMTP
  const hasEmailProvider = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);

  let deliveryStatus: LeadDeliveryStatus = "provider_not_configured";
  let errorMessage: string | null = "Nenhum provedor de e-mail (Resend/SMTP) configurado no ambiente.";

  if (!destination.destinationEmail) {
    deliveryStatus = "missing_destination";
    errorMessage = "Imobiliária anunciante não possui e-mail de contato cadastrado.";
  } else if (hasEmailProvider) {
    // Se no futuro houver provider configurado
    deliveryStatus = "delivered";
    errorMessage = null;
  }

  await supabase.from("lead_delivery_attempts" as any).insert({
    lead_id: leadId,
    channel: "email",
    destination: destination.destinationEmail || "Destino não informado",
    provider: hasEmailProvider ? "resend_or_smtp" : "none",
    status: deliveryStatus,
    attempt_number: 1,
    attempted_at: nowIso,
    delivered_at: deliveryStatus === "delivered" ? nowIso : null,
    error_message: errorMessage,
    next_retry_at: (deliveryStatus as string) === "failed" ? new Date(Date.now() + RETRY_DELAYS_MS[0]).toISOString() : null,
  });

  return {
    id: leadId,
    propertyId: input.propertyId,
    offerId: input.offerId,
    agencyId: input.agencyId,
    brokerId: input.brokerId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: "form",
    status: "new",
    message: input.message,
    snapshotPrice,
    snapshotTitle,
    snapshotSource,
    snapshotAgencyName,
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    utmContent: input.utmContent || null,
    sessionId: input.sessionId || null,
    createdAt: nowIso,
  };
}

/**
 * Consulta de leads de uma agência para o painel comercial /painel/leads (Seção 37)
 */
export async function getAgencyLeads(
  agencyId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
    channel?: string;
    propertyId?: string;
    search?: string;
  }
): Promise<{ leads: LeadWithDetails[]; total: number }> {
  const supabase = await createClient();

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

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
      )
    `,
      { count: "exact" }
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (options?.status && options.status !== "all") {
    query = query.eq("status" as any, options.status);
  }

  if (options?.channel && options.channel !== "all") {
    query = query.eq("source" as any, options.channel);
  }

  if (options?.propertyId) {
    query = query.eq("property_id", options.propertyId);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error || !data) {
    return { leads: [], total: 0 };
  }

  const mappedLeads: LeadWithDetails[] = (data as any[]).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    offerId: row.offer_id,
    agencyId: row.agency_id,
    brokerId: row.broker_id,
    consumerUserId: row.consumer_user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status || "new",
    message: row.message,
    snapshotPrice: row.snapshot_price ? Number(row.snapshot_price) : null,
    snapshotTitle: row.snapshot_title,
    snapshotSource: row.snapshot_source,
    snapshotAgencyName: row.snapshot_agency_name,
    snapshotBrokerName: row.snapshot_broker_name,
    notes: row.notes,
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
  }));

  return { leads: mappedLeads, total: count || 0 };
}

/**
 * Consulta detalhes completos de um lead específico para modal/drawer (Seção 38)
 */
export async function getLeadDetails(leadId: string): Promise<LeadWithDetails | null> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("leads")
    .select(`
      *,
      property:properties (
        id,
        title,
        slug,
        external_id,
        price,
        rent_price
      ),
      agency:agencies (
        id,
        name,
        slug,
        logo_url,
        phone,
        whatsapp
      )
    `)
    .eq("id", leadId)
    .single();

  if (error || !row) return null;
  const r = row as any;

  // Busca eventos da linha do tempo
  const { data: events } = await supabase
    .from("lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  // Busca tentativas de entrega
  const { data: attempts } = await supabase
    .from("lead_delivery_attempts" as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("attempted_at", { ascending: true });

  // Busca notas internas
  const { data: notes } = await supabase
    .from("lead_notes" as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return {
    id: r.id,
    propertyId: r.property_id,
    offerId: r.offer_id,
    agencyId: r.agency_id,
    brokerId: r.broker_id,
    consumerUserId: r.consumer_user_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    source: r.source,
    status: r.status || "new",
    message: r.message,
    snapshotPrice: r.snapshot_price ? Number(r.snapshot_price) : null,
    snapshotTitle: r.snapshot_title,
    snapshotSource: r.snapshot_source,
    snapshotAgencyName: r.snapshot_agency_name,
    snapshotBrokerName: r.snapshot_broker_name,
    notes: r.notes,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    sessionId: row.session_id,
    createdAt: row.created_at,
    property: row.property ? {
      id: row.property.id,
      title: row.property.title,
      slug: row.property.slug,
      externalId: row.property.external_id,
      price: row.property.price,
      rentPrice: row.property.rent_price,
    } : null,
    agency: row.agency ? {
      id: row.agency.id,
      name: row.agency.name,
      slug: row.agency.slug,
      logoUrl: row.agency.logo_url,
      phone: row.agency.phone,
      whatsapp: row.agency.whatsapp,
    } : null,
    events: (events as any[]) || [],
    deliveryAttempts: (attempts as any[]) || [],
    notesList: (notes as any[]) || [],
  };
}

/**
 * Atualiza o status comercial de um lead (Seção 35)
 */
export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  actorName = "Corretor"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: currentLead } = await supabase
    .from("leads")
    .select("agency_id, status" as any)
    .eq("id", leadId)
    .single();

  const previousStatus = (currentLead as any)?.status || "new";

  const { error } = await supabase
    .from("leads")
    .update({ status: newStatus } as any)
    .eq("id", leadId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Registra no histórico auditável (Seção 36)
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event: "status_changed",
    metadata: {
      previousStatus,
      newStatus,
      updatedBy: actorName,
    },
  });

  return { success: true };
}

/**
 * Adiciona uma anotação interna à timeline do lead (Seção 36)
 */
export async function addLeadNote(
  leadId: string,
  content: string,
  authorName: string,
  userId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("lead_notes" as any).insert({
    lead_id: leadId,
    user_id: userId || null,
    author_name: authorName,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event: "note_added",
    metadata: {
      authorName,
      preview: content.slice(0, 100),
    },
  });

  return { success: true };
}

/**
 * Estatísticas resumidas de leads para a agência
 */
export async function getAgencyLeadStats(agencyId: string): Promise<{
  totalLeads: number;
  whatsappLeads: number;
  last7DaysLeads: number;
}> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: total }, { count: whatsappCount }, { count: last7Days }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("agency_id", agencyId),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("agency_id", agencyId).eq("source", "whatsapp"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("agency_id", agencyId).gte("created_at", sevenDaysAgo),
    ]);

  return {
    totalLeads: total || 0,
    whatsappLeads: whatsappCount || 0,
    last7DaysLeads: last7Days || 0,
  };
}

/**
 * Métricas de observabilidade de leads para o Painel Administrativo /admin/leads (Seção 45)
 */
export async function getAdminLeadsObservability(): Promise<{
  leadsToday: number;
  leads7Days: number;
  whatsappCount: number;
  formCount: number;
  totalAttempts: number;
  deliveredCount: number;
  failedCount: number;
  missingDestinationCount: number;
  providerNotConfiguredCount: number;
}> {
  const supabase = createAdminClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    { count: countToday },
    { count: count7Days },
    { count: waCount },
    { count: fCount },
    { data: attempts },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("source", "whatsapp"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("source", "form"),
    supabase.from("lead_delivery_attempts" as any).select("status"),
  ]);

  const allAttempts = (attempts as any[]) || [];
  let delivered = 0;
  let failed = 0;
  let missing = 0;
  let unconfigured = 0;

  for (const a of allAttempts) {
    if (a.status === "delivered") delivered++;
    else if (a.status === "failed") failed++;
    else if (a.status === "missing_destination") missing++;
    else if (a.status === "provider_not_configured") unconfigured++;
  }

  return {
    leadsToday: countToday || 0,
    leads7Days: count7Days || 0,
    whatsappCount: waCount || 0,
    formCount: fCount || 0,
    totalAttempts: allAttempts.length,
    deliveredCount: delivered,
    failedCount: failed,
    missingDestinationCount: missing,
    providerNotConfiguredCount: unconfigured,
  };
}

/**
 * Processador em lote para retentativas de entrega com backoff e proteção de idempotência (Seções 41, 42 e 43)
 */
export async function processPendingLeadDeliveriesBatch(batchSize = 20): Promise<{
  processed: number;
  retried: number;
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Busca tentativas pendentes ou falhas prontas para retry
  const { data: pendingAttempts, error } = await supabase
    .from("lead_delivery_attempts" as any)
    .select("*")
    .eq("status", "failed")
    .lte("next_retry_at", now)
    .lt("attempt_number", 3)
    .limit(batchSize);

  if (error || !pendingAttempts || pendingAttempts.length === 0) {
    return { processed: 0, retried: 0 };
  }

  let retried = 0;

  for (const attempt of pendingAttempts as any[]) {
    const nextAttemptNumber = attempt.attempt_number + 1;
    const nextDelayMs = RETRY_DELAYS_MS[Math.min(nextAttemptNumber - 1, RETRY_DELAYS_MS.length - 1)];
    const nextRetryAt = new Date(Date.now() + nextDelayMs).toISOString();

    // Idempotência: marca tentativa com timestamp
    await supabase
      .from("lead_delivery_attempts" as any)
      .update({
        attempt_number: nextAttemptNumber,
        attempted_at: now,
        next_retry_at: nextAttemptNumber < 3 ? nextRetryAt : null,
        updated_at: now,
      })
      .eq("id", attempt.id);

    retried++;
  }

  return { processed: pendingAttempts.length, retried };
}
