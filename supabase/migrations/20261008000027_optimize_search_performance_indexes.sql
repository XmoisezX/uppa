-- =====================================================================
-- MIGRATION: 20261008000027_optimize_search_performance_indexes.sql
-- DESCRIÇÃO: Índices especializados de alta performance para busca pública,
--            keyset/cursor pagination e recuperação rápida de fotos de capa.
-- CONFORMIDADE: Regras do projeto e MASTER_PLAN.
-- =====================================================================

-- 1. ÍNDICE COMPOSTO PARCIAL: BUSCA POR CIDADE + RANKING SCORE + DESEMPATE DETERMINÍSTICO ID
-- Acelera /comprar e /alugar em ordenação padrão (ranking) sem necessidade de filesort em memória
CREATE INDEX IF NOT EXISTS idx_properties_search_city_ranking_id
ON public.properties (city_id, transaction_type, ranking_score DESC, id ASC)
WHERE status = 'active' AND canonical_property_id IS NULL AND active_offers_count > 0;

-- 2. ÍNDICE COMPOSTO PARCIAL: RANKING GERAL (BUSCA SEM FILTRO DE CIDADE)
CREATE INDEX IF NOT EXISTS idx_properties_search_ranking_id
ON public.properties (transaction_type, ranking_score DESC, id ASC)
WHERE status = 'active' AND canonical_property_id IS NULL AND active_offers_count > 0;

-- 3. ÍNDICES DE BUSCA POR CIDADE + PREÇO (ORDENAÇÃO MENOR E MAIOR PREÇO)
CREATE INDEX IF NOT EXISTS idx_properties_search_city_sale_price_asc
ON public.properties (city_id, lowest_sale_price ASC, id ASC)
WHERE status = 'active' AND canonical_property_id IS NULL AND active_offers_count > 0;

CREATE INDEX IF NOT EXISTS idx_properties_search_city_sale_price_desc
ON public.properties (city_id, lowest_sale_price DESC, id ASC)
WHERE status = 'active' AND canonical_property_id IS NULL AND active_offers_count > 0;

CREATE INDEX IF NOT EXISTS idx_properties_search_city_rent_price_asc
ON public.properties (city_id, lowest_rent_price ASC, id ASC)
WHERE status = 'active' AND canonical_property_id IS NULL AND active_offers_count > 0;

CREATE INDEX IF NOT EXISTS idx_properties_search_city_rent_price_desc
ON public.properties (city_id, lowest_rent_price DESC, id ASC)
WHERE status = 'active' AND canonical_property_id IS NULL AND active_offers_count > 0;

-- 4. ÍNDICE PARCIAL PARA RECUPERAÇÃO INSTANTÂNEA DA FOTO DE CAPA
-- Elimina a necessidade de escanear 140.000 mídias para localizar a capa do imóvel
CREATE INDEX IF NOT EXISTS idx_property_media_cover_fast
ON public.property_media (property_id, url)
WHERE is_cover = true;

CREATE INDEX IF NOT EXISTS idx_offer_media_cover_fast
ON public.offer_media (offer_id, url)
WHERE is_cover = true;
