import { createAdminClient } from '@/lib/supabase/admin';
import type { DashboardStats } from '@/types/admin';
import { getRecentAuditLogs } from './audit';

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();

  // Valores padrão resilientes
  const stats: DashboardStats = {
    properties: { total: 0, published: 0, active: 0, inactive: 0, featured: 0 },
    users: { total: 0, active: 0, admins: 0 },
    agencies: { total: 0, verified: 0 },
    leads: { total: 0, recent7Days: 0 },
    articles: { total: 0, published: 0, draft: 0 },
    banners: { total: 0, active: 0, totalImpressions: 0, totalClicks: 0 },
    feeds: { total: 0, active: 0, error: 0 },
    recentActivities: [],
  };

  // 1. Imóveis
  try {
    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    stats.properties.total = totalProperties || 0;

    const { count: activeProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    stats.properties.active = activeProperties || 0;
    stats.properties.published = activeProperties || 0;

    const { count: inactiveProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'active');
    stats.properties.inactive = inactiveProperties || 0;

    const { data: featRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'featured_property_ids')
      .maybeSingle();
    stats.properties.featured = Array.isArray(featRow?.value) ? featRow.value.length : 0;
  } catch (err) {
    console.warn('[Dashboard Properties Stats Error]', err);
  }

  // 2. Agências
  try {
    const { count: totalAgencies } = await supabase
      .from('agencies')
      .select('*', { count: 'exact', head: true });
    stats.agencies.total = totalAgencies || 0;

    const { count: verifiedAgencies } = await supabase
      .from('agencies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    stats.agencies.verified = verifiedAgencies || 0;
  } catch (err) {
    console.warn('[Dashboard Agencies Stats Error]', err);
  }

  // 3. Leads
  try {
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    stats.leads.total = totalLeads || 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);
    stats.leads.recent7Days = recentLeads || 0;
  } catch (err) {
    console.warn('[Dashboard Leads Stats Error]', err);
  }

  // 4. Feeds
  try {
    const { data: feedList } = await supabase
      .from('feeds')
      .select('status');
    if (feedList) {
      stats.feeds.total = feedList.length;
      stats.feeds.active = feedList.filter((f) => f.status === 'active').length;
      stats.feeds.error = feedList.filter((f) => f.status === 'error').length;
    }
  } catch (err) {
    console.warn('[Dashboard Feeds Stats Error]', err);
  }

  // 5. Banners
  try {
    const { data: bannerList } = await supabase
      .from('banners')
      .select('status, impressions, clicks');
    if (bannerList) {
      const items = bannerList as any[];
      stats.banners.total = items.length;
      stats.banners.active = items.filter((b) => b.status === 'active').length;
      stats.banners.totalImpressions = items.reduce((acc, b) => acc + (b.impressions || 0), 0);
      stats.banners.totalClicks = items.reduce((acc, b) => acc + (b.clicks || 0), 0);
    }
  } catch (err) {
    console.warn('[Dashboard Banners Stats Error]', err);
  }

  // 6. Artigos
  try {
    const { data: articleList } = await supabase
      .from('articles')
      .select('status');
    if (articleList) {
      const items = articleList as any[];
      stats.articles.total = items.length;
      stats.articles.published = items.filter((a) => a.status === 'published').length;
      stats.articles.draft = items.filter((a) => a.status === 'draft').length;
    }
  } catch (err) {
    console.warn('[Dashboard Articles Stats Error]', err);
  }

  // 7. Usuários
  try {
    const { data: adminList } = await supabase
      .from('admin_users')
      .select('status');
    if (adminList) {
      const items = adminList as any[];
      stats.users.admins = items.length;
      stats.users.active = items.filter((u) => u.status === 'active').length;
    }
  } catch {
    stats.users.admins = 1;
    stats.users.active = 1;
  }

  try {
    const { count: memberCount } = await supabase
      .from('agency_members')
      .select('*', { count: 'exact', head: true });
    stats.users.total = (memberCount || 0) + (stats.users.admins || 1);
  } catch {
    stats.users.total = stats.users.admins || 1;
  }

  // 8. Atividades recentes
  stats.recentActivities = await getRecentAuditLogs(10);

  return stats;
}
