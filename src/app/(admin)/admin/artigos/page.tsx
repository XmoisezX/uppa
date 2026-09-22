import { getAllArticles } from '@/features/admin/services/articles';
import { ArticlesClient } from './ArticlesClient';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  const articles = await getAllArticles();
  return <ArticlesClient initialArticles={articles} />;
}
