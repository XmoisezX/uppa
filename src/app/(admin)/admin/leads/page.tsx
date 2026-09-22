import { getAllAdminLeads } from '@/features/admin/services/leads';
import { LeadsClient } from './LeadsClient';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const leads = await getAllAdminLeads(100);
  return <LeadsClient initialLeads={leads} />;
}
