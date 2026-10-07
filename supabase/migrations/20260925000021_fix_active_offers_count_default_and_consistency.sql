-- =====================================================================
-- MIGRATION: 20260925000021_fix_active_offers_count_default_and_consistency.sql
-- DESCRIÇÃO: Correção do valor default de active_offers_count para 0
--            e garantia de consistência com COUNT(property_offers WHERE status = 'active').
-- =====================================================================

-- 1. ALTERA O DEFAULT PARA 0 (A CONTAGEM DEVE SER CONSEQUÊNCIA DAS OFFERS ATIVAS)
ALTER TABLE public.properties 
    ALTER COLUMN active_offers_count SET DEFAULT 0;

COMMENT ON COLUMN public.properties.active_offers_count IS 'Quantidade real de ofertas comerciais públicas ativas vinculadas ao imóvel físico (default 0)';

-- 2. RECÁLCULO EM LOTE PARA GARANTIR CONSISTÊNCIA ESTRITA COM AS OFERTAS ATIVAS
UPDATE public.properties p
SET active_offers_count = COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.property_offers o
    WHERE o.property_id = p.id
      AND o.status = 'active'
), 0)
WHERE p.canonical_property_id IS NULL;

-- 3. GARANTE QUE PROPRIEDADES CONSOLIDADAS (MERGED) POSSUAM ACTIVE_OFFERS_COUNT = 0
UPDATE public.properties
SET active_offers_count = 0
WHERE status = 'merged';
