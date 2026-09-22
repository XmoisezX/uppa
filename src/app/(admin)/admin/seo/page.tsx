import { getSiteSettings } from '@/features/admin/services/site';
import { SeoClient } from './SeoClient';

export const dynamic = 'force-dynamic';

export default async function AdminSeoPage() {
  const settings = await getSiteSettings();
  return <SeoClient initialSettings={settings} />;
}
