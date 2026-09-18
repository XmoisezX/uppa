-- =====================================================================
-- MIGRATION: 20260918000008_add_property_query_indexes.sql
-- DESCRIÇÃO: Adiciona índice UNIQUE em properties(slug) e índice B-Tree em properties(state_id)
-- CONFORMIDADE: MASTER_PLAN.md (Seções 12, 13, 31, 45 e 85)
-- =====================================================================

-- 1. TRATAMENTO DETERMINÍSTICO DE SLUGS DUPLICADOS PREEXISTENTES (SE HOUVER)
-- Garante que o índice UNIQUE seja criado com segurança sem perda de dados
UPDATE public.properties p
SET slug = p.slug || '-' || LOWER(COALESCE(p.external_id, SUBSTRING(p.id::text, 1, 8)))
WHERE p.id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) as rn
        FROM public.properties
    ) sub
    WHERE sub.rn > 1
);

-- 2. ÍNDICE UNIQUE PARA PROPERTIES(SLUG)
-- Otimiza consultas da página pública /imovel/[slug] e impede rotas duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug
ON public.properties(slug);

-- 3. ÍNDICE B-TREE PARA PROPERTIES(STATE_ID)
-- Otimiza buscas e filtragens no portal por estado federativo
CREATE INDEX IF NOT EXISTS idx_properties_state_id
ON public.properties(state_id);

COMMENT ON INDEX public.idx_properties_slug IS 'Garante unicidade de URL e acesso instantâneo na rota pública /imovel/[slug]';
COMMENT ON INDEX public.idx_properties_state_id IS 'Otimiza filtros geográficos por estado sem necessidade de varredura sequencial';
