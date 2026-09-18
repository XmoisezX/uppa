-- =====================================================================
-- MIGRATION: 20260918000002_seed_brazilian_states.sql
-- DESCRIÇÃO: Seed inicial dos 27 estados da federação brasileira
-- CONFORMIDADE: MASTER_PLAN.md (Seção 7 e 81)
-- =====================================================================

INSERT INTO public.states (name, code, ibge_code, slug)
VALUES
    ('Acre', 'AC', 12, 'acre'),
    ('Alagoas', 'AL', 27, 'alagoas'),
    ('Amapá', 'AP', 16, 'amapa'),
    ('Amazonas', 'AM', 13, 'amazonas'),
    ('Bahia', 'BA', 29, 'bahia'),
    ('Ceará', 'CE', 23, 'ceara'),
    ('Distrito Federal', 'DF', 53, 'distrito-federal'),
    ('Espírito Santo', 'ES', 32, 'espirito-santo'),
    ('Goiás', 'GO', 52, 'goias'),
    ('Maranhão', 'MA', 21, 'maranhao'),
    ('Mato Grosso', 'MT', 51, 'mato-grosso'),
    ('Mato Grosso do Sul', 'MS', 50, 'mato-grosso-do-sul'),
    ('Minas Gerais', 'MG', 31, 'minas-gerais'),
    ('Pará', 'PA', 15, 'para'),
    ('Paraíba', 'PB', 25, 'paraiba'),
    ('Paraná', 'PR', 41, 'parana'),
    ('Pernambuco', 'PE', 26, 'pernambuco'),
    ('Piauí', 'PI', 22, 'piaui'),
    ('Rio de Janeiro', 'RJ', 33, 'rio-de-janeiro'),
    ('Rio Grande do Norte', 'RN', 24, 'rio-grande-do-norte'),
    ('Rio Grande do Sul', 'RS', 43, 'rio-grande-do-sul'),
    ('Rondônia', 'RO', 11, 'rondonia'),
    ('Roraima', 'RR', 14, 'roraima'),
    ('Santa Catarina', 'SC', 42, 'santa-catarina'),
    ('São Paulo', 'SP', 35, 'sao-paulo'),
    ('Sergipe', 'SE', 28, 'sergipe'),
    ('Tocantins', 'TO', 17, 'tocantins')
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    ibge_code = EXCLUDED.ibge_code,
    slug = EXCLUDED.slug,
    updated_at = timezone('utc'::text, now());
