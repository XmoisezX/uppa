import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminUser } from '@/types/admin';

/**
 * Retorna os dados do usuário administrativo atualmente autenticado.
 * A autorização depende estritamente do banco de dados (admin_users -> admin_roles).
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    try {
      const adminDb = createAdminClient();
      const { data: adminRecord, error: adminError } = await adminDb
        .from('admin_users')
        .select(`
          id,
          role_id,
          status,
          name,
          phone,
          created_at,
          updated_at,
          role:admin_roles (
            id,
            name,
            slug,
            description,
            is_system,
            created_at,
            updated_at,
            permissions:admin_role_permissions (permission_code)
          )
        `)
        .eq('id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (adminError || !adminRecord) {
        return null;
      }

      const roleData: any = adminRecord.role;
      const permissions: string[] = roleData?.permissions?.map(
        (p: any) => p.permission_code
      ) || [];

      return {
        id: adminRecord.id,
        email: user.email || '',
        name: adminRecord.name || user.user_metadata?.full_name || null,
        phone: adminRecord.phone || user.phone || null,
        role_id: adminRecord.role_id,
        role: {
          id: roleData.id,
          name: roleData.name,
          slug: roleData.slug,
          description: roleData.description,
          is_system: roleData.is_system,
          created_at: roleData.created_at,
          updated_at: roleData.updated_at,
          permissions,
        },
        status: adminRecord.status as 'active' | 'suspended',
        created_at: adminRecord.created_at,
        updated_at: adminRecord.updated_at,
        last_sign_in_at: user.last_sign_in_at || null,
      };
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Erro ao verificar usuário administrativo:', error);
    return null;
  }
}

/**
 * Checa se o usuário atual possui uma determinada permissão baseada no RBAC do banco.
 */
export function checkPermission(
  adminUser: AdminUser | null,
  permissionCode: string
): boolean {
  if (!adminUser || adminUser.status !== 'active') return false;

  // Role super_admin possui todas as permissões
  if (adminUser.role?.slug === 'super_admin') {
    return true;
  }

  return adminUser.role?.permissions?.includes(permissionCode) ?? false;
}
