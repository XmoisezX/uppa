import { createClient } from '@/lib/supabase/server';
import type { Banner, BannerPosition } from './types';

/**
 * Retorna os banners ativos para uma posição específica.
 *
 * A RLS da tabela já garante que apenas banners ativos dentro do período de vigência
 * são retornados. A query adiciona ordenação por prioridade.
 *
 * Nunca usa service_role — utiliza o client público com RLS ativo.
 */
export async function getBannersByPosition(
  position: BannerPosition
): Promise<Banner[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('banners')
      .select(
        `
        id,
        title,
        image_url_desktop,
        image_url_mobile,
        destination_url,
        position,
        status,
        start_at,
        end_at,
        priority,
        advertiser_id,
        campaign_id,
        impressions,
        clicks,
        created_at,
        updated_at
      `
      )
      .eq('position', position)
      .order('priority', { ascending: false })
      .limit(5);

    if (error || !data) {
      return [];
    }

    return (data as any[]).map(
      (row): Banner => ({
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
      })
    );
  } catch (err) {
    console.error(`[BannerService] Erro ao carregar banners para "${position}":`, err);
    return [];
  }
}
