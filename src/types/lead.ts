/**
 * Tipos do Sistema de Leads, Entregas e Eventos definidos no MASTER_PLAN.md (Seções 9, 19, 20, 22-45 e 87)
 */

export type LeadSource = "whatsapp" | "form" | "phone" | "email" | "financing";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "visit_scheduled"
  | "proposal"
  | "won"
  | "lost"
  | "spam";

export type LeadDeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "missing_destination"
  | "provider_not_configured";

export type LeadDeliveryChannel =
  | "email"
  | "whatsapp"
  | "webhook"
  | "crm"
  | "portal_form";

export type LeadEventType =
  | "created"
  | "viewed"
  | "whatsapp_clicked"
  | "form_submitted"
  | "delivery_attempted"
  | "delivery_succeeded"
  | "delivery_failed"
  | "status_changed"
  | "note_added"
  | "contacted"
  | "qualified"
  | "visit_scheduled"
  | "lost"
  | "converted";

export interface LeadDeliveryAttempt {
  id: string;
  leadId: string;
  channel: LeadDeliveryChannel;
  destination: string;
  provider?: string | null;
  status: LeadDeliveryStatus;
  attemptNumber: number;
  attemptedAt: string;
  deliveredAt?: string | null;
  providerMessageId?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  userId?: string | null;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  propertyId?: string | null;
  offerId?: string | null;
  agencyId: string;
  brokerId?: string | null;
  consumerUserId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  status: LeadStatus;
  message?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  sessionId?: string | null;
  snapshotPrice?: number | null;
  snapshotTitle?: string | null;
  snapshotSource?: string | null;
  snapshotAgencyName?: string | null;
  snapshotBrokerName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface LeadEvent {
  id: string;
  leadId: string;
  event: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface LeadWithDetails extends Lead {
  property?: {
    id: string;
    title: string;
    slug: string;
    externalId: string;
    price?: number | null;
    rentPrice?: number | null;
  } | null;
  agency?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null;
  events?: LeadEvent[];
  deliveryAttempts?: LeadDeliveryAttempt[];
  notesList?: LeadNote[];
}

export interface CreateWhatsAppLeadInput {
  propertyId: string;
  offerId?: string | null;
  agencyId: string;
  brokerId?: string | null;
  message?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  sessionId?: string;
  // Snapshot comercial
  snapshotPrice?: number | null;
  snapshotTitle?: string | null;
  snapshotSource?: string | null;
  snapshotAgencyName?: string | null;
  snapshotBrokerName?: string | null;
}

export interface CreateFormLeadInput {
  propertyId: string;
  offerId?: string | null;
  agencyId: string;
  brokerId?: string | null;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  sessionId?: string;
  // Snapshot comercial
  snapshotPrice?: number | null;
  snapshotTitle?: string | null;
  snapshotSource?: string | null;
  snapshotAgencyName?: string | null;
  snapshotBrokerName?: string | null;
}
