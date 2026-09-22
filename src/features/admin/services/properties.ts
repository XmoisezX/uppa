import { createAdminClient } from '@/lib/supabase/admin';

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

    let query = supabase
      .from('properties')
      .select(
        `
        id,
        slug,
        external_id,
        title,
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
        city:cities!city_id (id, name),
        state:states!state_id (id, code),
        neighborhood:neighborhoods!neighborhood_id (id, name),
        agency:agencies!agency_id (id, name)
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

    const formatted: AdminPropertyItem[] = (data as any[]).map((row) => ({
      id: row.id,
      code: row.external_id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      featured: featuredIds.includes(row.id),
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
      feed_id: null,
      feed_type: row.source === 'manual' ? null : row.source,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

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
