-- =====================================================================
-- MIGRATION: 20260918000001_create_geographic_base.sql
-- DESCRIÇÃO: Ativação do PostGIS e criação da base geográfica (states, cities, neighborhoods)
-- CONFORMIDADE: MASTER_PLAN.md (Seção 4, 7, 12, 13, 31, 74, 75 e 81)
-- =====================================================================

-- 1. ATIVAR EXTENSÃO POSTGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. TABELA: STATES (Estados Brasileiros)
CREATE TABLE IF NOT EXISTS public.states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(2) NOT NULL UNIQUE,
    ibge_code INTEGER NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comentários documentais
COMMENT ON TABLE public.states IS 'Estados da federação brasileira';
COMMENT ON COLUMN public.states.code IS 'Sigla da UF em maiúsculo (ex: RS, SP)';
COMMENT ON COLUMN public.states.ibge_code IS 'Código oficial IBGE do estado (ex: 43 para RS)';

-- 3. TABELA: CITIES (Municípios)
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ibge_code INTEGER UNIQUE,
    slug TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location geography(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT cities_state_slug_key UNIQUE (state_id, slug)
);

COMMENT ON TABLE public.cities IS 'Municípios brasileiros vinculados aos estados';
COMMENT ON COLUMN public.cities.ibge_code IS 'Código oficial IBGE de 7 dígitos do município (ex: 4314407)';
COMMENT ON COLUMN public.cities.location IS 'Ponto geográfico WGS84 (SRID 4326) para indexação espacial e consultas de raio';

-- 4. TABELA: NEIGHBORHOODS (Bairros)
CREATE TABLE IF NOT EXISTS public.neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location geography(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT neighborhoods_city_slug_key UNIQUE (city_id, slug)
);

COMMENT ON TABLE public.neighborhoods IS 'Bairros e regiões vinculados às cidades';

-- 5. GATILHOS PARA SINCRONIZAÇÃO AUTOMÁTICA DE LOCATION (Point, 4326)
CREATE OR REPLACE FUNCTION public.sync_geographic_location()
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

DROP TRIGGER IF EXISTS trg_cities_sync_location ON public.cities;
CREATE TRIGGER trg_cities_sync_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.cities
FOR EACH ROW
EXECUTE FUNCTION public.sync_geographic_location();

DROP TRIGGER IF EXISTS trg_neighborhoods_sync_location ON public.neighborhoods;
CREATE TRIGGER trg_neighborhoods_sync_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.neighborhoods
FOR EACH ROW
EXECUTE FUNCTION public.sync_geographic_location();

-- 6. ÍNDICES ESPACIAIS (GIST) E RELACIONAIS (B-TREE)
-- Índices espaciais PostGIS
CREATE INDEX IF NOT EXISTS idx_cities_location ON public.cities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_location ON public.neighborhoods USING GIST(location);

-- Índices relacionais e buscas frequentes
CREATE INDEX IF NOT EXISTS idx_states_slug ON public.states(slug);
CREATE INDEX IF NOT EXISTS idx_states_code ON public.states(code);
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON public.cities(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON public.cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_ibge_code ON public.cities(ibge_code);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_city_id ON public.neighborhoods(city_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_slug ON public.neighborhoods(slug);

-- 7. ROW LEVEL SECURITY (RLS) - Regra 2 e Seção 31 do MASTER_PLAN
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- Leitura Pública irrestrita (Visitantes e Autenticados podem consultar localizações)
DROP POLICY IF EXISTS "Permitir leitura publica em states" ON public.states;
CREATE POLICY "Permitir leitura publica em states"
ON public.states FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Permitir leitura publica em cities" ON public.cities;
CREATE POLICY "Permitir leitura publica em cities"
ON public.cities FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Permitir leitura publica em neighborhoods" ON public.neighborhoods;
CREATE POLICY "Permitir leitura publica em neighborhoods"
ON public.neighborhoods FOR SELECT
TO public
USING (true);

-- Escrita, alteração e deleção permitidas exclusivamente via service_role ou platform_admin
-- Sem policies para anon/authenticated realizarem INSERT/UPDATE/DELETE, garantindo integridade territorial
