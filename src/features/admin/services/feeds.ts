import { createAdminClient } from '@/lib/supabase/admin';
import { executeManualFeedSync } from '@/features/feeds/services';

export interface AdminFeedItem {
  id: string;
  agency_id: string;
  agency_name: string | null;
  type: string;
  url: string;
  status: string;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  properties_count: number;
  latest_run?: {
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    items_found: number;
    items_created: number;
    items_updated: number;
    items_failed: number;
    error_message: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export async function getAllAdminFeeds(): Promise<AdminFeedItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('feeds')
      .select(`
        id,
        agency_id,
        type,
        url,
        status,
        sync_interval_minutes,
        last_sync_at,
        next_sync_at,
        created_at,
        updated_at,
        agency:agencies (id, name),
        runs:feed_runs (
          id,
          status,
          started_at,
          finished_at,
          items_found,
          items_created,
          items_updated,
          items_failed,
          error_message
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => {
      const runs = (row.runs || []) as any[];
      runs.sort(
        (a: any, b: any) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      const latest = runs[0] || null;

      return {
        id: row.id,
        agency_id: row.agency_id,
        agency_name: row.agency?.name || null,
        type: row.type,
        url: row.url,
        status: row.status,
        sync_interval_minutes: row.sync_interval_minutes,
        last_sync_at: row.last_sync_at,
        next_sync_at: row.next_sync_at,
        properties_count: latest ? (latest.items_created ?? latest.items_found ?? 0) : 0,
        latest_run: latest
          ? {
              id: latest.id,
              status: latest.status,
              started_at: latest.started_at,
              finished_at: latest.finished_at,
              items_found: latest.items_found ?? 0,
              items_created: latest.items_created ?? 0,
              items_updated: latest.items_updated ?? 0,
              items_failed: latest.items_failed ?? 0,
              error_message: latest.error_message,
            }
          : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  } catch {
    return [];
  }
}

export async function toggleFeedStatus(feedId: string, currentStatus: string): Promise<boolean> {
  const supabase = createAdminClient();
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  const { error } = await supabase
    .from('feeds')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', feedId);
  return !error;
}

export async function triggerAdminFeedSync(feedId: string) {
  return await executeManualFeedSync(feedId);
}
