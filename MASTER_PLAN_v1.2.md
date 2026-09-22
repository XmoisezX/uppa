# UPPA — MASTER PLAN v1.1
## Documento Mestre de Produto, Arquitetura e Estado Atual
### Atualizado em 21/09/2026

Status: em desenvolvimento — MVP operacional em evolução
Produto: portal imobiliário nacional
Marca atual: UPPA
Frontend: Next.js + TypeScript
Backend/Banco: Supabase + PostgreSQL + PostGIS
Deploy atual: Vercel
Estratégia inicial: inventário gratuito + distribuição + geração de leads para imobiliárias

---

# 1. OBJETIVO DESTE DOCUMENTO

Este documento substitui, como referência operacional, o MASTER_PLAN.md v1 original.

O MASTER_PLAN v1 continua sendo a base histórica de arquitetura e visão de longo prazo. Esta versão 1.1 registra:

- o que já foi construído;
- decisões que mudaram;
- problemas identificados no estado atual;
- prioridades reais do MVP;
- direção visual e funcional do portal;
- regras para o desenvolvimento com Antigravity/vibe coding.

REGRA:

Quando houver conflito entre o plano original e este documento, este documento representa a decisão mais recente, salvo orientação explícita posterior.

---

# 2. VISÃO DO PRODUTO

A UPPA será um portal imobiliário nacional para descoberta, distribuição e geração de leads.

O ciclo principal continua sendo:

Imobiliária
→ fornece imóveis
→ UPPA ganha inventário
→ inventário gera páginas públicas
→ páginas atraem compradores e locatários
→ usuários geram leads
→ imobiliárias recebem valor
→ mais imobiliárias entram
→ mais imóveis entram.

O produto não deve começar tentando substituir ZAP, OLX ou Viva Real.

O primeiro objetivo é ser um canal adicional, gratuito e extremamente fácil para imobiliárias distribuírem seus imóveis.

---

# 3. PRINCÍPIO CENTRAL

Toda nova funcionalidade deve ser avaliada por sua contribuição para pelo menos um destes objetivos:

1. obter imóveis;
2. manter imóveis atualizados;
3. facilitar a descoberta de imóveis;
4. gerar tráfego;
5. gerar leads;
6. aumentar a retenção das imobiliárias;
7. monetizar tráfego ou leads existentes.

Se não contribuir claramente para nenhum deles, não é prioridade do MVP.

---

# 4. ESTADO ATUAL DO PRODUTO

O projeto já ultrapassou a fase de arquitetura inicial.

A base atual já contempla ou contempla parcialmente:

- portal público;
- página inicial;
- /comprar;
- /alugar;
- páginas individuais de imóveis;
- cadastro/importação de imóveis;
- VRSync;
- feeds por URL;
- Supabase;
- banco de imóveis;
- dados geográficos;
- sincronização automática;
- endpoint de sincronização;
- cron externo;
- cards de imóveis;
- filtros;
- páginas SEO;
- CTA de contato;
- integração visual com WhatsApp;
- páginas de imobiliária/contato em evolução.

O foco atual deixa de ser "construir o esqueleto do portal" e passa a ser:

PORTAL PÚBLICO + ESTOQUE + BUSCA + CONVERSÃO + SEO.

---

# 5. SITUAÇÃO REAL OBSERVADA NO SITE

URL atual de produção/teste:

https://uppa-six.vercel.app/

A home já apresenta:

- marca UPPA;
- busca principal;
- Comprar / Alugar;
- tipos de imóveis;
- buscas por características;
- imóveis recentes;
- cidades com estoque;
- chamada para imobiliárias;
- FAQ;
- links para cadastro e painel.

O portal já apresenta imóveis reais importados, incluindo anúncios da Imperial Paris e outras fontes.

A página /comprar já apresenta:

- breadcrumb;
- busca;
- filtros;
- quantidade de resultados;
- filtros por tipo;
- faixa de preço;
- quartos;
- banheiros;
- vagas;
- área;
- características;
- ordenação;
- lista de imóveis;
- paginação;
- opção de mapa.

A página /alugar possui estrutura semelhante.

A página individual de imóvel já apresenta:

- título;
- finalidade;
- tipo;
- código;
- localização;
- data de publicação;
- galeria;
- preço;
- imobiliária;
- CTA de WhatsApp;
- características;
- descrição;
- localização aproximada;
- imobiliária responsável.

---

# 6. PROBLEMAS ATUAIS PRIORITÁRIOS

## 6.1 Contexto inicial de busca

Foi identificado que /comprar e /alugar podem abrir com contexto de localização específico mesmo quando o usuário não informou explicitamente uma localização.

Exemplo observado:

/comprar
→ Parque Fragata
→ Capão do Leão
→ 735 imóveis

/alugar
→ Centro
→ Pelotas
→ 211 imóveis

Isso precisa ser revisado.

REGRA:

Ao entrar em /comprar ou /alugar sem filtros:

- não assumir bairro;
- não assumir cidade;
- não assumir estado;
- não assumir localização com base no primeiro imóvel;
- mostrar resultado nacional ou uma experiência neutra de descoberta;
- só aplicar localização quando ela vier da URL, busca do usuário ou filtro explícito.

---

## 6.2 Contagens

As contagens apresentadas na home e nas páginas de busca devem vir do banco e refletir exatamente os filtros aplicados.

Nunca utilizar números estáticos ou demonstrativos.

Não mostrar:

- número inventado de imóveis;
- crescimento diário inventado;
- leads inventados;
- taxa de conversão inventada;
- sincronização fictícia.

---

## 6.3 Identidade visual

Todos os caminhos públicos devem usar exclusivamente a identidade UPPA.

Não pode existir:

- PORTAL IMO;
- PORTAL IMO BRASIL;
- PORTALIMOBrasil;
- textos de marcas antigas;
- rodapé de projeto anterior.

Cada rota pública deve ter:

UPPA

como identidade principal.

---

## 6.4 Cards

Os cards atuais possuem informações importantes, porém precisam de melhor hierarquia visual e espaçamento.

Priorizar:

- foto;
- finalidade;
- título;
- localização;
- preço;
- quartos;
- banheiros;
- vagas;
- área;
- condomínio/IPTU quando relevante;
- imobiliária;
- CTA.

Não compactar os dados a ponto de ficarem visualmente colados.

---

## 6.5 /alugar

Imóveis do tipo sale_or_rent podem aparecer em resultados de locação, mas a interface deve deixar isso explícito.

Não usar apenas:

"Venda/Loc."

Preferir:

"Venda e locação"

e, dentro de /alugar:

- destacar aluguel;
- apresentar venda como informação secundária, quando útil.

---

## 6.6 Página individual

A página individual precisa ter identidade UPPA consistente em todas as propriedades.

Deve manter:

- galeria;
- preço;
- dados principais;
- descrição;
- características;
- localização aproximada;
- imobiliária;
- CTA.

Também deve eliminar qualquer referência visual ou textual de marca antiga.

---

# 7. PRIORIDADE ATUAL — EXPERIÊNCIA DO PORTAL

A prioridade imediata é fazer o site parecer um portal imobiliário nacional consolidado.

A experiência deve transmitir:

- grande estoque;
- facilidade de busca;
- confiança;
- informação clara;
- contato direto;
- profissionalismo.

A referência estrutural de UX é o padrão de grandes portais imobiliários, especialmente Chaves na Mão, mas:

NÃO copiar:

- código;
- CSS;
- textos;
- imagens;
- logo;
- identidade;
- assets.

A referência serve apenas para:

- proporções;
- densidade;
- organização;
- filtros;
- cards;
- navegação;
- hierarquia.

---

# 8. HOME

Objetivo:

BUSCAR → ENCONTRAR → ABRIR IMÓVEL.

Ordem recomendada:

1. Header
2. Hero/busca
3. Buscas rápidas
4. Imóveis recentes/destaques
5. Busca por localização
6. Tipos de imóveis
7. Conteúdo SEO/FAQ
8. Área para imobiliárias
9. Footer

A home não deve parecer uma página institucional.

Os imóveis devem aparecer cedo.

---

# 9. HEADER

Identidade:

UPPA

Desktop:

- logo;
- Comprar;
- Alugar;
- opção para imobiliárias/anunciar;
- acesso ao painel/login.

Mobile:

- logo;
- menu;
- busca e ações principais.

Evitar header excessivamente alto.

---

# 10. BUSCA PRINCIPAL

Permitir:

- cidade;
- bairro;
- estado;
- futuramente condomínio.

A operação deve ser explícita:

Comprar | Alugar

Não presumir localização.

Sugestões devem ser derivadas de localidades reais.

Nunca assumir que dois bairros com o mesmo nome são a mesma entidade.

---

# 11. /COMPRAR E /ALUGAR

Estrutura principal:

Filtros | Lista | Mapa opcional

Desktop:

- sidebar compacta;
- lista densa;
- mapa secundário.

Sidebar aproximada:

180–220px.

Lista:

aproximadamente 700–850px em layouts com mapa/área lateral.

Filtros principais:

- localização;
- tipo;
- preço;
- quartos;
- banheiros;
- vagas;
- área;
- características.

Filtros secundários:

"Mais filtros"

---

# 12. CARDS DE RESULTADO

Desktop:

Cards horizontais.

Proporção aproximada:

Imagem:
38–42%

Conteúdo:
58–62%

Altura aproximada:

190–230px.

Informações:

- imagem;
- finalidade;
- título;
- localização;
- preço;
- quartos;
- suítes;
- banheiros;
- vagas;
- área;
- condomínio quando disponível;
- imobiliária;
- favorito quando disponível;
- contato.

Preço deve possuir forte hierarquia.

Não utilizar cards gigantes.

---

# 13. MAPA

O mapa é importante, mas não deve dominar a primeira versão da experiência.

Regras:

- não carregar dezenas de milhares de imóveis de uma vez;
- utilizar viewport;
- utilizar PostGIS;
- usar clusters em zoom baixo;
- retornar imóveis relevantes em zoom alto;
- manter abstração do provedor.

Mobile:

Lista | Mapa

como modos alternativos.

---

# 14. PÁGINA DO IMÓVEL

Estrutura:

1. breadcrumb;
2. galeria;
3. finalidade;
4. título;
5. localização;
6. preço;
7. dados principais;
8. CTA;
9. descrição;
10. características;
11. valores;
12. localização aproximada;
13. imobiliária;
14. imóveis semelhantes.

Desktop:

CTA lateral quando aplicável.

Mobile:

CTA de contato acessível/fixo.

---

# 15. PRIVACIDADE DE ENDEREÇO

Nunca expor endereço residencial completo sem autorização.

Quando:

address_visible = false

mostrar:

Bairro
Cidade - UF

Mapa deve usar localização aproximada.

---

# 16. LEADS

O principal evento comercial é o contato com a imobiliária.

Ao clicar em WhatsApp:

1. registrar evento;
2. registrar property_id;
3. registrar agency_id;
4. registrar origem;
5. registrar UTMs quando existirem;
6. abrir WhatsApp.

Analytics não pode impedir o contato caso falhe.

---

# 17. FEEDS

Fontes previstas:

- cadastro manual;
- upload de XML;
- VRSync;
- XML por URL;
- APIs;
- futuras integrações com CRMs.

Separar:

IMPORTAÇÃO MANUAL

Upload de arquivo
→ processa
→ importa

SINCRONIZAÇÃO AUTOMÁTICA

URL externa
→ feed
→ parser
→ normalização
→ importer
→ banco
→ sincronização periódica.

---

# 18. IDENTIDADE DO IMÓVEL

Regra:

agency_id + source + external_id

deve identificar um anúncio dentro da mesma origem.

Não criar duplicata quando o mesmo item for sincronizado novamente.

Não tentar resolver deduplicação global entre imobiliárias no MVP.

---

# 19. PIPELINE DE FEED

Fluxo:

1. baixar;
2. validar HTTP;
3. validar XML;
4. detectar formato;
5. parser;
6. normalizar;
7. validar;
8. resolver localização;
9. localizar anúncio existente;
10. criar/atualizar;
11. sincronizar mídia;
12. registrar alteração de preço;
13. atualizar source_updated_at;
14. marcar presença no feed;
15. detectar ausentes;
16. desativar conforme regra;
17. registrar feed_run.

Parser nunca escreve diretamente no banco.

VRSyncParser
→ NormalizedProperty
→ PropertyImporter

---

# 20. DESATIVAÇÃO

Não apagar imediatamente imóveis ausentes.

Manter histórico.

Primeira ausência:

missing_from_feed_at

Ausência confirmada:

status = inactive

Nunca apagar em massa sem confirmação.

---

# 21. CRON E SINCRONIZAÇÃO

A sincronização automática deve possuir:

- autenticação;
- lock;
- timeout;
- retry controlado;
- logs;
- feed_runs;
- feed_errors;
- desativação segura.

O endpoint de sincronização deve aceitar apenas chamadas autorizadas.

O cron externo não deve ser considerado prova de sucesso apenas porque a chamada foi enfileirada.

O sistema deve registrar e permitir verificar o HTTP response real.

---

# 22. BANCO

Manter a arquitetura do MASTER_PLAN original:

- PostgreSQL;
- Supabase;
- PostGIS;
- RLS;
- migrations;
- entidades normalizadas.

Entidades centrais:

profiles
agencies
agency_members
brokers

states
cities
neighborhoods

properties
property_media
property_features
property_price_history
property_status_history

feeds
feed_runs
feed_errors

leads
lead_events

favorites
saved_searches

audit_logs

---

# 23. PROPERTIES

Identidade:

agency_id
source
external_id

Campos principais:

- title;
- description;
- transaction_type;
- property_type;
- status;
- price;
- rent_price;
- condominium_fee;
- iptu;
- bedrooms;
- suites;
- bathrooms;
- parking_spaces;
- usable_area;
- total_area;
- lot_area;
- state;
- city;
- neighborhood;
- latitude;
- longitude;
- location;
- published_at;
- source_updated_at.

Não utilizar SELECT * em endpoints críticos.

---

# 24. LOCALIZAÇÃO

Hierarquia:

Brasil
→ Estado
→ Cidade
→ Bairro

Usar IDs, não apenas nomes.

Cidades e bairros homônimos devem ser tratados por contexto geográfico.

PostGIS continua sendo a fonte para consultas espaciais.

---

# 25. SEO

SEO é parte do MVP.

Páginas prioritárias:

- imóvel;
- cidade;
- bairro;
- tipo + cidade;
- tipo + bairro;
- imobiliária.

Exemplos:

/comprar/rs/pelotas

/comprar/rs/pelotas/apartamento

/comprar/rs/pelotas/centro

/imovel/[slug]

Não indexar infinitas combinações de filtros.

Filtros arbitrários:

noindex, follow

quando apropriado.

---

# 26. SITEMAPS

Implementar:

/sitemap.xml

e sitemaps segmentados para grandes volumes.

Priorizar:

- imóveis ativos;
- cidades;
- bairros;
- imobiliárias.

Nunca colocar infinitas URLs de filtros.

---

# 27. METADATA

Cada imóvel deve possuir:

- title;
- description;
- canonical;
- Open Graph.

Exemplo:

Casa com 3 quartos no Laranjal, Pelotas - R$ 719.000 | UPPA

Nunca utilizar apenas código do imóvel como título SEO.

---

# 28. DADOS ESTRUTURADOS

Somente dados verdadeiros.

Nunca inventar:

- reviews;
- estrelas;
- avaliações;
- preço anterior;
- disponibilidade;
- características não presentes.

---

# 29. PERFORMANCE

Priorizar:

- Server Components;
- imagens otimizadas;
- lazy loading;
- cache;
- revalidation;
- consultas específicas;
- paginação por cursor quando necessário.

Não carregar todas as imagens na listagem.

---

# 30. SEGURANÇA

Regras mantidas do plano original:

- service role somente no backend;
- nunca usar service role no frontend;
- RLS em tabelas públicas;
- validação no backend;
- migrations para alterações de banco;
- RBAC;
- audit logs para ações sensíveis.

Nunca criar:

NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

---

# 31. AUTENTICAÇÃO E PERMISSÕES

Papéis:

consumer
broker
agency_member
agency_admin
platform_admin

Não usar e-mail hardcoded para determinar administrador.

Usar RBAC.

---

# 32. DASHBOARD DA IMOBILIÁRIA

Prioridade posterior ao portal público.

Menu:

- visão geral;
- imóveis;
- leads;
- integrações;
- equipe;
- estatísticas;
- configurações.

Primeiro painel útil:

- imóveis ativos;
- leads;
- contatos;
- última sincronização;
- erros de feed.

---

# 33. MONITORAMENTO

Registrar:

- feed inacessível;
- timeout;
- XML inválido;
- erro de parser;
- erro de geocoding;
- erro de imagem;
- erro de importação;
- erro de API.

Sentry pode ser integrado posteriormente.

---

# 34. O QUE NÃO É PRIORIDADE AGORA

Não avançar antes de consolidar o portal público:

- IA;
- CRM completo;
- chat interno;
- WhatsApp API completa;
- aplicativo nativo;
- marketplace;
- simulação bancária completa;
- recomendação por IA;
- comissão;
- gestão financeira;
- MLS;
- automações complexas;
- monetização avançada.

---

# 35. ROADMAP REAL ATUALIZADO

## FASE 1 — Fundação
Status: majoritariamente concluída

- Next.js;
- Supabase;
- Auth;
- RLS;
- estrutura de dados;
- localização;
- properties;
- agencies;
- PostGIS.

## FASE 2 — Estoque
Status: avançada

- VRSync;
- parser;
- normalização;
- importer;
- feed por URL;
- feed runs;
- feed errors;
- sincronização;
- cron;
- desativação.

## FASE 3 — Portal público
Status: ATUAL

Prioridade:

1. identidade UPPA;
2. header;
3. home;
4. /comprar;
5. /alugar;
6. cards;
7. filtros;
8. página do imóvel;
9. responsividade;
10. UX;
11. SEO básico.

## FASE 4 — Conversão

- leads;
- eventos;
- WhatsApp;
- painel de leads;
- analytics básico.

## FASE 5 — SEO e escala

- sitemaps;
- landing pages;
- viewport map;
- clusters;
- cache;
- performance;
- SEO programático controlado.

## FASE 6 — Crescimento

- favoritos;
- buscas salvas;
- alertas;
- verificação;
- destaques;
- planos;
- publicidade;
- financiamento;
- integrações CRM.

---

# 36. META DE PRIMEIRO LANÇAMENTO

O produto pode ser considerado operacional quando:

1. uma imobiliária consegue criar conta;
2. conecta um feed;
3. importa centenas de imóveis;
4. imóveis aparecem corretamente;
5. busca funciona;
6. filtros funcionam;
7. página individual funciona;
8. mapa funciona;
9. contato gera lead;
10. lead chega ao painel;
11. atualização do feed atualiza o imóvel;
12. imóvel removido do feed é desativado corretamente;
13. páginas públicas podem ser rastreadas pelo Google.

---

# 37. META COMERCIAL INICIAL

Primeira meta:

30 imobiliárias.

Estoque alvo:

5.000–10.000 imóveis.

Preço inicial:

R$0 para publicação/inventário básico.

Objetivo:

validar:

- aquisição de imobiliárias;
- integração;
- estoque;
- busca;
- tráfego;
- leads.

---

# 38. MONETIZAÇÃO FUTURA

Free:

- publicação;
- integração;
- página;
- leads.

Pro:

- analytics;
- ferramentas adicionais;
- destaques;
- automações.

Receitas futuras:

- destaques;
- empreendimentos;
- publicidade;
- financiamento;
- seguros;
- consórcios;
- serviços;
- dados.

Princípio:

Primeiro inventário.
Depois audiência.
Depois leads.
Depois monetização.

---

# 39. REGRAS PARA ANTIGRAVITY

Antes de modificar:

1. ler este documento;
2. analisar a implementação existente;
3. identificar arquivos envolvidos;
4. não alterar arquitetura sem necessidade;
5. não criar tabela se uma existente resolver;
6. não remover RLS;
7. não expor service role;
8. não duplicar componentes;
9. não instalar dependência sem necessidade;
10. não refatorar fora do escopo;
11. preservar funcionalidades existentes;
12. executar build após mudanças.

Para tarefas visuais:

- não alterar backend sem necessidade;
- não alterar banco;
- não alterar feeds;
- não alterar autenticação;
- utilizar dados reais;
- não inventar métricas.

---

# 40. REGRA DE DADOS REAIS

A interface nunca deve criar sensação artificial de escala.

É preferível mostrar:

123 imóveis reais

do que:

10.000 imóveis fictícios.

Toda estatística pública deve possuir origem real.

---

# 41. CHECKLIST VISUAL ATUAL

Antes de considerar o portal público pronto:

[ ] UPPA aparece de forma consistente em todas as páginas

[ ] Nenhuma referência a PORTAL IMO/PORTALIMOBrasil

[ ] Home claramente parece portal imobiliário

[ ] Busca é o elemento principal

[ ] Imóveis aparecem cedo na home

[ ] /comprar não assume localização sem filtro

[ ] /alugar não assume localização sem filtro

[ ] Filtros são claros

[ ] Cards compactos e legíveis

[ ] Preço possui hierarquia

[ ] Dados dos cards possuem espaçamento correto

[ ] Venda e locação são claramente diferenciadas

[ ] Página individual possui identidade UPPA

[ ] CTA de contato é evidente

[ ] Mobile é funcional

[ ] Desktop possui boa densidade

[ ] Não há números fictícios

[ ] SEO básico funciona

---

# 42. CHECKLIST TÉCNICO

[ ] Build sem erros

[ ] TypeScript sem erros críticos

[ ] RLS preservado

[ ] Service role somente servidor

[ ] Feed autenticado

[ ] Cron autenticado

[ ] Feed runs registrados

[ ] Feed errors registrados

[ ] Idempotência funcionando

[ ] Não criar duplicatas

[ ] Ausência do feed não apaga imóvel imediatamente

[ ] Histórico de preço preservado

[ ] Imagens carregando corretamente

[ ] Slugs estáveis

[ ] Canonical correto

[ ] Sitemap funcionando

[ ] Robots funcionando

[ ] Queries críticas sem SELECT *

---

# 43. PRÓXIMA TAREFA OFICIAL

A próxima tarefa é exclusivamente visual/UX:

REDESIGN DO PORTAL PÚBLICO.

Ordem:

1. Header;
2. Home;
3. /comprar;
4. /alugar;
5. PropertyCard;
6. página do imóvel;
7. mobile;
8. consistência de identidade;
9. remoção de dados fictícios;
10. correção dos contextos automáticos de localização.

Não iniciar novas funcionalidades complexas nesta etapa.

---

# 44. NORTE DO PRODUTO

A UPPA não deve permanecer como:

"mais um site de classificados."

A direção é:

infraestrutura nacional para descoberta, distribuição e transação imobiliária.

O MVP deve começar simples, mas a arquitetura deve continuar capaz de crescer para:

- 100.000 imóveis;
- 1.000.000+ imóveis;
- milhares de imobiliárias;
- milhões de páginas públicas.

O crescimento deve acontecer sem reconstruir o produto inteiro.

---

# 45. REGRA FINAL

Quando houver dúvida entre adicionar uma funcionalidade e melhorar uma funcionalidade existente:

PRIMEIRO:

- estoque;
- busca;
- experiência;
- páginas;
- SEO;
- leads;
- estabilidade.

DEPOIS:

- recursos avançados;
- monetização;
- IA;
- marketplace.

A UPPA deve primeiro provar que consegue:

OBTER IMÓVEIS
→ MOSTRAR IMÓVEIS
→ SER ENCONTRADA
→ GERAR CONTATOS
→ ENTREGAR VALOR À IMOBILIÁRIA.

Esse é o produto.

# UPPA — MASTER PLAN v1.2
## Evolução do v1.1: Portal Imobiliário + Conteúdo + Mídia + Marketplace
### Atualizado em 22/09/2026

> Esta versão preserva integralmente o MASTER_PLAN_v1.1 como base e acrescenta uma camada estratégica que estava faltando: a definição da UPPA como PORTAL, e não apenas como vitrine de imóveis.

---

# 46. NOVA DEFINIÇÃO DO PRODUTO

A UPPA não deve ser percebida como uma imobiliária que possui imóveis próprios.

A UPPA deve ser percebida como uma plataforma nacional que:

- reúne anúncios de diferentes imobiliárias, corretores, proprietários e parceiros autorizados;
- permite pesquisar, comparar e descobrir imóveis;
- oferece conteúdo útil para quem compra, vende, aluga ou investe;
- apresenta cidades, bairros, regiões, tipos de imóveis e oportunidades;
- conecta usuários aos anunciantes;
- oferece ferramentas de apoio à decisão;
- possui publicidade e espaços patrocinados;
- funciona como uma camada de distribuição para as imobiliárias.

A fórmula visual e conceitual passa a ser:

PORTAL = ESTOQUE + BUSCA + CONTEÚDO + CIDADES + FERRAMENTAS + PUBLICIDADE + ANUNCIANTES.

Não é:

PORTAL = LISTA DE IMÓVEIS.

---

# 47. BENCHMARK DOS GRANDES PORTAIS

A análise dos sites atuais de Chaves na Mão, ZAP Imóveis e Viva Real mostra um padrão comum.

## 47.1 Chaves na Mão

O site apresenta simultaneamente:

- busca de imóveis;
- categorias de imóveis;
- filtros por características;
- páginas por cidades;
- páginas por tipos de imóvel;
- páginas por comodidades;
- área para anunciantes;
- blog imobiliário;
- conteúdos de decoração, reformas e guias;
- mercado imobiliário;
- FAQ;
- publicidade;
- aplicativo;
- navegação ampla por localização.

Além disso, o próprio site se posiciona como portal de classificados e tecnologia, e não como imobiliária.

## 47.2 ZAP Imóveis

A estrutura atual apresenta:

- hero/banner visual;
- busca principal;
- Comprar / Alugar / Imóvel novo;
- categorias residenciais e comerciais;
- módulos editoriais;
- publicidade;
- bairros populares;
- cidades;
- buscas populares;
- lançamentos;
- financiamento;
- Minha Casa Minha Vida;
- avaliação de imóveis;
- incorporadoras;
- blog;
- guias de cidades e bairros;
- recursos para anunciantes.

## 47.3 Viva Real

A estrutura atual apresenta:

- hero/banner;
- busca principal;
- Comprar / Alugar / Imóvel novo;
- categorias;
- módulos editoriais;
- conteúdos temáticos;
- cidades;
- buscas populares;
- financiamento;
- Minha Casa Minha Vida;
- incorporadoras;
- blog;
- guias de cidades;
- guias de bairros;
- recursos para anunciantes.

## 47.4 Conclusão

Os três modelos não tratam a home como uma simples grade de imóveis.

A home funciona como uma página de entrada para um ecossistema imobiliário.

Portanto, a UPPA deve seguir a mesma lógica de produto, sem copiar código, textos, imagens, identidade ou layout proprietário.

---

# 48. O QUE ESTÁ FALTANDO NA UPPA

A UPPA atual já possui vários módulos corretos:

- busca;
- categorias;
- imóveis recentes;
- cidades;
- FAQ;
- CTA para anunciantes.

Porém, a composição ainda pode transmitir a sensação de:

"uma imobiliária com vários imóveis"

em vez de:

"um portal nacional de imóveis".

O principal problema não é falta de imóveis.

É falta de CAMADAS DE PORTAL.

As principais camadas a adicionar são:

1. hero/banner editorial;
2. navegação de portal;
3. conteúdo temático;
4. guias de cidades;
5. guias de bairros;
6. buscas populares;
7. lançamentos;
8. financiamento e ferramentas;
9. mercado imobiliário;
10. publicidade;
11. conteúdo para anunciantes;
12. módulos patrocináveis;
13. páginas SEO de descoberta.

---

# 49. NOVA ARQUITETURA DA HOME

A home deve ser organizada como um portal.

## Camada 1 — Header

- UPPA;
- Comprar;
- Alugar;
- Lançamentos;
- Explorar;
- Anunciar;
- Entrar.

No mobile:

- logo;
- menu;
- busca;
- entrar.

---

## Camada 2 — Hero principal

Deve possuir:

- imagem ou composição visual;
- título curto;
- subtítulo;
- busca grande;
- Comprar / Alugar / Imóvel novo;
- localização;
- tipo de imóvel;
- botão Buscar.

A busca continua sendo o elemento principal.

O banner não deve ser apenas decorativo.

---

## Camada 3 — Atalhos de descoberta

Exemplos:

- Apartamentos;
- Casas;
- Terrenos;
- Comerciais;
- Lançamentos;
- Imóveis financiáveis;
- Imóveis mobiliados;
- Imóveis com piscina;
- Imóveis com 3+ quartos.

Somente mostrar categorias com dados reais ou páginas válidas.

---

## Camada 4 — Imóveis em destaque

Pode conter:

- Imóveis recentes;
- Imóveis selecionados;
- Lançamentos;
- Oportunidades;
- Destaques patrocinados.

Esses blocos devem ser claramente identificados.

---

## Camada 5 — Publicidade

Criar espaços reservados para:

- banner horizontal;
- banner desktop;
- banner mobile;
- destaque patrocinado.

No início podem permanecer desativados ou com placeholder administrativo.

Não inserir publicidade falsa.

---

## Camada 6 — Explore por localização

Exemplos:

- Imóveis em São Paulo;
- Imóveis em Porto Alegre;
- Imóveis em Curitiba;
- Imóveis no Rio de Janeiro;
- Imóveis em Pelotas.

A lista deve ser dinâmica e baseada em estoque real.

---

## Camada 7 — Explore por tipo

Exemplos:

- apartamentos à venda;
- casas à venda;
- terrenos à venda;
- apartamentos para alugar;
- casas para alugar;
- imóveis comerciais.

---

## Camada 8 — Conteúdo editorial

Criar módulos como:

- Guia de compra;
- Guia de aluguel;
- Financiamento;
- Documentação;
- Reforma;
- Decoração;
- Investimento;
- Mercado imobiliário.

A home pode mostrar 3–6 conteúdos, não uma página inteira de blog.

---

## Camada 9 — Guias de cidades e bairros

Exemplo:

"Conheça Pelotas"

- bairros;
- preço médio;
- tipos de imóveis;
- imóveis à venda;
- imóveis para alugar;
- infraestrutura;
- pontos de interesse;
- conteúdos relacionados.

Os dados precisam ser reais ou claramente apresentados como conteúdo editorial.

---

## Camada 10 — Ferramentas

Futuro:

- simulador de financiamento;
- calculadora de poder de compra;
- estimativa de custos de compra;
- calculadora de aluguel;
- avaliação/estimativa de preço;
- comparação de imóveis.

Essas ferramentas podem virar importantes páginas de aquisição orgânica.

---

## Camada 11 — Para imobiliárias

Mensagem clara:

"Publique sua carteira na UPPA"

Mostrar:

- integração XML/feed;
- publicação;
- distribuição;
- leads;
- WhatsApp;
- painel;
- analytics;
- cadastro gratuito.

Não transformar essa área em protagonista da home.

---

## Camada 12 — FAQ

Perguntas sobre:

- o que é a UPPA;
- como funciona;
- quem anuncia;
- como encontrar imóvel;
- como entrar em contato;
- como anunciar;
- como os anúncios são atualizados.

---

## Camada 13 — Footer de portal

Deve possuir grupos:

### Comprar
- apartamentos;
- casas;
- terrenos;
- comerciais;
- lançamentos.

### Alugar
- apartamentos;
- casas;
- comerciais;
- imóveis mobiliados.

### Explorar
- cidades;
- bairros;
- tipos;
- características.

### Conteúdo
- blog;
- guias;
- financiamento;
- mercado imobiliário.

### Anunciantes
- anunciar;
- integração;
- painel;
- suporte.

### Institucional
- sobre;
- contato;
- termos;
- privacidade;
- segurança.

---

# 50. SISTEMA DE BANNERS

Banners passam a ser uma funcionalidade oficial do produto.

Não implementar banners como imagens fixas diretamente no código.

Criar um sistema administrável.

## Entidade conceitual

`banners`

Campos mínimos:

- id;
- title;
- image_url_desktop;
- image_url_mobile;
- destination_url;
- position;
- status;
- start_at;
- end_at;
- priority;
- advertiser_id opcional;
- campaign_id opcional;
- impressions;
- clicks;
- created_at;
- updated_at.

## Posições iniciais

- `home_hero`;
- `home_after_featured`;
- `home_editorial`;
- `search_top`;
- `search_middle`;
- `property_bottom`.

Não é necessário ativar todas no MVP.

## Regras

- banner expirado não aparece;
- banner inativo não aparece;
- imagem mobile pode ser diferente;
- destino deve ser configurável;
- não quebrar layout quando não existir banner;
- registrar clique;
- registrar impressão de forma eficiente;
- não bloquear carregamento do portal;
- utilizar otimização de imagem;
- não usar autoplay pesado como padrão.

---

# 51. SISTEMA DE MÓDULOS EDITORIAIS

A home deve permitir módulos independentes.

Exemplos:

- `hero`;
- `quick_links`;
- `featured_properties`;
- `banner`;
- `city_grid`;
- `property_type_grid`;
- `popular_searches`;
- `editorial_cards`;
- `guide_cards`;
- `launches`;
- `finance_tools`;
- `agency_cta`;
- `faq`.

A ordem deve poder ser alterada futuramente sem reescrever a home.

Não é necessário construir um CMS completo agora.

O primeiro objetivo é criar uma estrutura de componentes reutilizáveis.

---

# 52. CONTEÚDO NÃO DEVE SER APENAS BLOG

O portal deve ter conteúdo em três níveis.

## Nível A — Conteúdo de descoberta

Exemplos:

- imóveis em Pelotas;
- casas em Pelotas;
- apartamentos para alugar em Pelotas;
- terrenos à venda em Pelotas.

## Nível B — Conteúdo de decisão

Exemplos:

- como financiar;
- documentos;
- custos;
- compra;
- aluguel;
- condomínio;
- IPTU;
- financiamento.

## Nível C — Conteúdo editorial

Exemplos:

- tendências;
- decoração;
- arquitetura;
- mercado;
- bairros;
- cidades;
- notícias.

A combinação desses níveis transforma a UPPA em portal.

---

# 53. ESTRATÉGIA DE CONTEÚDO POR CIDADE

Cada cidade relevante deve futuramente possuir:

`/imoveis/{cidade}`

E páginas derivadas:

`/comprar/{cidade}`

`/alugar/{cidade}`

`/apartamentos/{cidade}`

`/casas/{cidade}`

`/terrenos/{cidade}`

`/bairros/{cidade}`

A geração automática só deve acontecer quando houver dados suficientes.

Não criar milhares de páginas vazias.

---

# 54. ESTRATÉGIA DE BAIRROS

Quando houver estoque suficiente:

- página do bairro;
- descrição;
- imóveis disponíveis;
- tipos predominantes;
- links para bairros próximos;
- conteúdo relacionado.

Não inventar preço médio ou dados urbanos.

Se não houver fonte confiável, omitir o dado.

---

# 55. LANÇAMENTOS

Criar uma categoria própria:

`/lancamentos`

Futuro suporte:

- empreendimento;
- construtora/incorporadora;
- localização;
- faixa de preço;
- unidades;
- previsão;
- tipologia;
- imagens;
- CTA.

No MVP, somente implementar se houver fonte de dados real.

---

# 56. PUBLICIDADE E MONETIZAÇÃO

A publicidade deve ser tratada como camada de receita, não como elemento dominante.

Possibilidades futuras:

1. banners;
2. imóveis patrocinados;
3. imobiliárias em destaque;
4. empreendimentos patrocinados;
5. conteúdo patrocinado claramente identificado;
6. mídia direta;
7. programas de publicidade contextual.

Regra:

O usuário deve sempre conseguir distinguir:

- resultado orgânico;
- anúncio patrocinado;
- publicidade.

Nunca esconder publicidade como se fosse resultado orgânico.

---

# 57. IMÓVEL PATROCINADO

Quando implementado:

- etiqueta "Patrocinado" ou equivalente;
- posição diferenciada;
- regras de duração;
- prioridade;
- controle administrativo;
- tracking;
- não alterar os dados reais do imóvel.

Não permitir que patrocínio esconda completamente a relevância da busca.

---

# 58. MODELO DE PORTAL, NÃO DE IMOBILIÁRIA

A UPPA deve comunicar claramente:

"Os imóveis são anunciados por imobiliárias, corretores, proprietários ou parceiros autorizados."

A UPPA não deve parecer a responsável pela venda de todos os imóveis.

No detalhe do imóvel:

- mostrar anunciante;
- mostrar fonte/anunciante;
- mostrar contato;
- informar que a negociação ocorre com o anunciante.

---

# 59. IDENTIDADE VISUAL DO PORTAL

A marca deve ser:

- nacional;
- tecnológica;
- confiável;
- simples;
- moderna;
- neutra.

Evitar aparência de:

- imobiliária boutique;
- imobiliária local;
- construtora;
- escritório de arquitetura.

A identidade deve permitir que diferentes anunciantes coexistam sob a mesma plataforma.

---

# 60. ROADMAP EXECUTÁVEL EM ETAPAS

Cada etapa abaixo deve ser executada separadamente no Antigravity.

REGRA:

Não pedir à IA para executar todas as etapas em um único prompt.

Cada prompt deve:

1. analisar o estado atual;
2. alterar apenas o escopo definido;
3. preservar funcionalidades existentes;
4. testar build;
5. informar arquivos alterados;
6. informar problemas encontrados;
7. parar.

---

## ETAPA 0 — AUDITORIA E CONGELAMENTO

Objetivo:

Criar fotografia técnica antes das mudanças visuais.

A IA deve:

- verificar estrutura;
- identificar rotas;
- identificar componentes;
- identificar dados reais;
- localizar banner/hero atual;
- localizar home;
- localizar /comprar;
- localizar /alugar;
- localizar página de imóvel;
- localizar componentes de card;
- localizar layout/header/footer;
- não modificar código.

### Prompt da Etapa 0

```text
UPPA — ETAPA 0 — AUDITORIA ANTES DA EVOLUÇÃO DO PORTAL

Você está trabalhando no projeto real da UPPA.

NÃO implemente mudanças nesta etapa.

Objetivo:
fazer uma auditoria objetiva do estado atual antes de iniciar a evolução da UPPA para um portal imobiliário nacional mais completo.

Analise:

1. estrutura do projeto;
2. app/router;
3. home;
4. header;
5. footer;
6. /comprar;
7. /alugar;
8. página individual de imóvel;
9. cards;
10. filtros;
11. busca;
12. componentes de conteúdo;
13. sistema atual de imagens;
14. dados do Supabase;
15. feeds;
16. banners, se existirem;
17. autenticação/painel;
18. SEO;
19. sitemap/robots;
20. analytics/tracking;
21. responsividade.

Também identifique onde seria melhor criar:

- PortalShell;
- Header;
- Footer;
- HeroSearch;
- BannerSlot;
- PropertyCard;
- CitySection;
- EditorialSection;
- PopularSearches;
- AgencyCTA;
- FAQSection.

Não crie componentes ainda.

Entregue somente:

A. mapa das rotas;
B. mapa dos componentes;
C. onde cada componente é usado;
D. problemas encontrados;
E. riscos de alterar a home;
F. proposta de ordem das etapas;
G. arquivos que cada próxima etapa provavelmente deverá alterar.

Não faça alterações.

Ao final, pare.
```

---

# 61. ETAPA 1 — SHELL DE PORTAL

Objetivo:

Fazer todas as páginas públicas parecerem parte do mesmo portal.

Implementar:

- header;
- navegação;
- footer;
- identidade UPPA;
- estados desktop/mobile;
- remoção de marcas antigas.

Não alterar ainda a estrutura profunda da home.

### Prompt da Etapa 1

```text
UPPA — ETAPA 1 — PORTAL SHELL E IDENTIDADE GLOBAL

Implemente somente esta etapa.

Objetivo:
criar uma identidade global consistente de portal imobiliário nacional.

Corrija toda referência antiga de:

- PORTAL IMO;
- PORTAL IMO BRASIL;
- PORTALIMObrasil;
- marcas anteriores.

Tudo deve utilizar UPPA.

Crie ou reorganize componentes reutilizáveis para:

- Header;
- Footer;
- PortalShell, se fizer sentido.

Header desktop:

- logo UPPA;
- Comprar;
- Alugar;
- Lançamentos;
- Explorar;
- Anunciar;
- Entrar.

Não invente funcionalidades que ainda não existem.
Quando uma rota ainda não existir, não crie link quebrado.

Footer:

- Comprar;
- Alugar;
- Explorar;
- Conteúdo;
- Anunciantes;
- Institucional.

Mobile:

- header compacto;
- menu funcional;
- navegação clara.

Preserve:

- backend;
- Supabase;
- feeds;
- filtros;
- imóveis;
- páginas existentes.

Não redesenhe /comprar ou /alugar profundamente nesta etapa.

Execute build.

Faça smoke test das principais rotas.

Ao final informe:

- arquivos alterados;
- componentes criados;
- rotas testadas;
- problemas encontrados.

Pare.
```

---

# 62. ETAPA 2 — HOME COMO PORTAL

Objetivo:

A home deixa de parecer uma vitrine de imobiliária e passa a parecer um portal.

### Estrutura alvo

1. Header;
2. hero/banner;
3. busca;
4. atalhos;
5. imóveis em destaque/recentes;
6. banner/publicidade;
7. cidades;
8. tipos;
9. buscas populares;
10. conteúdo editorial;
11. ferramentas;
12. anunciantes;
13. FAQ;
14. footer.

### Prompt da Etapa 2

```text
UPPA — ETAPA 2 — TRANSFORMAR A HOME EM HOME DE PORTAL IMOBILIÁRIO

Implemente somente esta etapa.

Objetivo:
fazer a home parecer um portal imobiliário nacional, e não uma imobiliária com uma lista de imóveis.

Use como referência conceitual a arquitetura de grandes portais como Chaves na Mão, ZAP Imóveis e Viva Real.

NÃO copie:

- código;
- CSS;
- textos;
- imagens;
- logos;
- identidade visual;
- assets.

Apenas use o padrão de produto como referência.

A home deve possuir:

1. Header;
2. Hero visual;
3. busca principal;
4. Comprar / Alugar / Imóvel novo, se a rota existir;
5. atalhos de descoberta;
6. imóveis recentes;
7. bloco de publicidade reservado;
8. cidades;
9. tipos de imóveis;
10. buscas populares;
11. conteúdo editorial;
12. ferramentas/serviços;
13. CTA para anunciantes;
14. FAQ;
15. Footer.

O hero deve ter:

- imagem ou composição visual profissional;
- título;
- subtítulo;
- busca grande;
- localização;
- tipo;
- operação;
- botão de busca.

Não criar estatísticas falsas.

Todos os números devem vir do banco.

Se não houver dados suficientes, o componente deve ocultar-se ou mostrar conteúdo neutro.

A home deve ter densidade de portal:
múltiplos módulos, navegação e descoberta.

Não transformar a home em uma página institucional.

Os imóveis devem continuar aparecendo cedo.

Crie componentes reutilizáveis quando necessário.

Preserve todos os dados e integrações existentes.

Execute build.

Teste desktop e mobile.

Ao final informe arquivos alterados e o que foi implementado.

Pare.
```

---

# 63. ETAPA 3 — SISTEMA DE BANNERS

Objetivo:

Criar infraestrutura para banners sem hardcode.

### Prompt da Etapa 3

```text
UPPA — ETAPA 3 — SISTEMA DE BANNERS E PUBLICIDADE

Implemente somente esta etapa.

Objetivo:
criar infraestrutura de banners administráveis para transformar a UPPA em um portal com mídia própria.

Primeiro audite se já existe alguma estrutura de banners.

Não duplique tabelas ou componentes sem necessidade.

Se não existir, implemente a menor estrutura segura para:

- banner desktop;
- banner mobile;
- posição;
- URL de destino;
- status;
- início;
- fim;
- prioridade;
- anunciante opcional;
- campanha opcional;
- impressões;
- cliques.

Posições iniciais:

- home_hero;
- home_after_featured;
- search_top;
- search_middle;
- property_bottom.

Criar componente:

BannerSlot.

Regras:

- sem banner ativo, o layout não quebra;
- banner expirado não aparece;
- banner inativo não aparece;
- desktop e mobile podem utilizar imagens diferentes;
- usar otimização de imagem;
- não carregar imagens desnecessárias;
- registrar clique;
- registrar impressão de maneira eficiente;
- não bloquear o carregamento principal.

Se o painel administrativo já existir, integrar nele.

Se não existir, criar apenas a estrutura mínima necessária e não construir um CMS completo.

Não implementar AdSense ou outra rede externa ainda.

Não alterar a busca.

Execute build e smoke tests.

Pare.
```

---

# 64. ETAPA 4 — COMPRAR E ALUGAR COMO BUSCA DE PORTAL

Objetivo:

Consolidar a experiência de busca.

### Prompt da Etapa 4

```text
UPPA — ETAPA 4 — BUSCA /COMPRAR E /ALUGAR

Agora trabalhe somente nas páginas:

/comprar
/alugar

Objetivo:
criar experiência de busca comparável à estrutura dos grandes portais imobiliários.

Desktop:

- breadcrumb;
- título;
- contagem real;
- chips;
- sidebar de filtros;
- lista;
- ordenação;
- mapa opcional;
- paginação.

Não assumir cidade ou bairro quando o usuário não informou localização.

Filtros principais:

- localização;
- tipo;
- preço;
- quartos;
- banheiros;
- vagas;
- área.

Mais filtros:

- suíte;
- mobiliado;
- piscina;
- churrasqueira;
- condomínio;
- características existentes no banco.

Cards horizontais:

- imagem;
- finalidade;
- título;
- localização;
- preço;
- características;
- anunciante;
- contato;
- favorito, se já existir.

Em /alugar:

quando o imóvel também estiver à venda, exibir claramente:
"Venda e locação".

O aluguel deve ser o preço principal na página /alugar.

Não criar dados fictícios.

Preserve consultas e filtros existentes que funcionem.

Não implementar novas funcionalidades de favoritos nesta etapa.

Execute build.

Teste:

- /comprar sem localização;
- /alugar sem localização;
- /comprar com cidade;
- /alugar com cidade;
- filtros;
- paginação;
- mobile.

Pare.
```

---

# 65. ETAPA 5 — PÁGINA DO IMÓVEL

Objetivo:

Transformar o detalhe em página de portal, sem parecer página da imobiliária.

### Prompt da Etapa 5

```text
UPPA — ETAPA 5 — PÁGINA INDIVIDUAL DO IMÓVEL

Trabalhe somente na página individual de imóvel.

Objetivo:
criar uma página profissional de anúncio dentro de um portal nacional.

Estrutura:

1. breadcrumb;
2. galeria;
3. finalidade;
4. título;
5. localização;
6. preço;
7. características;
8. CTA;
9. descrição;
10. valores adicionais;
11. localização aproximada;
12. anunciante;
13. contato;
14. imóveis semelhantes.

A UPPA não deve parecer proprietária do imóvel.

Sempre deixar claro quem é o anunciante.

Manter proteção de endereço quando o anunciante não autorizar endereço exato.

Remover qualquer marca antiga.

O CTA deve continuar funcionando mesmo se analytics estiver indisponível.

Não inventar dados.

Preservar URLs existentes quando possível.

Execute build e teste pelo menos 2 imóveis reais.

Pare.
```

---

# 66. ETAPA 6 — CAMADA EDITORIAL

Objetivo:

Introduzir conteúdo que torne a UPPA um portal de informação, e não somente classificados.

### Prompt da Etapa 6

```text
UPPA — ETAPA 6 — CAMADA EDITORIAL E CONTEÚDO

Implemente somente a camada editorial.

Crie componentes reutilizáveis para:

- EditorialCard;
- ArticleGrid;
- GuideCard;
- PopularSearches;
- CityGuideCard;
- ContentSection.

A home deve conseguir exibir:

- Comprar imóvel;
- Alugar imóvel;
- Financiamento;
- Documentação;
- Mercado imobiliário;
- Decoração;
- Reforma;
- Cidades;
- Bairros.

Não é necessário criar um CMS completo.

Primeiro implemente estrutura de componentes e dados reais/placeholder controlado.

Não apresentar conteúdo falso como se fosse real.

Se ainda não houver artigos reais no banco, usar uma estrutura que permita ocultar o módulo.

Criar rotas somente quando fizer sentido para o projeto atual.

SEO deve ser considerado.

Não alterar feeds.

Não alterar banco de imóveis sem necessidade.

Execute build.

Pare.
```

---

# 67. ETAPA 7 — CIDADES E BAIRROS

Objetivo:

Transformar localização em estrutura de descoberta e SEO.

### Prompt da Etapa 7

```text
UPPA — ETAPA 7 — CIDADES E BAIRROS

Implemente somente a camada de localização e descoberta.

Criar ou consolidar páginas para:

- cidade;
- bairro;
- imóveis por cidade;
- comprar por cidade;
- alugar por cidade;
- tipos de imóveis por cidade.

Nunca criar páginas vazias em massa.

Regra:

Só gerar páginas indexáveis quando existir:

- estoque suficiente;
OU
- conteúdo editorial real.

A página de cidade deve conter:

- título;
- busca;
- estoque;
- comprar;
- alugar;
- tipos;
- bairros;
- conteúdo;
- links internos.

A página de bairro deve conter:

- localização;
- estoque;
- tipos;
- comprar;
- alugar;
- bairros próximos quando houver dados;
- conteúdo real.

Não inventar preços médios.

Não inventar dados de população, segurança, mobilidade ou infraestrutura.

Execute build.

Teste cidades existentes no banco.

Pare.
```

---

# 68. ETAPA 8 — FERRAMENTAS DO PORTAL

Objetivo:

Criar diferenciais além do estoque.

Prioridade:

1. financiamento;
2. custos de compra;
3. poder de compra;
4. aluguel;
5. avaliação.

### Prompt da Etapa 8

```text
UPPA — ETAPA 8 — FERRAMENTAS IMOBILIÁRIAS

Implemente somente a primeira versão das ferramentas úteis do portal.

Prioridade:

1. simulador simples de financiamento;
2. calculadora de custos de compra;
3. calculadora de capacidade de compra.

As ferramentas devem:

- funcionar no navegador;
- explicar que são estimativas;
- não prometer aprovação de crédito;
- permitir alterar premissas;
- apresentar resultado de forma clara;
- possuir links para buscar imóveis compatíveis.

Não integrar bancos neste momento.

Não coletar dados pessoais desnecessários.

Não implementar uma plataforma financeira completa.

Criar componentes reutilizáveis.

Preparar SEO para páginas de ferramentas.

Execute build.

Pare.
```

---

# 69. ETAPA 9 — ÁREA DE ANUNCIANTES

Objetivo:

Transformar o portal em canal de aquisição de inventário.

### Prompt da Etapa 9

```text
UPPA — ETAPA 9 — EXPERIÊNCIA PARA IMOBILIÁRIAS E ANUNCIANTES

Melhore somente a experiência de quem anuncia.

A mensagem central:

"Publique sua carteira na UPPA."

Mostrar:

- integração XML/feed;
- publicação automática;
- atualização automática;
- leads;
- WhatsApp;
- painel;
- analytics;
- cadastro.

Criar página pública para anunciantes.

Não alterar o funcionamento dos feeds sem necessidade.

Não inventar métricas.

Se houver números, buscar do banco.

Diferenciar:

- imobiliária;
- corretor;
- proprietário;
- parceiro.

Preparar estrutura para futuramente criar planos e anúncios patrocinados.

Execute build.

Pare.
```

---

# 70. ETAPA 10 — FAVORITOS, ALERTAS E PERSONALIZAÇÃO

Esta etapa é posterior ao portal público estar estável.

Possibilidades:

- favoritos;
- histórico;
- alertas de novos imóveis;
- busca salva;
- comparação;
- notificações.

### Prompt da Etapa 10

```text
UPPA — ETAPA 10 — FAVORITOS E ALERTAS

Somente execute se o portal público, busca e páginas de imóveis estiverem estáveis.

Implemente:

- favoritos;
- busca salva;
- alerta de novos imóveis.

Usuário não autenticado:

- permitir experiência local quando seguro;
- solicitar login somente quando necessário.

Usuário autenticado:

- salvar no Supabase.

Não bloquear a navegação pública.

Não coletar dados além do necessário.

Criar mecanismos de opt-in para notificações.

Execute build e testes.

Pare.
```

---

# 71. ETAPA 11 — MONETIZAÇÃO

Somente depois que existir tráfego e inventário suficientes.

Possibilidades:

- imóveis patrocinados;
- banners;
- anunciantes em destaque;
- lançamentos patrocinados;
- mídia direta;
- planos premium.

### Prompt da Etapa 11

```text
UPPA — ETAPA 11 — MONETIZAÇÃO DO PORTAL

Não implemente cobrança financeira nesta etapa.

Crie somente a infraestrutura visual e de dados para:

- imóvel patrocinado;
- anunciante em destaque;
- banner patrocinado;
- empreendimento patrocinado.

Todo conteúdo patrocinado deve ser claramente identificado.

Não alterar os dados reais do imóvel.

Criar:

- status;
- período;
- prioridade;
- anunciante;
- campanha;
- tracking.

Não permitir que publicidade destrua a relevância da busca.

Execute build.

Pare.
```

---

# 72. ETAPA 12 — SEO, PERFORMANCE E LANÇAMENTO

Objetivo:

Preparar o portal para escala nacional.

### Prompt da Etapa 12

```text
UPPA — ETAPA 12 — SEO, PERFORMANCE E QA FINAL

Faça uma auditoria completa do portal público.

Verifique:

- title;
- meta description;
- canonical;
- sitemap;
- robots;
- Open Graph;
- schema.org;
- breadcrumbs;
- páginas de cidade;
- páginas de bairro;
- páginas de tipo;
- páginas de imóvel;
- links internos;
- imagens;
- alt;
- Core Web Vitals;
- lazy loading;
- queries;
- paginação;
- cache;
- erros 404;
- redirects;
- dados estruturados.

Não criar milhares de páginas automaticamente.

Não indexar filtros inúteis.

Não indexar combinações sem valor.

Verificar performance mobile.

Executar build.

Fazer smoke test das rotas principais.

Entregar relatório final.

Não iniciar nova funcionalidade.

Pare.
```

---

# 73. ORDEM OFICIAL DE EXECUÇÃO

A ordem recomendada passa a ser:

### BLOCO A — IDENTIDADE
1. Etapa 0 — Auditoria
2. Etapa 1 — Portal Shell

### BLOCO B — HOME
3. Etapa 2 — Home Portal
4. Etapa 3 — Banners

### BLOCO C — INVENTÁRIO
5. Etapa 4 — Comprar/Alugar
6. Etapa 5 — Página do imóvel

### BLOCO D — PORTAL
7. Etapa 6 — Editorial
8. Etapa 7 — Cidades/Bairros

### BLOCO E — UTILIDADE
9. Etapa 8 — Ferramentas
10. Etapa 9 — Anunciantes

### BLOCO F — RETENÇÃO
11. Etapa 10 — Favoritos/Alertas

### BLOCO G — RECEITA
12. Etapa 11 — Monetização

### BLOCO H — ESCALA
13. Etapa 12 — SEO/Performance/QA

---

# 74. O QUE NÃO FAZER AGORA

Não começar simultaneamente:

- aplicativo;
- IA;
- CRM completo;
- marketplace financeiro;
- rede social;
- chat interno;
- sistema de pagamentos;
- dezenas de integrações;
- programa de fidelidade;
- comparação complexa;
- automações avançadas de marketing.

O objetivo atual é fazer a UPPA parecer e funcionar como um portal.

---

# 75. CRITÉRIO DE CONCLUSÃO DA NOVA FASE

A UPPA estará pronta para a próxima fase quando um visitante entrar na home e perceber imediatamente:

"Este é um portal imobiliário nacional."

Ele deve conseguir:

1. pesquisar;
2. comprar;
3. alugar;
4. explorar cidades;
5. explorar tipos;
6. ler conteúdo útil;
7. abrir anúncios;
8. falar com anunciantes;
9. encontrar ferramentas;
10. entender que a UPPA conecta usuários a anunciantes.

A percepção desejada é:

"UPPA é onde eu pesquiso imóveis."

e não:

"UPPA é uma imobiliária que tem alguns imóveis."

---

# 76. REGRA FINAL PARA O ANTIGRAVITY

Nunca executar o roadmap inteiro em uma única solicitação.

Cada etapa deve ser um prompt separado.

Após cada etapa:

- build;
- smoke test;
- revisão visual;
- revisão funcional;
- revisão de dados.

Somente então executar a próxima.

A IA deve preservar o que já funciona.

A prioridade é evolução incremental, não reescrita do projeto.

---

# 77. PRINCÍPIO DE DESIGN DO PORTAL

A UPPA deve equilibrar quatro elementos:

BUSCA
+
INVENTÁRIO
+
CONTEÚDO
+
PUBLICIDADE

Nenhum deles deve dominar completamente a experiência.

A busca permite encontrar.

O inventário entrega valor imediato.

O conteúdo gera autoridade e SEO.

A publicidade cria receita.

A combinação desses quatro elementos é o que diferencia um portal de uma imobiliária.
