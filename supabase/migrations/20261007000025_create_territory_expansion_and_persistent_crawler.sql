-- =====================================================================
-- MIGRATION: 20261007000025_create_territory_expansion_and_persistent_crawler.sql
-- DESCRIÇÃO: Estrutura completa de Expansão Territorial da UPPA por Cidade,
--            distinção de proveniência de fontes (agency_managed vs uppa_discovery),
--            rastreabilidade de dados institucionais por campo (agency_data_sources)
--            e orquestrador de crawler persistente tolerante a falhas (crawl_jobs e crawl_tasks)
-- CONFORMIDADE: Regras do projeto e MASTER_PLAN.
-- =====================================================================

-- 0. AJUSTE DE COLUNAS DE AGENCIES PARA PERFIS DESCOBERTOS (SEÇÃO 18)
-- Permite que agências descobertas possam ter CRECI, WhatsApp e Email nulos quando não encontrados
ALTER TABLE public.agencies
ALTER COLUMN creci DROP NOT NULL,
ALTER COLUMN whatsapp DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL;

-- 1. EXTENSÃO DA TABELA CITIES: DADOS ESTRATÉGICOS E EXPANSÃO TERRITORIAL
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS population INTEGER,
ADD COLUMN IF NOT EXISTS population_reference_year INTEGER DEFAULT 2022,
ADD COLUMN IF NOT EXISTS population_source TEXT DEFAULT 'IBGE',
ADD COLUMN IF NOT EXISTS population_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expansion_status TEXT NOT NULL DEFAULT 'not_started' 
    CHECK (expansion_status IN ('not_started', 'researching', 'eligible', 'crawling', 'active', 'paused', 'saturated', 'blocked')),
ADD COLUMN IF NOT EXISTS expansion_priority TEXT NOT NULL DEFAULT 'not_prioritized' 
    CHECK (expansion_priority IN ('A', 'B', 'C', 'not_prioritized')),
ADD COLUMN IF NOT EXISTS expansion_score NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_discovery_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS known_agencies_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS claimed_agencies_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_properties_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_offers_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.cities.population IS 'População oficial do município (IBGE Censo/Estimativa)';
COMMENT ON COLUMN public.cities.expansion_status IS 'Estado do plano de expansão territorial da UPPA no município';
COMMENT ON COLUMN public.cities.expansion_priority IS 'Faixa de prioridade estratégica (A: Alta densidade/gap, B: Médio, C: Baixo)';
COMMENT ON COLUMN public.cities.expansion_score IS 'Pontuação determinística explicável de oportunidade de expansão (0-100)';

CREATE INDEX IF NOT EXISTS idx_cities_expansion_status ON public.cities(expansion_status);
CREATE INDEX IF NOT EXISTS idx_cities_expansion_priority ON public.cities(expansion_priority);
CREATE INDEX IF NOT EXISTS idx_cities_expansion_score ON public.cities(expansion_score DESC);

-- 2. EXTENSÃO DA TABELA WEBSITE_SOURCES: PROVENIÊNCIA E VÍNCULO TERRITORIAL
ALTER TABLE public.website_sources
ADD COLUMN IF NOT EXISTS ingestion_origin TEXT NOT NULL DEFAULT 'agency_managed'
    CHECK (ingestion_origin IN ('agency_managed', 'uppa_discovery', 'feed', 'api', 'partner')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.website_sources.ingestion_origin IS 'Identifica quem originou a fonte: agency_managed (própria imobiliária) ou uppa_discovery (expansão UPPA)';

CREATE INDEX IF NOT EXISTS idx_website_sources_origin ON public.website_sources(ingestion_origin);
CREATE INDEX IF NOT EXISTS idx_website_sources_city_id ON public.website_sources(city_id);

-- 3. TABELA DE PROVENIÊNCIA GRANULAR DE DADOS DA AGÊNCIA: AGENCY_DATA_SOURCES
CREATE TABLE IF NOT EXISTS public.agency_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('website', 'feed', 'public_record', 'manual', 'partner')),
    source_url TEXT,
    captured_value TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    is_official BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agency_data_sources IS 'Histórico e proveniência granular por campo cadastral (CRECI, CNPJ, telefone, logo, endereço)';

CREATE INDEX IF NOT EXISTS idx_agency_data_sources_agency_field ON public.agency_data_sources(agency_id, field_name);
CREATE INDEX IF NOT EXISTS idx_agency_data_sources_captured_at ON public.agency_data_sources(captured_at DESC);

-- 4. TABELA DE JOBS DE CRAWLER PERSISTENTE: CRAWL_JOBS
CREATE TABLE IF NOT EXISTS public.crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    website_source_id UUID NOT NULL REFERENCES public.website_sources(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'scheduled', 'admin_expansion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    heartbeat_at TIMESTAMPTZ,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    failed_tasks INTEGER NOT NULL DEFAULT 0,
    offers_found INTEGER NOT NULL DEFAULT 0,
    offers_created INTEGER NOT NULL DEFAULT 0,
    offers_updated INTEGER NOT NULL DEFAULT 0,
    offers_unchanged INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_lock_triggered TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.crawl_jobs IS 'Orquestração persistente de execuções de scraping tolerante a reinícios e crashes';

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source_status ON public.crawl_jobs(website_source_id, status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_city_id ON public.crawl_jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created_at ON public.crawl_jobs(created_at DESC);

-- 5. TABELA DE TAREFAS PERSISTENTES: CRAWL_TASKS
CREATE TABLE IF NOT EXISTS public.crawl_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
    normalized_url TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'property_page' CHECK (task_type IN ('discovery_page', 'property_page')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    http_status INTEGER,
    error_code TEXT,
    error_message TEXT,
    content_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT crawl_tasks_job_url_key UNIQUE (job_id, normalized_url)
);

COMMENT ON TABLE public.crawl_tasks IS 'Fila persistente de URLs a serem extraídas com garantia de unicidade e controle de concorrência';

CREATE INDEX IF NOT EXISTS idx_crawl_tasks_job_status ON public.crawl_tasks(job_id, status);
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_available ON public.crawl_tasks(status, available_at) WHERE status = 'pending';

-- 6. TABELA DE EVENTOS DO JOB: CRAWL_JOB_EVENTS
CREATE TABLE IF NOT EXISTS public.crawl_job_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.crawl_job_events IS 'Linha do tempo auditável de eventos de execução de jobs de varredura';

CREATE INDEX IF NOT EXISTS idx_crawl_job_events_job_id ON public.crawl_job_events(job_id);

-- 7. FUNÇÃO RPC TRANSACIONAL: CLAIM ATÔMICO DE TASKS COM SKIP LOCKED E LEASE
CREATE OR REPLACE FUNCTION public.claim_crawl_tasks(
    p_job_id UUID,
    p_batch_size INT DEFAULT 10,
    p_lease_seconds INT DEFAULT 300
)
RETURNS SETOF public.crawl_tasks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_stale_threshold TIMESTAMPTZ := v_now - (p_lease_seconds || ' seconds')::interval;
BEGIN
    -- 1. Re-enfileira tasks com lease expirado (worker crash / timeout)
    UPDATE public.crawl_tasks
    SET status = 'pending',
        started_at = NULL,
        updated_at = v_now
    WHERE job_id = p_job_id
      AND status = 'running'
      AND started_at < v_stale_threshold;

    -- 2. Claim atômico com FOR UPDATE SKIP LOCKED
    RETURN QUERY
    WITH candidate AS (
        SELECT id
        FROM public.crawl_tasks
        WHERE job_id = p_job_id
          AND status = 'pending'
          AND available_at <= v_now
        ORDER BY priority DESC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_batch_size
    )
    UPDATE public.crawl_tasks ct
    SET status = 'running',
        attempt_count = ct.attempt_count + 1,
        started_at = v_now,
        updated_at = v_now
    FROM candidate
    WHERE ct.id = candidate.id
    RETURNING ct.*;
END;
$$;

COMMENT ON FUNCTION public.claim_crawl_tasks IS 'Claim atômico com SKIP LOCKED e recuperação de lease para execução tolerante a falhas';

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.agency_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_job_events ENABLE ROW LEVEL SECURITY;

-- 8.1 AGENCY_DATA_SOURCES
DROP POLICY IF EXISTS "Agency data sources select access" ON public.agency_data_sources;
CREATE POLICY "Agency data sources select access"
ON public.agency_data_sources FOR SELECT
TO authenticated
USING (
    public.is_agency_member(agency_id)
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 8.2 CRAWL_JOBS
DROP POLICY IF EXISTS "Crawl jobs select access" ON public.crawl_jobs;
CREATE POLICY "Crawl jobs select access"
ON public.crawl_jobs FOR SELECT
TO authenticated
USING (
    (agency_id IS NOT NULL AND public.is_agency_member(agency_id))
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 8.3 CRAWL_TASKS
DROP POLICY IF EXISTS "Crawl tasks select access" ON public.crawl_tasks;
CREATE POLICY "Crawl tasks select access"
ON public.crawl_tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crawl_jobs cj
        WHERE cj.id = crawl_tasks.job_id
          AND (
            (cj.agency_id IS NOT NULL AND public.is_agency_member(cj.agency_id))
            OR public.has_admin_permission(auth.uid(), 'agencies.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);

-- 8.4 CRAWL_JOB_EVENTS
DROP POLICY IF EXISTS "Crawl job events select access" ON public.crawl_job_events;
CREATE POLICY "Crawl job events select access"
ON public.crawl_job_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crawl_jobs cj
        WHERE cj.id = crawl_job_events.job_id
          AND (
            (cj.agency_id IS NOT NULL AND public.is_agency_member(cj.agency_id))
            OR public.has_admin_permission(auth.uid(), 'agencies.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);
