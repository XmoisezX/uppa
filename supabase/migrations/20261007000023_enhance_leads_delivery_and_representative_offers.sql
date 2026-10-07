-- =====================================================================
-- MIGRATION: 20261007000023_enhance_leads_delivery_and_representative_offers.sql
-- DESCRIÇÃO: Expansão do sistema de Leads (status comercial, snapshot da offer,
--            tentativas de entrega, notas internas e RLS administrativo) e
--            métrica de exposição da Representative Offer (offer_impressions).
-- CONFORMIDADE: Regras do projeto e MASTER_PLAN.
-- =====================================================================

-- 1. EXPANSÃO DA TABELA LEADS: STATUS COMERCIAL E SNAPSHOT DA OFERTA
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'visit_scheduled', 'proposal', 'won', 'lost', 'spam')),
ADD COLUMN IF NOT EXISTS snapshot_price NUMERIC(14, 2),
ADD COLUMN IF NOT EXISTS snapshot_title TEXT,
ADD COLUMN IF NOT EXISTS snapshot_source TEXT,
ADD COLUMN IF NOT EXISTS snapshot_agency_name TEXT,
ADD COLUMN IF NOT EXISTS snapshot_broker_name TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.leads.status IS 'Status comercial do lead no pipeline: new, contacted, qualified, visit_scheduled, proposal, won, lost, spam';
COMMENT ON COLUMN public.leads.snapshot_price IS 'Preço comercial da representative offer congelado no momento do contato';
COMMENT ON COLUMN public.leads.snapshot_title IS 'Título comercial do anúncio no momento do contato';
COMMENT ON COLUMN public.leads.snapshot_source IS 'Origem/fonte da offer no momento do contato';

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_agency_status ON public.leads(agency_id, status);

-- 2. TABELA DE TENTATIVAS DE ENTREGA DE LEADS: LEAD_DELIVERY_ATTEMPTS (Seção 28)
CREATE TABLE IF NOT EXISTS public.lead_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'webhook', 'crm', 'portal_form')),
    destination TEXT NOT NULL,
    provider TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'missing_destination', 'provider_not_configured')),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    delivered_at TIMESTAMPTZ,
    provider_message_id TEXT,
    status_code INTEGER,
    error_code TEXT,
    error_message TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.lead_delivery_attempts IS 'Registro auditável de tentativas de entrega e despacho de leads para imobiliárias/corretores';

CREATE INDEX IF NOT EXISTS idx_lead_delivery_attempts_lead_id ON public.lead_delivery_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_delivery_attempts_status ON public.lead_delivery_attempts(status);
CREATE INDEX IF NOT EXISTS idx_lead_delivery_attempts_next_retry ON public.lead_delivery_attempts(next_retry_at) WHERE status = 'failed';

-- 3. TABELA DE NOTAS INTERNAS DO LEAD: LEAD_NOTES (Seção 36)
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.lead_notes IS 'Notas e anotações internas da equipe da imobiliária sobre o lead';

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);

-- 4. MÉTRICA DE EXPOSIÇÃO LEVE: OFFER_IMPRESSIONS (Seção 21)
CREATE TABLE IF NOT EXISTS public.offer_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES public.property_offers(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    context TEXT NOT NULL DEFAULT 'search',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.offer_impressions IS 'Registro de impressões e exposições públicas de representative offers';

CREATE INDEX IF NOT EXISTS idx_offer_impressions_offer_id ON public.offer_impressions(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_impressions_property_id ON public.offer_impressions(property_id);
CREATE INDEX IF NOT EXISTS idx_offer_impressions_created_at ON public.offer_impressions(created_at DESC);

-- 5. ROW LEVEL SECURITY (RLS) ATUALIZADO (Seções 39 e 44)
ALTER TABLE public.lead_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_impressions ENABLE ROW LEVEL SECURITY;

-- LEADS: Leitura por membros da imobiliária OU administradores com permissão
DROP POLICY IF EXISTS "Leads select access" ON public.leads;
CREATE POLICY "Leads select access"
ON public.leads FOR SELECT
TO authenticated
USING (
    public.is_agency_member(agency_id)
    OR public.has_admin_permission(auth.uid(), 'leads.manage')
    OR public.is_super_admin(auth.uid())
);

-- LEAD_DELIVERY_ATTEMPTS: Leitura por membros da imobiliária ou admin
DROP POLICY IF EXISTS "Lead delivery attempts select access" ON public.lead_delivery_attempts;
CREATE POLICY "Lead delivery attempts select access"
ON public.lead_delivery_attempts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_delivery_attempts.lead_id
          AND (
            public.is_agency_member(l.agency_id)
            OR public.has_admin_permission(auth.uid(), 'leads.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);

-- LEAD_DELIVERY_ATTEMPTS: Inserção por autenticado/público (gerada na criação do lead)
DROP POLICY IF EXISTS "Lead delivery attempts insert access" ON public.lead_delivery_attempts;
CREATE POLICY "Lead delivery attempts insert access"
ON public.lead_delivery_attempts FOR INSERT
TO public
WITH CHECK (true);

-- LEAD_NOTES: Leitura
DROP POLICY IF EXISTS "Lead notes select access" ON public.lead_notes;
CREATE POLICY "Lead notes select access"
ON public.lead_notes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_notes.lead_id
          AND (
            public.is_agency_member(l.agency_id)
            OR public.has_admin_permission(auth.uid(), 'leads.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);

-- LEAD_NOTES: Inserção por membros da imobiliária ou admin
DROP POLICY IF EXISTS "Lead notes insert access" ON public.lead_notes;
CREATE POLICY "Lead notes insert access"
ON public.lead_notes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_notes.lead_id
          AND (
            public.is_agency_member(l.agency_id)
            OR public.has_admin_permission(auth.uid(), 'leads.manage')
            OR public.is_super_admin(auth.uid())
          )
    )
);

-- OFFER_IMPRESSIONS: Inserção pública permitida
DROP POLICY IF EXISTS "Offer impressions insert access" ON public.offer_impressions;
CREATE POLICY "Offer impressions insert access"
ON public.offer_impressions FOR INSERT
TO public
WITH CHECK (true);

-- OFFER_IMPRESSIONS: Leitura por admin ou membros da agency
DROP POLICY IF EXISTS "Offer impressions select access" ON public.offer_impressions;
CREATE POLICY "Offer impressions select access"
ON public.offer_impressions FOR SELECT
TO authenticated
USING (
    public.is_agency_member(agency_id)
    OR public.has_admin_permission(auth.uid(), 'agencies.manage')
    OR public.is_super_admin(auth.uid())
);
