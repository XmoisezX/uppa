-- =====================================================================
-- MIGRATION: 20260924000016_add_property_status_published_at_index.sql
-- DESCRIÇÃO: Cria índice composto (status, published_at DESC) em properties
-- JUSTIFICATIVA: As consultas mais frequentes do portal (Home, Comprar, Alugar, 
-- Imóveis Semelhantes) filtram por status = 'active' e ordenam por published_at DESC.
-- Sem este índice composto, o PostgreSQL precisava fazer varredura e ordenação
-- manual de milhares de registros, atrasando o carregamento das páginas.
-- CONFORMIDADE: MASTER_PLAN.md (Seção 13: "Monitorar queries reais")
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_properties_status_published_at
ON public.properties(status, published_at DESC);

COMMENT ON INDEX public.idx_properties_status_published_at IS 'Acelera vitrines públicas e listagens de busca ordenadas por mais recentes';
