-- =====================================================================
-- MIGRATION: 20260918000005_create_leads_and_events.sql
-- DESCRIÇÃO: Criação do sistema de leads, lead_events e rastreamento de WhatsApp
-- CONFORMIDADE: MASTER_PLAN.md (Seções 9, 19, 20, 31, 32 e 87)
-- =====================================================================

-- 1. TIPO ENUMERADO: lead_source (Seção 9 do MASTER_PLAN)
DO $$ BEGIN
    CREATE TYPE public.lead_source AS ENUM ('whatsapp', 'form', 'phone', 'email', 'financing');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELA PRINCIPAL: LEADS (Seção 19 do MASTER_PLAN)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    consumer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    source public.lead_source NOT NULL DEFAULT 'whatsapp',
    message TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.leads IS 'Registro de oportunidades de contato e leads gerados para as imobiliárias';

-- 3. TABELA DE EVENTOS DO LEAD: LEAD_EVENTS (Seção 20 do MASTER_PLAN)
CREATE TABLE IF NOT EXISTS public.lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    event TEXT NOT NULL DEFAULT 'created',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.lead_events IS 'Histórico auditável e linha do tempo de eventos e interações do lead';

-- 4. ÍNDICES DE ALTA PERFORMANCE (Seções 19 e 20)
CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON public.leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON public.lead_events(created_at DESC);

-- 5. ROW LEVEL SECURITY (RLS) - Seções 31, 32 e 87
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- LEADS: Inserção permitida para qualquer usuário (anônimo ou autenticado) ao clicar em WhatsApp ou enviar formulário
DROP POLICY IF EXISTS "Leads insert access" ON public.leads;
CREATE POLICY "Leads insert access"
ON public.leads FOR INSERT
TO public
WITH CHECK (true);

-- LEADS: Leitura permitida estritamente para membros da imobiliária detentora do lead
DROP POLICY IF EXISTS "Leads select access" ON public.leads;
CREATE POLICY "Leads select access"
ON public.leads FOR SELECT
TO authenticated
USING (
    public.is_agency_member(agency_id)
);

-- LEADS: Atualização restrita a administradores ou owners da imobiliária
DROP POLICY IF EXISTS "Leads update access" ON public.leads;
CREATE POLICY "Leads update access"
ON public.leads FOR UPDATE
TO authenticated
USING (
    public.is_agency_admin_or_owner(agency_id)
)
WITH CHECK (
    public.is_agency_admin_or_owner(agency_id)
);

-- LEADS: Deleção restrita a administradores ou owners da imobiliária
DROP POLICY IF EXISTS "Leads delete access" ON public.leads;
CREATE POLICY "Leads delete access"
ON public.leads FOR DELETE
TO authenticated
USING (
    public.is_agency_admin_or_owner(agency_id)
);

-- LEAD_EVENTS: Inserção pública permitida (para eventos de clique inicial)
DROP POLICY IF EXISTS "Lead events insert access" ON public.lead_events;
CREATE POLICY "Lead events insert access"
ON public.lead_events FOR INSERT
TO public
WITH CHECK (true);

-- LEAD_EVENTS: Leitura restrita a membros da imobiliária dona do lead
DROP POLICY IF EXISTS "Lead events select access" ON public.lead_events;
CREATE POLICY "Lead events select access"
ON public.lead_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_events.lead_id
          AND public.is_agency_member(l.agency_id)
    )
);
