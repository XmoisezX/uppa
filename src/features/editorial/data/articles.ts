import type { EditorialArticle, EditorialCategoryInfo } from "../types";

export const EDITORIAL_CATEGORIES: EditorialCategoryInfo[] = [
  {
    key: "compra",
    label: "Comprar Imóvel",
    description: "Orientações completas para fazer uma aquisição segura e transparente.",
  },
  {
    key: "aluguel",
    label: "Aluguel",
    description: "Tudo sobre locação residencial, garantias e relação proprietário-inquilino.",
  },
  {
    key: "financiamento",
    label: "Financiamento",
    description: "Linhas de crédito, amortização SAC e Price, entrada e uso do FGTS.",
  },
  {
    key: "documentacao",
    label: "Documentação",
    description: "Certidões, escritura pública, matrícula e segurança jurídica.",
  },
  {
    key: "mercado",
    label: "Mercado Imobiliário",
    description: "Análise de preços por metro quadrado, tendências e valorização.",
  },
  {
    key: "decoracao",
    label: "Decoração",
    description: "Home staging e ideias práticas para valorizar ambientes e fotos.",
  },
  {
    key: "reforma",
    label: "Reforma",
    description: "Obras inteligentes que agregam valor real ao patrimônio.",
  },
  {
    key: "cidades",
    label: "Cidades",
    description: "Guias regionais, infraestrutura e características de cada município.",
  },
  {
    key: "bairros",
    label: "Bairros",
    description: "Como avaliar comércio, transporte e qualidade de vida na vizinhança.",
  },
];

export const EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    id: "art-01",
    slug: "guia-completo-comprar-primeiro-imovel",
    title: "Guia Completo para Comprar seu Primeiro Imóvel: Do Planejamento à Escritura",
    summary:
      "Descubra as etapas essenciais para adquirir um imóvel no Brasil com segurança jurídica, cálculo correto de custos adicionais e negociação eficiente.",
    category: "compra",
    categoryLabel: "Comprar Imóvel",
    readTime: "5 min de leitura",
    publishedAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-20T14:30:00.000Z",
    featured: true,
    tags: ["compra", "primeiro imóvel", "escritura", "planejamento"],
    author: {
      name: "Equipe Editorial UPPA",
      role: "Especialistas em Mercado Imobiliário",
    },
    sections: [
      {
        title: "1. Planejamento financeiro além do valor anunciado",
        content: [
          "O primeiro passo para adquirir um imóvel é entender que o custo total da transação vai além do preço de venda do anúncio.",
          "Em média, deve-se reservar de 4% a 8% adicionais sobre o valor do imóvel para despesas com ITBI (Imposto de Transmissão de Bens Imóveis), taxas de cartório de notas (escritura) e registro no Cartório de Registro de Imóveis (RGI).",
          "Para quem compra o primeiro imóvel pelo Sistema Financeiro de Habitação (SFH), a Lei Federal 6.015/73 prevê 50% de desconto nas taxas cartorárias de primeiro registro.",
        ],
      },
      {
        title: "2. Visita técnica e checklist do imóvel",
        content: [
          "Visite o imóvel em horários alternados (manhã e final da tarde) para checar incidência solar, ruídos da rua e fluxo de trânsito.",
          "Verifique o estado da fiação elétrica, pressão da água nos pontos mais altos, caixilhos de janelas e sinais de umidade ou infiltrações em rodapés e tetos.",
        ],
      },
      {
        title: "3. Proposta formal e contrato de promessa de compra e venda",
        content: [
          "Ao formalizar sua proposta, especifique prazos de pagamento, forma de quitação (à vista, financiamento bancário ou consórcio) e inventário do que permanece no imóvel (marcenaria fixa, luminárias, ar-condicionado).",
          "O compromisso preliminar deve conter cláusula resolutiva caso surjam apontamentos impeditivos nas certidões dos vendedores ou do imóvel.",
        ],
      },
    ],
    relatedSlugs: [
      "checklist-documentacao-compra-imovel",
      "guia-financiamento-habitacional-sac-price",
    ],
  },
  {
    id: "art-02",
    slug: "lei-inquilinato-direitos-deveres-locacao",
    title: "Lei do Inquilinato Descomplicada: Direitos, Deveres e Vistoria de Aluguel",
    summary:
      "Tudo o que locadores e inquilinos precisam saber sobre a Lei 8.245/91: garantias locatícias, laudo de vistoria, rescisão e reajustes anuais.",
    category: "aluguel",
    categoryLabel: "Aluguel",
    readTime: "4 min de leitura",
    publishedAt: "2026-09-14T09:00:00.000Z",
    updatedAt: "2026-09-18T16:00:00.000Z",
    featured: true,
    tags: ["aluguel", "lei do inquilinato", "vistoria", "contrato"],
    author: {
      name: "Assessoria Jurídica Imobiliária",
      role: "Direito Imobiliário & Contratos",
    },
    sections: [
      {
        title: "1. O papel crucial do laudo de vistoria de entrada",
        content: [
          "A vistoria inicial com fotos nítidas e descrição pormenorizada é o documento mais importante da locação.",
          "O inquilino deve devolver o imóvel no mesmo estado em que recebeu, ressalvados os desgastes decorrentes do uso normal e da ação do tempo.",
          "Qualquer divergência no início do contrato deve ser formalmente contestada por escrito dentro do prazo estipulado no contrato (geralmente até 10 dias após a entrega das chaves).",
        ],
      },
      {
        title: "2. Reparos estruturais versus manutenção ordinária",
        content: [
          "Despesas estruturais, impermeabilização, consertos em telhado e reformas na fachada do condomínio cabem ao proprietário (locador).",
          "Manutenções de rotina, como troca de lâmpadas, vedação de torneiras, desentupimentos e reparos causados pelo uso cotidiano são de responsabilidade do inquilino (locatário).",
        ],
      },
      {
        title: "3. Rescisão antecipada e cálculo proporcional da multa",
        content: [
          "O locatário pode desocupar o imóvel antes do término do prazo contratual mediante pagamento de multa compensatória, que deve ser cobrada proporcionalmente ao tempo restante de contrato, conforme o artigo 4º da Lei do Inquilinato.",
        ],
      },
    ],
    relatedSlugs: [
      "guia-completo-comprar-primeiro-imovel",
      "checklist-documentacao-compra-imovel",
    ],
  },
  {
    id: "art-03",
    slug: "guia-financiamento-habitacional-sac-price",
    title: "Financiamento Habitacional: Entenda a Diferença entre Tabela SAC e Tabela Price",
    summary:
      "Aprenda como calcular a entrada, amortizar parcelas com FGTS e escolher o melhor sistema de amortização para o seu orçamento.",
    category: "financiamento",
    categoryLabel: "Financiamento",
    readTime: "5 min de leitura",
    publishedAt: "2026-09-12T11:00:00.000Z",
    updatedAt: "2026-09-19T10:00:00.000Z",
    featured: true,
    tags: ["financiamento", "tabela sac", "tabela price", "fgts"],
    author: {
      name: "Consultoria Financeira UPPA",
      role: "Crédito Imobiliário",
    },
    sections: [
      {
        title: "1. Tabela SAC (Sistema de Amortização Constante)",
        content: [
          "Na tabela SAC, o valor que você abate da dívida principal (amortização) é fixo todos os meses. Com o passar do tempo, o saldo devedor diminui e, consequentemente, os juros diminuem.",
          "O resultado prático: as parcelas começam mais altas e vão decrescendo mês a mês até o final do financiamento.",
          "É a modalidade mais recomendada para quem possui renda suficiente para aprovar a primeira parcela e deseja pagar menos juros totais ao longo do contrato.",
        ],
      },
      {
        title: "2. Tabela Price (Sistema Francês de Amortização)",
        content: [
          "Na tabela Price, as parcelas são lineares e praticamente fixas (corrigidas pela taxa de referência ou IPCA, dependendo do contrato).",
          "No início, a maior parte da prestação é composta de juros e pouca amortização. As parcelas iniciais costumam ser menores do que na SAC, facilitando a comprovação de renda exigida pelos bancos.",
        ],
      },
      {
        title: "3. Estratégia de uso do FGTS para redução da dívida",
        content: [
          "O trabalhador que se enquadra nas regras do SFH pode utilizar o saldo do FGTS a cada dois anos para reduzir o saldo devedor (diminuindo o prazo ou o valor das parcelas) ou amortizar até 80% do valor da prestação mensal por até 12 meses.",
        ],
      },
    ],
    relatedSlugs: [
      "guia-completo-comprar-primeiro-imovel",
      "checklist-documentacao-compra-imovel",
    ],
  },
  {
    id: "art-04",
    slug: "checklist-documentacao-compra-imovel",
    title: "Checklist Definitivo de Documentos e Certidões para Compra Segura",
    summary:
      "A relação completa de certidões do imóvel, dos vendedores e do condomínio para blindar seu negócio contra riscos e penhoras.",
    category: "documentacao",
    categoryLabel: "Documentação",
    readTime: "4 min de leitura",
    publishedAt: "2026-09-10T14:00:00.000Z",
    updatedAt: "2026-09-17T11:00:00.000Z",
    featured: true,
    tags: ["documentação", "certidões", "segurança jurídica", "matrícula"],
    author: {
      name: "Cartórios & Relações Jurídicas",
      role: "Compliance Notarial",
    },
    sections: [
      {
        title: "1. Documentação obrigatória do imóvel",
        content: [
          "Matrícula atualizada com certidão de ônus reais e de ações reipersecutórias emitida pelo Cartório de Registro de Imóveis (validade de 30 dias).",
          "Certidão negativa de débitos de IPTU expedida pela prefeitura do município onde o imóvel está localizado.",
          "Declaração de quitação condominial assinada pelo síndico ou administradora (com ata de eleição do síndico em anexo).",
        ],
      },
      {
        title: "2. Certidões dos vendedores (Pessoa Física ou Jurídica)",
        content: [
          "Certidões negativas da Justiça Federal e da Justiça Estadual (Cível, Executivos Fiscais e Família/Sucessões).",
          "Certidão Negativa de Débitos Trabalhistas (CNDT) emitida pelo Tribunal Superior do Trabalho.",
          "Certidão de protestos dos cartórios da comarca do domicílio dos vendedores e da comarca do imóvel.",
        ],
      },
      {
        title: "3. Por que a certidão vintenária é recomendada?",
        content: [
          "A análise do histórico do imóvel nos últimos 20 anos garante que alienações anteriores não sofreram fraude contra credores ou disputas de herança que possam colocar em risco a posse do novo adquirente.",
        ],
      },
    ],
    relatedSlugs: [
      "guia-completo-comprar-primeiro-imovel",
      "guia-financiamento-habitacional-sac-price",
    ],
  },
  {
    id: "art-05",
    slug: "como-avaliar-preco-metro-quadrado-valorizacao",
    title: "Como Avaliar o Preço do Metro Quadrado e a Valorização da Sua Região",
    summary:
      "Aprenda a analisar liquidez, média de valor por m², infraestrutura do entorno e fatores que influenciam na valorização imobiliária.",
    category: "mercado",
    categoryLabel: "Mercado Imobiliário",
    readTime: "4 min de leitura",
    publishedAt: "2026-09-08T15:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
    featured: false,
    tags: ["mercado", "metro quadrado", "valorização", "investimento"],
    author: {
      name: "Equipe Editorial UPPA",
      role: "Pesquisa & Economia Imobiliária",
    },
    sections: [
      {
        title: "1. O que compõe o valor por metro quadrado?",
        content: [
          "O preço do metro quadrado varia substancialmente de acordo com a área útil versus área privativa, padrão de acabamento, idade da construção e infraestrutura de lazer do condomínio.",
          "Ao comparar imóveis, certifique-se de comparar metragem útil com metragem útil, descontando áreas comuns como hall e garagens coletivas.",
        ],
      },
      {
        title: "2. Vetores de crescimento urbano e infraestrutura",
        content: [
          "Novos eixos de transporte público (estações de metrô, corredores de ônibus), centros comerciais, hospitais e universidades são catalisadores históricos de valorização imobiliária sustentada.",
        ],
      },
    ],
    relatedSlugs: [
      "como-escolher-bairro-ideal-morar",
      "guia-completo-comprar-primeiro-imovel",
    ],
  },
  {
    id: "art-06",
    slug: "home-staging-decoracao-vender-alugar-rapido",
    title: "Home Staging: Dicas Práticas de Decoração para Vender ou Alugar Mais Rápido",
    summary:
      "Técnicas acessíveis de organização, despersonalização e iluminação que reduzem em até 50% o tempo de anúncio de um imóvel.",
    category: "decoracao",
    categoryLabel: "Decoração",
    readTime: "3 min de leitura",
    publishedAt: "2026-09-05T13:00:00.000Z",
    updatedAt: "2026-09-15T09:00:00.000Z",
    featured: false,
    tags: ["decoração", "home staging", "fotos de imóveis", "valorização"],
    author: {
      name: "Design de Interiores & Arquitetura",
      role: "Especialistas em Apresentação",
    },
    sections: [
      {
        title: "1. Despersonalização dos ambientes",
        content: [
          "Para que o potencial comprador se imagine vivendo no espaço, é fundamental remover retratos de família, itens colecionáveis e objetos pessoais em excesso.",
          "A regra de ouro: bancadas e superfícies limpas transmitem amplitude visual imediata nas fotos do portal.",
        ],
      },
      {
        title: "2. A importância da iluminação natural nas fotos",
        content: [
          "Abra todas as cortinas e persianas para captar fotos com luz natural. Acenda luminárias secundárias para criar pontos quentes de acolhimento nos cômodos.",
        ],
      },
    ],
    relatedSlugs: [
      "reformas-inteligentes-que-valorizam-imovel",
      "lei-inquilinato-direitos-deveres-locacao",
    ],
  },
  {
    id: "art-07",
    slug: "reformas-inteligentes-que-valorizam-imovel",
    title: "Reforma Estratégica: Quais Obras Realmente Valorizam o Imóvel?",
    summary:
      "Saiba onde investir antes de anunciar: cozinhas, banheiros, pintura neutra e fiação elétrica trazem o maior retorno sobre investimento.",
    category: "reforma",
    categoryLabel: "Reforma",
    readTime: "4 min de leitura",
    publishedAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-14T08:00:00.000Z",
    featured: false,
    tags: ["reforma", "obras", "valorização", "manutenção"],
    author: {
      name: "Engenharia & Obras",
      role: "Reformas e Avaliações",
    },
    sections: [
      {
        title: "1. Cozinhas e banheiros: os ambientes mais decisivos",
        content: [
          "Compradores e locatários priorizam o estado de conservação de cozinhas e banheiros porque são os ambientes mais caros e trabalhosos para reformar.",
          "Trocar metais antigos, instalar bancadas de pedra de fácil limpeza e atualizar louças sanitárias modernizam o imóvel a um custo relativamente controlado.",
        ],
      },
      {
        title: "2. Pintura neutra com acabamento acetinado",
        content: [
          "Uma nova demão de tinta em tons claros e neutros (como off-white ou cinza-claro) renova o cheiro do imóvel, esconde marcas do tempo e reflete melhor a luminosidade.",
        ],
      },
    ],
    relatedSlugs: [
      "home-staging-decoracao-vender-alugar-rapido",
      "guia-completo-comprar-primeiro-imovel",
    ],
  },
  {
    id: "art-08",
    slug: "como-escolher-bairro-ideal-morar",
    title: "Como Escolher o Bairro Ideal para Morar: Critérios de Infraestrutura e Mobilidade",
    summary:
      "Avalie comércio local, segurança, trânsito nos horários de pico e opções de lazer antes de definir a localização do seu próximo lar.",
    category: "bairros",
    categoryLabel: "Bairros",
    readTime: "4 min de leitura",
    publishedAt: "2026-09-01T16:00:00.000Z",
    updatedAt: "2026-09-12T14:00:00.000Z",
    featured: false,
    tags: ["bairros", "localização", "qualidade de vida", "mobilidade"],
    author: {
      name: "Equipe Editorial UPPA",
      role: "Geografia Urbana",
    },
    sections: [
      {
        title: "1. O trajeto do dia a dia no horário de pico",
        content: [
          "Teste o trajeto do bairro até o trabalho e escolas nos horários reais de trânsito intenso antes de fechar negócio.",
          "Verifique a proximidade de linhas de transporte público, ciclovias e vias expressas de escoamento.",
        ],
      },
      {
        title: "2. Caminhabilidade e comércio de proximidade",
        content: [
          "Bairros onde você consegue resolver tarefas essenciais a pé (padaria, farmácia, supermercado, academias) proporcionam maior qualidade de vida e menor dependência de veículo particular.",
        ],
      },
    ],
    relatedSlugs: [
      "como-avaliar-preco-metro-quadrado-valorizacao",
      "guia-completo-comprar-primeiro-imovel",
    ],
  },
];
