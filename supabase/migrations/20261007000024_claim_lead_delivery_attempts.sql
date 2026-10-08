-- =====================================================================
-- MIGRATION: 20261007000024_claim_lead_delivery_attempts.sql
-- DESCRIÇÃO: Função RPC para claim concorrente atômico de lead_delivery_attempts
--            com FOR UPDATE SKIP LOCKED para garantia de idempotência.
-- CONFORMIDADE: Regras do projeto e MASTER_PLAN.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_lead_delivery_attempts(p_batch_size INT DEFAULT 20)
RETURNS SETOF public.lead_delivery_attempts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH candidate AS (
        SELECT id
        FROM public.lead_delivery_attempts
        WHERE status = 'failed'
          AND next_retry_at <= timezone('utc'::text, now())
          AND attempt_number < 3
        ORDER BY next_retry_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_batch_size
    )
    UPDATE public.lead_delivery_attempts lda
    SET attempted_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    FROM candidate
    WHERE lda.id = candidate.id
    RETURNING lda.*;
END;
$$;

COMMENT ON FUNCTION public.claim_lead_delivery_attempts IS 'Claim atômico com SKIP LOCKED para processamento de retry de leads sem concorrência duplicada';
