-- =====================================================================
-- MIGRATION: 20260918000009_fix_property_audit_triggers_rls.sql
-- DESCRIÇÃO: Torna os gatilhos de auditoria de histórico de preço e status SECURITY DEFINER
--            e adiciona políticas de inserção nas tabelas de histórico para membros autenticados.
-- CONFORMIDADE: MASTER_PLAN.md (Seções 14, 31, 32 e 82)
-- =====================================================================

-- 1. REFAZER GATILHO DE HISTÓRICO DE STATUS COM SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_property_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.property_status_history (property_id, from_status, to_status, changed_by, recorded_at)
        VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status,
            auth.uid(),
            timezone('utc'::text, now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.handle_property_status_history IS 'Registra automaticamente mudanças de status do imóvel de forma segura com SECURITY DEFINER';

-- 2. REFAZER GATILHO DE HISTÓRICO DE PREÇO COM SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_property_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND (NEW.price IS NOT NULL OR NEW.rent_price IS NOT NULL)) OR
       (OLD.price IS DISTINCT FROM NEW.price OR OLD.rent_price IS DISTINCT FROM NEW.rent_price) THEN
        INSERT INTO public.property_price_history (property_id, price, rent_price, changed_by, recorded_at)
        VALUES (
            NEW.id,
            NEW.price,
            NEW.rent_price,
            auth.uid(),
            timezone('utc'::text, now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.handle_property_price_history IS 'Registra automaticamente alterações de preço e aluguel de forma segura com SECURITY DEFINER';

-- 3. POLÍTICAS RLS DE INSERÇÃO NAS TABELAS DE HISTÓRICO (SAFEGUARD)
DROP POLICY IF EXISTS "Status history insert access" ON public.property_status_history;
CREATE POLICY "Status history insert access"
ON public.property_status_history FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_status_history.property_id
          AND public.is_agency_member(p.agency_id)
    )
);

DROP POLICY IF EXISTS "Price history insert access" ON public.property_price_history;
CREATE POLICY "Price history insert access"
ON public.property_price_history FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_price_history.property_id
          AND public.is_agency_member(p.agency_id)
    )
);
