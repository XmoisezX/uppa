import { getRankingConfig } from '@/features/ranking/services';
import { RankingDashboardClient } from './RankingDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminRankingPage() {
  const rankingConfig = await getRankingConfig();

  return <RankingDashboardClient initialConfig={rankingConfig} />;
}
