-- =====================================================================
-- MIGRATION: 20260922000014_create_admin_and_cms_system.sql
-- DESCRIÇÃO: Área administrativa completa, RBAC dinâmico, CMS de artigos,
--            configurações do site, logs de auditoria e bootstrap de Super Admin.
-- =====================================================================

-- 1. TABELA DE CARGOS ADMINISTRATIVOS (ROLES)
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.admin_roles IS 'Cargos administrativos dinâmicos da plataforma UPPA';

-- 2. TABELA DE PERMISSÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.admin_permissions IS 'Permissões granulares de acesso às funcionalidades do portal';

-- 3. ASSOCIAÇÃO CARGOS x PERMISSÕES
CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES public.admin_permissions(code) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (role_id, permission_code)
);

-- 4. USUÁRIOS ADMINISTRATIVOS DA PLATAFORMA
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.admin_users IS 'Usuários com privilégios de acesso ao painel /admin';

-- 5. LOG DE AUDITORIA ADMINISTRATIVA
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    record_id TEXT,
    record_title TEXT,
    changes JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.admin_audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.admin_audit_logs(user_id);

-- 6. TABELA DE ARTIGOS (CMS COMPLETO)
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    cover_image TEXT,
    author_name TEXT NOT NULL DEFAULT 'Equipe Editorial UPPA',
    author_role TEXT NOT NULL DEFAULT 'Especialista Imobiliário',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN NOT NULL DEFAULT false,
    seo_title TEXT,
    seo_description TEXT,
    read_time TEXT DEFAULT '4 min de leitura',
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON public.articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);

-- 7. TABELA DE CONFIGURAÇÕES GLOBAIS DO SITE
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABELA DE PERGUNTAS FREQUENTES (FAQ GERENCIÁVEL)
CREATE TABLE IF NOT EXISTS public.site_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'geral',
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- FUNÇÕES DE AUTORIZAÇÃO E CHECAGEM ATÔMICA
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Checagem 1: usuário com cargo super_admin em admin_users
    IF EXISTS (
        SELECT 1
        FROM public.admin_users au
        JOIN public.admin_roles ar ON ar.id = au.role_id
        WHERE au.id = user_uuid
          AND au.status = 'active'
          AND ar.slug = 'super_admin'
    ) THEN
        RETURN true;
    END IF;

    -- Checagem 2: email oficial moiseztorres100@gmail.com
    IF EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = user_uuid
          AND LOWER(u.email) = 'moiseztorres100@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_admin_permission(user_uuid UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admin tem todas as permissões
    IF public.is_super_admin(user_uuid) THEN
        RETURN true;
    END IF;

    -- Verifica se o cargo do usuário possui a permissão requerida
    RETURN EXISTS (
        SELECT 1
        FROM public.admin_users au
        JOIN public.admin_role_permissions arp ON arp.role_id = au.role_id
        WHERE au.id = user_uuid
          AND au.status = 'active'
          AND arp.permission_code = required_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_faqs ENABLE ROW LEVEL SECURITY;

-- ARTIGOS: Leitura pública para artigos publicados
DROP POLICY IF EXISTS "Public read published articles" ON public.articles;
CREATE POLICY "Public read published articles"
ON public.articles FOR SELECT
TO public
USING (status = 'published');

-- ARTIGOS: Gestão para administradores com permissão articles.manage
DROP POLICY IF EXISTS "Admin manage articles" ON public.articles;
CREATE POLICY "Admin manage articles"
ON public.articles FOR ALL
TO authenticated
USING (public.has_admin_permission(auth.uid(), 'articles.manage'))
WITH CHECK (public.has_admin_permission(auth.uid(), 'articles.manage'));

-- FAQS & SETTINGS: Leitura pública
DROP POLICY IF EXISTS "Public read site_faqs" ON public.site_faqs;
CREATE POLICY "Public read site_faqs" ON public.site_faqs FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT TO public USING (true);

-- ADMIN TABLES: Leitura para admins autenticados
DROP POLICY IF EXISTS "Admin read roles" ON public.admin_roles;
CREATE POLICY "Admin read roles" ON public.admin_roles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin read permissions" ON public.admin_permissions;
CREATE POLICY "Admin read permissions" ON public.admin_permissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin read role_permissions" ON public.admin_role_permissions;
CREATE POLICY "Admin read role_permissions" ON public.admin_role_permissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin read admin_users" ON public.admin_users;
CREATE POLICY "Admin read admin_users" ON public.admin_users FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin read audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Admin read audit_logs" ON public.admin_audit_logs FOR SELECT TO authenticated
USING (public.has_admin_permission(auth.uid(), 'audit.view'));

-- =====================================================================
-- SEED DE PERMISSÕES, CARGOS E SUPER ADMIN
-- =====================================================================

-- Inserir permissões
INSERT INTO public.admin_permissions (code, module, name, description)
VALUES
    ('dashboard.view', 'dashboard', 'Visualizar Dashboard', 'Acessar métricas e KPIs principais do portal'),
    ('site.manage', 'site', 'Gerenciar Site', 'Editar textos, seções da Home, menus e FAQs'),
    ('banners.manage', 'banners', 'Gerenciar Banners', 'Criar, editar e excluir campanhas publicitárias'),
    ('articles.manage', 'articles', 'Gerenciar Artigos', 'Criar, editar e publicar artigos no CMS'),
    ('properties.manage', 'properties', 'Gerenciar Imóveis', 'Moderar anúncios, publicar, despublicar e destacar'),
    ('users.manage', 'users', 'Gerenciar Usuários', 'Alterar status, cargos e permissões de usuários'),
    ('roles.manage', 'roles', 'Gerenciar Cargos', 'Criar cargos e configurar matriz de permissões'),
    ('agencies.manage', 'agencies', 'Gerenciar Agências', 'Aprovar, verificar e gerenciar imobiliárias anunciantes'),
    ('feeds.manage', 'feeds', 'Gerenciar Feeds', 'Monitorar integrações VRSync e disparar sincronizações'),
    ('leads.manage', 'leads', 'Gerenciar Leads', 'Visualizar e exportar oportunidades de contato geradas'),
    ('seo.manage', 'seo', 'Gerenciar SEO', 'Configurar meta tags, sitemaps e indexação de páginas'),
    ('settings.manage', 'settings', 'Gerenciar Configurações', 'Editar parâmetros técnicos e operacionais do portal'),
    ('audit.view', 'audit', 'Visualizar Auditoria', 'Consultar log de ações e alterações administrativas')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    module = EXCLUDED.module;

-- Inserir cargos padrão
INSERT INTO public.admin_roles (name, slug, description, is_system)
VALUES
    ('SUPER ADMIN', 'super_admin', 'Acesso irrestrito a todos os recursos da plataforma', true),
    ('ADMIN', 'admin', 'Administrador geral com acesso a operações diárias', true),
    ('EDITOR', 'editor', 'Gestão de conteúdo, artigos, guias e banners publicitários', true),
    ('MODERADOR', 'moderator', 'Moderação de anúncios de imóveis e verificação de agências', true),
    ('SUPORTE', 'support', 'Atendimento a anunciantes, leads e suporte a corretores', true),
    ('COMERCIAL', 'commercial', 'Gestão de anunciantes, planos, banners e oportunidades de leads', true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Atribuir permissões aos cargos
DO $$
DECLARE
    r_super UUID;
    r_admin UUID;
    r_editor UUID;
    r_mod UUID;
    r_sup UUID;
    r_com UUID;
BEGIN
    SELECT id INTO r_super FROM public.admin_roles WHERE slug = 'super_admin';
    SELECT id INTO r_admin FROM public.admin_roles WHERE slug = 'admin';
    SELECT id INTO r_editor FROM public.admin_roles WHERE slug = 'editor';
    SELECT id INTO r_mod FROM public.admin_roles WHERE slug = 'moderator';
    SELECT id INTO r_sup FROM public.admin_roles WHERE slug = 'support';
    SELECT id INTO r_com FROM public.admin_roles WHERE slug = 'commercial';

    -- SUPER ADMIN: todas
    INSERT INTO public.admin_role_permissions (role_id, permission_code)
    SELECT r_super, code FROM public.admin_permissions
    ON CONFLICT DO NOTHING;

    -- ADMIN: todas
    INSERT INTO public.admin_role_permissions (role_id, permission_code)
    SELECT r_admin, code FROM public.admin_permissions
    ON CONFLICT DO NOTHING;

    -- EDITOR: dashboard, site, banners, articles, seo
    INSERT INTO public.admin_role_permissions (role_id, permission_code) VALUES
        (r_editor, 'dashboard.view'),
        (r_editor, 'site.manage'),
        (r_editor, 'banners.manage'),
        (r_editor, 'articles.manage'),
        (r_editor, 'seo.manage')
    ON CONFLICT DO NOTHING;

    -- MODERADOR: dashboard, properties, agencies, leads, audit
    INSERT INTO public.admin_role_permissions (role_id, permission_code) VALUES
        (r_mod, 'dashboard.view'),
        (r_mod, 'properties.manage'),
        (r_mod, 'agencies.manage'),
        (r_mod, 'leads.manage'),
        (r_mod, 'audit.view')
    ON CONFLICT DO NOTHING;

    -- SUPORTE: dashboard, leads, agencies, properties, users
    INSERT INTO public.admin_role_permissions (role_id, permission_code) VALUES
        (r_sup, 'dashboard.view'),
        (r_sup, 'leads.manage'),
        (r_sup, 'agencies.manage'),
        (r_sup, 'properties.manage'),
        (r_sup, 'users.manage')
    ON CONFLICT DO NOTHING;

    -- COMERCIAL: dashboard, agencies, leads, banners
    INSERT INTO public.admin_role_permissions (role_id, permission_code) VALUES
        (r_com, 'dashboard.view'),
        (r_com, 'agencies.manage'),
        (r_com, 'leads.manage'),
        (r_com, 'banners.manage')
    ON CONFLICT DO NOTHING;
END $$;

-- Vincular moiseztorres100@gmail.com como SUPER ADMIN inicial
DO $$
DECLARE
    u_id UUID;
    r_super UUID;
BEGIN
    SELECT id INTO u_id FROM auth.users WHERE LOWER(email) = 'moiseztorres100@gmail.com';
    SELECT id INTO r_super FROM public.admin_roles WHERE slug = 'super_admin';

    IF u_id IS NOT NULL AND r_super IS NOT NULL THEN
        INSERT INTO public.admin_users (id, role_id, status, name, email)
        VALUES (u_id, r_super, 'active', 'Moisez Torres', 'moiseztorres100@gmail.com')
        ON CONFLICT (id) DO UPDATE SET
            role_id = r_super,
            status = 'active';
    END IF;
END $$;
