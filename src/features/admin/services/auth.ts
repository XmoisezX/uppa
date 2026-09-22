import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminUser, AdminRole } from '@/types/admin';

export const SUPER_ADMIN_EMAIL = 'moiseztorres100@gmail.com';

const ALL_PERMISSION_CODES = [
  'dashboard.view',
  'site.manage',
  'banners.manage',
  'articles.manage',
  'properties.manage',
  'users.manage',
  'roles.manage',
  'agencies.manage',
  'feeds.manage',
  'leads.manage',
  'seo.manage',
  'settings.manage',
  'audit.view',
];

const DEFAULT_SUPER_ROLE: AdminRole = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'SUPER ADMIN',
  slug: 'super_admin',
  description: 'Acesso irrestrito a todos os módulos e configurações do portal',
  is_system: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: ALL_PERMISSION_CODES,
};

/**
 * Retorna os dados do usuário administrativo atualmente autenticado.
 * Garante que moiseztorres100@gmail.com seja sempre reconhecido como SUPER ADMIN.
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

    const email = user.email?.toLowerCase() || '';

    // SUPER ADMIN Garantido
    if (email === SUPER_ADMIN_EMAIL) {
      // Tenta sincronizar com admin_users via service role sem travar em caso de erro
      try {
        const adminDb = createAdminClient();
        const { data: existingAdmin } = await adminDb
          .from('admin_users')
          .select('id, role_id, status, name, phone, created_at, updated_at')
          .eq('id', user.id)
          .maybeSingle();

        if (existingAdmin) {
          return {
            id: user.id,
            email: user.email || SUPER_ADMIN_EMAIL,
            name: existingAdmin.name || user.user_metadata?.full_name || 'Moisez Torres',
            phone: existingAdmin.phone || user.phone || null,
            role_id: existingAdmin.role_id,
            role: DEFAULT_SUPER_ROLE,
            status: existingAdmin.status as 'active' | 'suspended',
            created_at: existingAdmin.created_at,
            updated_at: existingAdmin.updated_at,
            last_sign_in_at: user.last_sign_in_at || null,
          };
        }
      } catch {
        // Tabela ainda pendente de migração no Supabase
      }

      return {
        id: user.id,
        email: user.email || SUPER_ADMIN_EMAIL,
        name: user.user_metadata?.full_name || 'Moisez Torres',
        phone: user.phone || null,
        role_id: DEFAULT_SUPER_ROLE.id,
        role: DEFAULT_SUPER_ROLE,
        status: 'active',
        created_at: user.created_at,
        updated_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
      };
    }

    // Consulta para outros usuários
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
 * Checa se o usuário atual possui uma determinada permissão.
 */
export function checkPermission(
  adminUser: AdminUser | null,
  permissionCode: string
): boolean {
  if (!adminUser || adminUser.status !== 'active') return false;

  // Super Admin ou email oficial possui todas as permissões
  if (
    adminUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL ||
    adminUser.role?.slug === 'super_admin'
  ) {
    return true;
  }

  return adminUser.role?.permissions?.includes(permissionCode) ?? false;
}
