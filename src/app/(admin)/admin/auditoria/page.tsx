import { getRecentAuditLogs } from '@/features/admin/services/audit';
import { AuditClient } from './AuditClient';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const logs = await getRecentAuditLogs(100);
  return <AuditClient initialLogs={logs} />;
}
