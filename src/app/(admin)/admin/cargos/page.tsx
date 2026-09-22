import { getAllRoles, getAllPermissions } from '@/features/admin/services/roles';
import { RolesClient } from './RolesClient';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const [roles, permissions] = await Promise.all([
    getAllRoles(),
    getAllPermissions(),
  ]);

  return <RolesClient initialRoles={roles} permissions={permissions} />;
}
