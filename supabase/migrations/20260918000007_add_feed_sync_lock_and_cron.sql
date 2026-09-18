-- =====================================================================
-- MIGRATION: 20260918000007_add_feed_sync_lock_and_cron.sql
-- DESCRIÇÃO: Adiciona controle atômico de lock concorrente, retry e agendamento de feeds
-- CONFORMIDADE: MASTER_PLAN.md (Seções 16, 24, 25, 26, 28, 29 e 89)
-- =====================================================================

-- 1. ADICIONAR COLUNAS DE LOCK E RETRY NA TABELA FEEDS
ALTER TABLE public.feeds 
    ADD COLUMN IF NOT EXISTS sync_locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.feeds.sync_locked_until IS 'Timestamp de expiração do lock atômico de sincronização (impede execuções concorrentes)';
COMMENT ON COLUMN public.feeds.retry_count IS 'Contador de tentativas consecutivas com falha';
COMMENT ON COLUMN public.feeds.max_retries IS 'Limite máximo de retentativas automáticas antes de marcar o feed como error';

-- 2. ÍNDICE PARA CONSULTAS DE CRON / AGENDAMENTO
CREATE INDEX IF NOT EXISTS idx_feeds_next_sync_at ON public.feeds(next_sync_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_feeds_sync_locked_until ON public.feeds(sync_locked_until);

-- 3. FUNÇÃO RPC ATÔMICA PARA ADQUIRIR LOCK DE SINCRONIZAÇÃO
CREATE OR REPLACE FUNCTION public.acquire_feed_sync_lock(
    p_feed_id UUID,
    p_lock_duration_seconds INTEGER DEFAULT 900 -- 15 minutos de timeout de segurança
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_locked BOOLEAN := false;
BEGIN
    -- Atualiza de forma atômica se o feed não estiver bloqueado ou se o lock anterior expirou
    UPDATE public.feeds
    SET sync_locked_until = timezone('utc'::text, now()) + (p_lock_duration_seconds || ' seconds')::INTERVAL,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_feed_id
      AND (sync_locked_until IS NULL OR sync_locked_until < timezone('utc'::text, now()))
    RETURNING true INTO v_locked;

    RETURN COALESCE(v_locked, false);
END;
$$;

COMMENT ON FUNCTION public.acquire_feed_sync_lock IS 'Adquire lock exclusivo para sincronização do feed de forma atômica';

-- 4. FUNÇÃO RPC ATÔMICA PARA LIBERAR LOCK DE SINCRONIZAÇÃO
CREATE OR REPLACE FUNCTION public.release_feed_sync_lock(
    p_feed_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.feeds
    SET sync_locked_until = NULL,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_feed_id;
END;
$$;

COMMENT ON FUNCTION public.release_feed_sync_lock IS 'Libera o lock exclusivo de sincronização do feed';

-- 5. PERMISSÕES PARA MEMBROS AUTENTICADOS E SERVICE ROLE
GRANT EXECUTE ON FUNCTION public.acquire_feed_sync_lock(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_feed_sync_lock(UUID) TO authenticated, service_role;
