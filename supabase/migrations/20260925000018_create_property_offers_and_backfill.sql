-- =====================================================================
-- MIGRATION: 20260925000018_create_property_offers_and_backfill.sql
-- DESCRIÇÃO: Fase 1 da Arquitetura Property x Offer da UPPA:
--   1. Criação das tabelas paralelas de ofertas:
--      - public.property_offers
--      - public.offer_media
--      - public.offer_price_history
--      - public.offer_status_history
--      - Coluna leads.offer_id
--   2. Índices e RLS (Público, Agências e Super Admin)
--   3. TEMPORARY PROPERTY/OFFER COMPATIBILITY BRIDGE (Gatilhos de sincronização em tempo real)
--   4. Backfill idempotente 1:1 de todos os anúncios, mídias e históricos existentes
-- REGRAS:
--   - Zero DELETE em tabelas existentes
--   - 1 property legado = 1 offer
--   - Preservar identidade UNIQUE (agency_id, source, external_id)
--   - Preservar 100% do funcionamento do portal legado
-- =====================================================================

-- 1. TABELA PRINCIPAL DE OFERTAS: PROPERTY_OFFERS
CREATE TABLE IF NOT EXISTS public.property_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    legacy_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source public.listing_source NOT NULL DEFAULT 'manual',
    external_id TEXT NOT NULL,
    transaction_type public.transaction_type NOT NULL,
    status public.property_status NOT NULL DEFAULT 'draft',
    sale_price NUMERIC(14, 2),
    rent_price NUMERIC(14, 2),
    condominium_fee NUMERIC(12, 2),
    iptu NUMERIC(12, 2),
    financiable BOOLEAN DEFAULT false,
    accepts_exchange BOOLEAN DEFAULT false,
    accepts_vehicle BOOLEAN DEFAULT false,
    furnished BOOLEAN DEFAULT false,
    pet_friendly BOOLEAN DEFAULT false,
    address_visible BOOLEAN DEFAULT false,
    title TEXT NOT NULL,
    description TEXT,
    original_url TEXT,
    published_at TIMESTAMPTZ,
    source_updated_at TIMESTAMPTZ,
    missing_from_feed_at TIMESTAMPTZ,
    content_hash TEXT,
    last_seen_at TIMESTAMPTZ,
    ranking_score NUMERIC(6, 2) DEFAULT 0,
    ranking_breakdown JSONB DEFAULT '{}'::jsonb,
    ranking_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT property_offers_agency_source_external_id_key UNIQUE (agency_id, source, external_id),
    CONSTRAINT property_offers_legacy_property_id_key UNIQUE (legacy_property_id)
);

-- Garante que se a tabela já existir com CASCADE, a constraint seja atualizada para RESTRICT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'property_offers_property_id_fkey'
          AND table_name = 'property_offers'
    ) THEN
        ALTER TABLE public.property_offers
            DROP CONSTRAINT property_offers_property_id_fkey,
            ADD CONSTRAINT property_offers_property_id_fkey
                FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;
    END IF;
END $$;

COMMENT ON TABLE public.property_offers IS 'Ofertas e anúncios comerciais das imobiliárias vinculados a propriedades físicas';
COMMENT ON COLUMN public.property_offers.legacy_property_id IS 'Preserva o vínculo 1:1 de origem com o registro original de properties para migração reversível';

-- 2. TABELA DE MÍDIA DA OFERTA: OFFER_MEDIA
CREATE TABLE IF NOT EXISTS public.offer_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.property_offers(id) ON DELETE CASCADE,
    media_type public.media_type NOT NULL DEFAULT 'image',
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT false,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.offer_media IS 'Fotos e mídias associadas diretamente à oferta comercial da imobiliária';

-- 3. TABELA DE HISTÓRICO DE PREÇO DA OFERTA: OFFER_PRICE_HISTORY
CREATE TABLE IF NOT EXISTS public.offer_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.property_offers(id) ON DELETE CASCADE,
    price NUMERIC(14, 2),
    rent_price NUMERIC(14, 2),
    source TEXT DEFAULT 'manual',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.offer_price_history IS 'Histórico de variações de preço do anúncio comercial da imobiliária';

-- 4. TABELA DE HISTÓRICO DE STATUS DA OFERTA: OFFER_STATUS_HISTORY
CREATE TABLE IF NOT EXISTS public.offer_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.property_offers(id) ON DELETE CASCADE,
    from_status public.property_status,
    to_status public.property_status NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.offer_status_history IS 'Histórico de transições de status comercial do anúncio da imobiliária';

-- 5. RELACIONAMENTO SEGURO EM LEADS (offer_id nullable)
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.property_offers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.offer_id IS 'Referência à oferta específica que originou a oportunidade comercial';

-- 6. ÍNDICES ESSENCIAIS
CREATE INDEX IF NOT EXISTS idx_property_offers_property_id ON public.property_offers(property_id);
CREATE INDEX IF NOT EXISTS idx_property_offers_agency_status ON public.property_offers(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_property_offers_status ON public.property_offers(status);
CREATE INDEX IF NOT EXISTS idx_property_offers_sale_price ON public.property_offers(sale_price);
CREATE INDEX IF NOT EXISTS idx_property_offers_rent_price ON public.property_offers(rent_price);
CREATE INDEX IF NOT EXISTS idx_property_offers_source_updated_at ON public.property_offers(source_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_offers_legacy_prop_id ON public.property_offers(legacy_property_id);

CREATE INDEX IF NOT EXISTS idx_offer_media_offer_position ON public.offer_media(offer_id, position);
CREATE INDEX IF NOT EXISTS idx_offer_price_history_offer_id ON public.offer_price_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_status_history_offer_id ON public.offer_status_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_leads_offer_id ON public.leads(offer_id);

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.property_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_status_history ENABLE ROW LEVEL SECURITY;

-- 7.1 Políticas para public.property_offers
DROP POLICY IF EXISTS property_offers_select_public ON public.property_offers;
CREATE POLICY property_offers_select_public ON public.property_offers
    FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS property_offers_all_agency ON public.property_offers;
CREATE POLICY property_offers_all_agency ON public.property_offers
    FOR ALL USING (public.is_agency_member(agency_id));

DROP POLICY IF EXISTS property_offers_all_super_admin ON public.property_offers;
CREATE POLICY property_offers_all_super_admin ON public.property_offers
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- 7.2 Políticas para public.offer_media
DROP POLICY IF EXISTS offer_media_select_public ON public.offer_media;
CREATE POLICY offer_media_select_public ON public.offer_media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.property_offers o
            WHERE o.id = offer_media.offer_id AND o.status = 'active'
        )
    );

DROP POLICY IF EXISTS offer_media_all_agency ON public.offer_media;
CREATE POLICY offer_media_all_agency ON public.offer_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.property_offers o
            WHERE o.id = offer_media.offer_id AND public.is_agency_member(o.agency_id)
        )
    );

DROP POLICY IF EXISTS offer_media_all_super_admin ON public.offer_media;
CREATE POLICY offer_media_all_super_admin ON public.offer_media
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- 7.3 Políticas para offer_price_history e offer_status_history
DROP POLICY IF EXISTS offer_price_history_select_agency ON public.offer_price_history;
CREATE POLICY offer_price_history_select_agency ON public.offer_price_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.property_offers o
            WHERE o.id = offer_price_history.offer_id AND public.is_agency_member(o.agency_id)
        ) OR public.is_super_admin(auth.uid())
    );

DROP POLICY IF EXISTS offer_status_history_select_agency ON public.offer_status_history;
CREATE POLICY offer_status_history_select_agency ON public.offer_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.property_offers o
            WHERE o.id = offer_status_history.offer_id AND public.is_agency_member(o.agency_id)
        ) OR public.is_super_admin(auth.uid())
    );

-- =====================================================================
-- 8. TEMPORARY PROPERTY/OFFER COMPATIBILITY BRIDGE
-- Mantém properties legado ↔ property_offers sincronizados automaticamente
-- durante a fase transitória enquanto feeds e crawler ainda gravam em properties
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_bridge_property_to_offer()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.property_offers (
        property_id,
        legacy_property_id,
        agency_id,
        broker_id,
        source,
        external_id,
        transaction_type,
        status,
        sale_price,
        rent_price,
        condominium_fee,
        iptu,
        financiable,
        accepts_exchange,
        accepts_vehicle,
        furnished,
        pet_friendly,
        address_visible,
        title,
        description,
        original_url,
        published_at,
        source_updated_at,
        missing_from_feed_at,
        content_hash,
        last_seen_at,
        ranking_score,
        ranking_breakdown,
        ranking_updated_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.id,
        NEW.agency_id,
        NEW.broker_id,
        NEW.source,
        NEW.external_id,
        NEW.transaction_type,
        NEW.status,
        NEW.price,
        NEW.rent_price,
        NEW.condominium_fee,
        NEW.iptu,
        COALESCE(NEW.financiable, false),
        COALESCE(NEW.accepts_exchange, false),
        COALESCE(NEW.accepts_vehicle, false),
        COALESCE(NEW.furnished, false),
        COALESCE(NEW.pet_friendly, false),
        COALESCE(NEW.address_visible, false),
        NEW.title,
        NEW.description,
        NEW.source_url,
        NEW.published_at,
        NEW.source_updated_at,
        NEW.missing_from_feed_at,
        NEW.content_hash,
        NEW.last_seen_at,
        COALESCE(NEW.ranking_score, 0),
        COALESCE(NEW.ranking_breakdown, '{}'::jsonb),
        NEW.ranking_updated_at,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (legacy_property_id) DO UPDATE SET
        agency_id = EXCLUDED.agency_id,
        broker_id = EXCLUDED.broker_id,
        source = EXCLUDED.source,
        external_id = EXCLUDED.external_id,
        transaction_type = EXCLUDED.transaction_type,
        status = EXCLUDED.status,
        sale_price = EXCLUDED.sale_price,
        rent_price = EXCLUDED.rent_price,
        condominium_fee = EXCLUDED.condominium_fee,
        iptu = EXCLUDED.iptu,
        financiable = EXCLUDED.financiable,
        accepts_exchange = EXCLUDED.accepts_exchange,
        accepts_vehicle = EXCLUDED.accepts_vehicle,
        furnished = EXCLUDED.furnished,
        pet_friendly = EXCLUDED.pet_friendly,
        address_visible = EXCLUDED.address_visible,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        original_url = EXCLUDED.original_url,
        published_at = EXCLUDED.published_at,
        source_updated_at = EXCLUDED.source_updated_at,
        missing_from_feed_at = EXCLUDED.missing_from_feed_at,
        content_hash = EXCLUDED.content_hash,
        last_seen_at = EXCLUDED.last_seen_at,
        ranking_score = EXCLUDED.ranking_score,
        ranking_breakdown = EXCLUDED.ranking_breakdown,
        ranking_updated_at = EXCLUDED.ranking_updated_at,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bridge_property_to_offer ON public.properties;
CREATE TRIGGER trg_bridge_property_to_offer
AFTER INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.sync_bridge_property_to_offer();

-- Sincronização automática de mídia inserida via modelo legado
CREATE OR REPLACE FUNCTION public.sync_bridge_property_media_to_offer_media()
RETURNS TRIGGER AS $$
DECLARE
    v_offer_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.offer_media WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    -- Localiza a offer pelo legacy_property_id
    SELECT id INTO v_offer_id
    FROM public.property_offers
    WHERE legacy_property_id = NEW.property_id;

    IF v_offer_id IS NOT NULL THEN
        INSERT INTO public.offer_media (
            id,
            offer_id,
            media_type,
            url,
            thumbnail_url,
            width,
            height,
            position,
            is_cover,
            source_url,
            created_at
        ) VALUES (
            NEW.id,
            v_offer_id,
            NEW.type,
            NEW.url,
            NEW.thumbnail_url,
            NEW.width,
            NEW.height,
            NEW.position,
            NEW.is_cover,
            NEW.source_url,
            NEW.created_at
        )
        ON CONFLICT (id) DO UPDATE SET
            media_type = EXCLUDED.media_type,
            url = EXCLUDED.url,
            thumbnail_url = EXCLUDED.thumbnail_url,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            position = EXCLUDED.position,
            is_cover = EXCLUDED.is_cover,
            source_url = EXCLUDED.source_url;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bridge_property_media_to_offer_media ON public.property_media;
CREATE TRIGGER trg_bridge_property_media_to_offer_media
AFTER INSERT OR UPDATE OR DELETE ON public.property_media
FOR EACH ROW EXECUTE FUNCTION public.sync_bridge_property_media_to_offer_media();

-- Sincronização automática de histórico de preço inserido via modelo legado
CREATE OR REPLACE FUNCTION public.sync_bridge_price_history_to_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_offer_id UUID;
BEGIN
    SELECT id INTO v_offer_id
    FROM public.property_offers
    WHERE legacy_property_id = NEW.property_id;

    IF v_offer_id IS NOT NULL THEN
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bridge_price_history_to_offer ON public.property_price_history;
CREATE TRIGGER trg_bridge_price_history_to_offer
AFTER INSERT ON public.property_price_history
FOR EACH ROW EXECUTE FUNCTION public.sync_bridge_price_history_to_offer();

-- Sincronização automática de histórico de status inserido via modelo legado
CREATE OR REPLACE FUNCTION public.sync_bridge_status_history_to_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_offer_id UUID;
BEGIN
    SELECT id INTO v_offer_id
    FROM public.property_offers
    WHERE legacy_property_id = NEW.property_id;

    IF v_offer_id IS NOT NULL THEN
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bridge_status_history_to_offer ON public.property_status_history;
CREATE TRIGGER trg_bridge_status_history_to_offer
AFTER INSERT ON public.property_status_history
FOR EACH ROW EXECUTE FUNCTION public.sync_bridge_status_history_to_offer();

-- =====================================================================
-- 9. BACKFILL 1:1 IDEMPOTENTE DOS DADOS EXISTENTES
-- =====================================================================

-- 9.1 Backfill de properties -> property_offers
INSERT INTO public.property_offers (
    property_id,
    legacy_property_id,
    agency_id,
    broker_id,
    source,
    external_id,
    transaction_type,
    status,
    sale_price,
    rent_price,
    condominium_fee,
    iptu,
    financiable,
    accepts_exchange,
    accepts_vehicle,
    furnished,
    pet_friendly,
    address_visible,
    title,
    description,
    original_url,
    published_at,
    source_updated_at,
    missing_from_feed_at,
    content_hash,
    last_seen_at,
    ranking_score,
    ranking_breakdown,
    ranking_updated_at,
    created_at,
    updated_at
)
SELECT
    p.id,
    p.id,
    p.agency_id,
    p.broker_id,
    p.source,
    p.external_id,
    p.transaction_type,
    p.status,
    p.price,
    p.rent_price,
    p.condominium_fee,
    p.iptu,
    COALESCE(p.financiable, false),
    COALESCE(p.accepts_exchange, false),
    COALESCE(p.accepts_vehicle, false),
    COALESCE(p.furnished, false),
    COALESCE(p.pet_friendly, false),
    COALESCE(p.address_visible, false),
    p.title,
    p.description,
    p.source_url,
    p.published_at,
    p.source_updated_at,
    p.missing_from_feed_at,
    p.content_hash,
    p.last_seen_at,
    COALESCE(p.ranking_score, 0),
    COALESCE(p.ranking_breakdown, '{}'::jsonb),
    p.ranking_updated_at,
    p.created_at,
    p.updated_at
FROM public.properties p
ON CONFLICT (legacy_property_id) DO UPDATE SET
    agency_id = EXCLUDED.agency_id,
    broker_id = EXCLUDED.broker_id,
    source = EXCLUDED.source,
    external_id = EXCLUDED.external_id,
    transaction_type = EXCLUDED.transaction_type,
    status = EXCLUDED.status,
    sale_price = EXCLUDED.sale_price,
    rent_price = EXCLUDED.rent_price,
    condominium_fee = EXCLUDED.condominium_fee,
    iptu = EXCLUDED.iptu,
    financiable = EXCLUDED.financiable,
    accepts_exchange = EXCLUDED.accepts_exchange,
    accepts_vehicle = EXCLUDED.accepts_vehicle,
    furnished = EXCLUDED.furnished,
    pet_friendly = EXCLUDED.pet_friendly,
    address_visible = EXCLUDED.address_visible,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    original_url = EXCLUDED.original_url,
    published_at = EXCLUDED.published_at,
    source_updated_at = EXCLUDED.source_updated_at,
    missing_from_feed_at = EXCLUDED.missing_from_feed_at,
    content_hash = EXCLUDED.content_hash,
    last_seen_at = EXCLUDED.last_seen_at,
    ranking_score = EXCLUDED.ranking_score,
    ranking_breakdown = EXCLUDED.ranking_breakdown,
    ranking_updated_at = EXCLUDED.ranking_updated_at,
    updated_at = timezone('utc'::text, now());

-- 9.2 Backfill de property_media -> offer_media
INSERT INTO public.offer_media (
    id,
    offer_id,
    media_type,
    url,
    thumbnail_url,
    width,
    height,
    position,
    is_cover,
    source_url,
    created_at
)
SELECT
    pm.id,
    po.id,
    pm.type,
    pm.url,
    pm.thumbnail_url,
    pm.width,
    pm.height,
    pm.position,
    pm.is_cover,
    pm.source_url,
    pm.created_at
FROM public.property_media pm
JOIN public.property_offers po ON po.legacy_property_id = pm.property_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.offer_media om WHERE om.id = pm.id
)
ON CONFLICT (id) DO NOTHING;

-- 9.3 Backfill de property_price_history -> offer_price_history
INSERT INTO public.offer_price_history (
    id,
    offer_id,
    price,
    rent_price,
    source,
    recorded_at
)
SELECT
    pph.id,
    po.id,
    pph.price,
    pph.rent_price,
    pph.source,
    pph.recorded_at
FROM public.property_price_history pph
JOIN public.property_offers po ON po.legacy_property_id = pph.property_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.offer_price_history oph WHERE oph.id = pph.id
)
ON CONFLICT (id) DO NOTHING;

-- 9.4 Backfill de property_status_history -> offer_status_history
INSERT INTO public.offer_status_history (
    id,
    offer_id,
    from_status,
    to_status,
    changed_by,
    reason,
    recorded_at
)
SELECT
    psh.id,
    po.id,
    psh.from_status,
    psh.to_status,
    psh.changed_by,
    psh.reason,
    psh.recorded_at
FROM public.property_status_history psh
JOIN public.property_offers po ON po.legacy_property_id = psh.property_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.offer_status_history osh WHERE osh.id = psh.id
)
ON CONFLICT (id) DO NOTHING;

-- 9.5 Backfill de leads.offer_id
UPDATE public.leads l
SET offer_id = po.id
FROM public.property_offers po
WHERE l.property_id = po.legacy_property_id
  AND l.offer_id IS NULL;
