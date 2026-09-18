-- =====================================================================
-- TESTES DE AUTORIZAÇÃO E RLS: BASE GEOGRÁFICA
-- CONFORMIDADE: MASTER_PLAN.md (Seção 31 e 81)
-- =====================================================================

BEGIN;

-- 1. Testar se tabelas possuem RLS ativado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('states', 'cities', 'neighborhoods');

-- 2. Testar leitura anônima (deve retornar os registros sem erro)
SET ROLE anon;
SELECT count(*) FROM public.states;
SELECT count(*) FROM public.cities;
SELECT count(*) FROM public.neighborhoods;

-- 3. Testar tentativa de inserção por anônimo (deve FALHAR por RLS)
DO $$
BEGIN
    INSERT INTO public.states (name, code, ibge_code, slug)
    VALUES ('Estado Teste', 'TT', 99, 'estado-teste');
    RAISE EXCEPTION 'VIOLAÇÃO DE RLS: Anônimo conseguiu inserir em states!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCESSO: Inserção de anônimo bloqueada corretamente (insufficient_privilege).';
    WHEN others THEN
        RAISE NOTICE 'SUCESSO: Inserção de anônimo bloqueada por RLS: %', SQLERRM;
END;
$$;

-- 4. Testar tentativa de inserção por usuário autenticado comum (deve FALHAR por RLS)
SET ROLE authenticated;
DO $$
BEGIN
    INSERT INTO public.cities (state_id, name, slug)
    VALUES ('00000000-0000-0000-0000-000000000000', 'Cidade Teste', 'cidade-teste');
    RAISE EXCEPTION 'VIOLAÇÃO DE RLS: Usuário autenticado comum conseguiu inserir em cities!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCESSO: Inserção de usuário autenticado bloqueada corretamente (insufficient_privilege).';
    WHEN others THEN
        RAISE NOTICE 'SUCESSO: Inserção bloqueada por RLS: %', SQLERRM;
END;
$$;

ROLLBACK;
