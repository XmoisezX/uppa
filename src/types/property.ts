/**
 * Tipos centrais do Catálogo de Imóveis (Properties) definidos no MASTER_PLAN.md (Seções 9, 10, 14, 15, 16 e 83)
 */

import type { Agency } from "./agency";
import type { State, City, Neighborhood } from "./geo";

export type TransactionType = "sale" | "rent" | "sale_or_rent";

export type PropertyStatus =
  | "draft"
  | "pending"
  | "active"
  | "inactive"
  | "sold"
  | "rented"
  | "blocked"
  | "archived";

export type PropertyType =
  | "apartment"
  | "house"
  | "townhouse"
  | "land"
  | "farm"
  | "commercial"
  | "office"
  | "warehouse"
  | "studio"
  | "loft"
  | "kitnet"
  | "penthouse"
  | "condo_house"
  | "rural"
  | "other";

export type ListingSource = "manual" | "vrsync" | "api" | "csv" | "partner" | "chaves_na_mao";

export type MediaType = "image" | "video" | "virtual_tour" | "floor_plan";

export interface Property {
  id: string;
  agencyId: string;
  brokerId?: string | null;
  externalId: string;
  source: ListingSource;
  slug: string;
  title: string;
  description?: string | null;
  transactionType: TransactionType;
  propertyType: PropertyType;
  status: PropertyStatus;
  price?: number | null;
  rentPrice?: number | null;
  condominiumFee?: number | null;
  iptu?: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  usableArea?: number | null;
  totalArea?: number | null;
  lotArea?: number | null;
  yearBuilt?: number | null;
  financiable: boolean;
  acceptsExchange: boolean;
  acceptsVehicle: boolean;
  furnished: boolean;
  petFriendly: boolean;
  addressVisible: boolean;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  zipcode?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  neighborhoodId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  publishedAt?: string | null;
  sourceUpdatedAt?: string | null;
  missingFromFeedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  name: string;
  slug: string;
  category: string;
  createdAt?: string;
}

export interface PropertyMedia {
  id: string;
  propertyId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  position: number;
  isCover: boolean;
  sourceUrl?: string | null;
  createdAt: string;
}

export interface PropertyPriceHistory {
  id: string;
  propertyId: string;
  price?: number | null;
  rentPrice?: number | null;
  source: string;
  recordedAt: string;
}

export interface PropertyStatusHistory {
  id: string;
  propertyId: string;
  fromStatus?: PropertyStatus | null;
  toStatus: PropertyStatus;
  changedBy?: string | null;
  reason?: string | null;
  recordedAt: string;
}

export interface PropertyWithDetails extends Property {
  agency?: Agency;
  state?: State;
  city?: City;
  neighborhood?: Neighborhood;
  media?: PropertyMedia[];
  features?: Feature[];
}
