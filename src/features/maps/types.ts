import type { SearchPropertyItem } from "@/features/search/types";

export interface MapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export interface MapPinItem {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  rentPrice: number | null;
  transactionType: "sale" | "rent" | "sale_or_rent";
  propertyType: string;
  latitude: number;
  longitude: number;
  addressVisible: boolean;
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  coverImage?: string | null;
  bedrooms?: number;
  usableArea?: number | null;
}

export interface MapViewProps {
  properties: SearchPropertyItem[];
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
  onSearchThisArea?: (viewport: MapViewport) => void;
  isSearchingArea?: boolean;
}
