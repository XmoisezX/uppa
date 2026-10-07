import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityTerritorialData,
  formatCitySlug,
} from "@/features/seo/services";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";
import { Breadcrumbs } from "@/features/seo/components/Breadcrumbs";
import { SearchPropertyCard } from "@/features/search/components/SearchPropertyCard";
import {
  Building2,
  Home,
  MapPin,
  TrendingDown,
  Key,
  ShoppingBag,
} from "lucide-react";

interface CityPageProps {
  params: Promise<{ citySlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const revalidate = 180; // ISR a cada 3 minutos

export async function generateMetadata({
  params,
  searchParams,
}: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const rawParams = searchParams ? await searchParams : {};
  const data = await getCityTerritorialData(citySlug);

  if (!data) {
    return {
      title: "Cidade não encontrada | UPPA",
      description: "A localidade solicitada não foi encontrada.",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const canonicalSlug = formatCitySlug(data.city.slug, data.city.state.code);
  const canonicalUrl = `${siteUrl}/imoveis/${canonicalSlug}`;

  // Se houver filtros na query string ou estoque for insuficiente, noindex, follow
  const hasArbitraryParams = Object.keys(rawParams).length > 0;
  const shouldIndex = data.isIndexable && !hasArbitraryParams;

  const minPriceText = data.minPrice
    ? ` a partir de R$ ${data.minPrice.toLocaleString("pt-BR")}`
    : "";

  const title = `Imóveis em ${data.city.name} - ${data.city.state.code} | UPPA`;
  const description = `Confira ${data.totalCount} imóveis em ${data.city.name} - ${data.city.state.code}.${minPriceText}. Compare ${data.saleCount} imóveis à venda e ${data.rentCount} para alugar com imobiliárias credenciadas.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "UPPA",
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityHubPage({
  params,
}: CityPageProps) {
  const { citySlug } = await params;
  const data = await getCityTerritorialData(citySlug);

  if (!data) {
    notFound();
  }

  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const canonicalSlug = formatCitySlug(data.city.slug, data.city.state.code);
  const canonicalUrl = `${siteUrl}/imoveis/${canonicalSlug}`;

  // Structured Data JSON-LD
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "UPPA",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: data.city.state.name,
          item: `${siteUrl}/comprar?state=${data.city.state.code.toLowerCase()}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: data.city.name,
          item: canonicalUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Imóveis em ${data.city.name} - ${data.city.state.code}`,
      description: `Listagem de ${data.totalCount} imóveis disponíveis em ${data.city.name}.`,
      url: canonicalUrl,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20 pt-4">
      {/* Schema Estruturado */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* BREADCRUMBS HIERÁRQUICOS */}
        <Breadcrumbs
          items={[
            {
              label: data.city.state.name,
              href: `/comprar?state=${data.city.state.code.toLowerCase()}`,
            },
            {
              label: data.city.name,
            },
          ]}
        />

        {/* CABEÇALHO TERRITORIAL H1 */}
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
            <MapPin className="w-3.5 h-3.5" />
            <span>Guia Territorial & Mercado Imobiliário</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Imóveis em {data.city.name} - {data.city.state.code}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            Explore {data.totalCount} {data.totalCount === 1 ? "imóvel com oferta ativa" : "imóveis com ofertas ativas"} em {data.city.name}. Compare anúncios de imobiliárias e corretores credenciados para compra e locação sem duplicidade.
          </p>

          {/* SINAL DE ESTOQUE BAIXO (QUANDO NÃO ATINGE LIMIAR DE INDEXABILIDADE) */}
          {!data.isIndexable && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <strong>Estoque em crescimento:</strong> Esta localidade conta com poucas ofertas cadastradas no momento. As opções disponíveis estão listadas abaixo.
            </div>
          )}
        </div>

        {/* MÉTRICAS REAIS DO MERCADO LOCAL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Total de Imóveis
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {data.totalCount}
            </div>
            <div className="text-[11px] text-slate-500">
              {data.saleCount} venda • {data.rentCount} aluguel
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              Preço Inicial Venda
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {data.minPrice
                ? `R$ ${data.minPrice.toLocaleString("pt-BR")}`
                : "Consulte"}
            </div>
            <div className="text-[11px] text-slate-500">
              {data.avgPrice ? `Média: R$ ${data.avgPrice.toLocaleString("pt-BR")}` : "Ofertas selecionadas"}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              Aluguel Inicial
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {data.minRentPrice
                ? `R$ ${data.minRentPrice.toLocaleString("pt-BR")}/mês`
                : "Consulte"}
            </div>
            <div className="text-[11px] text-slate-500">
              {data.avgRentPrice ? `Média: R$ ${data.avgRentPrice.toLocaleString("pt-BR")}/mês` : "Locações ativas"}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-violet-600" />
              Bairros com Estoque
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {data.neighborhoods?.length || 0}
            </div>
            <div className="text-[11px] text-slate-500">
              Bairros mapeados
            </div>
          </div>
        </div>

        {/* ATALHOS RÁPIDOS DE BUSCA (COMPRAR E ALUGAR) */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/comprar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ver todos à venda em {data.city.name}</span>
          </Link>
          <Link
            href={`/alugar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Key className="w-4 h-4" />
            <span>Ver todos para alugar em {data.city.name}</span>
          </Link>
        </div>

        {/* NAVEGAÇÃO DE BAIRROS (LINKING INTERNO ESTRUTURADO) */}
        {data.neighborhoods && data.neighborhoods.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Bairros em {data.city.name}
              </h2>
              <span className="text-xs text-slate-500">
                Selecione um bairro para ver detalhes locais
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.neighborhoods.map((neigh) => (
                <Link
                  key={neigh.id}
                  href={`/imoveis/${canonicalSlug}/${neigh.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
                >
                  <span>{neigh.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white dark:bg-slate-900 text-slate-500 font-mono">
                    {neigh.propertyCount}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* TIPOLOGIAS MAIS ENCONTRADAS */}
        {data.topTypes && data.topTypes.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Tipos de Imóveis Mais Frequentes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {data.topTypes.map((t) => (
                <Link
                  key={t.type}
                  href={`/comprar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}&propertyType=${t.type}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
                >
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    {t.label}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t.count} disponíveis
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* VITRINE DE IMÓVEIS DISPONÍVEIS NA CIDADE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Imóveis em destaque em {data.city.name}
            </h2>
            <Link
              href={`/comprar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
            >
              Ver todos os {data.totalCount} imóveis &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.properties.map((property) => (
              <SearchPropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
