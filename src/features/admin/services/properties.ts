import { createAdminClient } from '@/lib/supabase/admin';
import { calculatePropertyRanking } from '@/features/ranking/engine';
import { getRankingConfig } from '@/features/ranking/services';

export interface AdminPropertyItem {
  id: string;
  code: string | null;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  type: string;
  transaction_type: string;
  price_sale: number | null;
  price_rent: number | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  usable_area: number | null;
  agency_id: string | null;
  agency_name: string | null;
  feed_id: string | null;
  feed_type: string | null;
  agency_verified: boolean;
  ranking_score: number;
  ranking_breakdown: {
    relevance: number;
    quality: number;
    featured: number;
    verified_brokerage: number;
    freshness: number;
    completeness: number;
    media: number;
    price: number;
    engagement: number;
  };
  created_at: string;
  updated_at: string;
}

export interface PropertyFilterParams {
  search?: string;
  status?: string;
  agencyId?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getAdminProperties(params: PropertyFilterParams = {}): Promise<{
  data: AdminPropertyItem[];
  total: number;
}> {
  try {
    const supabase = createAdminClient();
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Obtém IDs dos imóveis destacados em site_settings
    let featuredIds: string[] = [];
    try {
      const { data: featRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'featured_property_ids')
        .maybeSingle();
      if (featRow?.value && Array.isArray(featRow.value)) {
        featuredIds = featRow.value;
      }
    } catch {
      // ignore
    }

    const rankingConfig = await getRankingConfig();

    let query = supabase
      .from('properties')
      .select(
        `
        id,
        slug,
        external_id,
        title,
        description,
        status,
        property_type,
        transaction_type,
        price,
        rent_price,
        bedrooms,
        suites,
        bathrooms,
        parking_spaces,
        usable_area,
        agency_id,
        source,
        created_at,
        updated_at,
        city:cities!city_id (id, name, slug),
        state:states!state_id (id, code, name),
        neighborhood:neighborhoods!neighborhood_id (id, name, slug),
        agency:agencies!agency_id (id, name, verified_at),
        media:property_media (id, url, is_cover, position)
      `,
        { count: 'exact' }
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status as any);
    }

    if (params.agencyId && params.agencyId !== 'all') {
      query = query.eq('agency_id', params.agencyId);
    }

    if (params.search) {
      const s = params.search.trim();
      query = query.or(`title.ilike.%${s}%,external_id.ilike.%${s}%,slug.ilike.%${s}%`);
    }

    const { data, count, error } = await query;

    if (error || !data) {
      return { data: [], total: 0 };
    }

    const formatted: AdminPropertyItem[] = (data as any[]).map((row) => {
      const isFeatured = featuredIds.includes(row.id);
      const isAgencyVerified = Boolean(row.agency?.verified_at);
      const mediaList = ((row.media as any[]) || []).map((m: any) => ({
        id: m.id,
        url: m.url,
        isCover: Boolean(m.is_cover),
        position: m.position || 0,
      }));

      const ranking = calculatePropertyRanking(
        {
          id: row.id,
          title: row.title,
          description: row.description,
          propertyType: row.property_type,
          transactionType: row.transaction_type,
          price: row.price,
          rentPrice: row.rent_price,
          usableArea: row.usable_area,
          bedrooms: row.bedrooms,
          suites: row.suites,
          bathrooms: row.bathrooms,
          parkingSpaces: row.parking_spaces,
          publishedAt: row.created_at,
          updatedAt: row.updated_at,
          city: row.city,
          neighborhood: row.neighborhood,
          state: row.state,
          agency: {
            id: row.agency_id || '',
            name: row.agency?.name || '',
            slug: '',
            verifiedAt: row.agency?.verified_at || null,
          },
          media: mediaList,
        },
        {
          rankingConfig,
          isFeatured,
          isAgencyVerified,
        }
      );

      return {
        id: row.id,
        code: row.external_id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        featured: isFeatured,
        type: row.property_type,
        transaction_type: row.transaction_type,
        price_sale: row.price,
        price_rent: row.rent_price,
        city: row.city?.name || null,
        state: row.state?.code || null,
        neighborhood: row.neighborhood?.name || null,
        bedrooms: row.bedrooms,
        suites: row.suites,
        bathrooms: row.bathrooms,
        parking_spots: row.parking_spaces,
        usable_area: row.usable_area,
        agency_id: row.agency_id,
        agency_name: row.agency?.name || null,
        agency_verified: isAgencyVerified,
        feed_id: null,
        feed_type: row.source === 'manual' ? null : row.source,
        ranking_score: ranking.score,
        ranking_breakdown: ranking.breakdown,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return {
      data: formatted,
      total: count || 0,
    };
  } catch {
    return { data: [], total: 0 };
  }
}

export async function togglePropertyFeatured(id: string, currentFeatured: boolean): Promise<boolean> {
  const supabase = createAdminClient();
  try {
    const { data: featRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'featured_property_ids')
      .maybeSingle();

    let list: string[] = [];
    if (featRow?.value && Array.isArray(featRow.value)) {
      list = featRow.value;
    }

    if (currentFeatured) {
      list = list.filter((item) => item !== id);
    } else {
      if (!list.includes(id)) list.push(id);
    }

    const { error } = await supabase.from('site_settings').upsert({
      key: 'featured_property_ids',
      value: list,
      description: 'Lista de IDs de imóveis destacados na Home',
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch {
    return false;
  }
}

export async function updatePropertyStatus(id: string, newStatus: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('properties')
    .update({
      status: newStatus as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
}
