import React from "react";
import { BookOpen } from "lucide-react";
import { getFeaturedEditorialArticles } from "@/features/editorial";
import { ContentSection, ArticleGrid } from "@/features/editorial/components";

export function HomeEditorialSection() {
  const articles = getFeaturedEditorialArticles(4);

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <ContentSection
      badgeIcon={BookOpen}
      badgeText="Guias & Conhecimento"
      title="Conteúdo & Dicas Imobiliárias"
      subtitle="Orientações essenciais sobre compra, locação, financiamento, documentação e reformas sem surpresas"
      actionHref="/guias"
      actionLabel="Ver todos os guias"
      className="bg-slate-50/70 dark:bg-slate-900/30"
    >
      <ArticleGrid articles={articles} columns={4} />
    </ContentSection>
  );
}
