-- =====================================================================
-- MIGRATION: 20260918000004_create_properties_model.sql
-- DESCRIÇÃO: Criação do modelo de properties, features, media e históricos
-- CONFORMIDADE: MASTER_PLAN.md (Seções 4, 9, 10, 11, 12, 13, 14, 15, 16, 31, 32 e 83)
-- =====================================================================

-- 1. TIPOS ENUMERADOS (Seção 9 do MASTER_PLAN)
DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('sale', 'rent', 'sale_or_rent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.property_status AS ENUM (
        'draft', 'pending', 'active', 'inactive', 'sold', 'rented', 'blocked', 'archived'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.property_type AS ENUM (
        'apartment', 'house', 'townhouse', 'land', 'farm', 'commercial',
        'office', 'warehouse', 'studio', 'loft', 'kitnet', 'penthouse',
        'condo_house', 'rural', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.listing_source AS ENUM ('manual', 'vrsync', 'api', 'csv', 'partner');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.media_type AS ENUM ('image', 'video', 'virtual_tour', 'floor_plan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELA PRINCIPAL: PROPERTIES (Seção 10 e 11)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    external_id TEXT NOT NULL,
    source public.listing_source NOT NULL DEFAULT 'manual',
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    transaction_type public.transaction_type NOT NULL,
    property_type public.property_type NOT NULL,
    status public.property_status NOT NULL DEFAULT 'draft',
    price NUMERIC(14, 2),
    rent_price NUMERIC(14, 2),
    condominium_fee NUMERIC(12, 2),
    iptu NUMERIC(12, 2),
    bedrooms INTEGER DEFAULT 0,
    suites INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    parking_spaces INTEGER DEFAULT 0,
    usable_area NUMERIC(10, 2),
    total_area NUMERIC(10, 2),
    lot_area NUMERIC(10, 2),
    year_built INTEGER,
    financiable BOOLEAN DEFAULT false,
    accepts_exchange BOOLEAN DEFAULT false,
    accepts_vehicle BOOLEAN DEFAULT false,
    furnished BOOLEAN DEFAULT false,
    pet_friendly BOOLEAN DEFAULT false,
    address_visible BOOLEAN DEFAULT false,
    street TEXT,
    number TEXT,
    complement TEXT,
    zipcode TEXT,
    state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    neighborhood_id UUID REFERENCES public.neighborhoods(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location geography(Point, 4326),
    published_at TIMESTAMPTZ,
    source_updated_at TIMESTAMPTZ,
    missing_from_feed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT properties_agency_source_external_id_key UNIQUE (agency_id, source, external_id)
);

COMMENT ON TABLE public.properties IS 'Catálogo central de imóveis anunciados no portal';
COMMENT ON COLUMN public.properties.location IS 'Ponto geográfico WGS84 para buscas espaciais, raio e mapa viewport';

-- 3. TABELA: FEATURES (Catálogo de Características - Seção 15)
CREATE TABLE IF NOT EXISTS public.features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed inicial de características conforme Seção 15 do MASTER_PLAN
INSERT INTO public.features (name, slug, category)
VALUES
    ('Piscina', 'pool', 'leisure'),
    ('Churrasqueira', 'barbecue', 'leisure'),
    ('Lareira', 'fireplace', 'comfort'),
    ('Energia Solar', 'solar_energy', 'sustainability'),
    ('Elevador', 'elevator', 'infrastructure'),
    ('Sacada / Varanda', 'balcony', 'comfort'),
    ('Jardim / Quintal', 'garden', 'comfort'),
    ('Condomínio Fechado', 'gated_community', 'security'),
    ('Academia / Fitness', 'gym', 'leisure'),
    ('Salão de Festas', 'party_room', 'leisure'),
    ('Ar Condicionado', 'air_conditioning', 'comfort')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, category = EXCLUDED.category;

-- 4. TABELA DE LIGAÇÃO: PROPERTY_FEATURES (Seção 15)
CREATE TABLE IF NOT EXISTS public.property_features (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (property_id, feature_id)
);

-- 5. TABELA: PROPERTY_MEDIA (Fotos, Vídeos, Tours e Plantas - Seção 14)
CREATE TABLE IF NOT EXISTS public.property_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    type public.media_type NOT NULL DEFAULT 'image',
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT false,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA: PROPERTY_PRICE_HISTORY (Seção 16)
CREATE TABLE IF NOT EXISTS public.property_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    price NUMERIC(14, 2),
    rent_price NUMERIC(14, 2),
    source TEXT DEFAULT 'manual',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA: PROPERTY_STATUS_HISTORY (Seção 83)
CREATE TABLE IF NOT EXISTS public.property_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    from_status public.property_status,
    to_status public.property_status NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. GATILHOS (TRIGGERS) DE INTEGRIDADE E AUDITORIA AUTOMÁTICA
-- Sincronização automática do ponto geográfico (Point 4326)
CREATE OR REPLACE FUNCTION public.sync_property_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography;
    ELSE
        NEW.location := NULL;
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_sync_location ON public.properties;
CREATE TRIGGER trg_properties_sync_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.sync_property_location();

-- Auditoria automática de histórico de preço quando houver alteração
CREATE OR REPLACE FUNCTION public.handle_property_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR 
       (OLD.price IS DISTINCT FROM NEW.price) OR 
       (OLD.rent_price IS DISTINCT FROM NEW.rent_price) THEN
        IF NEW.price IS NOT NULL OR NEW.rent_price IS NOT NULL THEN
            INSERT INTO public.property_price_history (property_id, price, rent_price, source, recorded_at)
            VALUES (NEW.id, NEW.price, NEW.rent_price, NEW.source::text, timezone('utc'::text, now()));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_price_history ON public.properties;
CREATE TRIGGER trg_property_price_history
AFTER INSERT OR UPDATE OF price, rent_price ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.handle_property_price_history();

-- Auditoria automática de histórico de status
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_status_history ON public.properties;
CREATE TRIGGER trg_property_status_history
AFTER INSERT OR UPDATE OF status ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.handle_property_status_history();

-- 9. ÍNDICES ESPACIAIS E RELACIONAIS (Seções 12 e 13)
-- Índice espacial PostGIS
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties USING GIST(location);

-- Índices simples
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_id ON public.properties(city_id);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood_id ON public.properties(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_transaction_type ON public.properties(transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_published_at ON public.properties(published_at);

-- Índices compostos de alta performance recomendados pelo MASTER_PLAN
CREATE INDEX IF NOT EXISTS idx_properties_status_city ON public.properties(status, city_id);
CREATE INDEX IF NOT EXISTS idx_properties_status_city_trans ON public.properties(status, city_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_status_city_type ON public.properties(status, city_id, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status_city_price ON public.properties(status, city_id, price);

-- Índices de mídias e relacionamentos
CREATE INDEX IF NOT EXISTS idx_property_media_property_pos ON public.property_media(property_id, position);
CREATE INDEX IF NOT EXISTS idx_property_price_history_property ON public.property_price_history(property_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_status_history_property ON public.property_status_history(property_id, recorded_at DESC);

-- 10. ROW LEVEL SECURITY (RLS) - Seções 31 e 32
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_status_history ENABLE ROW LEVEL SECURITY;

-- FEATURES: Catálogo público
DROP POLICY IF EXISTS "Features public read" ON public.features;
CREATE POLICY "Features public read"
ON public.features FOR SELECT
TO public
USING (true);

-- PROPERTIES: Leitura
-- Público vê anúncios ativos; Membros da imobiliária veem todo o estoque da sua empresa
DROP POLICY IF EXISTS "Properties select access" ON public.properties;
CREATE POLICY "Properties select access"
ON public.properties FOR SELECT
TO public
USING (
    status = 'active' OR public.is_agency_member(agency_id)
);

-- PROPERTIES: Inserção
-- Apenas membros ativos da imobiliária
DROP POLICY IF EXISTS "Properties insert access" ON public.properties;
CREATE POLICY "Properties insert access"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (
    public.is_agency_member(agency_id)
);

-- PROPERTIES: Atualização
-- Apenas membros ativos da imobiliária dona do imóvel
DROP POLICY IF EXISTS "Properties update access" ON public.properties;
CREATE POLICY "Properties update access"
ON public.properties FOR UPDATE
TO authenticated
USING (
    public.is_agency_member(agency_id)
)
WITH CHECK (
    public.is_agency_member(agency_id)
);

-- PROPERTIES: Deleção
-- Apenas owner ou admin da imobiliária dona do imóvel
DROP POLICY IF EXISTS "Properties delete access" ON public.properties;
CREATE POLICY "Properties delete access"
ON public.properties FOR DELETE
TO authenticated
USING (
    public.is_agency_admin_or_owner(agency_id)
);

-- PROPERTY_MEDIA: Políticas RLS
DROP POLICY IF EXISTS "Property media select access" ON public.property_media;
CREATE POLICY "Property media select access"
ON public.property_media FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_media.property_id
          AND (p.status = 'active' OR public.is_agency_member(p.agency_id))
    )
);

DROP POLICY IF EXISTS "Property media write access" ON public.property_media;
CREATE POLICY "Property media write access"
ON public.property_media FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_media.property_id
          AND public.is_agency_member(p.agency_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_media.property_id
          AND public.is_agency_member(p.agency_id)
    )
);

-- PROPERTY_FEATURES: Políticas RLS
DROP POLICY IF EXISTS "Property features select access" ON public.property_features;
CREATE POLICY "Property features select access"
ON public.property_features FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_features.property_id
          AND (p.status = 'active' OR public.is_agency_member(p.agency_id))
    )
);

DROP POLICY IF EXISTS "Property features write access" ON public.property_features;
CREATE POLICY "Property features write access"
ON public.property_features FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_features.property_id
          AND public.is_agency_member(p.agency_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_features.property_id
          AND public.is_agency_member(p.agency_id)
    )
);

-- HISTÓRICOS: Leitura para membros da imobiliária
DROP POLICY IF EXISTS "Price history select access" ON public.property_price_history;
CREATE POLICY "Price history select access"
ON public.property_price_history FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_price_history.property_id
          AND public.is_agency_member(p.agency_id)
    )
);

DROP POLICY IF EXISTS "Status history select access" ON public.property_status_history;
CREATE POLICY "Status history select access"
ON public.property_status_history FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_status_history.property_id
          AND public.is_agency_member(p.agency_id)
    )
);
