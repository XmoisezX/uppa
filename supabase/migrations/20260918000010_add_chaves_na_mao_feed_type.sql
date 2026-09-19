-- =====================================================================
-- MIGRATION: 20260918000010_add_chaves_na_mao_feed_type.sql
-- DESCRIÇÃO: Documentação e suporte a feeds Chaves na Mão e correção do gatilho de histórico de preços
-- CONFORMIDADE: MASTER_PLAN.md (Seções 16, 23, 27 e 28)
-- =====================================================================

-- 1. Documenta o suporte ao tipo chaves_na_mao na tabela feeds
COMMENT ON COLUMN public.feeds.type IS 'Tipo do feed: vrsync, custom_xml, chaves_na_mao, api';

-- 2. Adiciona chaves_na_mao ao enum listing_source em public.properties
ALTER TYPE public.listing_source ADD VALUE IF NOT EXISTS 'chaves_na_mao';

-- 3. Adiciona coluna changed_by em property_price_history para suportar auditoria de usuário
ALTER TABLE public.property_price_history ADD COLUMN IF NOT EXISTS changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Corrige o gatilho handle_property_price_history para suportar tanto source quanto changed_by com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_property_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND (NEW.price IS NOT NULL OR NEW.rent_price IS NOT NULL)) OR
       (OLD.price IS DISTINCT FROM NEW.price OR OLD.rent_price IS DISTINCT FROM NEW.rent_price) THEN
        INSERT INTO public.property_price_history (
            property_id,
            price,
            rent_price,
            source,
            changed_by,
            recorded_at
        )
        VALUES (
            NEW.id,
            NEW.price,
            NEW.rent_price,
            COALESCE(NEW.source::text, 'feed'),
            auth.uid(),
            timezone('utc'::text, now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.handle_property_price_history IS 'Registra automaticamente alterações de preço e aluguel de forma segura com SECURITY DEFINER';
