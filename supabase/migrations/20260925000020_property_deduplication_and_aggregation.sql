-- =====================================================================
-- MIGRATION: 20260925000020_property_deduplication_and_aggregation.sql
-- DESCRIÇÃO: Conclusão de ponta a ponta da Arquitetura Property x Offer:
--   1. Suporte a propriedades físicas agrupadas (N offers -> 1 property canônica);
--   2. Agregados comerciais em properties (active_offers_count, ranges de preço, primary_offer_id);
--   3. Suporte a status 'merged' e ponteiro canonical_property_id;
--   4. Tabela de redirecionamentos de slug (property_slug_redirects - 301 sem 404);
--   5. Tabela de auditoria e revisão de duplicidade (property_match_candidates);
--   6. Função e gatilhos atômicos para recalcular agregados sem peso em runtime;
--   7. Backfill idempotente dos agregados de todo o estoque existente.
-- =====================================================================

-- 1. ADICIONA STATUS 'merged' AO ENUM property_status CASO NÃO EXISTA
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'merged';

-- 2. ESTRUTURA PARA PROPRIEDADES AGRUPADAS E AGREGADOS (FASE 1, 8 E 23)
ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS active_offers_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS lowest_sale_price NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS highest_sale_price NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS lowest_rent_price NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS highest_rent_price NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS primary_offer_id UUID REFERENCES public.property_offers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS canonical_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

COMMENT ON COLUMN public.properties.active_offers_count IS 'Quantidade de ofertas comerciais públicas ativas vinculadas ao imóvel físico';
COMMENT ON COLUMN public.properties.lowest_sale_price IS 'Menor preço de venda entre todas as ofertas ativas da propriedade';
COMMENT ON COLUMN public.properties.highest_sale_price IS 'Maior preço de venda entre todas as ofertas ativas da propriedade';
COMMENT ON COLUMN public.properties.lowest_rent_price IS 'Menor valor de locação entre todas as ofertas ativas da propriedade';
COMMENT ON COLUMN public.properties.highest_rent_price IS 'Maior valor de locação entre todas as ofertas ativas da propriedade';
COMMENT ON COLUMN public.properties.primary_offer_id IS 'Oferta comercial representativa selecionada para exibir fotos e destaques no card';
COMMENT ON COLUMN public.properties.canonical_property_id IS 'ID da property física canônica quando este registro for unificado/mesclado';
COMMENT ON COLUMN public.properties.merged_at IS 'Data/hora em que a propriedade foi consolidada como duplicata';

-- 3. TABELA DE REDIRECIONAMENTOS DE SLUG (FASE 5)
CREATE TABLE IF NOT EXISTS public.property_slug_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_slug TEXT UNIQUE NOT NULL,
    target_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    target_slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.property_slug_redirects IS 'Mapeamento de slugs de propriedades consolidadas para redirecionamento 301 sem 404';

CREATE INDEX IF NOT EXISTS idx_property_slug_redirects_source
    ON public.property_slug_redirects (source_slug);

ALTER TABLE public.property_slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read property_slug_redirects" ON public.property_slug_redirects;
CREATE POLICY "Public read property_slug_redirects"
    ON public.property_slug_redirects
    FOR SELECT
    USING (true);

-- 4. TABELA DE CANDIDATOS À DUPLICIDADE (FASE 3 E 20)
CREATE TABLE IF NOT EXISTS public.property_match_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_a_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    property_b_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_approved', 'approved', 'rejected', 'unmerged')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_property_match_pair UNIQUE (property_a_id, property_b_id)
);

COMMENT ON TABLE public.property_match_candidates IS 'Registro de candidatos a duplicidade física entre propriedades e decisão de agrupamento';

CREATE INDEX IF NOT EXISTS idx_property_match_candidates_status
    ON public.property_match_candidates (status, confidence);
CREATE INDEX IF NOT EXISTS idx_property_match_candidates_prop_a
    ON public.property_match_candidates (property_a_id);
CREATE INDEX IF NOT EXISTS idx_property_match_candidates_prop_b
    ON public.property_match_candidates (property_b_id);

ALTER TABLE public.property_match_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access property_match_candidates" ON public.property_match_candidates;
CREATE POLICY "Admin access property_match_candidates"
    ON public.property_match_candidates
    FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Permite leitura por usuários autenticados para moderação/admin
DROP POLICY IF EXISTS "Authenticated read property_match_candidates" ON public.property_match_candidates;
CREATE POLICY "Authenticated read property_match_candidates"
    ON public.property_match_candidates
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 5. FUNÇÃO CENTRAL DE RECÁLCULO ATÔMICO DE AGREGADOS (FASE 8 E 9)
CREATE OR REPLACE FUNCTION public.recalculate_property_aggregates(p_property_id UUID)
RETURNS VOID AS $$
DECLARE
    v_active_count INTEGER;
    v_min_sale NUMERIC(14, 2);
    v_max_sale NUMERIC(14, 2);
    v_min_rent NUMERIC(14, 2);
    v_max_rent NUMERIC(14, 2);
    v_primary_offer_id UUID;
BEGIN
    IF p_property_id IS NULL THEN
        RETURN;
    END IF;

    -- Agrega apenas sobre ofertas ativas vinculadas a esta property física
    SELECT 
        COUNT(*),
        MIN(sale_price) FILTER (WHERE sale_price > 0),
        MAX(sale_price) FILTER (WHERE sale_price > 0),
        MIN(rent_price) FILTER (WHERE rent_price > 0),
        MAX(rent_price) FILTER (WHERE rent_price > 0)
    INTO 
        v_active_count,
        v_min_sale,
        v_max_sale,
        v_min_rent,
        v_max_rent
    FROM public.property_offers
    WHERE property_id = p_property_id
      AND status = 'active';

    -- Seleção determinística da Primary Offer (Fase 9):
    -- Prioriza: 1) status='active', 2) ranking_score DESC, 3) updated_at DESC
    SELECT id INTO v_primary_offer_id
    FROM public.property_offers
    WHERE property_id = p_property_id
    ORDER BY 
        (status = 'active') DESC,
        COALESCE(ranking_score, 0) DESC,
        updated_at DESC
    LIMIT 1;

    -- Atualiza os agregados na property física
    UPDATE public.properties
    SET 
        active_offers_count = COALESCE(v_active_count, 0),
        lowest_sale_price = v_min_sale,
        highest_sale_price = v_max_sale,
        lowest_rent_price = v_min_rent,
        highest_rent_price = v_max_rent,
        primary_offer_id = v_primary_offer_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.recalculate_property_aggregates IS 'Recalcula agregados (contagem de ofertas ativas, menor e maior preço e oferta primária) de forma atômica';

-- 6. GATILHO AUTOMÁTICO EM PROPERTY_OFFERS PARA RECALCULAR AGREGADOS
CREATE OR REPLACE FUNCTION public.trg_fn_sync_offer_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.recalculate_property_aggregates(OLD.property_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.property_id IS NOT DISTINCT FROM NEW.property_id) THEN
            -- Se houve alteração de status, preço ou ranking que afete agregados
            IF (OLD.status IS DISTINCT FROM NEW.status OR
                OLD.sale_price IS DISTINCT FROM NEW.sale_price OR
                OLD.rent_price IS DISTINCT FROM NEW.rent_price OR
                OLD.ranking_score IS DISTINCT FROM NEW.ranking_score) THEN
                PERFORM public.recalculate_property_aggregates(NEW.property_id);
            END IF;
        ELSE
            -- Mudou de property (consolidação/desagrupamento)
            PERFORM public.recalculate_property_aggregates(OLD.property_id);
            PERFORM public.recalculate_property_aggregates(NEW.property_id);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        PERFORM public.recalculate_property_aggregates(NEW.property_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_offer_aggregates ON public.property_offers;
CREATE TRIGGER trg_sync_offer_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.property_offers
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_sync_offer_aggregates();

-- 7. ÍNDICES DE PERFORMANCE PARA BUSCA AGRUPADA NO POSTGRESQL (FASE 11 E 12)
CREATE INDEX IF NOT EXISTS idx_properties_search_active_canonical
    ON public.properties (status, canonical_property_id)
    WHERE status = 'active' AND canonical_property_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_search_lowest_prices
    ON public.properties (lowest_sale_price, lowest_rent_price)
    WHERE status = 'active' AND canonical_property_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_offers_property_status
    ON public.property_offers (property_id, status);

-- 8. BACKFILL INICIAL DE AGREGADOS PARA AS PROPERTIES EXISTENTES (SET-BASED)
WITH aggregated AS (
    SELECT 
        property_id,
        COUNT(*) FILTER (WHERE status = 'active') AS active_count,
        MIN(sale_price) FILTER (WHERE status = 'active' AND sale_price > 0) AS min_sale,
        MAX(sale_price) FILTER (WHERE status = 'active' AND sale_price > 0) AS max_sale,
        MIN(rent_price) FILTER (WHERE status = 'active' AND rent_price > 0) AS min_rent,
        MAX(rent_price) FILTER (WHERE status = 'active' AND rent_price > 0) AS max_rent
    FROM public.property_offers
    WHERE property_id IS NOT NULL
    GROUP BY property_id
),
primary_offers AS (
    SELECT DISTINCT ON (property_id)
        property_id,
        id AS primary_id
    FROM public.property_offers
    WHERE property_id IS NOT NULL
    ORDER BY property_id, (status = 'active') DESC, COALESCE(ranking_score, 0) DESC, updated_at DESC
)
UPDATE public.properties p
SET 
    active_offers_count = COALESCE(a.active_count, 0),
    lowest_sale_price = a.min_sale,
    highest_sale_price = a.max_sale,
    lowest_rent_price = a.min_rent,
    highest_rent_price = a.max_rent,
    primary_offer_id = po.primary_id
FROM aggregated a
LEFT JOIN primary_offers po ON po.property_id = a.property_id
WHERE p.id = a.property_id;
