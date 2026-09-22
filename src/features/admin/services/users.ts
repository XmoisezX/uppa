import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminUser } from '@/types/admin';
import { SUPER_ADMIN_EMAIL } from './auth';
import { DEFAULT_ROLES } from './roles';

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const supabase = createAdminClient();
  const usersMap = new Map<string, AdminUser>();

  // 1. Garante que moiseztorres100@gmail.com esteja sempre listado como SUPER ADMIN inicial
  const superAdminRole = DEFAULT_ROLES.find((r) => r.slug === 'super_admin') || DEFAULT_ROLES[0];
  const defaultSuperUser: AdminUser = {
    id: '4f5cbe7e-e1de-4f83-a841-b498ee568b86',
    email: SUPER_ADMIN_EMAIL,
    name: 'Moisez Torres',
    phone: null,
    role_id: superAdminRole.id,
    role: superAdminRole,
    status: 'active',
    created_at: '2026-09-17T22:57:00Z',
    updated_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
  };
  usersMap.set(defaultSuperUser.email.toLowerCase(), defaultSuperUser);

  // 2. Consulta tabela admin_users
  try {
    const { data: adminRows, error } = await supabase
      .from('admin_users')
      .select(`
        id,
        role_id,
        status,
        name,
        phone,
        email,
        created_at,
        updated_at,
        role:admin_roles (
          id,
          name,
          slug,
          description,
          is_system,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && adminRows) {
      for (const row of adminRows as any[]) {
        const email = (row.email || '').toLowerCase();
        usersMap.set(email, {
          id: row.id,
          email: row.email,
          name: row.name,
          phone: row.phone,
          role_id: row.role_id,
          role: row.role || superAdminRole,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
      }
    }
  } catch {
    // Tabela ainda pendente de migração
  }

  // 3. Consulta membros de agências para visualização unificada de usuários da plataforma
  try {
    const { data: members } = await supabase
      .from('agency_members')
      .select(`
        id,
        user_id,
        role,
        created_at,
        agency:agencies (name)
      `)
      .limit(30);

    if (members) {
      const viewerRole = DEFAULT_ROLES.find((r) => r.slug === 'commercial') || DEFAULT_ROLES[5];
      for (const m of members as any[]) {
        const dummyEmail = `membro.${m.user_id.slice(0, 6)}@anunciante.com.br`;
        if (!usersMap.has(dummyEmail)) {
          usersMap.set(dummyEmail, {
            id: m.user_id,
            email: dummyEmail,
            name: `Membro da Imobiliária ${m.agency?.name || ''}`.trim(),
            phone: null,
            role_id: viewerRole.id,
            role: viewerRole,
            status: 'active',
            created_at: m.created_at,
            updated_at: m.created_at,
          });
        }
      }
    }
  } catch {
    // Tabela agency_members
  }

  return Array.from(usersMap.values());
}

export async function updateUserRole(userId: string, newRoleId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('admin_users')
    .update({
      role_id: newRoleId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return !error;
}

export async function toggleUserStatus(userId: string, currentStatus: string): Promise<boolean> {
  const supabase = createAdminClient();
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const { error } = await supabase
    .from('admin_users')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return !error;
}
