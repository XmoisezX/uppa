-- =====================================================================
-- MIGRATION: 20260918000003_create_agencies_and_members.sql
-- DESCRIÇÃO: Criação das tabelas agencies e agency_members, RLS, funções e triggers
-- CONFORMIDADE: MASTER_PLAN.md (Seções 6, 17, 18, 31, 32, 56 e 82)
-- =====================================================================

-- 1. TABELA: AGENCIES (Imobiliárias)
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    legal_name TEXT,
    document TEXT,
    creci TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT,
    logo_url TEXT,
    description TEXT,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agencies IS 'Imobiliárias e empresas parceiras anunciantes no portal';
COMMENT ON COLUMN public.agencies.creci IS 'Número de registro no Conselho Regional de Corretores de Imóveis';
COMMENT ON COLUMN public.agencies.document IS 'CNPJ ou CPF para validação interna e auditoria';

-- 2. TABELA: AGENCY_MEMBERS (Membros da Imobiliária)
CREATE TABLE IF NOT EXISTS public.agency_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('owner', 'admin', 'manager', 'broker', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT agency_members_agency_user_key UNIQUE (agency_id, user_id)
);

COMMENT ON TABLE public.agency_members IS 'Membros e corretores vinculados a cada imobiliária com respectivos papéis RBAC';

-- 3. ÍNDICES DE PERFORMANCE E INTEGRIDADE
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON public.agencies(status);
CREATE INDEX IF NOT EXISTS idx_agencies_city_id ON public.agencies(city_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_id ON public.agency_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON public.agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_user_role ON public.agency_members(user_id, role);

-- 4. FUNÇÕES DE AUTORIZAÇÃO (Seção 32 do MASTER_PLAN)
CREATE OR REPLACE FUNCTION public.is_agency_member(agency_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.agency_members
        WHERE agency_id = agency_uuid
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_agency_admin_or_owner(agency_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.agency_members
        WHERE agency_id = agency_uuid
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. TRIGGER ATÔMICO: ASSOCIAÇÃO DO CRIADOR COMO OWNER
CREATE OR REPLACE FUNCTION public.handle_new_agency_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.agency_members (agency_id, user_id, role, status)
        VALUES (NEW.id, auth.uid(), 'owner', 'active')
        ON CONFLICT (agency_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_agency_owner_assignment ON public.agencies;
CREATE TRIGGER trg_agency_owner_assignment
AFTER INSERT ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_agency_owner();

-- 6. GATILHO DE ATUALIZAÇÃO DO UPDATED_AT
CREATE OR REPLACE FUNCTION public.sync_agency_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agencies_sync_updated_at ON public.agencies;
CREATE TRIGGER trg_agencies_sync_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.sync_agency_updated_at();

-- 7. ROW LEVEL SECURITY (RLS) - Regra 2, Seção 31 e 82
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- AGENCIES: Leitura
-- Público pode ver imobiliárias ativas
-- Membros podem ver sua própria imobiliária em qualquer status
DROP POLICY IF EXISTS "Permitir leitura de imobiliarias ativas ou membros" ON public.agencies;
CREATE POLICY "Permitir leitura de imobiliarias ativas ou membros"
ON public.agencies FOR SELECT
TO public
USING (
    status = 'active' OR public.is_agency_member(id)
);

-- AGENCIES: Criação
-- Usuários autenticados podem cadastrar imobiliária
DROP POLICY IF EXISTS "Permitir criacao de imobiliaria por autenticados" ON public.agencies;
CREATE POLICY "Permitir criacao de imobiliaria por autenticados"
ON public.agencies FOR INSERT
TO authenticated
WITH CHECK (true);

-- AGENCIES: Edição
-- Apenas OWNER ou ADMIN vinculado pode editar a imobiliária
DROP POLICY IF EXISTS "Permitir edicao de imobiliaria por owners e admins" ON public.agencies;
CREATE POLICY "Permitir edicao de imobiliaria por owners e admins"
ON public.agencies FOR UPDATE
TO authenticated
USING (public.is_agency_admin_or_owner(id))
WITH CHECK (public.is_agency_admin_or_owner(id));

-- AGENCIES: Exclusão (restrita a service role / platform_admin)
-- Sem policy de delete para usuários comuns

-- AGENCY_MEMBERS: Leitura
-- Membros da mesma imobiliária podem visualizar seus colegas de equipe
DROP POLICY IF EXISTS "Permitir visualizacao de membros da propria imobiliaria" ON public.agency_members;
CREATE POLICY "Permitir visualizacao de membros da propria imobiliaria"
ON public.agency_members FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR public.is_agency_member(agency_id)
);

-- AGENCY_MEMBERS: Modificação (Adição / Alteração / Remoção)
-- Apenas OWNER ou ADMIN da imobiliária pode gerenciar membros
DROP POLICY IF EXISTS "Permitir gerenciar membros por owners e admins" ON public.agency_members;
CREATE POLICY "Permitir gerenciar membros por owners e admins"
ON public.agency_members FOR ALL
TO authenticated
USING (public.is_agency_admin_or_owner(agency_id))
WITH CHECK (public.is_agency_admin_or_owner(agency_id));
