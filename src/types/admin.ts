export type AdminRoleSlug =
  | 'super_admin'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'support'
  | 'commercial'
  | string;

export interface AdminRole {
  id: string;
  name: string;
  slug: AdminRoleSlug;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  permissions?: string[];
}

export interface AdminPermission {
  id: string;
  code: string;
  module: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role_id: string;
  role?: AdminRole;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
}

export interface AdminAuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  module: string;
  record_id: string | null;
  record_title: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ArticleCMS {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  tags: string[];
  cover_image: string | null;
  author_name: string;
  author_role: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  read_time: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSettingsData {
  hero_headline?: string;
  hero_subheadline?: string;
  hero_search_placeholder?: string;
  hero_background_image?: string | null;
  hero_image_layout?: 'side' | 'cover' | 'right';
  hero_image_fit?: 'cover' | 'contain';
  hero_background_color?: string;
  hero_variant?: 'bubbles' | 'classic';
  home_sections?: {
    id: string;
    label: string;
    enabled: boolean;
    order: number;
  }[];
  institutional_links?: {
    label: string;
    href: string;
    category: 'institucional' | 'anunciantes' | 'legal';
  }[];
  seo_global?: {
    meta_title: string;
    meta_description: string;
    og_image: string;
    keywords: string[];
  };
  contact_info?: {
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
  };
}

export interface DashboardStats {
  properties: {
    total: number;
    published: number;
    active: number;
    inactive: number;
    featured: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
  };
  agencies: {
    total: number;
    verified: number;
  };
  leads: {
    total: number;
    recent7Days: number;
  };
  articles: {
    total: number;
    published: number;
    draft: number;
  };
  banners: {
    total: number;
    active: number;
    totalImpressions: number;
    totalClicks: number;
  };
  feeds: {
    total: number;
    active: number;
    error: number;
  };
  recentActivities: AdminAuditLog[];
}
