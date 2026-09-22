import React from "react";
import { EditorialCard } from "./EditorialCard";
import type { EditorialArticle } from "../types";

interface ArticleGridProps {
  articles: EditorialArticle[];
  columns?: 2 | 3 | 4;
  compact?: boolean;
}

export function ArticleGrid({
  articles,
  columns = 4,
  compact = false,
}: ArticleGridProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={`grid ${colClasses} gap-6`}>
      {articles.map((art) => (
        <EditorialCard key={art.id} article={art} compact={compact} />
      ))}
    </div>
  );
}
