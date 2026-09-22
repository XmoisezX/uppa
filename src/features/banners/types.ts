/**
 * Posições de banner suportadas no portal UPPA.
 * Espelha o constraint `banners_position_check` da migration.
 */
export type BannerPosition =
  | 'home_hero'
  | 'home_after_featured'
  | 'home_editorial'
  | 'search_top'
  | 'search_middle'
  | 'property_bottom';

export type BannerStatus = 'active' | 'inactive' | 'archived';

export interface Banner {
  id: string;
  title: string;
  imageUrlDesktop: string;
  imageUrlMobile: string | null;
  destinationUrl: string;
  position: BannerPosition;
  status: BannerStatus;
  startAt: string | null;
  endAt: string | null;
  priority: number;
  advertiserId: string | null;
  campaignId: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}
