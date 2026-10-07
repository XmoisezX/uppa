-- =====================================================================
-- MIGRATION: 20260925000019_prevent_bridge_history_duplication.sql
-- DESCRIÇÃO: Ajusta as triggers da ponte temporária para evitar duplicação
--            de registros de histórico quando o novo fluxo grava nativamente
--            em offer_price_history e offer_status_history.
-- =====================================================================

-- 1. Sincronização protegida de histórico de preço
CREATE OR REPLACE FUNCTION public.sync_bridge_price_history_to_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_offer_id UUID;
BEGIN
    SELECT id INTO v_offer_id
    FROM public.property_offers
    WHERE legacy_property_id = NEW.property_id;

    IF v_offer_id IS NOT NULL THEN
        -- Evita duplicata se um registro idêntico já foi gravado nativamente nos últimos 10 segundos
        IF NOT EXISTS (
            SELECT 1 FROM public.offer_price_history
            WHERE offer_id = v_offer_id
              AND (price IS NOT DISTINCT FROM NEW.price)
              AND (rent_price IS NOT DISTINCT FROM NEW.rent_price)
              AND recorded_at >= (NEW.recorded_at - INTERVAL '10 seconds')
        ) THEN
            INSERT INTO public.offer_price_history (
                id,
                offer_id,
                price,
                rent_price,
                source,
                recorded_at
            ) VALUES (
                NEW.id,
                v_offer_id,
                NEW.price,
                NEW.rent_price,
                NEW.source,
                NEW.recorded_at
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Sincronização protegida de histórico de status
CREATE OR REPLACE FUNCTION public.sync_bridge_status_history_to_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_offer_id UUID;
BEGIN
    SELECT id INTO v_offer_id
    FROM public.property_offers
    WHERE legacy_property_id = NEW.property_id;

    IF v_offer_id IS NOT NULL THEN
        -- Evita duplicata se um registro idêntico já foi gravado nativamente nos últimos 10 segundos
        IF NOT EXISTS (
            SELECT 1 FROM public.offer_status_history
            WHERE offer_id = v_offer_id
              AND (from_status IS NOT DISTINCT FROM NEW.from_status)
              AND (to_status = NEW.to_status)
              AND recorded_at >= (NEW.recorded_at - INTERVAL '10 seconds')
        ) THEN
            INSERT INTO public.offer_status_history (
                id,
                offer_id,
                from_status,
                to_status,
                changed_by,
                reason,
                recorded_at
            ) VALUES (
                NEW.id,
                v_offer_id,
                NEW.from_status,
                NEW.to_status,
                NEW.changed_by,
                NEW.reason,
                NEW.recorded_at
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
