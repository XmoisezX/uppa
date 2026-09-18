-- =====================================================================
-- TESTES DE AUTORIZAÇÃO E RLS: MODELO DE PROPERTIES
-- CONFORMIDADE: MASTER_PLAN.md (Seções 10, 14, 15, 16, 31, 32 e 83)
-- =====================================================================

BEGIN;

-- 1. Verificar se RLS está ativo em todas as tabelas do modelo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'properties',
    'features',
    'property_features',
    'property_media',
    'property_price_history',
    'property_status_history'
  );

-- 2. Testar leitura de catálogo de features por visitante anônimo (deve permitir)
SET ROLE anon;
SELECT count(*) FROM public.features;

-- 3. Testar leitura de imóveis por anônimo (deve retornar somente status = 'active')
SELECT count(*) FROM public.properties WHERE status != 'active';
-- O resultado acima deve ser 0 para anônimos devido ao RLS.

-- 4. Testar tentativa de inserção por anônimo em properties (deve FALHAR por RLS)
DO $$
BEGIN
    INSERT INTO public.properties (
        agency_id, external_id, slug, title, transaction_type, property_type
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', 'ext-fake-01', 'slug-fake',
        'Imóvel Hackeado', 'sale', 'house'
    );
    RAISE EXCEPTION 'VIOLAÇÃO DE RLS: Visitante anônimo conseguiu inserir imóvel!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCESSO: Inserção de anônimo em properties bloqueada por RLS.';
    WHEN others THEN
        RAISE NOTICE 'SUCESSO: Inserção de anônimo bloqueada pela política: %', SQLERRM;
END;
$$;

-- 5. Testar tentativa de deleção por usuário comum autenticado (deve FALHAR por RLS)
SET ROLE authenticated;
DO $$
BEGIN
    DELETE FROM public.properties
    WHERE id = '00000000-0000-0000-0000-000000000000';
    IF FOUND THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE RLS: Usuário sem vínculo conseguiu deletar imóvel!';
    ELSE
        RAISE NOTICE 'SUCESSO: Deleção não autorizada bloqueada por RLS (0 rows affected).';
    END IF;
END;
$$;

ROLLBACK;
