-- =====================================================================
-- MIGRATION: 20260925000017_create_property_ranking_system.sql
-- DESCRIÇÃO: Sistema Completo de Ranking de Imóveis (0 a 100 pontos)
-- CRITÉRIOS:
--   1. Relevância da Busca ........... 25 pontos
--   2. Qualidade do Anúncio ......... 15 pontos
--   3. Imóvel em Destaque ........... 15 pontos
--   4. Imobiliária Verificada ....... 10 pontos
--   5. Atualização / Recência ....... 10 pontos
--   6. Completude dos Dados ......... 5 pontos
--   7. Qualidade de Mídia ........... 5 pontos
--   8. Competitividade de Preço ..... 5 pontos
--   9. Engajamento do Anúncio ....... 5 pontos
-- TOTAL ............................. 100 pontos
-- =====================================================================

-- 1. NOVAS COLUNAS DE SCORE E AUDITORIA EM PROPERTIES
ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS ranking_score NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ranking_breakdown JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ranking_updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

COMMENT ON COLUMN public.properties.ranking_score IS 'Pontuação do ranking de 0 a 100 pontos para ordenação inteligente dos anúncios';
COMMENT ON COLUMN public.properties.ranking_breakdown IS 'Discriminação detalhada dos 9 critérios de pontuação do ranking';

-- 2. ÍNDICES DE ALTA PERFORMANCE PARA O RANKING
CREATE INDEX IF NOT EXISTS idx_properties_ranking_score
    ON public.properties(ranking_score DESC);

CREATE INDEX IF NOT EXISTS idx_properties_status_ranking
    ON public.properties(status, ranking_score DESC)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_properties_city_ranking
    ON public.properties(city_id, status, ranking_score DESC)
    WHERE status = 'active';

-- 3. CONFIGURAÇÃO CENTRALIZADA INICIAL EM SITE_SETTINGS (SOMA = 100)
INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES (
    'ranking_config',
    jsonb_build_object(
        'weights', jsonb_build_object(
            'relevance', 25,
            'quality', 15,
            'featured', 15,
            'verified_brokerage', 10,
            'freshness', 10,
            'completeness', 5,
            'media', 5,
            'price', 5,
            'engagement', 5
        ),
        'freshness_intervals', jsonb_build_array(
            jsonb_build_object('maxDays', 3, 'score', 10),
            jsonb_build_object('maxDays', 7, 'score', 9),
            jsonb_build_object('maxDays', 14, 'score', 8),
            jsonb_build_object('maxDays', 30, 'score', 6),
            jsonb_build_object('maxDays', 60, 'score', 4),
            jsonb_build_object('maxDays', 90, 'score', 2),
            jsonb_build_object('maxDays', 999999, 'score', 0)
        ),
        'media_intervals', jsonb_build_array(
            jsonb_build_object('minPhotos', 0, 'maxPhotos', 0, 'score', 0),
            jsonb_build_object('minPhotos', 1, 'maxPhotos', 3, 'score', 1),
            jsonb_build_object('minPhotos', 4, 'maxPhotos', 6, 'score', 2),
            jsonb_build_object('minPhotos', 7, 'maxPhotos', 10, 'score', 3),
            jsonb_build_object('minPhotos', 11, 'maxPhotos', 99999, 'score', 4)
        ),
        'video_tour_bonus', 1
    ),
    'Pesos e parâmetros centrais do algoritmo de ranking de imóveis (0 a 100 pontos)',
    timezone('utc'::text, now())
)
ON CONFLICT (key) DO NOTHING;

-- 4. FUNÇÃO PARA CALCULAR O SCORE INTRÍNSECO DE UM IMÓVEL
CREATE OR REPLACE FUNCTION public.calculate_property_ranking_score(p_property_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_prop RECORD;
    v_featured_ids JSONB;
    v_is_featured BOOLEAN := false;
    v_is_verified BOOLEAN := false;
    v_media_count INTEGER := 0;
    v_has_video BOOLEAN := false;
    v_leads_count INTEGER := 0;
    v_whatsapp_count INTEGER := 0;
    v_form_count INTEGER := 0;
    v_days_active NUMERIC := 1;

    -- Scores
    v_quality NUMERIC := 0;
    v_featured NUMERIC := 0;
    v_verified NUMERIC := 0;
    v_freshness NUMERIC := 0;
    v_completeness NUMERIC := 0;
    v_media NUMERIC := 0;
    v_price NUMERIC := 2.5;
    v_engagement NUMERIC := 0;
    v_total NUMERIC := 0;

    v_days_since_update INTEGER := 0;
    v_title_len INTEGER := 0;
    v_desc_len INTEGER := 0;
    v_valid_completeness_fields INTEGER := 0;
    v_is_land BOOLEAN := false;
    v_is_comm BOOLEAN := false;
    v_breakdown JSONB;
BEGIN
    -- Busca dados do imóvel e imobiliária
    SELECT 
        p.*,
        a.verified_at AS agency_verified_at
    INTO v_prop
    FROM public.properties p
    LEFT JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Property not found');
    END IF;

    -- 1. Destaque (site_settings.featured_property_ids)
    SELECT value INTO v_featured_ids
    FROM public.site_settings
    WHERE key = 'featured_property_ids';

    IF v_featured_ids IS NOT NULL AND jsonb_typeof(v_featured_ids) = 'array' THEN
        v_is_featured := v_featured_ids ? p_property_id::text;
    END IF;
    IF v_is_featured THEN
        v_featured := 15.0;
    ELSE
        v_featured := 0.0;
    END IF;

    -- 2. Imobiliária Verificada
    IF v_prop.agency_verified_at IS NOT NULL THEN
        v_is_verified := true;
        v_verified := 10.0;
    ELSE
        v_verified := 0.0;
    END IF;

    -- 3. Recência / Atualização (0–3d = 10, 4–7d = 9, 8–14d = 8, 15–30d = 6, 31–60d = 4, 61–90d = 2, >90d = 0)
    v_days_since_update := GREATEST(0, EXTRACT(DAY FROM (now() - v_prop.updated_at))::INTEGER);
    IF v_days_since_update <= 3 THEN
        v_freshness := 10.0;
    ELSIF v_days_since_update <= 7 THEN
        v_freshness := 9.0;
    ELSIF v_days_since_update <= 14 THEN
        v_freshness := 8.0;
    ELSIF v_days_since_update <= 30 THEN
        v_freshness := 6.0;
    ELSIF v_days_since_update <= 60 THEN
        v_freshness := 4.0;
    ELSIF v_days_since_update <= 90 THEN
        v_freshness := 2.0;
    ELSE
        v_freshness := 0.0;
    END IF;

    -- 4. Qualidade do Anúncio (0 a 15) Contextual por tipo
    v_is_land := v_prop.property_type IN ('land', 'farm', 'rural');
    v_is_comm := v_prop.property_type IN ('commercial', 'office', 'warehouse');
    v_title_len := length(trim(COALESCE(v_prop.title, '')));
    v_desc_len := length(trim(COALESCE(v_prop.description, '')));

    -- Título (max 2 pts)
    IF v_title_len >= 25 THEN v_quality := v_quality + 2.0;
    ELSIF v_title_len >= 12 THEN v_quality := v_quality + 1.2;
    END IF;

    -- Descrição (max 3.5 pts)
    IF v_desc_len >= 150 THEN v_quality := v_quality + 3.5;
    ELSIF v_desc_len >= 60 THEN v_quality := v_quality + 2.0;
    ELSIF v_desc_len >= 20 THEN v_quality := v_quality + 1.0;
    END IF;

    -- Preço e Área (max 5 pts)
    IF (v_prop.price > 0 OR v_prop.rent_price > 0) THEN v_quality := v_quality + 2.5; END IF;
    IF (v_prop.usable_area > 0 OR v_prop.total_area > 0) THEN v_quality := v_quality + 2.5; END IF;

    -- Contextual (max 3 pts)
    IF NOT v_is_land AND NOT v_is_comm THEN
        IF COALESCE(v_prop.bedrooms, 0) > 0 THEN v_quality := v_quality + 1.2; END IF;
        IF COALESCE(v_prop.bathrooms, 0) > 0 THEN v_quality := v_quality + 1.0; END IF;
        IF v_prop.parking_spaces IS NOT NULL THEN v_quality := v_quality + 0.8; END IF;
    ELSIF v_is_comm THEN
        IF COALESCE(v_prop.bathrooms, 0) > 0 THEN v_quality := v_quality + 1.5; END IF;
        IF v_prop.condominium_fee IS NOT NULL OR v_prop.iptu IS NOT NULL THEN v_quality := v_quality + 1.5; END IF;
    ELSE
        IF COALESCE(v_prop.total_area, 0) > 0 THEN v_quality := v_quality + 1.8; END IF;
        IF v_prop.neighborhood_id IS NOT NULL THEN v_quality := v_quality + 1.2; END IF;
    END IF;

    -- Características associadas (max 1.5 pts)
    IF EXISTS (SELECT 1 FROM public.property_features WHERE property_id = p_property_id LIMIT 1) THEN
        v_quality := v_quality + 1.0;
    END IF;
    v_quality := LEAST(15.0, v_quality);

    -- 5. Completude dos Dados (0 a 5)
    IF (v_prop.price > 0 OR v_prop.rent_price > 0) THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    IF v_prop.city_id IS NOT NULL AND v_prop.state_id IS NOT NULL THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    IF v_prop.neighborhood_id IS NOT NULL THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    IF v_prop.latitude IS NOT NULL AND v_prop.longitude IS NOT NULL AND v_prop.latitude <> 0 THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    IF (v_prop.usable_area > 0 OR v_prop.total_area > 0) THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    IF v_prop.property_type IS NOT NULL AND v_prop.transaction_type IS NOT NULL THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    IF v_prop.external_id IS NOT NULL AND trim(v_prop.external_id) <> '' THEN v_valid_completeness_fields := v_valid_completeness_fields + 1; END IF;
    v_completeness := ROUND((v_valid_completeness_fields::NUMERIC / 7.0) * 5.0, 1);

    -- 6. Qualidade de Mídia (0 a 5)
    SELECT 
        COUNT(*),
        COALESCE(bool_or(type IN ('video', 'virtual_tour')), false)
    INTO v_media_count, v_has_video
    FROM public.property_media
    WHERE property_id = p_property_id;

    IF v_media_count >= 11 THEN v_media := 4.0;
    ELSIF v_media_count >= 7 THEN v_media := 3.0;
    ELSIF v_media_count >= 4 THEN v_media := 2.0;
    ELSIF v_media_count >= 1 THEN v_media := 1.0;
    ELSE v_media := 0.0;
    END IF;

    IF v_has_video THEN v_media := LEAST(5.0, v_media + 1.0); END IF;

    -- 7. Competitividade de Preço (0 a 5) - Padrão neutro balanceado
    v_price := 2.5;

    -- 8. Engajamento do Anúncio (0 a 5)
    SELECT 
        COUNT(*),
        COALESCE(COUNT(*) FILTER (WHERE source = 'whatsapp'), 0),
        COALESCE(COUNT(*) FILTER (WHERE source = 'form'), 0)
    INTO v_leads_count, v_whatsapp_count, v_form_count
    FROM public.leads
    WHERE property_id = p_property_id;

    IF v_leads_count > 0 THEN
        IF v_prop.published_at IS NOT NULL THEN
            v_days_active := GREATEST(1, EXTRACT(DAY FROM (now() - v_prop.published_at))::NUMERIC);
        ELSE
            v_days_active := 30;
        END IF;

        DECLARE
            v_weighted NUMERIC;
            v_monthly_rate NUMERIC;
        BEGIN
            v_weighted := (v_form_count * 3.0) + (v_whatsapp_count * 2.0) + ((v_leads_count - v_form_count - v_whatsapp_count) * 1.0);
            v_monthly_rate := (v_weighted / v_days_active) * 30.0;

            IF v_monthly_rate >= 6.0 THEN v_engagement := 5.0;
            ELSIF v_monthly_rate >= 3.5 THEN v_engagement := 4.0;
            ELSIF v_monthly_rate >= 1.5 THEN v_engagement := 3.0;
            ELSIF v_monthly_rate >= 0.5 THEN v_engagement := 2.0;
            ELSE v_engagement := 1.0;
            END IF;
        END;
    END IF;

    -- Score Total Intrínseco (Base sem filtros = Relevância 25)
    v_total := 25.0 + v_quality + v_featured + v_verified + v_freshness + v_completeness + v_media + v_price + v_engagement;
    v_total := LEAST(100.0, GREATEST(0.0, ROUND(v_total, 1)));

    v_breakdown := jsonb_build_object(
        'relevance', 25.0,
        'quality', v_quality,
        'featured', v_featured,
        'verified_brokerage', v_verified,
        'freshness', v_freshness,
        'completeness', v_completeness,
        'media', v_media,
        'price', v_price,
        'engagement', v_engagement
    );

    -- Atualiza colunas no banco
    UPDATE public.properties
    SET 
        ranking_score = v_total,
        ranking_breakdown = v_breakdown,
        ranking_updated_at = timezone('utc'::text, now())
    WHERE id = p_property_id;

    RETURN jsonb_build_object(
        'property_id', p_property_id,
        'score', v_total,
        'breakdown', v_breakdown
    );
END;
$$;

-- 5. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DO SCORE NO BANCO
CREATE OR REPLACE FUNCTION public.handle_property_ranking_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.calculate_property_ranking_score(NEW.id);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_recalculate_ranking ON public.properties;
CREATE TRIGGER trg_properties_recalculate_ranking
AFTER INSERT OR UPDATE OF title, description, price, rent_price, usable_area, bedrooms, bathrooms, parking_spaces, status
ON public.properties
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.handle_property_ranking_trigger();

-- Permissões RPC
GRANT EXECUTE ON FUNCTION public.calculate_property_ranking_score(UUID) TO anon, authenticated, service_role;
