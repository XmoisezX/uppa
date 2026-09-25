import type { TransactionType, PropertyType } from "@/types/property";

export interface SearchFilters {
  transactionType?: TransactionType;
  state?: string; // Código UF (ex: "SP", "RS") ou ID
  city?: string; // Slug ou ID da cidade
  neighborhood?: string; // Nome ou ID do bairro
  propertyType?: PropertyType | PropertyType[];
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  areaMin?: number;
  areaMax?: number;
  financiable?: boolean;
  furnished?: boolean;
  acceptsExchange?: boolean;
  page?: number;
  limit?: number;
  orderBy?: "recent" | "price_asc" | "price_desc" | "area_desc";
  bbox?: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom?: number;
  };
}

export interface SearchPropertyItem {
  id: string;
  slug: string;
  externalId: string;
  title: string;
  transactionType: TransactionType;
  propertyType: PropertyType;
  price?: number | null;
  rentPrice?: number | null;
  condominiumFee?: number | null;
  usableArea?: number | null;
  totalArea?: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  financiable: boolean;
  furnished: boolean;
  acceptsExchange: boolean;
  addressVisible: boolean;
  street?: string | null;
  number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  publishedAt?: string | null;
  featured?: boolean;
  city?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  neighborhood?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  state?: {
    id: string;
    code: string;
    name: string;
  } | null;
  agency?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    creci?: string | null;
    verifiedAt?: string | null;
    phone?: string | null;
  } | null;
  media?: {
    id: string;
    url: string;
    isCover: boolean;
    position: number;
  }[];
}

export interface SearchResult {
  properties: SearchPropertyItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  filters: SearchFilters;
}
