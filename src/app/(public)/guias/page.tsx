import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Sparkles, Search, Compass, ShieldCheck } from "lucide-react";
import {
  getEditorialArticles,
  getEditorialCategories,
  getFeaturedEditorialArticles,
} from "@/features/editorial";
import { ArticleGrid, GuideCard } from "@/features/editorial/components";
import type { EditorialCategory } from "@/features/editorial/types";

interface GuiasPageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export const metadata: Metadata = {
  title: "Guias & Dicas Imobiliárias | UPPA Portal Imobiliário",
  description:
    "Aprenda tudo sobre compra, aluguel, financiamento habitacional, documentação, reforma e mercado imobiliário com os guias práticos da UPPA.",
  alternates: {
    canonical: "https://uppa.com.br/guias",
  },
  openGraph: {
    title: "Guias & Dicas Imobiliárias | UPPA",
    description:
      "Aprenda tudo sobre compra, aluguel, financiamento habitacional, documentação e mercado imobiliário.",
    url: "https://uppa.com.br/guias",
    type: "website",
  },
};

export default async function GuiasPage({ searchParams }: GuiasPageProps) {
  const params = await searchParams;
  const currentCategory = (params.categoria as EditorialCategory) || undefined;

  const categories = getEditorialCategories();
  const articles = getEditorialArticles(currentCategory);
  const featuredArticles = getFeaturedEditorialArticles(3);

  const activeCategoryInfo = categories.find((c) => c.key === currentCategory);

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* HERO DA CAMADA EDITORIAL */}
        <div className="rounded-3xl bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Conhecimento & Mercado Imobiliário</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Guias Práticos para Fazer Negócios Imobiliários com Segurança
            </h1>

            <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
              Tire suas dúvidas sobre financiamento, certidões obrigatórias, direitos de locação, vistoria e estratégias de compra e venda sem surpresas.
            </p>
          </div>
        </div>

        {/* GUIAS ESSENCIAIS EM DESTAQUE (3 CARDS) */}
        {!currentCategory && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Guias em Destaque</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredArticles.map((art) => (
                <GuideCard
                  key={art.id}
                  title={art.title}
                  description={art.summary}
                  category={art.categoryLabel}
                  href={`/guias/${art.slug}`}
                  badge="Essencial"
                  stepsCount={art.sections.length}
                />
              ))}
            </div>
          </section>
        )}

        {/* NAVEGAÇÃO POR CATEGORIAS */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <Link
              href="/guias"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !currentCategory
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Todos os Guias ({getEditorialArticles().length})
            </Link>

            {categories.map((cat) => {
              const isActive = currentCategory === cat.key;
              const count = getEditorialArticles(cat.key).length;
              return (
                <Link
                  key={cat.key}
                  href={`/guias?categoria=${cat.key}`}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </Link>
              );
            })}
          </div>

          {/* CABEÇALHO DO FILTRO ATIVO */}
          {activeCategoryInfo && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeCategoryInfo.label}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeCategoryInfo.description}
              </p>
            </div>
          )}

          {/* GRADE DE ARTIGOS */}
          <ArticleGrid articles={articles} columns={3} />
        </section>

        {/* BANNER CTA: ENCONTRE SEU IMÓVEL NA UPPA */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Pronto para aplicar o conhecimento na prática?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explore milhares de imóveis à venda e para alugar anunciados diretamente por imobiliárias e corretores credenciados.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/comprar"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Buscar Imóveis à Venda
            </Link>
            <Link
              href="/alugar"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
            >
              Buscar para Alugar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
