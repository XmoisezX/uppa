import { getAllAdminAgencies } from '@/features/admin/services/agencies';
import { AgenciesClient } from './AgenciesClient';

export const dynamic = 'force-dynamic';

export default async function AdminAgenciesPage() {
  const agencies = await getAllAdminAgencies();
  return <AgenciesClient initialAgencies={agencies} />;
}
