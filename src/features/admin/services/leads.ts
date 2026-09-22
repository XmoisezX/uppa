import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminLeadItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  message: string | null;
  property_id: string | null;
  property_title: string | null;
  property_code: string | null;
  agency_id: string | null;
  agency_name: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

export async function getAllAdminLeads(limit = 100): Promise<AdminLeadItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        source,
        message,
        property_id,
        agency_id,
        utm_source,
        utm_medium,
        utm_campaign,
        created_at,
        property:properties(id, title, code),
        agency:agencies(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      source: row.source || 'portal_form',
      message: row.message,
      property_id: row.property_id,
      property_title: row.property?.title || null,
      property_code: row.property?.code || null,
      agency_id: row.agency_id,
      agency_name: row.agency?.name || null,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}
