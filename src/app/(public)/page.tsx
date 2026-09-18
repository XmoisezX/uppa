import React from "react";
import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Compass,
  Zap,
  TrendingUp,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BedDouble,
  Bath,
  Car,
  Maximize,
} from "lucide-react";

export default function HomePage() {
  const popularSearches = [
    { title: "Apartamentos com 3 quartos", href: "/comprar?tipo=apartamento&quartos=3" },
    { title: "Casas em condomínio fechado", href: "/comprar?tipo=casa_condominio" },
    { title: "Studios e Lofts para alugar", href: "/alugar?tipo=studio" },
    { title: "Imóveis financiáveis Caixa", href: "/comprar?financiavel=true" },
    { title: "Casas que aceitam permuta", href: "/comprar?aceita_permuta=true" },
    { title: "Coberturas com vista panorâmica", href: "/comprar?tipo=cobertura" },
  ];

  const featuredCities = [
    {
      name: "Pelotas",
      state: "RS",
      description: "Tradição, patrimônio histórico e expansão residencial no Laranjal.",
      count: "1.240+ anúncios",
    },
    {
      name: "Porto Alegre",
      state: "RS",
      description: "A capital gaúcha com opções diversificadas para compra e locação.",
      count: "4.890+ anúncios",
    },
    {
      name: "São Paulo",
      state: "SP",
      description: "O maior mercado imobiliário do país com alta liquidez.",
      count: "18.500+ anúncios",
    },
    {
      name: "Curitiba",
      state: "PR",
      description: "Qualidade de vida, sustentabilidade e bairros arborizados.",
      count: "3.710+ anúncios",
    },
  ];

  const showcaseProperties = [
    {
      id: "demo-1",
      title: "Casa com 3 suítes no Laranjal",
      location: "Laranjal, Pelotas - RS",
      price: "R$ 780.000",
      type: "Venda",
      tag: "Destaque",
      bedrooms: 3,
      bathrooms: 4,
      parking: 2,
      area: 210,
    },
    {
      id: "demo-2",
      title: "Apartamento reformado no Centro",
      location: "Centro, Pelotas - RS",
      price: "R$ 390.000",
      type: "Venda",
      tag: "Financiável",
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      area: 85,
    },
    {
      id: "demo-3",
      title: "Apartamento com varanda gourmet",
      location: "Moinhos de Vento, Porto Alegre - RS",
      price: "R$ 3.500 /mês",
      type: "Aluguel",
      tag: "Novo",
      bedrooms: 2,
      bathrooms: 2,
      parking: 2,
      area: 95,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 py-20 lg:py-28 text-white">
        {/* Background Glow Efeitos */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/25 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 right-10 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <Badge
            variant="outline"
            className="border-indigo-400/40 text-indigo-300 bg-indigo-950/60 mb-6 px-4 py-1 text-xs sm:text-sm font-medium backdrop-blur-sm"
          >
            Infraestrutura Imobiliária de Alcance Nacional
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl max-w-3xl leading-tight text-white drop-shadow-sm">
            Onde você quer <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-300">morar?</span>
          </h1>

          <p className="mt-4 max-w-2xl text-base sm:text-lg text-slate-300">
            Descubra casas, apartamentos e terrenos cadastrados pelas melhores
            imobiliárias do país. Informações transparentes e contato direto.
          </p>

          {/* SearchBar Principal */}
          <div className="mt-10 w-full flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* 2. BUSCAS POPULARES */}
      <section className="border-b border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Buscas Populares
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {popularSearches.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs font-medium text-slate-700 transition-all hover:border-indigo-500 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-400"
              >
                <span>{item.title}</span>
                <span className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Ver imóveis <ChevronRight className="h-3 w-3 inline" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CIDADES PRINCIPAIS */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Localidades
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Cidades em Destaque
              </h2>
            </div>
            <Link
              href="/comprar"
              className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1 dark:text-indigo-400"
            >
              Explorar todo o Brasil <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCities.map((city) => (
              <Card
                key={city.name}
                className="group border-slate-200/80 bg-white transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs dark:bg-indigo-950/60 dark:text-indigo-400">
                      {city.state}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {city.count}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {city.name}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {city.description}
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      href={`/comprar?cidade=${encodeURIComponent(city.name)}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center justify-between dark:text-indigo-400"
                    >
                      Ver oportunidades
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. IMÓVEIS EM DESTAQUE (DEMONSTRAÇÃO PROVISÓRIA) */}
      <section className="py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Vitrine
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Imóveis Recém-Publicados
              </h2>
            </div>
            <Link
              href="/comprar"
              className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1 dark:text-indigo-400"
            >
              Ver todos os imóveis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {showcaseProperties.map((prop) => (
              <Card
                key={prop.id}
                className="overflow-hidden border-slate-200/80 bg-white transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 flex flex-col"
              >
                {/* Imagem Placeholder Estilizada */}
                <div className="relative h-48 w-full bg-gradient-to-tr from-slate-200 via-slate-100 to-indigo-100 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/50 flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-slate-400/70" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <Badge variant="default" className="bg-indigo-600 text-xs">
                      {prop.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {prop.tag}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {prop.price}
                    </div>

                    <h3 className="mt-1 font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {prop.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {prop.location}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <BedDouble className="h-4 w-4 text-slate-400 mb-0.5" />
                      <span>{prop.bedrooms} qtos</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Bath className="h-4 w-4 text-slate-400 mb-0.5" />
                      <span>{prop.bathrooms} banh</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Car className="h-4 w-4 text-slate-400 mb-0.5" />
                      <span>{prop.parking} vag</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Maximize className="h-4 w-4 text-slate-400 mb-0.5" />
                      <span>{prop.area} m²</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. COMO FUNCIONA */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Transparência & Rapidez
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Como o Portal Imobiliário funciona
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Simplificamos todo o caminho entre encontrar um anúncio confiável e fechar o negócio.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center p-6 rounded-2xl bg-white shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-5">
                <Compass className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                1. Busca Geográfica Precisa
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Filtre por estado, cidade, bairro e características essenciais como financiamento e vagas de garagem.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-2xl bg-white shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-5">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Contato Direto & WhatsApp
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Conecte-se em um clique diretamente com a imobiliária ou corretor responsável pelo anúncio.
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-2xl bg-white shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-5">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                3. Informações Auditadas
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Estoque atualizado e sincronizado com os principais CRMs do Brasil para evitar anúncios fantasmas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PARA IMOBILIÁRIAS (MASTER_PLAN - SEÇÃO 1, 2 e 51) */}
      <section className="py-20 bg-gradient-to-tr from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 mb-4">
                Parceria Gratuita para Imobiliárias
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl leading-tight">
                Distribua seu estoque e multiplique seus leads sem custo inicial
              </h2>
              <p className="mt-4 text-slate-200 text-base leading-relaxed">
                Mais um canal de distribuição nacional criado para valorizar o
                trabalho da sua equipe. Integração fácil via feed XML/VRSync ou
                cadastro manual com painel de métricas.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-100">
                    Publicação gratuita no plano base
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-100">
                    Receba leads qualificados diretamente no seu WhatsApp e e-mail
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-100">
                    Compatível com o formato padrão VRSync do mercado imobiliário
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/cadastrar">
                  <Button size="lg" className="bg-white text-indigo-950 hover:bg-slate-100 font-bold shadow-lg">
                    Cadastrar Minha Imobiliária
                  </Button>
                </Link>
                <Link href="/entrar">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-indigo-400/40 text-white bg-indigo-950/40 hover:bg-indigo-900/50"
                  >
                    Acessar Painel
                  </Button>
                </Link>
              </div>
            </div>

            {/* Painel Provisório Preview */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/60 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between border-b border-indigo-800/60 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-mono text-indigo-300">
                    painel.portalimobiliario.com.br
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] border-indigo-400/40 text-indigo-300">
                  Visão Geral
                </Badge>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-indigo-900/40 p-4 border border-indigo-700/40">
                  <span className="text-xs text-indigo-300">Imóveis Ativos</span>
                  <div className="mt-1 text-2xl font-extrabold text-white">742</div>
                  <span className="text-[10px] text-emerald-400">+12 novos hoje</span>
                </div>
                <div className="rounded-xl bg-indigo-900/40 p-4 border border-indigo-700/40">
                  <span className="text-xs text-indigo-300">Leads este mês</span>
                  <div className="mt-1 text-2xl font-extrabold text-white">185</div>
                  <span className="text-[10px] text-emerald-400">82% WhatsApp</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-indigo-900/40 p-4 border border-indigo-700/40">
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span>Última Sincronização XML</span>
                  <span className="text-emerald-400">Sucesso</span>
                </div>
                <div className="mt-2 text-xs font-mono text-slate-300">
                  VRSync Feed: 742 processados, 0 erros
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "h-4 w-4"}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
