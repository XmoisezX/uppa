import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminAgencyItem {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  document: string | null;
  creci: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  status: string;
  verified: boolean;
  verified_at: string | null;
  properties_count: number;
  created_at: string;
  updated_at: string;
}

export async function getAllAdminAgencies(): Promise<AdminAgencyItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agencies')
      .select(`
        id,
        name,
        slug,
        legal_name,
        document,
        creci,
        phone,
        whatsapp,
        email,
        website,
        logo_url,
        description,
        status,
        verified_at,
        created_at,
        updated_at,
        properties:properties(count)
      `)
      .order('name', { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      legal_name: row.legal_name,
      document: row.document,
      creci: row.creci,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      website: row.website,
      logo_url: row.logo_url,
      description: row.description,
      status: row.status,
      verified: !!row.verified_at,
      verified_at: row.verified_at,
      properties_count: row.properties?.[0]?.count || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function toggleAgencyVerification(id: string, currentVerified: boolean): Promise<boolean> {
  const supabase = createAdminClient();
  const verified_at = currentVerified ? null : new Date().toISOString();
  const { error } = await supabase
    .from('agencies')
    .update({ verified_at, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function updateAgencyStatus(id: string, newStatus: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('agencies')
    .update({ status: newStatus as any, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
