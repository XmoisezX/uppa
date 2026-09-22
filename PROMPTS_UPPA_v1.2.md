# UPPA — PROMPTS DE IMPLEMENTAÇÃO v1.2
## Execução incremental no Antigravity
### Atualizado em 22/09/2026

Este arquivo contém os prompts oficiais para executar a evolução do MASTER_PLAN_v1.2.

REGRA:
- executar uma etapa por vez;
- não pedir duas etapas na mesma mensagem;
- depois de cada etapa, fazer build + smoke test;
- revisar visualmente antes da próxima;
- preservar backend, Supabase, feeds e imóveis existentes;
- não inventar dados;
- parar ao final de cada etapa.

---

## ETAPA 0 — AUDITORIA

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

Identifique onde seria melhor criar:
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

Entregue:
A. mapa das rotas;
B. mapa dos componentes;
C. onde cada componente é usado;
D. problemas;
E. riscos;
F. ordem recomendada;
G. arquivos que cada etapa deverá alterar.

Não faça alterações.

Ao final, pare.
```

---

## ETAPA 1 — PORTAL SHELL

```text
UPPA — ETAPA 1 — PORTAL SHELL E IDENTIDADE GLOBAL

Implemente somente esta etapa.

Objetivo:
criar identidade global consistente de portal imobiliário nacional.

Remova referências antigas:
- PORTAL IMO;
- PORTAL IMO BRASIL;
- PORTALIMObrasil;
- marcas anteriores.

Tudo deve utilizar UPPA.

Criar/reorganizar, quando necessário:
- Header;
- Footer;
- PortalShell.

Header desktop:
- logo UPPA;
- Comprar;
- Alugar;
- Lançamentos;
- Explorar;
- Anunciar;
- Entrar.

Não crie links quebrados para funcionalidades inexistentes.

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

Preserve backend, Supabase, feeds, filtros, imóveis e páginas existentes.

Não redesenhe profundamente /comprar e /alugar nesta etapa.

Execute build e smoke test.

Informe arquivos alterados e problemas.

Pare.
```

---

## ETAPA 2 — HOME PORTAL

```text
UPPA — ETAPA 2 — TRANSFORMAR A HOME EM HOME DE PORTAL IMOBILIÁRIO

Implemente somente esta etapa.

Objetivo:
fazer a home parecer um portal imobiliário nacional, e não uma imobiliária com uma lista de imóveis.

Use como referência conceitual a arquitetura de grandes portais como Chaves na Mão, ZAP Imóveis e Viva Real.

NÃO copie código, CSS, textos, imagens, logos, identidade ou assets.

A home deve possuir:
1. Header;
2. Hero visual;
3. busca principal;
4. Comprar / Alugar / Imóvel novo, se existir;
5. atalhos de descoberta;
6. imóveis recentes;
7. bloco de publicidade reservado;
8. cidades;
9. tipos;
10. buscas populares;
11. conteúdo editorial;
12. ferramentas/serviços;
13. CTA para anunciantes;
14. FAQ;
15. Footer.

Hero:
- imagem/composição profissional;
- título;
- subtítulo;
- busca grande;
- localização;
- tipo;
- operação;
- Buscar.

Não criar estatísticas falsas.
Números devem vir do banco.
Sem dados suficientes, ocultar o módulo.

Não transformar a home em página institucional.
Imóveis devem aparecer cedo.

Criar componentes reutilizáveis quando necessário.

Preserve integrações.

Execute build.
Teste desktop e mobile.

Informe arquivos alterados e implementação.

Pare.
```

---

## ETAPA 3 — BANNERS

```text
UPPA — ETAPA 3 — SISTEMA DE BANNERS E PUBLICIDADE

Implemente somente esta etapa.

Primeiro audite se já existe sistema de banners.
Não duplique estruturas.

Se necessário, criar estrutura mínima para:
- imagem desktop;
- imagem mobile;
- posição;
- URL;
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

Criar BannerSlot.

Regras:
- sem banner ativo, layout não quebra;
- expirado não aparece;
- inativo não aparece;
- mobile pode ter imagem própria;
- otimizar imagens;
- não carregar imagens desnecessárias;
- registrar clique;
- registrar impressão eficientemente;
- não bloquear carregamento principal.

Se houver painel, integrar.
Se não houver, criar somente estrutura mínima.

Não implementar AdSense ainda.
Não alterar a busca.

Execute build e smoke test.

Pare.
```

---

## ETAPA 4 — BUSCA

```text
UPPA — ETAPA 4 — BUSCA /COMPRAR E /ALUGAR

Trabalhe somente em:
- /comprar
- /alugar

Objetivo:
experiência de busca comparável à estrutura dos grandes portais.

Desktop:
- breadcrumb;
- título;
- contagem real;
- chips;
- sidebar;
- lista;
- ordenação;
- mapa opcional;
- paginação.

Não assumir localização quando o usuário não informou.

Filtros:
- localização;
- tipo;
- preço;
- quartos;
- banheiros;
- vagas;
- área;
- mais filtros.

Cards horizontais:
- imagem;
- finalidade;
- título;
- localização;
- preço;
- características;
- anunciante;
- contato;
- favorito se já existir.

Em /alugar:
se também estiver à venda, mostrar "Venda e locação".
Aluguel é o preço principal.

Não inventar dados.
Preservar consultas existentes.

Não criar favoritos novos nesta etapa.

Testar:
- /comprar sem localização;
- /alugar sem localização;
- cidade;
- filtros;
- paginação;
- mobile.

Build + smoke test.

Pare.
```

---

## ETAPA 5 — IMÓVEL

```text
UPPA — ETAPA 5 — PÁGINA INDIVIDUAL DO IMÓVEL

Trabalhe somente na página individual.

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
10. valores;
11. localização aproximada;
12. anunciante;
13. contato;
14. semelhantes.

A UPPA não é proprietária do imóvel.
Deixar claro quem anuncia.

Proteger endereço quando necessário.

Remover marca antiga.

CTA deve continuar funcionando mesmo se analytics falhar.

Não inventar dados.

Preservar URLs quando possível.

Testar pelo menos 2 imóveis reais.

Build + smoke test.

Pare.
```

---

## ETAPA 6 — EDITORIAL

```text
UPPA — ETAPA 6 — CAMADA EDITORIAL

Criar/reorganizar:
- EditorialCard;
- ArticleGrid;
- GuideCard;
- PopularSearches;
- CityGuideCard;
- ContentSection.

A home deve suportar:
- Comprar imóvel;
- Alugar;
- Financiamento;
- Documentação;
- Mercado imobiliário;
- Decoração;
- Reforma;
- Cidades;
- Bairros.

Não criar CMS completo.
Se não houver conteúdo real, ocultar módulos em vez de inventar.

Considerar SEO.

Não alterar feeds.
Não alterar banco de imóveis sem necessidade.

Build + smoke test.

Pare.
```

---

## ETAPA 7 — CIDADES E BAIRROS

```text
UPPA — ETAPA 7 — CIDADES E BAIRROS

Criar/consolidar páginas:
- cidade;
- bairro;
- imóveis por cidade;
- comprar por cidade;
- alugar por cidade;
- tipos por cidade.

Não criar páginas vazias em massa.

Só indexar quando houver estoque suficiente ou conteúdo editorial real.

Cidade:
- título;
- busca;
- estoque;
- comprar;
- alugar;
- tipos;
- bairros;
- conteúdo;
- links internos.

Bairro:
- localização;
- estoque;
- tipos;
- comprar;
- alugar;
- bairros próximos se houver dados;
- conteúdo real.

Não inventar preço médio, população, segurança, mobilidade ou infraestrutura.

Build + smoke test.

Pare.
```

---

## ETAPA 8 — FERRAMENTAS

```text
UPPA — ETAPA 8 — FERRAMENTAS IMOBILIÁRIAS

Criar primeira versão de:
1. simulador simples de financiamento;
2. calculadora de custos de compra;
3. calculadora de capacidade de compra.

Devem:
- funcionar no navegador;
- explicar que são estimativas;
- não prometer aprovação;
- permitir alterar premissas;
- apresentar resultado claro;
- ligar para imóveis compatíveis.

Não integrar bancos agora.
Não coletar dados pessoais desnecessários.
Não criar plataforma financeira completa.

Componentes reutilizáveis.
SEO nas páginas.

Build + smoke test.

Pare.
```

---

## ETAPA 9 — ANUNCIANTES

```text
UPPA — ETAPA 9 — EXPERIÊNCIA PARA IMOBILIÁRIAS E ANUNCIANTES

Mensagem:
"Publique sua carteira na UPPA."

Mostrar:
- XML/feed;
- publicação automática;
- atualização;
- leads;
- WhatsApp;
- painel;
- analytics;
- cadastro.

Criar página pública para anunciantes.

Não alterar feeds sem necessidade.
Não inventar métricas.

Preparar estrutura para planos e patrocinados.

Build + smoke test.

Pare.
```

---

## ETAPA 10 — FAVORITOS E ALERTAS

```text
UPPA — ETAPA 10 — FAVORITOS E ALERTAS

Só executar se portal, busca e páginas estiverem estáveis.

Implementar:
- favoritos;
- busca salva;
- alertas de novos imóveis.

Não autenticado:
- experiência local quando segura;
- login somente quando necessário.

Autenticado:
- persistir no Supabase.

Não bloquear navegação pública.
Notificações com opt-in.

Build + testes.

Pare.
```

---

## ETAPA 11 — MONETIZAÇÃO

```text
UPPA — ETAPA 11 — MONETIZAÇÃO DO PORTAL

Não implementar cobrança financeira ainda.

Criar infraestrutura visual/dados para:
- imóvel patrocinado;
- anunciante em destaque;
- banner patrocinado;
- empreendimento patrocinado.

Sempre identificar publicidade.

Não alterar dados reais.
Criar:
- status;
- período;
- prioridade;
- anunciante;
- campanha;
- tracking.

Não prejudicar relevância da busca.

Build + smoke test.

Pare.
```

---

## ETAPA 12 — SEO / PERFORMANCE / QA

```text
UPPA — ETAPA 12 — SEO, PERFORMANCE E QA FINAL

Auditar:
- title;
- description;
- canonical;
- sitemap;
- robots;
- Open Graph;
- schema.org;
- breadcrumbs;
- cidade;
- bairro;
- tipo;
- imóvel;
- links internos;
- imagens;
- alt;
- Core Web Vitals;
- lazy loading;
- queries;
- paginação;
- cache;
- 404;
- redirects;
- dados estruturados.

Não criar milhares de páginas automaticamente.
Não indexar filtros inúteis.
Não indexar combinações sem valor.

Verificar mobile.

Build.
Smoke test.
Relatório final.

Não iniciar nova funcionalidade.

Pare.
```

---

# CHECKPOINT APÓS CADA ETAPA

Antes de executar a próxima:

1. abrir o site em desktop;
2. abrir no celular;
3. testar home;
4. testar busca;
5. abrir um imóvel;
6. verificar console;
7. verificar build;
8. verificar se os dados continuam reais;
9. verificar se nenhuma marca antiga voltou;
10. só então enviar a próxima etapa.
