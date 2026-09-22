import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminRole, AdminPermission } from '@/types/admin';

export const DEFAULT_PERMISSIONS: AdminPermission[] = [
  { id: '1', code: 'dashboard.view', module: 'dashboard', name: 'Visualizar Dashboard', description: 'Acessar métricas e KPIs principais do portal', created_at: '' },
  { id: '2', code: 'site.manage', module: 'site', name: 'Gerenciar Site', description: 'Editar textos, seções da Home, menus e FAQs', created_at: '' },
  { id: '3', code: 'banners.manage', module: 'banners', name: 'Gerenciar Banners', description: 'Criar, editar e excluir campanhas publicitárias', created_at: '' },
  { id: '4', code: 'articles.manage', module: 'articles', name: 'Gerenciar Artigos', description: 'Criar, editar e publicar artigos no CMS', created_at: '' },
  { id: '5', code: 'properties.manage', module: 'properties', name: 'Gerenciar Imóveis', description: 'Moderar anúncios, publicar, despublicar e destacar', created_at: '' },
  { id: '6', code: 'users.manage', module: 'users', name: 'Gerenciar Usuários', description: 'Alterar status, cargos e permissões de usuários', created_at: '' },
  { id: '7', code: 'roles.manage', module: 'roles', name: 'Gerenciar Cargos', description: 'Criar cargos e configurar matriz de permissões', created_at: '' },
  { id: '8', code: 'agencies.manage', module: 'agencies', name: 'Gerenciar Agências', description: 'Aprovar, verificar e gerenciar imobiliárias anunciantes', created_at: '' },
  { id: '9', code: 'feeds.manage', module: 'feeds', name: 'Gerenciar Feeds', description: 'Monitorar integrações VRSync e disparar sincronizações', created_at: '' },
  { id: '10', code: 'leads.manage', module: 'leads', name: 'Gerenciar Leads', description: 'Visualizar e gerenciar oportunidades de contato geradas', created_at: '' },
  { id: '11', code: 'seo.manage', module: 'seo', name: 'Gerenciar SEO', description: 'Configurar meta tags, sitemaps e indexação de páginas', created_at: '' },
  { id: '12', code: 'settings.manage', module: 'settings', name: 'Gerenciar Configurações', description: 'Editar parâmetros técnicos e operacionais do portal', created_at: '' },
  { id: '13', code: 'audit.view', module: 'audit', name: 'Visualizar Auditoria', description: 'Consultar log de ações e alterações administrativas', created_at: '' },
];

export const DEFAULT_ROLES: AdminRole[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'SUPER ADMIN',
    slug: 'super_admin',
    description: 'Acesso irrestrito a todos os recursos da plataforma',
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: DEFAULT_PERMISSIONS.map((p) => p.code),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'ADMIN',
    slug: 'admin',
    description: 'Administrador geral com acesso a operações diárias',
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: DEFAULT_PERMISSIONS.map((p) => p.code),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'EDITOR',
    slug: 'editor',
    description: 'Gestão de conteúdo, artigos, guias e banners publicitários',
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: ['dashboard.view', 'site.manage', 'banners.manage', 'articles.manage', 'seo.manage'],
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'MODERADOR',
    slug: 'moderator',
    description: 'Moderação de anúncios de imóveis e verificação de agências',
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: ['dashboard.view', 'properties.manage', 'agencies.manage', 'leads.manage', 'audit.view'],
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'SUPORTE',
    slug: 'support',
    description: 'Atendimento a anunciantes, leads e suporte a corretores',
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: ['dashboard.view', 'leads.manage', 'agencies.manage', 'properties.manage', 'users.manage'],
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'COMERCIAL',
    slug: 'commercial',
    description: 'Gestão de anunciantes, planos, banners e oportunidades de leads',
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: ['dashboard.view', 'agencies.manage', 'leads.manage', 'banners.manage'],
  },
];

export async function getAllRoles(): Promise<AdminRole[]> {
  try {
    const supabase = createAdminClient();
    const { data: rolesData, error: rolesError } = await supabase
      .from('admin_roles')
      .select(`
        id,
        name,
        slug,
        description,
        is_system,
        created_at,
        updated_at,
        permissions:admin_role_permissions (permission_code)
      `)
      .order('created_at', { ascending: true });

    if (!rolesError && rolesData && rolesData.length > 0) {
      return (rolesData as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        is_system: r.is_system,
        created_at: r.created_at,
        updated_at: r.updated_at,
        permissions: r.permissions?.map((p: any) => p.permission_code) || [],
      }));
    }
  } catch {
    // Fallback caso a migration esteja pendente
  }

  return DEFAULT_ROLES;
}

export async function getAllPermissions(): Promise<AdminPermission[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .order('module', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as AdminPermission[];
    }
  } catch {
    // Fallback caso a migration esteja pendente
  }

  return DEFAULT_PERMISSIONS;
}

export async function updateRolePermissions(
  roleId: string,
  permissionCodes: string[]
): Promise<boolean> {
  const supabase = createAdminClient();

  // Limpa permissões antigas
  const { error: delError } = await supabase
    .from('admin_role_permissions')
    .delete()
    .eq('role_id', roleId);

  if (delError) return false;

  // Insere novas permissões
  if (permissionCodes.length > 0) {
    const rows = permissionCodes.map((code) => ({
      role_id: roleId,
      permission_code: code,
    }));
    const { error: insError } = await supabase
      .from('admin_role_permissions')
      .insert(rows);
    return !insError;
  }

  return true;
}
