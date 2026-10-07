/**
 * Tipos de Imobiliárias, Membros e Reivindicação (Claims)
 * CONFORMIDADE: MASTER_PLAN.md e arquitetura Property x Offer
 */

export type AgencyStatus = "active" | "pending" | "suspended";

export type AgencyClaimStatus = "discovered" | "claimed";

export type AgencyClaimRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type AgencyProfileRequestType = "correction" | "removal";

export type AgencyProfileRequestStatus = "pending" | "resolved" | "dismissed";

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
  claimStatus?: AgencyClaimStatus;
  claimedAt?: string | null;
  claimedBy?: string | null;
  createdSource?: string;
  commercialAddress?: string | null;
  isOfficialProfile?: boolean;
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

export interface AgencyClaim {
  id: string;
  agencyId: string;
  userId: string;
  status: AgencyClaimRequestStatus;
  applicantName: string;
  applicantRole: string;
  phone: string;
  professionalEmail: string;
  documentNumber?: string | null;
  message?: string | null;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  agency?: Agency;
  userEmail?: string;
}

export interface CreateAgencyClaimInput {
  agencyId: string;
  applicantName: string;
  applicantRole: string;
  phone: string;
  professionalEmail: string;
  documentNumber?: string;
  message?: string;
}

export interface AgencyProfileRequest {
  id: string;
  agencyId: string;
  userId?: string | null;
  type: AgencyProfileRequestType;
  applicantName: string;
  contactEmail: string;
  phone?: string | null;
  description: string;
  status: AgencyProfileRequestStatus;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  agency?: Agency;
}

export interface CreateAgencyProfileRequestInput {
  agencyId: string;
  type: AgencyProfileRequestType;
  applicantName: string;
  contactEmail: string;
  phone?: string;
  description: string;
}

export interface AgencyStockOfferItem {
  propertyId: string;
  propertySlug: string;
  propertyTitle: string;
  propertyType: string;
  transactionType: "sale" | "rent" | "sale_or_rent";
  offerId: string;
  offerPrice?: number | null;
  offerRentPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  usableArea?: number | null;
  totalArea?: number | null;
  addressVisible?: boolean;
  street?: string | null;
  neighborhoodName?: string | null;
  cityName?: string | null;
  stateCode?: string | null;
  coverImage?: string | null;
  imagesCount: number;
}

export interface AgencyPublicProfile {
  agency: Agency;
  totalProperties: number;
  activeOffersCount: number;
  saleCount: number;
  rentCount: number;
  topTypes: { type: string; label: string; count: number }[];
  neighborhoods: { name: string; count: number }[];
  stock: AgencyStockOfferItem[];
  isIndexable: boolean;
}
