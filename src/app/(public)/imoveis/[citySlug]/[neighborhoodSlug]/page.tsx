import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNeighborhoodTerritorialData,
  formatCitySlug,
} from "@/features/seo/services";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";
import { Breadcrumbs } from "@/features/seo/components/Breadcrumbs";
import { SearchPropertyCard } from "@/features/search/components/SearchPropertyCard";
import {
  Building2,
  MapPin,
  TrendingDown,
  Key,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";

interface NeighborhoodPageProps {
  params: Promise<{ citySlug: string; neighborhoodSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const revalidate = 180; // ISR a cada 3 minutos

export async function generateMetadata({
  params,
  searchParams,
}: NeighborhoodPageProps): Promise<Metadata> {
  const { citySlug, neighborhoodSlug } = await params;
  const rawParams = searchParams ? await searchParams : {};
  const data = await getNeighborhoodTerritorialData(citySlug, neighborhoodSlug);

  if (!data || !data.neighborhood) {
    return {
      title: "Bairro não encontrado | UPPA",
      description: "O bairro solicitado não foi encontrado nesta cidade.",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const canonicalCitySlug = formatCitySlug(data.city.slug, data.city.state.code);
  const canonicalUrl = `${siteUrl}/imoveis/${canonicalCitySlug}/${data.neighborhood.slug}`;

  // Se houver filtros na query string ou estoque for insuficiente, noindex, follow
  const hasArbitraryParams = Object.keys(rawParams).length > 0;
  const shouldIndex = data.isIndexable && !hasArbitraryParams;

  const minPriceText = data.minPrice
    ? ` a partir de R$ ${data.minPrice.toLocaleString("pt-BR")}`
    : "";

  const title = `Imóveis no ${data.neighborhood.name} em ${data.city.name} - ${data.city.state.code} | UPPA`;
  const description = `Encontre ${data.totalCount} imóveis no bairro ${data.neighborhood.name}, ${data.city.name}.${minPriceText}. Compare ${data.saleCount} à venda e ${data.rentCount} para alugar com imobiliárias credenciadas.`;

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

export default async function NeighborhoodHubPage({
  params,
}: NeighborhoodPageProps) {
  const { citySlug, neighborhoodSlug } = await params;
  const data = await getNeighborhoodTerritorialData(citySlug, neighborhoodSlug);

  if (!data || !data.neighborhood) {
    notFound();
  }

  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const canonicalCitySlug = formatCitySlug(data.city.slug, data.city.state.code);
  const canonicalUrl = `${siteUrl}/imoveis/${canonicalCitySlug}/${data.neighborhood.slug}`;

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
          name: data.city.name,
          item: `${siteUrl}/imoveis/${canonicalCitySlug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: data.neighborhood.name,
          item: canonicalUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Imóveis no bairro ${data.neighborhood.name} em ${data.city.name}`,
      description: `Listagem de ${data.totalCount} imóveis no bairro ${data.neighborhood.name}, ${data.city.name} - ${data.city.state.code}.`,
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
              label: data.city.name,
              href: `/imoveis/${canonicalCitySlug}`,
            },
            {
              label: data.neighborhood.name,
            },
          ]}
        />

        {/* CABEÇALHO TERRITORIAL DO BAIRRO (H1) */}
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2">
            <Link
              href={`/imoveis/${canonicalCitySlug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para {data.city.name}</span>
            </Link>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Imóveis no {data.neighborhood.name} em {data.city.name} - {data.city.state.code}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            Consulte {data.totalCount} {data.totalCount === 1 ? "imóvel disponível" : "imóveis disponíveis"} no bairro {data.neighborhood.name}. Compare anúncios e ofertas legítimas de imobiliárias e corretores credenciados para compra e aluguel.
          </p>

          {/* SINAL DE ESTOQUE BAIXO (QUANDO NÃO ATINGE LIMIAR DE INDEXABILIDADE) */}
          {!data.isIndexable && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <strong>Estoque reduzido:</strong> Este bairro possui poucas ofertas no momento. Confira as opções ativas abaixo ou explore outros bairros de {data.city.name}.
            </div>
          )}
        </div>

        {/* MÉTRICAS REAIS DO BAIRRO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Estoque Ativo
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
              A partir de (Venda)
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {data.minPrice
                ? `R$ ${data.minPrice.toLocaleString("pt-BR")}`
                : "Consulte"}
            </div>
            <div className="text-[11px] text-slate-500">
              {data.avgPrice ? `Média: R$ ${data.avgPrice.toLocaleString("pt-BR")}` : "Ofertas locais"}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              A partir de (Aluguel)
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
              <MapPin className="w-3.5 h-3.5 text-violet-600" />
              Localização
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {data.neighborhood.name}
            </div>
            <div className="text-[11px] text-slate-500">
              {data.city.name} - {data.city.state.code}
            </div>
          </div>
        </div>

        {/* ATALHOS DE BUSCA RÁPIDA NO BAIRRO */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/comprar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}&neighborhood=${data.neighborhood.name}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ver todos à venda no {data.neighborhood.name}</span>
          </Link>
          <Link
            href={`/alugar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}&neighborhood=${data.neighborhood.name}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Key className="w-4 h-4" />
            <span>Ver todos para alugar no {data.neighborhood.name}</span>
          </Link>
        </div>

        {/* TIPOS MAIS FREQUENTES NO BAIRRO */}
        {data.topTypes && data.topTypes.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Tipos de Imóveis no {data.neighborhood.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {data.topTypes.map((t) => (
                <Link
                  key={t.type}
                  href={`/comprar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}&neighborhood=${data.neighborhood?.name}&propertyType=${t.type}`}
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

        {/* OUTROS BAIRROS RELACIONADOS NA MESMA CIDADE (INTERLINKING LATERAL) */}
        {data.relatedNeighborhoods && data.relatedNeighborhoods.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Outros Bairros em {data.city.name}
              </h2>
              <Link
                href={`/imoveis/${canonicalCitySlug}`}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Ver todos os bairros &rarr;
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.relatedNeighborhoods.map((neigh) => (
                <Link
                  key={neigh.id}
                  href={`/imoveis/${canonicalCitySlug}/${neigh.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
                >
                  {neigh.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* VITRINE DE IMÓVEIS NO BAIRRO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Imóveis disponíveis no {data.neighborhood.name}
            </h2>
            <Link
              href={`/comprar?state=${data.city.state.code.toLowerCase()}&city=${data.city.slug}&neighborhood=${data.neighborhood.name}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
            >
              Ver na busca avançada &rarr;
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
