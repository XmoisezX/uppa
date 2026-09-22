import React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Calendar, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EditorialArticle } from "../types";

interface EditorialCardProps {
  article: EditorialArticle;
  compact?: boolean;
}

export function EditorialCard({ article, compact = false }: EditorialCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-indigo-200 hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Metadados: Categoria e Tempo de Leitura */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge
            variant="secondary"
            className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
          >
            {article.categoryLabel}
          </Badge>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <Clock className="h-3 w-3" />
            {article.readTime}
          </span>
        </div>

        {/* Título */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white leading-snug">
          <Link href={`/guias/${article.slug}`}>
            {article.title}
          </Link>
        </h3>

        {/* Resumo */}
        {!compact && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
            {article.summary}
          </p>
        )}
      </div>

      {/* Rodapé do Card */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(article.publishedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>

        <Link
          href={`/guias/${article.slug}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-transform group-hover:translate-x-0.5"
        >
          <span>Ler guia</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
