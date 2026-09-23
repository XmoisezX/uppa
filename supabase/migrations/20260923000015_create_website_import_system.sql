-- =====================================================================
-- MIGRATION: 20260923000015_create_website_import_system.sql
-- DESCRIÇÃO: Criação da infraestrutura de Website Import, conectores,
--            autorização de domínio, observabilidade (crawl_runs) e
--            suporte a content hash / source_url / last_seen_at
-- CONFORMIDADE: MASTER_PLAN.md (Seções 4, 5, 9, 10, 11, 23, 24, 25, 28, 29)
-- =====================================================================

-- 1. ADICIONA 'website' AO ENUM listing_source
DO $$ BEGIN
    ALTER TYPE public.listing_source ADD VALUE IF NOT EXISTS 'website';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ADICIONA CAMPOS ESPECÍFICOS DE WEBSITE E CONTENT HASH EM public.properties
ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS content_hash TEXT,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.properties.source_url IS 'URL canônica ou link original do anúncio no site de origem';
COMMENT ON COLUMN public.properties.content_hash IS 'Hash SHA-256 do conteúdo normalizado para evitar updates sem alteração';
COMMENT ON COLUMN public.properties.last_seen_at IS 'Data/hora da última detecção do imóvel ativo no domínio';

CREATE INDEX IF NOT EXISTS idx_properties_content_hash ON public.properties(content_hash);
CREATE INDEX IF NOT EXISTS idx_properties_last_seen_at ON public.properties(last_seen_at);

-- 3. TABELA DE AUTORIZAÇÃO FORMAL DE DOMÍNIOS (Conformidade legal obrigatória)
CREATE TABLE IF NOT EXISTS public.website_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    authorized_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'revoked'
    terms_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    declaration_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT website_authorizations_agency_domain_key UNIQUE (agency_id, domain)
);

COMMENT ON TABLE public.website_authorizations IS 'Registros explícitos de autorização da imobiliária para coleta de dados de seu domínio próprio';
CREATE INDEX IF NOT EXISTS idx_website_authorizations_agency_id ON public.website_authorizations(agency_id);
CREATE INDEX IF NOT EXISTS idx_website_authorizations_domain ON public.website_authorizations(domain);

-- 4. TABELA DE FONTES DE WEBSITES (Configurações do domínio a ser rastreado)
CREATE TABLE IF NOT EXISTS public.website_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    base_url TEXT NOT NULL,
    domain TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'error', 'pending_authorization'
    connector_type VARCHAR(100) NOT NULL DEFAULT 'universal_structured_data',
    crawl_interval_hours INTEGER NOT NULL DEFAULT 24,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_crawl_at TIMESTAMPTZ,
    next_crawl_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT website_sources_agency_domain_key UNIQUE (agency_id, domain)
);

COMMENT ON TABLE public.website_sources IS 'Fontes de sites cadastrados para varredura e importação automática de imóveis';
CREATE INDEX IF NOT EXISTS idx_website_sources_agency_id ON public.website_sources(agency_id);
CREATE INDEX IF NOT EXISTS idx_website_sources_domain ON public.website_sources(domain);
CREATE INDEX IF NOT EXISTS idx_website_sources_status ON public.website_sources(status);

-- 5. TABELA DE EXECUÇÃO DE VARREDURAS (CRAWL_RUNS - Observabilidade)
CREATE TABLE IF NOT EXISTS public.crawl_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_source_id UUID NOT NULL REFERENCES public.website_sources(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    finished_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'completed_with_errors', 'failed'
    items_found INTEGER NOT NULL DEFAULT 0,
    items_created INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    items_deactivated INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    pages_crawled INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.crawl_runs IS 'Histórico granular de execuções de crawling e sincronização por domínio';
CREATE INDEX IF NOT EXISTS idx_crawl_runs_website_source_id ON public.crawl_runs(website_source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_agency_id ON public.crawl_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_started_at ON public.crawl_runs(started_at DESC);

-- 6. TABELA DE ERROS GRANULARES (CRAWL_ERRORS - Tolerância a falhas)
CREATE TABLE IF NOT EXISTS public.crawl_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
    url TEXT,
    external_id TEXT,
    error_type VARCHAR(100) NOT NULL, -- 'fetch_error', 'parse_error', 'ssrf_blocked', 'validation_error', 'persistence_error'
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.crawl_errors IS 'Erros isolados de páginas ou imóveis durante o crawling (não interrompem a execução global)';
CREATE INDEX IF NOT EXISTS idx_crawl_errors_crawl_run_id ON public.crawl_errors(crawl_run_id);
CREATE INDEX IF NOT EXISTS idx_crawl_errors_external_id ON public.crawl_errors(external_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.website_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_errors ENABLE ROW LEVEL SECURITY;

-- 7.1 Políticas para public.website_authorizations
CREATE POLICY website_authorizations_select_member ON public.website_authorizations
    FOR SELECT TO authenticated
    USING (public.is_agency_member(agency_id));

CREATE POLICY website_authorizations_insert_admin ON public.website_authorizations
    FOR INSERT TO authenticated
    WITH CHECK (public.is_agency_admin_or_owner(agency_id));

CREATE POLICY website_authorizations_update_admin ON public.website_authorizations
    FOR UPDATE TO authenticated
    USING (public.is_agency_admin_or_owner(agency_id))
    WITH CHECK (public.is_agency_admin_or_owner(agency_id));

-- 7.2 Políticas para public.website_sources
CREATE POLICY website_sources_select_member ON public.website_sources
    FOR SELECT TO authenticated
    USING (public.is_agency_member(agency_id));

CREATE POLICY website_sources_insert_admin ON public.website_sources
    FOR INSERT TO authenticated
    WITH CHECK (public.is_agency_admin_or_owner(agency_id));

CREATE POLICY website_sources_update_admin ON public.website_sources
    FOR UPDATE TO authenticated
    USING (public.is_agency_admin_or_owner(agency_id))
    WITH CHECK (public.is_agency_admin_or_owner(agency_id));

CREATE POLICY website_sources_delete_admin ON public.website_sources
    FOR DELETE TO authenticated
    USING (public.is_agency_admin_or_owner(agency_id));

-- 7.3 Políticas para public.crawl_runs
CREATE POLICY crawl_runs_select_member ON public.crawl_runs
    FOR SELECT TO authenticated
    USING (public.is_agency_member(agency_id));

CREATE POLICY crawl_runs_insert_member ON public.crawl_runs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_agency_member(agency_id));

CREATE POLICY crawl_runs_update_member ON public.crawl_runs
    FOR UPDATE TO authenticated
    USING (public.is_agency_member(agency_id))
    WITH CHECK (public.is_agency_member(agency_id));

-- 7.4 Políticas para public.crawl_errors
CREATE POLICY crawl_errors_select_member ON public.crawl_errors
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crawl_runs r
            WHERE r.id = crawl_run_id
            AND public.is_agency_member(r.agency_id)
        )
    );

CREATE POLICY crawl_errors_insert_member ON public.crawl_errors
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crawl_runs r
            WHERE r.id = crawl_run_id
            AND public.is_agency_member(r.agency_id)
        )
    );
