# PORTAL IMOBILIÁRIO NACIONAL
## Documento Mestre de Produto e Arquitetura — v1

Status: Planejamento inicial  
Arquitetura: preparada para escala nacional  
Estratégia: marketplace imobiliário + integração com CRMs + geração de leads  
Frontend: Next.js + TypeScript  
Backend/Banco: Supabase + PostgreSQL + PostGIS

---

# 1. VISÃO DO PRODUTO

O produto será um portal imobiliário nacional destinado a:

- compradores;
- locatários;
- proprietários;
- corretores;
- imobiliárias;
- incorporadoras.

A plataforma deverá permitir que imóveis sejam publicados de quatro maneiras:

1. cadastro manual;
2. integração XML/VRSync;
3. API;
4. futuramente integração direta com CRMs parceiros.

O objetivo inicial NÃO é substituir ZAP, OLX ou Viva Real.

O objetivo inicial é tornar-se mais um canal de distribuição gratuito e extremamente fácil para imobiliárias.

A vantagem competitiva deverá surgir de:

- experiência de busca;
- mapa;
- qualidade dos anúncios;
- estoque atualizado;
- SEO;
- histórico de preço;
- dados de mercado;
- integração com CRMs;
- ferramentas profissionais;
- financiamento;
- IA;
- marketplace de serviços.

---

# 2. PRINCÍPIO CENTRAL DO PRODUTO

O principal loop do sistema é:

Imobiliária  
→ fornece imóveis  
→ portal ganha inventário  
→ inventário gera páginas  
→ páginas atraem compradores  
→ compradores geram leads  
→ leads geram valor para imobiliárias  
→ mais imobiliárias entram  
→ mais imóveis entram.

Toda funcionalidade deve fortalecer esse ciclo.

---

# 3. REGRA DE ESCOPO DO MVP

O MVP deverá fazer muito bem:

1. receber imóveis;
2. atualizar imóveis;
3. pesquisar imóveis;
4. exibir imóveis;
5. mostrar imóveis no mapa;
6. gerar leads;
7. medir leads;
8. permitir favoritos;
9. permitir buscas salvas;
10. indexar corretamente no Google.

Não desenvolver no MVP:

- CRM completo;
- chat interno;
- aplicativo mobile nativo;
- avaliação imobiliária por IA;
- sistema MLS completo;
- marketplace de serviços;
- simulação bancária completa;
- recomendação por IA;
- gestão financeira de imobiliária;
- automação de WhatsApp;
- sistema complexo de comissão.

Esses recursos serão fases posteriores.

---

# 4. STACK OFICIAL

## Frontend

Next.js  
TypeScript  
App Router  
Tailwind CSS  
shadcn/ui  
Lucide Icons

## Backend

Supabase

Utilizar:

- PostgreSQL;
- Supabase Auth;
- Supabase Storage;
- Row Level Security;
- Edge Functions quando necessário;
- PostGIS.

## Mapas

Criar uma abstração própria.

Nunca utilizar diretamente funções do fornecedor em toda a aplicação.

Interface:

```ts
interface MapProvider {
  geocode(address: string): Promise<Coordinates>
  reverseGeocode(lat: number, lng: number): Promise<Address>
  autocomplete(query: string): Promise<LocationSuggestion[]>
}
```

Implementação inicial:

```ts
MapboxProvider
```

Possíveis futuras:

```ts
GoogleMapsProvider
HereProvider
```

---

# 5. PRINCÍPIOS TÉCNICOS

## Regra 1

Nenhuma página deve acessar diretamente `service_role`.

Service role somente no backend.

## Regra 2

Todas as tabelas públicas devem possuir RLS.

## Regra 3

Alterações de banco somente por migrations.

Nunca alterar a estrutura manualmente em produção sem migration correspondente.

## Regra 4

Não criar tabela nova se uma tabela existente resolver corretamente o problema.

## Regra 5

Não duplicar entidades.

Exemplo proibido:

```text
cities
property_cities
cities_list
city_data
```

Deverá existir apenas uma fonte canônica.

## Regra 6

Nunca identificar um imóvel apenas pelo ID fornecido pelo CRM.

Chave externa:

```text
agency_id + source + external_id
```

## Regra 7

Toda importação deve ser idempotente.

Rodar o mesmo feed duas vezes NÃO pode criar imóveis duplicados.

---

# 6. ESTRUTURA DE USUÁRIOS

Tipos principais:

```text
consumer
broker
agency_member
agency_admin
platform_admin
```

## Consumer

Pode:

- pesquisar;
- favoritar;
- salvar buscas;
- criar alertas;
- enviar leads.

## Broker

Pode:

- possuir perfil;
- receber leads;
- estar vinculado a imobiliária;
- futuramente publicar imóveis individualmente.

## Agency Member

Pode:

- visualizar imóveis;
- visualizar leads;
- editar dependendo da permissão.

## Agency Admin

Pode:

- gerenciar imobiliária;
- gerenciar membros;
- cadastrar imóveis;
- configurar integração;
- visualizar leads;
- visualizar analytics.

## Platform Admin

Acesso administrativo geral.

Nunca identificar administrador através de e-mail hardcoded.

Utilizar RBAC.

---

# 7. ESTRUTURA DE LOCALIZAÇÃO

A estrutura deverá ser hierárquica.

```text
Brasil
└── Estado
    └── Cidade
        └── Bairro
```

Tabelas:

```text
states
cities
neighborhoods
```

## states

```text
id
name
code
ibge_code
slug
```

Exemplo:

```text
Rio Grande do Sul
RS
43
rio-grande-do-sul
```

## cities

```text
id
state_id
name
ibge_code
slug
latitude
longitude
```

## neighborhoods

```text
id
city_id
name
slug
latitude
longitude
```

Não presumir que nomes são únicos nacionalmente.

A chave deve ser o ID.

---

# 8. ENTIDADES PRINCIPAIS DO BANCO

```text
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

plans
subscriptions
property_boosts

verifications

audit_logs
```

---

# 9. ENUMS

Criar enums no PostgreSQL.

## transaction_type

```text
sale
rent
sale_or_rent
```

## property_status

```text
draft
pending
active
inactive
sold
rented
blocked
archived
```

## property_type

Começar com:

```text
apartment
house
townhouse
land
farm
commercial
office
warehouse
studio
loft
kitnet
penthouse
condo_house
rural
other
```

## listing_source

```text
manual
vrsync
api
csv
partner
```

## lead_source

```text
whatsapp
form
phone
email
financing
```

---

# 10. TABELA PROPERTIES

Estrutura conceitual:

```sql
properties

id uuid primary key

agency_id uuid
broker_id uuid

external_id text
source listing_source

slug text

title text
description text

transaction_type transaction_type
property_type property_type
status property_status

price numeric
rent_price numeric
condominium_fee numeric
iptu numeric

bedrooms integer
suites integer
bathrooms integer
parking_spaces integer

usable_area numeric
total_area numeric
lot_area numeric

year_built integer

financiable boolean
accepts_exchange boolean
accepts_vehicle boolean
furnished boolean
pet_friendly boolean

address_visible boolean

street text
number text
complement text
zipcode text

state_id uuid
city_id uuid
neighborhood_id uuid

latitude numeric
longitude numeric

location geography(Point, 4326)

published_at timestamptz
source_updated_at timestamptz

created_at timestamptz
updated_at timestamptz
```

---

# 11. REGRAS DA TABELA PROPERTIES

Criar constraint única:

```sql
unique (
  agency_id,
  source,
  external_id
)
```

Para anúncios manuais poderá ser criado `external_id` internamente.

Exemplo:

```text
manual_01JXYZ...
```

---

# 12. LOCALIZAÇÃO GEOGRÁFICA

Guardar:

```text
latitude
longitude
```

para conveniência.

Mas consultas geográficas deverão utilizar:

```text
location geography(Point, 4326)
```

Criar índice espacial:

```sql
CREATE INDEX properties_location_idx
ON properties
USING GIST(location);
```

Isso permitirá futuramente:

- raio;
- mapa;
- imóveis dentro de polígono;
- desenhar área;
- proximidade;
- busca por viewport.

---

# 13. ÍNDICES IMPORTANTES

Criar índices para:

```text
status
city_id
neighborhood_id
property_type
transaction_type
price
bedrooms
agency_id
published_at
```

Índices compostos importantes:

```sql
(status, city_id)
```

```sql
(status, city_id, transaction_type)
```

```sql
(status, city_id, property_type)
```

```sql
(status, city_id, price)
```

Não criar dezenas de índices antecipadamente.

Monitorar queries reais.

---

# 14. PROPERTY_MEDIA

```text
id
property_id

type
url
thumbnail_url

width
height

position

is_cover

source_url

created_at
```

Tipos:

```text
image
video
virtual_tour
floor_plan
```

Nunca salvar 30 URLs dentro de um JSON na tabela `properties`.

Fotos são uma entidade própria.

---

# 15. PROPERTY_FEATURES

Criar catálogo:

```text
features
```

Exemplo:

```text
pool
fireplace
barbecue
solar_energy
elevator
balcony
garden
gated_community
gym
party_room
air_conditioning
```

Relacionamento:

```text
property_features
```

Campos:

```text
property_id
feature_id
```

Evitar criar 100 campos booleanos em `properties`.

Campos de alta importância e alto uso nos filtros podem continuar como colunas.

Exemplo:

```text
financiable
furnished
accepts_exchange
```

---

# 16. HISTÓRICO DE PREÇO

Tabela:

```text
property_price_history
```

Campos:

```text
id
property_id
price
recorded_at
source
```

Somente inserir quando o preço mudar.

Exemplo:

```text
01/08/2026 R$ 750.000
15/09/2026 R$ 719.000
```

Permitir no futuro mostrar:

```text
Preço caiu R$31.000
```

---

# 17. IMOBILIÁRIAS

Tabela:

```text
agencies
```

Campos principais:

```text
id
name
slug
legal_name
document
creci
phone
whatsapp
email
website
logo_url
description

verified_at

status

created_at
updated_at
```

Não mostrar CNPJ necessariamente ao público.

---

# 18. MEMBROS DAS IMOBILIÁRIAS

```text
agency_members
```

Campos:

```text
id
agency_id
user_id
role
status
created_at
```

Roles:

```text
owner
admin
manager
broker
viewer
```

Uma pessoa poderá futuramente pertencer a mais de uma empresa.

---

# 19. LEADS

Tabela:

```text
leads
```

Campos:

```text
id

property_id
agency_id
broker_id

consumer_user_id

name
email
phone

source
message

utm_source
utm_medium
utm_campaign
utm_content

session_id

created_at
```

O clique em WhatsApp deve criar evento antes do redirecionamento.

---

# 20. LEAD EVENTS

Tabela:

```text
lead_events
```

Exemplos:

```text
created
viewed
contacted
qualified
visit_scheduled
lost
converted
```

Campos:

```text
id
lead_id
event
metadata
created_at
```

Isso permitirá futuramente construir CRM.

---

# 21. FAVORITOS

```text
favorites
```

```text
user_id
property_id
created_at
```

Unique:

```text
user_id + property_id
```

---

# 22. BUSCAS SALVAS

Tabela:

```text
saved_searches
```

Guardar filtros em JSON estruturado.

Exemplo:

```json
{
  "transaction_type": "sale",
  "city_id": "...",
  "property_type": ["house"],
  "price_max": 700000,
  "bedrooms_min": 3,
  "financiable": true
}
```

Campos adicionais:

```text
notify_email
notify_push
notify_whatsapp

last_notification_at
```

---

# 23. FEEDS

Tabela:

```text
feeds
```

Campos:

```text
id
agency_id

type
url

username_encrypted
password_encrypted

status

sync_interval_minutes

last_sync_at
next_sync_at

created_at
updated_at
```

Tipos:

```text
vrsync
custom_xml
api
```

Nunca guardar credenciais em texto puro.

---

# 24. FEED_RUNS

```text
feed_runs
```

Campos:

```text
id
feed_id

started_at
finished_at

status

items_found
items_created
items_updated
items_deactivated
items_failed

error_message
```

Dashboard deve mostrar:

```text
Última sincronização:
17/09/2026 18:31

Encontrados: 742
Novos: 12
Atualizados: 185
Desativados: 4
Erros: 2
```

---

# 25. FEED_ERRORS

```text
feed_errors
```

Campos:

```text
id
feed_run_id
external_id
error_type
message
payload
created_at
```

Importação NÃO deve parar completamente porque um imóvel possui erro.

Continuar processando os demais.

---

# 26. PIPELINE DE IMPORTAÇÃO

Fluxo oficial:

```text
1. baixar feed

2. validar XML

3. detectar formato

4. parser

5. normalizar

6. validar imóvel

7. localizar cidade/bairro

8. geocodificar se necessário

9. localizar imóvel existente

10. criar ou atualizar

11. sincronizar mídias

12. atualizar características

13. registrar histórico de preço

14. registrar source_updated_at

15. marcar itens presentes

16. identificar imóveis ausentes

17. desativar ausentes conforme regra

18. finalizar feed_run
```

---

# 27. NORMALIZAÇÃO

Nunca deixar o parser escrever diretamente no banco.

Criar tipo intermediário:

```ts
interface NormalizedProperty {
  externalId: string
  title: string
  description?: string

  transactionType: TransactionType
  propertyType: PropertyType

  price?: number

  bedrooms?: number
  bathrooms?: number
  suites?: number
  parkingSpaces?: number

  usableArea?: number
  totalArea?: number
  lotArea?: number

  address: NormalizedAddress

  images: NormalizedMedia[]

  features: string[]

  sourceUpdatedAt?: Date
}
```

Depois:

```text
VRSyncParser
    ↓
NormalizedProperty
    ↓
PropertyImporter
```

Isso permitirá adicionar outros formatos sem alterar a lógica principal.

---

# 28. IDEMPOTÊNCIA

Nunca:

```text
INSERT novo imóvel
```

sem verificar identidade.

Utilizar:

```text
agency_id
+
source
+
external_id
```

Se existir:

```text
UPDATE
```

Se não existir:

```text
INSERT
```

---

# 29. DESATIVAÇÃO DE IMÓVEIS

Não excluir imediatamente imóvel que desapareceu do feed.

Estratégia inicial:

Primeira ausência:

```text
missing_from_feed_at = now()
```

Ausência confirmada em sincronização seguinte:

```text
status = inactive
```

Manter imóvel no banco para:

- histórico;
- analytics;
- redirects;
- SEO;
- leads;
- auditoria.

Nunca apagar massivamente anúncios antigos automaticamente.

---

# 30. DUPLICIDADE

No futuro o mesmo imóvel poderá estar em:

```text
Imobiliária A
Imobiliária B
Corretor C
```

No MVP NÃO tentar resolver deduplicação global automaticamente.

Somente garantir duplicação dentro da mesma fonte.

Fase futura:

```text
property_entities
listings
```

onde diferentes anúncios podem representar o mesmo imóvel físico.

---

# 31. RLS

Princípio:

Visitante:

```text
SELECT somente properties active
```

Imobiliária:

```text
SELECT seus imóveis
INSERT seus imóveis
UPDATE seus imóveis
```

Usuário comum:

```text
SELECT seus favoritos
INSERT seus favoritos
DELETE seus favoritos
```

Nunca permitir:

```text
authenticated users UPDATE properties
```

sem verificar vínculo com imobiliária.

---

# 32. FUNÇÃO DE AUTORIZAÇÃO

Criar função segura:

```sql
is_agency_member(agency_uuid uuid)
```

Ela deverá verificar:

```text
auth.uid()
```

contra:

```text
agency_members.user_id
```

Utilizar essa função nas policies.

Evitar repetir queries gigantes em todas as policies.

---

# 33. SERVICE ROLE

Permitida somente em:

```text
jobs
workers
feed importer
admin backend
webhooks seguros
```

Proibido:

```text
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```

Nunca deve existir.

---

# 34. ESTRUTURA DE PASTAS

```text
src/

app/

  (public)/
    page.tsx

    comprar/
    alugar/

    imovel/
      [slug]/

    imobiliaria/
      [slug]/

    corretor/
      [slug]/

  (auth)/
    entrar/
    cadastrar/
    recuperar-senha/

  (dashboard)/
    painel/

      page.tsx

      imoveis/
      leads/
      integracoes/
      equipe/
      estatisticas/
      configuracoes/

  api/

    properties/
    leads/
    feeds/
    webhooks/
    internal/

components/

  ui/

  property/
    PropertyCard.tsx
    PropertyGallery.tsx
    PropertyPrice.tsx
    PropertyFeatures.tsx
    PropertyLocation.tsx

  search/
    SearchBar.tsx
    SearchFilters.tsx
    SearchResults.tsx
    SearchMap.tsx

  map/

  agency/

  leads/

features/

  auth/
  properties/
  search/
  feeds/
  leads/
  favorites/
  agencies/

lib/

  supabase/
    client.ts
    server.ts
    admin.ts

  maps/

  seo/

  validations/

  permissions/

types/

supabase/

  migrations/
  tests/

docs/

  architecture/
```

---

# 35. REGRA SERVER VS CLIENT

Por padrão:

```text
Server Component
```

Utilizar `"use client"` somente quando houver:

- interação;
- estado local;
- mapa;
- eventos;
- browser APIs.

Exemplo:

Página imóvel:

```text
Server
```

Galeria interativa:

```text
Client
```

Favoritar:

```text
Client
```

Dados principais do imóvel:

```text
Server
```

---

# 36. ROTAS PÚBLICAS

Home:

```text
/
```

Comprar:

```text
/comprar
```

Estado:

```text
/comprar/rs
```

Cidade:

```text
/comprar/rs/pelotas
```

Tipo:

```text
/comprar/rs/pelotas/apartamento
```

Bairro:

```text
/comprar/rs/pelotas/centro
```

Imóvel:

```text
/imovel/[slug]
```

Imobiliária:

```text
/imobiliaria/[slug]
```

---

# 37. SLUG DE IMÓVEL

Formato:

```text
apartamento-3-quartos-centro-pelotas-rs-01JABCXYZ
```

Não depender apenas do texto.

Final deve conter identificador estável.

Se título mudar:

URL antiga deverá redirecionar para nova quando possível.

---

# 38. PESQUISA

Filtros MVP:

```text
comprar / alugar

estado
cidade
bairro

tipo do imóvel

preço mínimo
preço máximo

quartos
banheiros
vagas

área mínima
área máxima

financiável
mobiliado
aceita permuta
```

---

# 39. MAPA

Mapa deve trabalhar com viewport.

Não retornar 80 mil imóveis de São Paulo de uma vez.

Frontend envia:

```text
north
south
east
west
zoom
```

Backend retorna apenas registros relevantes.

Quando muito afastado:

```text
clusters
```

Quando aproximar:

```text
properties
```

---

# 40. DRAW SEARCH

Fase 1.5.

Usuário desenha polígono.

Backend executa query PostGIS:

```text
imóveis dentro do polígono
```

A geometria nunca deverá ser filtrada apenas no frontend.

---

# 41. PROPERTY CARD

Informações:

```text
foto

preço

tipo

bairro
cidade

quartos
banheiros
vagas

área

imobiliária

favorito
```

Badges possíveis:

```text
Financiável
Novo
Preço reduzido
Verificado
Atualizado hoje
```

Não mostrar 15 badges.

Máximo visual recomendado:

```text
3
```

---

# 42. PÁGINA DO IMÓVEL

Ordem:

```text
Galeria

Preço

Título

Endereço aproximado

Informações principais

CTA WhatsApp

Descrição

Características

Valores

Histórico de preço

Localização

Imobiliária

Imóveis semelhantes
```

---

# 43. CTA

Desktop:

CTA lateral sticky.

Mobile:

barra inferior fixa:

```text
WhatsApp
Telefone
```

Antes de abrir WhatsApp:

registrar evento.

---

# 44. ENDEREÇO E PRIVACIDADE

Permitir:

```text
address_visible = false
```

Nesse caso mostrar:

```text
Centro
Pelotas - RS
```

Mapa deve usar localização aproximada.

Não expor número residencial sem autorização do anunciante.

---

# 45. SEO

Páginas indexáveis:

```text
imóvel individual
cidade
bairro
tipo + cidade
tipo + bairro
imobiliária
```

Não indexar automaticamente toda combinação possível de filtros.

---

# 46. FILTROS E SEO

Exemplo permitido:

```text
/comprar/rs/pelotas/apartamento
```

Exemplo que deverá permanecer busca:

```text
/comprar/rs/pelotas?
quartos=3
&banheiros=2
&min=420000
&max=575000
&garagem=2
&mobiliado=true
```

Aplicar:

```text
noindex, follow
```

quando necessário.

Canonical apontará para página principal apropriada.

---

# 47. SITEMAPS

Separar:

```text
/sitemap.xml
```

Index:

```text
/sitemaps/properties/0.xml
/sitemaps/properties/1.xml

/sitemaps/cities.xml
/sitemaps/neighborhoods.xml
/sitemaps/agencies.xml
```

Não colocar URLs de filtro infinito.

---

# 48. METADATA

Cada imóvel:

```text
title
description
canonical
openGraph
```

Exemplo:

```text
Casa com 3 quartos no Laranjal, Pelotas - R$ 719.000
```

Não gerar títulos genéricos:

```text
Imóvel 3818 | Portal
```

---

# 49. STRUCTURED DATA

Adicionar dados estruturados somente quando semanticamente corretos.

Não inventar:

- avaliações;
- reviews;
- notas;
- disponibilidade;
- preço anterior.

Dados estruturados devem refletir conteúdo real da página.

---

# 50. ROBOTS

Bloquear áreas internas:

```text
/painel/
/api/
/admin/
```

Avaliar bloqueio de combinações problemáticas de parâmetros.

---

# 51. HOME

Estrutura inicial:

```text
HEADER

LOGO

Comprar
Alugar
Anunciar imóvel
Entrar

HERO

Onde você quer morar?

[Cidade, bairro ou condomínio]

[Comprar] [Alugar]

BUSCAS POPULARES

CIDADES

IMÓVEIS EM DESTAQUE

COMO FUNCIONA

PARA IMOBILIÁRIAS

FOOTER
```

---

# 52. BUSCA PRINCIPAL

Campo deve sugerir:

```text
Cidade
Bairro
Condomínio futuramente
```

Exemplo:

Usuário digita:

```text
Laranjal
```

Retorno:

```text
Laranjal
Pelotas - RS

Laranjal
Porto Alegre - RS
```

Nunca assumir localidade apenas por nome.

---

# 53. DASHBOARD DA IMOBILIÁRIA

Menu:

```text
Visão geral

Imóveis

Leads

Integrações

Equipe

Estatísticas

Plano

Configurações
```

---

# 54. DASHBOARD — VISÃO GERAL

Cards:

```text
Imóveis ativos
Visualizações
Leads
Cliques WhatsApp
```

Gráfico:

```text
Leads últimos 30 dias
```

Feed:

```text
Última sincronização
```

---

# 55. CADASTRO MANUAL DE IMÓVEL

Dividir por etapas.

## Etapa 1

```text
Finalidade
Tipo
Preço
```

## Etapa 2

```text
Quartos
Suítes
Banheiros
Vagas
Áreas
```

## Etapa 3

```text
Localização
```

## Etapa 4

```text
Características
```

## Etapa 5

```text
Fotos
```

## Etapa 6

```text
Título
Descrição
```

## Etapa 7

```text
Revisão
Publicar
```

Autosave.

---

# 56. CADASTRO DA IMOBILIÁRIA

Fluxo:

```text
Criar conta

↓ 

Nome da imobiliária

↓ 

CRECI

↓ 

Cidade principal

↓ 

WhatsApp

↓ 

Logo

↓ 

Adicionar imóveis
```

Depois oferecer:

```text
Cadastro manual
OU
Importar meu XML
```

---

# 57. INTEGRAÇÃO XML

Tela:

```text
Integrações

Adicionar integração

Tipo:
VRSync

URL:
____________________

Usuário:
opcional

Senha:
opcional

[Testar conexão]
```

Depois:

```text
742 imóveis encontrados.

Deseja importar?

[Importar]
```

---

# 58. TESTE DO FEED

Antes de salvar:

validar:

```text
HTTP
XML
estrutura
listing count
campos mínimos
URLs de fotos
```

Mostrar erros amigáveis.

Exemplo:

```text
Encontramos o feed, mas 27 imóveis estão sem preço.
Eles poderão ser importados como rascunho.
```

---

# 59. MONITORAMENTO

Registrar:

```text
erro de API

feed inacessível

timeout

erro XML

erro geocoding

imagem quebrada

property import error
```

Integrar Sentry.

---

# 60. AUDITORIA

Tabela:

```text
audit_logs
```

Registrar ações sensíveis:

```text
property.deleted
property.blocked
agency.suspended
feed.changed
member.removed
role.changed
```

Campos:

```text
actor_user_id
action
entity_type
entity_id
before
after
created_at
```

---

# 61. ADMIN

Criar painel separado:

```text
/admin
```

Funções:

```text
imobiliárias

usuários

imóveis denunciados

feeds com erro

leads agregados

moderação

verificações

planos

estatísticas
```

Admin NÃO deve compartilhar automaticamente componentes do dashboard da imobiliária se isso gerar confusão de permissões.

---

# 62. MODERAÇÃO

Criar status:

```text
blocked
```

Motivos:

```text
fraud
duplicate
invalid_price
prohibited_content
expired
copyright
other
```

---

# 63. VERIFICAÇÃO

Fase futura próxima.

Imobiliária:

```text
CRECI verificado
```

Corretor:

```text
CRECI verificado
```

Imóvel:

```text
informações confirmadas
```

Nunca usar "verificado" apenas porque alguém criou conta.

---

# 64. ATUALIZAÇÃO DO ESTOQUE

Mostrar:

```text
Atualizado hoje

Atualizado há 5 dias

Última confirmação há 45 dias
```

Ranking poderá penalizar imóveis desatualizados.

---

# 65. RANKING DE BUSCA

Não implementar algoritmo complexo no MVP.

Inicial:

```text
relevância geográfica

+

status active

+

qualidade do anúncio

+

recência

+

destaque
```

Posteriormente:

```text
taxa de resposta

CTR

conversão

completude

verificação

qualidade de mídia
```

---

# 66. BUSCA POR TEXTO

Pesquisa:

```text
"casa laranjal 3 quartos"
```

Deverá conseguir transformar parte disso em:

```text
property_type = house
location = Laranjal
bedrooms >= 3
```

No MVP pode começar com:

Postgres Full Text Search + regras.

IA somente depois.

---

# 67. ANALYTICS DE IMÓVEL

Registrar:

```text
property_view

gallery_open

favorite

phone_click

whatsapp_click

lead_form

share
```

Não criar uma linha de banco para toda movimentação do mouse.

Eventos importantes apenas.

---

# 68. ANALYTICS DE IMOBILIÁRIA

Dashboard:

```text
Impressões

Visualizações

Favoritos

Leads

WhatsApp

Taxa de conversão
```

Por:

```text
7 dias
30 dias
90 dias
```

---

# 69. PERFORMANCE

Cards deverão usar:

```text
imagem otimizada
lazy loading
```

Nunca baixar todas as imagens do imóvel na página de resultados.

Resultado de busca deve trazer somente campos necessários.

Evitar:

```sql
SELECT *
```

em endpoints críticos.

---

# 70. PAGINAÇÃO

Não utilizar:

```text
OFFSET 500000
```

em escala grande.

Preparar para cursor pagination.

Exemplo:

```text
price
id
```

ou:

```text
ranking_score
id
```

---

# 71. CACHE

Páginas públicas poderão ser cacheadas.

Imóvel não precisa consultar banco a cada acesso se não mudou.

Utilizar estratégias de revalidation do Next.

Invalidar cache quando:

```text
property updated
property deactivated
price changed
```

---

# 72. AMBIENTES

Ter:

```text
development
staging
production
```

Nunca testar migrations diretamente em produção.

---

# 73. ENV VARIABLES

Exemplo:

```text
NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

SUPABASE_SERVICE_ROLE_KEY

MAP_PROVIDER

MAPBOX_ACCESS_TOKEN

RESEND_API_KEY

SENTRY_DSN
```

Service role somente servidor.

---

# 74. NOMENCLATURA

Código:

```text
English
```

Interface do usuário:

```text
Português brasileiro
```

Exemplo:

Código:

```ts
property.bedrooms
```

Não:

```ts
property.quartos
```

Interface:

```text
3 quartos
```

---

# 75. CONVENÇÕES

Components:

```text
PascalCase
```

Functions:

```text
camelCase
```

Banco:

```text
snake_case
```

URLs:

```text
kebab-case
```

---

# 76. VALIDAÇÃO

Frontend nunca é fonte de segurança.

Validar também no backend:

```text
preço
telefone
IDs
URLs
enums
uploads
```

Utilizar schemas compartilhados.

Sugestão:

```text
Zod
```

---

# 77. ARQUIVOS DO PROJETO

Criar:

```text
AGENTS.md
MASTER_PLAN.md
DATABASE.md
SECURITY.md
SEO.md
FEEDS.md
```

---

# 78. AGENTS.MD

Conteúdo obrigatório:

```text
Leia MASTER_PLAN.md antes de modificar arquitetura.

Não crie tabelas sem justificar.

Não altere migrations antigas.

Crie nova migration.

Não use service role no frontend.

Não remova RLS.

Não altere contratos públicos de API sem analisar impacto.

Não duplique componentes existentes.

Não instale dependência sem verificar se o projeto já possui solução.

Não faça refatoração fora do escopo solicitado.

Não substitua arquivos grandes inteiros quando uma alteração localizada resolver.

Preserve compatibilidade.

Escreva TypeScript tipado.

Não utilizar any sem justificativa.

Sempre tratar loading, empty e error states.
```

---

# 79. PROMPT BASE PARA VIBE CODING

Usar antes das tarefas:

```text
Leia integralmente:

AGENTS.md
MASTER_PLAN.md
DATABASE.md
SECURITY.md

antes de modificar o projeto.

Regras:

1. Analise a implementação existente antes de escrever código.
2. Não altere arquivos sem relação com a tarefa.
3. Não crie tabela se a estrutura atual resolver.
4. Não remova RLS.
5. Não exponha service role.
6. Não duplique lógica.
7. Preserve tipos TypeScript.
8. Mudanças no banco precisam de migration.
9. Informe quais arquivos serão alterados antes da implementação.
10. Após implementar, revise possíveis regressões.

Tarefa:
[INSERIR AQUI]
```

---

# 80. PRIMEIRO PROMPT DO PROJETO

```text
Leia MASTER_PLAN.md integralmente.

Crie a estrutura inicial de um portal imobiliário nacional utilizando:

- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui
- Supabase

Neste momento NÃO implemente todas as funcionalidades.

Crie apenas:

1. estrutura base do projeto;
2. layout global;
3. providers necessários;
4. clientes Supabase server/client;
5. estrutura de pastas definida no MASTER_PLAN;
6. configuração inicial de autenticação;
7. página inicial provisória;
8. páginas de login e cadastro;
9. tratamento básico de erros.

Não crie ainda as tabelas imobiliárias.

Não implemente mapa.

Não implemente XML.

Não implemente CRM.

Não invente funcionalidades fora do documento.

Ao final, informe:

- arquivos criados;
- arquivos modificados;
- dependências adicionadas;
- variáveis de ambiente necessárias;
- próximos passos.
```

---

# 81. SEGUNDO PROMPT

```text
Agora implemente somente a base de dados geográfica.

Criar migrations para:

states
cities
neighborhoods

Ativar e configurar PostGIS conforme o MASTER_PLAN.

Criar índices necessários.

Não criar properties ainda.

Criar tipos TypeScript correspondentes.

Criar seed inicial com estados brasileiros.

Preparar mecanismo posterior para importar municípios utilizando código IBGE.

Implementar RLS.

Criar testes mínimos de autorização.

Não modificar outras partes do projeto.
```

---

# 82. TERCEIRO PROMPT

```text
Implemente o módulo de imobiliárias.

Criar:

agencies
agency_members

Implementar:

- migrations;
- foreign keys;
- indexes;
- RLS;
- types;
- validações;
- services;
- criação de imobiliária;
- associação do usuário criador como owner.

Um usuário owner deve conseguir:

- visualizar sua imobiliária;
- editar sua imobiliária;
- adicionar membros futuramente.

Um usuário não vinculado NÃO pode editar outra imobiliária.

Não implemente ainda convite por e-mail.
```

---

# 83. QUARTO PROMPT

```text
Implemente o modelo de properties conforme MASTER_PLAN.

Inclua:

properties
features
property_features
property_media
property_price_history
property_status_history

Criar PostGIS location.

Criar índices necessários.

Criar RLS.

Criar tipos TypeScript.

Criar validações.

Não construir ainda o formulário completo de cadastro.

Criar testes básicos.

Não implementar XML.
```

---

# 84. QUINTO PROMPT

```text
Implemente cadastro manual de imóvel em etapas.

Utilize as tabelas existentes.

Não crie novas tabelas.

Implementar autosave.

Etapas:

1. finalidade/tipo/preço
2. características
3. localização
4. features
5. mídia
6. descrição
7. revisão/publicação

Garantir que somente membros autorizados da imobiliária possam editar.

Criar loading, error e empty states.

Não implementar feed XML nesta tarefa.
```

---

# 85. SEXTO PROMPT

```text
Implemente a página pública do imóvel.

Rota:

/imovel/[slug]

Utilizar Server Component para dados principais.

Criar:

galeria
preço
dados principais
descrição
features
localização
imobiliária
CTA WhatsApp

Não implementar recomendações ainda.

Implementar metadata dinâmica.

Implementar canonical.

Somente properties status=active podem aparecer publicamente.
```

---

# 86. SÉTIMO PROMPT

```text
Implemente busca de imóveis.

Filtros:

transaction_type
state
city
neighborhood
property_type
price_min
price_max
bedrooms
bathrooms
parking_spaces
area_min
area_max
financiable
furnished
accepts_exchange

Não usar SELECT *.

Implementar paginação.

Manter filtros sincronizados com URL.

Não indexar combinações arbitrárias de filtros.

Criar layout desktop com:

lista à esquerda
mapa à direita

No mobile:

alternar Lista / Mapa.
```

---

# 87. OITAVO PROMPT

```text
Implemente sistema de leads.

Criar:

leads
lead_events

Ao clicar no botão WhatsApp da página do imóvel:

1. registrar lead/evento;
2. registrar property_id;
3. registrar agency_id;
4. registrar source=whatsapp;
5. registrar UTMs quando existirem;
6. então abrir WhatsApp.

Não bloquear o usuário caso analytics falhe.

Criar dashboard básico de leads da imobiliária.

Aplicar RLS.
```

---

# 88. NONO PROMPT

```text
Implemente módulo de integração de feeds.

Criar:

feeds
feed_runs
feed_errors

Criar:

VRSyncParser

que converta dados para:

NormalizedProperty

Não permitir que o parser escreva diretamente no banco.

Criar:

PropertyImporter

responsável por persistência.

Usar:

agency_id + source + external_id

para idempotência.

Criar logs de execução.

Nesta etapa faça primeiro importação manual acionada pelo usuário.

Não implemente cron ainda.
```

---

# 89. DÉCIMO PROMPT

```text
Após o importador VRSync estar validado:

implemente sincronização automática.

Requisitos:

- lock para impedir duas sincronizações simultâneas;
- retry controlado;
- timeout;
- logs;
- feed_runs;
- feed_errors;
- desativação segura de imóveis ausentes;
- histórico de preço;
- atualização de mídia.

Não apagar imóvel definitivamente.
```

---

# 90. ORDEM OFICIAL DE DESENVOLVIMENTO

Fase 1:

```text
Projeto
Auth
Localização
Imobiliárias
Properties
```

Fase 2:

```text
Cadastro manual
Página imóvel
Pesquisa
Mapa
```

Fase 3:

```text
Leads
Dashboard
Favoritos
Buscas salvas
```

Fase 4:

```text
VRSync
Sincronização
Monitoramento
```

Fase 5:

```text
SEO
Sitemaps
Landing pages
Analytics
```

Fase 6:

```text
Planos
Destaques
Pagamentos
```

---

# 91. META PARA PRIMEIRO LANÇAMENTO

O produto poderá ser colocado em operação quando:

```text
1 imobiliária consiga criar conta;

importe 500 imóveis;

esses imóveis sejam encontrados na pesquisa;

apareçam corretamente no mapa;

possuam página própria;

a página gere lead;

o lead apareça no painel;

o imóvel atualizado no CRM seja atualizado no portal;

o imóvel removido do CRM seja desativado corretamente;

Google consiga rastrear as páginas públicas.
```

Não esperar funcionalidades avançadas.

---

# 92. PRIMEIRA META COMERCIAL

Buscar:

```text
30 imobiliárias
```

Meta de estoque:

```text
5.000 a 10.000 imóveis
```

Cobrança:

```text
R$0
```

Objetivo:

validar:

```text
integrações
estoque
busca
SEO
leads
```

---

# 93. SEGUNDA META

```text
100 imobiliárias
20.000–40.000 imóveis
```

Começar a testar:

```text
destaques
PRO
analytics
página profissional
```

---

# 94. TERCEIRA META

```text
500 imobiliárias
100.000+ imóveis
```

Investir em:

```text
integrações com CRMs
SEO programático controlado
financiamento
dados
avaliação
IA de busca
```

---

# 95. MODELO DE MONETIZAÇÃO

Plano Free:

```text
publicação
leads
integração
página básica
```

Plano Pro:

```text
analytics avançado
mais ferramentas
automação
destaques incluídos
```

Receitas adicionais:

```text
destaques
empreendimentos
publicidade
financiamento
seguros
consórcios
serviços
dados
```

---

# 96. PRINCÍPIO DE NEGÓCIO

No começo:

```text
não maximizar ARPU
```

Maximizar:

```text
inventory
```

Depois:

```text
audience
```

Depois:

```text
lead volume
```

Depois:

```text
monetization
```

---

# 97. REGRA FINAL

Antes de qualquer nova funcionalidade perguntar:

```text
Isso ajuda a:

obter imóveis?

encontrar imóveis?

gerar tráfego?

gerar leads?

reter imobiliárias?

monetizar tráfego existente?
```

Se nenhuma resposta for sim:

provavelmente não deve ser prioridade.

---

# 98. NORTE DO PROJETO

A plataforma não deve ser concebida como:

```text
mais um site de classificados.
```

Deve evoluir para:

```text
infraestrutura nacional para descoberta,
distribuição e transação imobiliária.
```

O MVP começa simples.

A arquitetura, entretanto, deve permitir chegar a:

```text
100.000 imóveis

1.000.000 imóveis

milhares de imobiliárias

milhões de páginas públicas
```

sem a necessidade de reconstruir todo o produto.
