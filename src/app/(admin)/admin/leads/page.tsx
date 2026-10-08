import { getAllAdminLeads } from '@/features/admin/services/leads';
import { getAdminLeadsObservability } from '@/features/leads/services';
import { LeadsClient } from './LeadsClient';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const [leads, observability] = await Promise.all([
    getAllAdminLeads(100),
    getAdminLeadsObservability(),
  ]);

  return <LeadsClient initialLeads={leads} observability={observability} />;
}
