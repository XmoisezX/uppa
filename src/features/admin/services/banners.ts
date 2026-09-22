import { createAdminClient } from '@/lib/supabase/admin';
import type { Banner } from '@/features/banners/types';

export async function getAllBanners(): Promise<Banner[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row): Banner => ({
      id: row.id,
      title: row.title,
      imageUrlDesktop: row.image_url_desktop,
      imageUrlMobile: row.image_url_mobile ?? null,
      destinationUrl: row.destination_url,
      position: row.position,
      status: row.status,
      startAt: row.start_at ?? null,
      endAt: row.end_at ?? null,
      priority: row.priority,
      advertiserId: row.advertiser_id ?? null,
      campaignId: row.campaign_id ?? null,
      impressions: row.impressions,
      clicks: row.clicks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function createBanner(bannerData: Partial<Banner>): Promise<Banner | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('banners')
    .insert({
      title: bannerData.title || '',
      image_url_desktop: bannerData.imageUrlDesktop || '',
      image_url_mobile: bannerData.imageUrlMobile || null,
      destination_url: bannerData.destinationUrl || '',
      position: (bannerData.position || 'home_editorial') as any,
      status: (bannerData.status || 'active') as any,
      start_at: bannerData.startAt || null,
      end_at: bannerData.endAt || null,
      priority: bannerData.priority || 0,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao criar banner');
  }

  const row = data as any;
  return {
    id: row.id,
    title: row.title,
    imageUrlDesktop: row.image_url_desktop,
    imageUrlMobile: row.image_url_mobile ?? null,
    destinationUrl: row.destination_url,
    position: row.position,
    status: row.status,
    startAt: row.start_at ?? null,
    endAt: row.end_at ?? null,
    priority: row.priority,
    advertiserId: row.advertiser_id ?? null,
    campaignId: row.campaign_id ?? null,
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateBanner(id: string, updates: Partial<Banner>): Promise<boolean> {
  const supabase = createAdminClient();
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.imageUrlDesktop !== undefined) payload.image_url_desktop = updates.imageUrlDesktop;
  if (updates.imageUrlMobile !== undefined) payload.image_url_mobile = updates.imageUrlMobile;
  if (updates.destinationUrl !== undefined) payload.destination_url = updates.destinationUrl;
  if (updates.position !== undefined) payload.position = updates.position;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.startAt !== undefined) payload.start_at = updates.startAt;
  if (updates.endAt !== undefined) payload.end_at = updates.endAt;
  if (updates.priority !== undefined) payload.priority = updates.priority;

  const { error } = await supabase.from('banners').update(payload).eq('id', id);
  return !error;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('banners').delete().eq('id', id);
  return !error;
}
