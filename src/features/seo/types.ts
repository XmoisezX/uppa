import type { Database } from "@/types/database.types";
import type { SearchPropertyItem } from "@/features/search/types";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TerritorialNeighborhoodSummary {
  id: string;
  name: string;
  slug: string;
  propertyCount: number;
}

export interface TerritorialTypeSummary {
  type: Database["public"]["Enums"]["property_type"];
  label: string;
  count: number;
}

export interface TerritorialHubData {
  city: {
    id: string;
    name: string;
    slug: string;
    state: {
      id: string;
      code: string;
      name: string;
    };
  };
  neighborhood?: {
    id: string;
    name: string;
    slug: string;
  };
  totalCount: number;
  saleCount: number;
  rentCount: number;
  minPrice?: number;
  avgPrice?: number;
  maxPrice?: number;
  minRentPrice?: number;
  avgRentPrice?: number;
  maxRentPrice?: number;
  topTypes: TerritorialTypeSummary[];
  neighborhoods?: TerritorialNeighborhoodSummary[];
  relatedNeighborhoods?: TerritorialNeighborhoodSummary[];
  properties: SearchPropertyItem[];
  isIndexable: boolean;
}

export interface AdminSeoStats {
  totalCanonicalProperties: number;
  totalWithOffers: number;
  totalWithoutOffers: number;
  totalMergedRedirects: number;
  totalCities: number;
  indexableCities: number;
  noindexCities: number;
  totalNeighborhoods: number;
  indexableNeighborhoods: number;
  noindexNeighborhoods: number;
  totalSitemapUrls: number;
  citiesList: { name: string; stateCode: string; count: number; isIndexable: boolean; slug: string }[];
}
