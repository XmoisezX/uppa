import { getSiteSettings, getAllFAQs } from '@/features/admin/services/site';
import { SiteManagerClient } from './SiteManagerClient';

export const dynamic = 'force-dynamic';

export default async function AdminSitePage() {
  const [settings, faqs] = await Promise.all([
    getSiteSettings(),
    getAllFAQs(),
  ]);

  return <SiteManagerClient initialSettings={settings} initialFaqs={faqs} />;
}
