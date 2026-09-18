-- =====================================================================
-- MIGRATION: 20260918000006_create_feeds_and_runs.sql
-- DESCRIÇÃO: Criação das tabelas de integração de feeds XML/VRSync, execuções e erros
-- CONFORMIDADE: MASTER_PLAN.md (Seções 23, 24, 25, 26, 27, 28 e 88)
-- =====================================================================

-- 1. TABELA PRINCIPAL: FEEDS (Seção 23 do MASTER_PLAN)
CREATE TABLE IF NOT EXISTS public.feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'vrsync', -- 'vrsync', 'custom_xml', 'api'
    url TEXT NOT NULL,
    username_encrypted TEXT,
    password_encrypted TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'error'
    sync_interval_minutes INTEGER NOT NULL DEFAULT 360,
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.feeds IS 'Configurações de feeds externos (VRSync / XML) para integração contínua de imóveis';
COMMENT ON COLUMN public.feeds.type IS 'Tipo do feed: vrsync, custom_xml, api';
COMMENT ON COLUMN public.feeds.sync_interval_minutes IS 'Intervalo de sincronização periódica em minutos';

-- 2. TABELA DE HISTÓRICO DE EXECUÇÃO: FEED_RUNS (Seção 24 do MASTER_PLAN)
CREATE TABLE IF NOT EXISTS public.feed_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    finished_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'completed_with_errors', 'failed'
    items_found INTEGER NOT NULL DEFAULT 0,
    items_created INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    items_deactivated INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.feed_runs IS 'Registros detalhados de cada execução de importação e sincronização de feeds';

-- 3. TABELA DE ERROS ESPECÍFICOS: FEED_ERRORS (Seção 25 do MASTER_PLAN)
CREATE TABLE IF NOT EXISTS public.feed_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_run_id UUID NOT NULL REFERENCES public.feed_runs(id) ON DELETE CASCADE,
    external_id TEXT,
    error_type VARCHAR(100) NOT NULL, -- 'xml_syntax', 'validation_error', 'missing_price', 'geo_error', 'persistence_error'
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.feed_errors IS 'Erros granulares de itens individuais durante o processamento do feed (não interrompem a execução)';

-- 4. ÍNDICES DE ALTA PERFORMANCE (Seções 31 e 32 do MASTER_PLAN)
CREATE INDEX IF NOT EXISTS idx_feeds_agency_id ON public.feeds(agency_id);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON public.feeds(status);

CREATE INDEX IF NOT EXISTS idx_feed_runs_feed_id ON public.feed_runs(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_runs_agency_id ON public.feed_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_feed_runs_started_at ON public.feed_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_errors_feed_run_id ON public.feed_errors(feed_run_id);
CREATE INDEX IF NOT EXISTS idx_feed_errors_external_id ON public.feed_errors(external_id);

-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_errors ENABLE ROW LEVEL SECURITY;

-- 5.1 Políticas para public.feeds
CREATE POLICY feeds_select_member ON public.feeds
    FOR SELECT TO authenticated
    USING (public.is_agency_member(agency_id));

CREATE POLICY feeds_insert_admin ON public.feeds
    FOR INSERT TO authenticated
    WITH CHECK (public.is_agency_admin_or_owner(agency_id));

CREATE POLICY feeds_update_admin ON public.feeds
    FOR UPDATE TO authenticated
    USING (public.is_agency_admin_or_owner(agency_id))
    WITH CHECK (public.is_agency_admin_or_owner(agency_id));

CREATE POLICY feeds_delete_admin ON public.feeds
    FOR DELETE TO authenticated
    USING (public.is_agency_admin_or_owner(agency_id));

-- 5.2 Políticas para public.feed_runs
CREATE POLICY feed_runs_select_member ON public.feed_runs
    FOR SELECT TO authenticated
    USING (public.is_agency_member(agency_id));

CREATE POLICY feed_runs_insert_member ON public.feed_runs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_agency_member(agency_id));

CREATE POLICY feed_runs_update_member ON public.feed_runs
    FOR UPDATE TO authenticated
    USING (public.is_agency_member(agency_id))
    WITH CHECK (public.is_agency_member(agency_id));

-- 5.3 Políticas para public.feed_errors
CREATE POLICY feed_errors_select_member ON public.feed_errors
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.feed_runs r
            WHERE r.id = feed_run_id
            AND public.is_agency_member(r.agency_id)
        )
    );

CREATE POLICY feed_errors_insert_member ON public.feed_errors
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.feed_runs r
            WHERE r.id = feed_run_id
            AND public.is_agency_member(r.agency_id)
        )
    );
