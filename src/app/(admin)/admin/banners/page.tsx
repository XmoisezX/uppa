import { getAllBanners } from '@/features/admin/services/banners';
import { BannersClient } from './BannersClient';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  const banners = await getAllBanners();
  return <BannersClient initialBanners={banners} />;
}
