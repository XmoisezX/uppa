-- =====================================================================
-- MIGRATION: 20260918000010_add_chaves_na_mao_feed_type.sql
-- DESCRIÇÃO: Documentação e suporte a feeds e importações do portal Chaves na Mão
-- CONFORMIDADE: MASTER_PLAN.md (Seções 23, 27 e 28)
-- =====================================================================

-- 1. Suporte ao tipo chaves_na_mao em feeds
COMMENT ON COLUMN public.feeds.type IS 'Tipo do feed: vrsync, custom_xml, chaves_na_mao, api';

-- 2. Adiciona chaves_na_mao ao enum listing_source caso a imobiliária deseje rastrear a origem específica
ALTER TYPE public.listing_source ADD VALUE IF NOT EXISTS 'chaves_na_mao';
