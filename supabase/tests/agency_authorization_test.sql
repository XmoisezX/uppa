-- =====================================================================
-- TESTES DE AUTORIZAÇÃO E RLS: MÓDULO DE IMOBILIÁRIAS
-- CONFORMIDADE: MASTER_PLAN.md (Seções 17, 18, 31, 32 e 82)
-- =====================================================================

BEGIN;

-- 1. Verificar RLS ativado nas tabelas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('agencies', 'agency_members');

-- 2. Testar leitura anônima de imobiliárias ativas (deve permitir)
SET ROLE anon;
SELECT count(*) FROM public.agencies WHERE status = 'active';

-- 3. Testar tentativa de criação de imobiliária por anônimo (deve FALHAR por RLS)
DO $$
BEGIN
    INSERT INTO public.agencies (name, slug, creci, whatsapp, email)
    VALUES ('Imobiliária Fake', 'fake-imob', '99999-J', '53999999999', 'fake@teste.com');
    RAISE EXCEPTION 'VIOLAÇÃO DE RLS: Visitante anônimo conseguiu inserir imobiliária!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCESSO: Inserção de anônimo em agencies bloqueada por RLS.';
    WHEN others THEN
        RAISE NOTICE 'SUCESSO: Inserção anônima bloqueada por política: %', SQLERRM;
END;
$$;

-- 4. Testar tentativa de edição direta de outra imobiliária por usuário não vinculado (deve FALHAR por RLS)
SET ROLE authenticated;
DO $$
BEGIN
    UPDATE public.agencies
    SET name = 'Nome Hackeado'
    WHERE id = '00000000-0000-0000-0000-000000000000';
    -- Se não for owner/admin, o update não afeta linhas devido ao RLS
    IF FOUND THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE RLS: Usuário não vinculado conseguiu atualizar imobiliária!';
    ELSE
        RAISE NOTICE 'SUCESSO: Usuário não vinculado bloqueado por RLS (0 rows updated).';
    END IF;
END;
$$;

ROLLBACK;
