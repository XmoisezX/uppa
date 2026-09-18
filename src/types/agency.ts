/**
 * Tipos de Imobiliárias e Membros definidos no MASTER_PLAN.md (Seções 17, 18 e 82)
 */

export type AgencyStatus = "active" | "pending" | "suspended";

export type AgencyMemberRole =
  | "owner"
  | "admin"
  | "manager"
  | "broker"
  | "viewer";

export interface Agency {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  document?: string | null;
  creci: string;
  phone?: string | null;
  whatsapp: string;
  email: string;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  cityId?: string | null;
  verifiedAt?: string | null;
  status: AgencyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyMember {
  id: string;
  agencyId: string;
  userId: string;
  role: AgencyMemberRole;
  status: AgencyStatus;
  createdAt: string;
  // Campos expandidos opcionais
  agency?: Agency;
  userEmail?: string;
}

export interface UserAgencyMembership {
  agency: Agency;
  role: AgencyMemberRole;
  status: AgencyStatus;
}
