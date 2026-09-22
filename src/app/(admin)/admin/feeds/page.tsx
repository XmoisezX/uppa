import { getAllAdminFeeds } from '@/features/admin/services/feeds';
import { FeedsClient } from './FeedsClient';

export const dynamic = 'force-dynamic';

export default async function AdminFeedsPage() {
  const feeds = await getAllAdminFeeds();
  return <FeedsClient initialFeeds={feeds} />;
}
