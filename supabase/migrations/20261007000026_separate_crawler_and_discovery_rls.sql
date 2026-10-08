-- =====================================================================
-- MIGRATION: 20261007000026_separate_crawler_and_discovery_rls.sql
-- DESCRIÇÃO: Segregação estrita de RLS entre scraping territorial da UPPA (administrativo)
--            e integrações geridas pela própria imobiliária (agency_managed).
--            Garante que agências claimed NUNCA visualizem ou controlem jobs, tasks,
--            fontes ou eventos de discovery/expansão estratégica da UPPA.
-- CONFORMIDADE: Regras do projeto e MASTER_PLAN.
-- =====================================================================

-- 1. REFINAMENTO DE RLS PARA WEBSITE_SOURCES
DROP POLICY IF EXISTS website_sources_select_member ON public.website_sources;
DROP POLICY IF EXISTS website_sources_insert_admin ON public.website_sources;
DROP POLICY IF EXISTS website_sources_update_admin ON public.website_sources;
DROP POLICY IF EXISTS website_sources_delete_admin ON public.website_sources;
DROP POLICY IF EXISTS "Website sources agency select access" ON public.website_sources;
DROP POLICY IF EXISTS "Website sources admin full access" ON public.website_sources;
DROP POLICY IF EXISTS "Website sources select access" ON public.website_sources;
DROP POLICY IF EXISTS "Website sources insert access" ON public.website_sources;
DROP POLICY IF EXISTS "Website sources update access" ON public.website_sources;
DROP POLICY IF EXISTS "Website sources delete access" ON public.website_sources;

-- 1.1 Leitura: Imobiliária só visualiza suas próprias fontes 'agency_managed'.
--     Administradores UPPA podem visualizar todas (uppa_discovery, agency_managed, feed, api, partner).
CREATE POLICY "Website sources select access"
ON public.website_sources FOR SELECT
TO authenticated
USING (
    (
        public.is_agency_member(agency_id)
        AND ingestion_origin = 'agency_managed'
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 1.2 Inserção: Imobiliária só pode inserir fontes 'agency_managed' para a própria agência.
CREATE POLICY "Website sources insert access"
ON public.website_sources FOR INSERT
TO authenticated
WITH CHECK (
    (
        public.is_agency_admin_or_owner(agency_id)
        AND ingestion_origin = 'agency_managed'
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 1.3 Atualização: Imobiliária só atualiza fontes 'agency_managed' próprias.
CREATE POLICY "Website sources update access"
ON public.website_sources FOR UPDATE
TO authenticated
USING (
    (
        public.is_agency_admin_or_owner(agency_id)
        AND ingestion_origin = 'agency_managed'
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
)
WITH CHECK (
    (
        public.is_agency_admin_or_owner(agency_id)
        AND ingestion_origin = 'agency_managed'
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 1.4 Exclusão: Imobiliária só remove fontes 'agency_managed' próprias.
CREATE POLICY "Website sources delete access"
ON public.website_sources FOR DELETE
TO authenticated
USING (
    (
        public.is_agency_admin_or_owner(agency_id)
        AND ingestion_origin = 'agency_managed'
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 2. REFINAMENTO DE RLS PARA CRAWL_JOBS
DROP POLICY IF EXISTS "Crawl jobs select access" ON public.crawl_jobs;

-- 2.1 Leitura de jobs: Agência só acessa jobs de fontes 'agency_managed' e que não sejam expansão territorial.
CREATE POLICY "Crawl jobs select access"
ON public.crawl_jobs FOR SELECT
TO authenticated
USING (
    (
        agency_id IS NOT NULL 
        AND public.is_agency_member(agency_id)
        AND trigger != 'admin_expansion'
        AND EXISTS (
            SELECT 1 FROM public.website_sources ws
            WHERE ws.id = crawl_jobs.website_source_id
              AND ws.ingestion_origin = 'agency_managed'
        )
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 2.2 Controle de jobs (Pausar/Cancelar próprio job): Apenas admin ou agency em suas fontes gerenciadas.
DROP POLICY IF EXISTS "Crawl jobs update access" ON public.crawl_jobs;
CREATE POLICY "Crawl jobs update access"
ON public.crawl_jobs FOR UPDATE
TO authenticated
USING (
    (
        agency_id IS NOT NULL 
        AND public.is_agency_admin_or_owner(agency_id)
        AND trigger != 'admin_expansion'
        AND EXISTS (
            SELECT 1 FROM public.website_sources ws
            WHERE ws.id = crawl_jobs.website_source_id
              AND ws.ingestion_origin = 'agency_managed'
        )
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
)
WITH CHECK (
    (
        agency_id IS NOT NULL 
        AND public.is_agency_admin_or_owner(agency_id)
        AND trigger != 'admin_expansion'
        AND EXISTS (
            SELECT 1 FROM public.website_sources ws
            WHERE ws.id = crawl_jobs.website_source_id
              AND ws.ingestion_origin = 'agency_managed'
        )
    )
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);

-- 3. REFINAMENTO DE RLS PARA CRAWL_TASKS
DROP POLICY IF EXISTS "Crawl tasks select access" ON public.crawl_tasks;

-- Tasks internas de discovery administrativo nunca são expostas a imobiliárias
CREATE POLICY "Crawl tasks select access"
ON public.crawl_tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crawl_jobs cj
        JOIN public.website_sources ws ON ws.id = cj.website_source_id
        WHERE cj.id = crawl_tasks.job_id
          AND (
            (
                cj.agency_id IS NOT NULL 
                AND public.is_agency_member(cj.agency_id)
                AND ws.ingestion_origin = 'agency_managed'
                AND cj.trigger != 'admin_expansion'
            )
            OR public.has_admin_permission(auth.uid(), 'agencies.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);

-- 4. REFINAMENTO DE RLS PARA CRAWL_JOB_EVENTS
DROP POLICY IF EXISTS "Crawl job events select access" ON public.crawl_job_events;

-- Eventos de crawler administrativo nunca são expostos a imobiliárias
CREATE POLICY "Crawl job events select access"
ON public.crawl_job_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crawl_jobs cj
        JOIN public.website_sources ws ON ws.id = cj.website_source_id
        WHERE cj.id = crawl_job_events.job_id
          AND (
            (
                cj.agency_id IS NOT NULL 
                AND public.is_agency_member(cj.agency_id)
                AND ws.ingestion_origin = 'agency_managed'
                AND cj.trigger != 'admin_expansion'
            )
            OR public.has_admin_permission(auth.uid(), 'agencies.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);
