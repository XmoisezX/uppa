-- =====================================================================
-- MIGRATION: 20261007000022_create_agency_claims_and_profile_status.sql
-- DESCRIÇÃO: Criação da estrutura de perfis de agências (descoberto vs oficial),
--            fluxo transacional de reivindicação (claims) e solicitações de correção/remoção.
-- CONFORMIDADE: Regras do projeto e MASTER_PLAN.
-- =====================================================================

-- 1. EXTENSÃO DA TABELA AGENCIES: ESTADOS DE REIVINDICAÇÃO E PROVENIÊNCIA
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS claim_status TEXT NOT NULL DEFAULT 'discovered' CHECK (claim_status IN ('discovered', 'claimed')),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_source TEXT NOT NULL DEFAULT 'crawler',
ADD COLUMN IF NOT EXISTS commercial_address TEXT,
ADD COLUMN IF NOT EXISTS is_official_profile BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.agencies.claim_status IS 'Estado de governança da agência: discovered (indexada automaticamente) ou claimed (assumida oficialmente)';
COMMENT ON COLUMN public.agencies.created_source IS 'Origem dos dados da agência: crawler, feed, manual, import ou partner';
COMMENT ON COLUMN public.agencies.is_official_profile IS 'Indica se os dados institucionais foram editados/validados oficialmente pelo responsável';

CREATE INDEX IF NOT EXISTS idx_agencies_claim_status ON public.agencies(claim_status);

-- 2. TABELA DE REIVINDICAÇÕES DE IMOBILIÁRIAS: AGENCY_CLAIMS
CREATE TABLE IF NOT EXISTS public.agency_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    applicant_name TEXT NOT NULL,
    applicant_role TEXT NOT NULL,
    phone TEXT NOT NULL,
    professional_email TEXT NOT NULL,
    document_number TEXT,
    message TEXT,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agency_claims IS 'Solicitações de reivindicação de posse e administração de perfil por representantes legítimos';

CREATE INDEX IF NOT EXISTS idx_agency_claims_agency_id ON public.agency_claims(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_claims_user_id ON public.agency_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_claims_status ON public.agency_claims(status);
CREATE INDEX IF NOT EXISTS idx_agency_claims_created_at ON public.agency_claims(created_at DESC);

-- 3. TABELA DE SOLICITAÇÕES DE CORREÇÃO OU REMOÇÃO (SEÇÃO 22)
CREATE TABLE IF NOT EXISTS public.agency_profile_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('correction', 'removal')),
    applicant_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    phone TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agency_profile_requests IS 'Solicitações administrativas de correção de dados ou remoção de perfis não reivindicados';

CREATE INDEX IF NOT EXISTS idx_agency_profile_requests_agency_id ON public.agency_profile_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_profile_requests_status ON public.agency_profile_requests(status);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.agency_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_profile_requests ENABLE ROW LEVEL SECURITY;

-- AGENCY_CLAIMS: Leitura
-- O usuário pode ver suas próprias solicitações; Admins podem ver todas
DROP POLICY IF EXISTS "Permitir leitura de claims por usuario ou admin" ON public.agency_claims;
CREATE POLICY "Permitir leitura de claims por usuario ou admin"
ON public.agency_claims FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- AGENCY_CLAIMS: Criação
-- Usuários autenticados podem submeter claim para si mesmos
DROP POLICY IF EXISTS "Permitir criacao de claim por autenticados" ON public.agency_claims;
CREATE POLICY "Permitir criacao de claim por autenticados"
ON public.agency_claims FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- AGENCY_CLAIMS: Atualização (Apenas Admins ou cancelamento pelo próprio usuário)
DROP POLICY IF EXISTS "Permitir atualizacao de claims por admin ou cancelamento" ON public.agency_claims;
CREATE POLICY "Permitir atualizacao de claims por admin ou cancelamento"
ON public.agency_claims FOR UPDATE
TO authenticated
USING (
    public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
    OR (user_id = auth.uid() AND status = 'pending')
)
WITH CHECK (
    public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
    OR (user_id = auth.uid() AND status = 'cancelled')
);

-- AGENCY_PROFILE_REQUESTS: Leitura
DROP POLICY IF EXISTS "Permitir leitura de profile requests por usuario ou admin" ON public.agency_profile_requests;
CREATE POLICY "Permitir leitura de profile requests por usuario ou admin"
ON public.agency_profile_requests FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- AGENCY_PROFILE_REQUESTS: Criação pública
DROP POLICY IF EXISTS "Permitir envio publico de correcao ou remocao" ON public.agency_profile_requests;
CREATE POLICY "Permitir envio publico de correcao ou remocao"
ON public.agency_profile_requests FOR INSERT
TO public
WITH CHECK (true);

-- AGENCY_PROFILE_REQUESTS: Atualização exclusiva de admin
DROP POLICY IF EXISTS "Permitir atualizacao de profile requests por admin" ON public.agency_profile_requests;
CREATE POLICY "Permitir atualizacao de profile requests por admin"
ON public.agency_profile_requests FOR UPDATE
TO authenticated
USING (
    public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 5. FUNÇÃO TRANSACIONAL PARA REVISÃO E APROVAÇÃO ATÔMICA DE CLAIM
CREATE OR REPLACE FUNCTION public.review_agency_claim(
    p_claim_id UUID,
    p_decision TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_claim RECORD;
    v_reviewer_id UUID;
    v_reviewer_email TEXT;
    v_reviewer_name TEXT;
    v_agency_name TEXT;
BEGIN
    -- Validação do usuário executor
    v_reviewer_id := auth.uid();
    IF v_reviewer_id IS NULL THEN
        -- Fallback seguro para chamadas administrativas com service_role
        IF current_setting('request.jwt.claim.role', true) = 'service_role' OR current_user IN ('postgres', 'service_role') THEN
            SELECT id INTO v_reviewer_id FROM public.admin_users WHERE status = 'active' LIMIT 1;
        ELSE
            RAISE EXCEPTION 'Acesso negado: permissão agencies.manage necessária.';
        END IF;
    ELSIF NOT (public.has_admin_permission(v_reviewer_id, 'agencies.manage') OR public.is_super_admin(v_reviewer_id)) THEN
        RAISE EXCEPTION 'Acesso negado: permissão agencies.manage necessária.';
    END IF;

    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Decisão inválida: deve ser approved ou rejected.';
    END IF;

    -- Localiza o claim
    SELECT * INTO v_claim
    FROM public.agency_claims
    WHERE id = p_claim_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação de reivindicação não encontrada.';
    END IF;

    IF v_claim.status != 'pending' THEN
        RAISE EXCEPTION 'Apenas solicitações com status pending podem ser revisadas.';
    END IF;

    -- Obtém nome da agência e dados do revisor para log
    SELECT name INTO v_agency_name FROM public.agencies WHERE id = v_claim.agency_id;
    SELECT email, name INTO v_reviewer_email, v_reviewer_name FROM public.admin_users WHERE id = v_reviewer_id;

    IF p_decision = 'approved' THEN
        -- 1. Atualiza o claim para approved
        UPDATE public.agency_claims
        SET status = 'approved',
            admin_notes = p_admin_notes,
            reviewed_by = v_reviewer_id,
            reviewed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_claim_id;

        -- 2. Marca a agência como claimed e oficial
        UPDATE public.agencies
        SET claim_status = 'claimed',
            claimed_at = timezone('utc'::text, now()),
            claimed_by = v_claim.user_id,
            is_official_profile = true,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_claim.agency_id;

        -- 3. Adiciona o usuário em agency_members como owner ativo
        INSERT INTO public.agency_members (
            agency_id,
            user_id,
            role,
            status,
            created_at
        ) VALUES (
            v_claim.agency_id,
            v_claim.user_id,
            'owner',
            'active',
            timezone('utc'::text, now())
        )
        ON CONFLICT (agency_id, user_id)
        DO UPDATE SET
            role = 'owner',
            status = 'active';

        -- 4. Grava auditoria
        INSERT INTO public.admin_audit_logs (
            user_id,
            user_email,
            user_name,
            action,
            module,
            record_id,
            record_title,
            changes
        ) VALUES (
            v_reviewer_id,
            v_reviewer_email,
            COALESCE(v_reviewer_name, 'Administrador'),
            'CLAIM_APPROVED',
            'agencies',
            v_claim.agency_id::text,
            v_agency_name,
            jsonb_build_object(
                'claim_id', p_claim_id,
                'claimant_user_id', v_claim.user_id,
                'claimant_name', v_claim.applicant_name,
                'notes', p_admin_notes
            )
        );

        RETURN jsonb_build_object('success', true, 'status', 'approved', 'agency_id', v_claim.agency_id);

    ELSE -- p_decision = 'rejected'
        -- Atualiza o claim para rejected
        UPDATE public.agency_claims
        SET status = 'rejected',
            admin_notes = p_admin_notes,
            reviewed_by = v_reviewer_id,
            reviewed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_claim_id;

        -- Grava auditoria
        INSERT INTO public.admin_audit_logs (
            user_id,
            user_email,
            user_name,
            action,
            module,
            record_id,
            record_title,
            changes
        ) VALUES (
            v_reviewer_id,
            v_reviewer_email,
            COALESCE(v_reviewer_name, 'Administrador'),
            'CLAIM_REJECTED',
            'agencies',
            v_claim.agency_id::text,
            v_agency_name,
            jsonb_build_object(
                'claim_id', p_claim_id,
                'claimant_user_id', v_claim.user_id,
                'claimant_name', v_claim.applicant_name,
                'notes', p_admin_notes
            )
        );

        RETURN jsonb_build_object('success', true, 'status', 'rejected', 'agency_id', v_claim.agency_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
