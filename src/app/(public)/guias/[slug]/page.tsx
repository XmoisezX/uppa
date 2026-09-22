import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Clock,
  Calendar,
  User,
  Share2,
  BookOpen,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getEditorialArticleBySlug,
  getRelatedArticles,
} from "@/features/editorial";
import { getArticleBySlug } from "@/features/admin/services/articles";
import type { EditorialArticle } from "@/features/editorial/types";
import { ArticleGrid } from "@/features/editorial/components";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

async function resolveArticle(slug: string): Promise<EditorialArticle | undefined> {
  try {
    const dbArticle = await getArticleBySlug(slug);
    if (dbArticle) {
      const validCats = ['compra', 'aluguel', 'financiamento', 'documentacao', 'mercado', 'decoracao', 'reforma', 'cidades', 'bairros'];
      const catKey = validCats.includes(dbArticle.category.toLowerCase())
        ? dbArticle.category.toLowerCase()
        : 'mercado';

      return {
        id: dbArticle.id,
        slug: dbArticle.slug,
        title: dbArticle.title,
        summary: dbArticle.summary || '',
        category: catKey as any,
        categoryLabel: dbArticle.category,
        tags: dbArticle.tags,
        author: {
          name: dbArticle.author_name,
          role: dbArticle.author_role,
        },
        readTime: dbArticle.read_time || '4 min de leitura',
        publishedAt: dbArticle.published_at || new Date().toISOString(),
        updatedAt: dbArticle.updated_at || new Date().toISOString(),
        featured: dbArticle.featured,
        sections: [
          {
            title: 'Conteúdo do Guia',
            content: dbArticle.content.split('\n\n').filter(Boolean),
          },
        ],
      };
    }
  } catch {
    // fallback
  }

  return getEditorialArticleBySlug(slug);
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await resolveArticle(slug);

  if (!article) {
    return {
      title: "Guia não encontrado | UPPA",
      description: "O artigo solicitado não foi localizado.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uppa.com.br";
  const canonicalUrl = `${siteUrl}/guias/${article.slug}`;

  return {
    title: `${article.title} | UPPA Guias`,
    description: article.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: article.title,
      description: article.summary,
      url: canonicalUrl,
      type: "article",
      siteName: "UPPA Portal Imobiliário",
      locale: "pt_BR",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await resolveArticle(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedArticles(article.slug, 3);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uppa.com.br";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: article.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "UPPA Portal Imobiliário",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/guias/${article.slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20 pt-6">
      {/* Schema Estruturado JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* BREADCRUMB */}
        <nav
          aria-label="Navegação estrutural"
          className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto scrollbar-none py-1"
        >
          <Link href="/" className="hover:text-indigo-600 transition-colors whitespace-nowrap">
            Início
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />

          <Link href="/guias" className="hover:text-indigo-600 transition-colors whitespace-nowrap">
            Guias & Conhecimento
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />

          <Link
            href={`/guias?categoria=${article.category}`}
            className="hover:text-indigo-600 transition-colors whitespace-nowrap font-medium"
          >
            {article.categoryLabel}
          </Link>
        </nav>

        {/* CABEÇALHO DO ARTIGO */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-bold text-xs uppercase tracking-wide">
              {article.categoryLabel}
            </Badge>

            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>

            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Atualizado em {new Date(article.updatedAt).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {article.title}
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {article.summary}
          </p>

          {/* Autoria */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <User className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {article.author.name}
              </span>
              <span className="text-[11px] text-slate-400">
                {article.author.role}
              </span>
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL DO GUIA */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-8">
          {article.sections.map((section, idx) => (
            <section key={idx} className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {section.title}
              </h2>
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {section.content.map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          {/* TAGS */}
          {article.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">Temas relacionados:</span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* CTA INLINE DE CONVERSÃO PARA COMPRA/ALUGUEL */}
        <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Procurando seu próximo imóvel?
            </span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Veja imóveis reais anunciados diretamente por imobiliárias credenciadas.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/comprar"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Ver à Venda
            </Link>
            <Link
              href="/alugar"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            >
              Ver para Alugar
            </Link>
          </div>
        </div>

        {/* GUIAS RELACIONADOS */}
        {related.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Continue Aprendendo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Outros guias que podem te ajudar
                </p>
              </div>

              <Link
                href="/guias"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Ver todos os guias →
              </Link>
            </div>

            <ArticleGrid articles={related} columns={3} compact />
          </section>
        )}
      </div>
    </main>
  );
}
