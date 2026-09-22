import { getAllAdminUsers } from '@/features/admin/services/users';
import { getAllRoles } from '@/features/admin/services/roles';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [users, roles] = await Promise.all([
    getAllAdminUsers(),
    getAllRoles(),
  ]);

  return <UsersClient initialUsers={users} roles={roles} />;
}
