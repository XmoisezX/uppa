/**
 * Tipos do Sistema de Leads e Eventos definidos no MASTER_PLAN.md (Seções 9, 19, 20 e 87)
 */

export type LeadSource = "whatsapp" | "form" | "phone" | "email" | "financing";

export type LeadEventType =
  | "created"
  | "viewed"
  | "contacted"
  | "qualified"
  | "visit_scheduled"
  | "lost"
  | "converted";

export interface Lead {
  id: string;
  propertyId?: string | null;
  agencyId: string;
  brokerId?: string | null;
  consumerUserId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  message?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  sessionId?: string | null;
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
  events?: LeadEvent[];
}

export interface CreateWhatsAppLeadInput {
  propertyId: string;
  agencyId: string;
  message?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  sessionId?: string;
}

export interface CreateFormLeadInput {
  propertyId: string;
  agencyId: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  sessionId?: string;
}
