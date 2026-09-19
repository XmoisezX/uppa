-- =====================================================================
-- MIGRATION: 20260918000011_add_spatial_bbox_search.sql
-- DESCRIÇÃO: RPC de busca espacial por Viewport (BBox) com PostGIS GiST
-- CONFORMIDADE: MASTER_PLAN.md (Seções 4, 12, 39, 44 e 86)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.search_properties_bbox(
    p_min_lat DOUBLE PRECISION,
    p_max_lat DOUBLE PRECISION,
    p_min_lng DOUBLE PRECISION,
    p_max_lng DOUBLE PRECISION,
    p_transaction_type TEXT DEFAULT NULL,
    p_property_types TEXT[] DEFAULT NULL,
    p_price_min NUMERIC DEFAULT NULL,
    p_price_max NUMERIC DEFAULT NULL,
    p_bedrooms INTEGER DEFAULT NULL,
    p_bathrooms INTEGER DEFAULT NULL,
    p_parking_spaces INTEGER DEFAULT NULL,
    p_area_min NUMERIC DEFAULT NULL,
    p_area_max NUMERIC DEFAULT NULL,
    p_financiable BOOLEAN DEFAULT NULL,
    p_furnished BOOLEAN DEFAULT NULL,
    p_accepts_exchange BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    slug TEXT,
    title TEXT,
    price NUMERIC,
    rent_price NUMERIC,
    transaction_type public.transaction_type,
    property_type public.property_type,
    bedrooms INTEGER,
    usable_area NUMERIC,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address_visible BOOLEAN,
    street TEXT,
    neighborhood_name TEXT,
    city_name TEXT,
    city_slug TEXT,
    state_code TEXT,
    agency_name TEXT,
    agency_logo_url TEXT,
    cover_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
STABLE
AS $$
DECLARE
    v_limit INTEGER;
    v_envelope geography;
BEGIN
    -- 1. VALIDAÇÃO DE SEGURANÇA DAS COORDENADAS (Seção 17 do MASTER_PLAN)
    IF p_min_lat < -90.0 OR p_max_lat > 90.0 OR p_min_lat > p_max_lat THEN
        RAISE EXCEPTION 'Latitude fora dos limites válidos (-90 a 90) ou min > max';
    END IF;

    IF p_min_lng < -180.0 OR p_max_lng > 180.0 OR p_min_lng > p_max_lng THEN
        RAISE EXCEPTION 'Longitude fora dos limites válidos (-180 a 180) ou min > max';
    END IF;

    -- Limite seguro de resultados para o mapa (máximo 150)
    v_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 150);

    -- 2. CRIAÇÃO DO ENVELOPE POSTGIS (xmin, ymin, xmax, ymax)
    v_envelope := ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography;

    -- 3. CONSULTA ESPACIAL ACELERADA POR ÍNDICE GIST COM PROJEÇÃO ESTRITA
    RETURN QUERY
    SELECT
        p.id,
        p.slug,
        p.title,
        p.price,
        p.rent_price,
        p.transaction_type,
        p.property_type,
        COALESCE(p.bedrooms, 0) AS bedrooms,
        p.usable_area,
        -- Privacidade de endereço (Seção 44 do MASTER_PLAN):
        -- Quando não visível, gera localização aproximada determinística na região
        CASE
            WHEN p.address_visible THEN p.latitude::DOUBLE PRECISION
            ELSE (ROUND(p.latitude::numeric, 2) + ((('x' || substr(md5(p.id::text), 1, 4))::bit(16)::int % 100 - 50) * 0.00005))::DOUBLE PRECISION
        END AS latitude,
        CASE
            WHEN p.address_visible THEN p.longitude::DOUBLE PRECISION
            ELSE (ROUND(p.longitude::numeric, 2) + ((('x' || substr(md5(p.id::text), 5, 4))::bit(16)::int % 100 - 50) * 0.00005))::DOUBLE PRECISION
        END AS longitude,
        p.address_visible,
        CASE
            WHEN p.address_visible THEN p.street
            ELSE NULL
        END AS street,
        n.name AS neighborhood_name,
        c.name AS city_name,
        c.slug AS city_slug,
        s.code AS state_code,
        a.name AS agency_name,
        a.logo_url AS agency_logo_url,
        (
            SELECT pm.url
            FROM public.property_media pm
            WHERE pm.property_id = p.id
            ORDER BY pm.is_cover DESC, pm.position ASC
            LIMIT 1
        ) AS cover_image_url
    FROM public.properties p
    LEFT JOIN public.neighborhoods n ON n.id = p.neighborhood_id
    LEFT JOIN public.cities c ON c.id = p.city_id
    LEFT JOIN public.states s ON s.id = p.state_id
    LEFT JOIN public.agencies a ON a.id = p.agency_id
    WHERE
        p.status = 'active'
        -- Filtro espacial PostGIS acelerado pelo índice idx_properties_location (GiST)
        AND p.location IS NOT NULL
        AND p.location && v_envelope
        -- Filtro: Tipo de Transação
        AND (
            p_transaction_type IS NULL
            OR (p_transaction_type = 'sale' AND p.transaction_type IN ('sale', 'sale_or_rent'))
            OR (p_transaction_type = 'rent' AND p.transaction_type IN ('rent', 'sale_or_rent'))
            OR (p.transaction_type::TEXT = p_transaction_type)
        )
        -- Filtro: Tipo de Imóvel
        AND (
            p_property_types IS NULL
            OR cardinality(p_property_types) = 0
            OR p.property_type::TEXT = ANY(p_property_types)
        )
        -- Filtro: Preço
        AND (
            p_price_min IS NULL
            OR (p_transaction_type = 'rent' AND p.rent_price >= p_price_min)
            OR (p_transaction_type <> 'rent' AND p.price >= p_price_min)
            OR (p_transaction_type IS NULL AND (p.price >= p_price_min OR p.rent_price >= p_price_min))
        )
        AND (
            p_price_max IS NULL
            OR (p_transaction_type = 'rent' AND p.rent_price <= p_price_max)
            OR (p_transaction_type <> 'rent' AND p.price <= p_price_max)
            OR (p_transaction_type IS NULL AND (p.price <= p_price_max OR p.rent_price <= p_price_max))
        )
        -- Filtros de Especificações
        AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
        AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
        AND (p_parking_spaces IS NULL OR p.parking_spaces >= p_parking_spaces)
        AND (p_area_min IS NULL OR p.usable_area >= p_area_min)
        AND (p_area_max IS NULL OR p.usable_area <= p_area_max)
        AND (p_financiable IS NULL OR p.financiable = p_financiable)
        AND (p_furnished IS NULL OR p.furnished = p_furnished)
        AND (p_accepts_exchange IS NULL OR p.accepts_exchange = p_accepts_exchange)
    ORDER BY p.published_at DESC NULLS LAST
    LIMIT v_limit;
END;
$$;

-- Permissões para leitura pública e anônima conforme RLS
GRANT EXECUTE ON FUNCTION public.search_properties_bbox TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_properties_bbox IS 'Busca espacial otimizada de imóveis ativos dentro de um Bounding Box (Viewport) com projeção mínima e privacidade de endereço.';
