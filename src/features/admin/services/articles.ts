import { createAdminClient } from '@/lib/supabase/admin';
import type { ArticleCMS } from '@/types/admin';
import { EDITORIAL_ARTICLES } from '@/features/editorial/data/articles';

function mapStaticToArticleCMS(item: any): ArticleCMS {
  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    content: item.content,
    category: item.category,
    tags: item.tags || [],
    cover_image: item.coverImage,
    author_name: item.author?.name || 'Equipe Editorial UPPA',
    author_role: item.author?.role || 'Especialista Imobiliário',
    status: 'published',
    featured: !!item.featured,
    seo_title: item.title,
    seo_description: item.summary,
    read_time: item.readTime || '4 min de leitura',
    published_at: item.publishedAt || new Date().toISOString(),
    created_at: item.publishedAt || new Date().toISOString(),
    updated_at: item.publishedAt || new Date().toISOString(),
  };
}

export async function getAllArticles(): Promise<ArticleCMS[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as ArticleCMS[];
    }
  } catch {
    // Tabela ainda não migrada
  }

  // Fallback seguro para artigos editoriais existentes
  return EDITORIAL_ARTICLES.map(mapStaticToArticleCMS);
}

export async function getArticleBySlug(slug: string): Promise<ArticleCMS | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      return data as ArticleCMS;
    }
  } catch {
    // Tabela ainda não migrada
  }

  const staticItem = EDITORIAL_ARTICLES.find((a) => a.slug === slug);
  if (staticItem) {
    return mapStaticToArticleCMS(staticItem);
  }

  return null;
}

export async function createArticle(articleData: Partial<ArticleCMS>): Promise<ArticleCMS> {
  const supabase = createAdminClient();
  const slug =
    articleData.slug ||
    articleData.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') ||
    `artigo-${Date.now()}`;

  const { data, error } = await supabase
    .from('articles')
    .insert({
      slug,
      title: articleData.title,
      summary: articleData.summary || null,
      content: articleData.content || '',
      category: articleData.category || 'Mercado Imobiliário',
      tags: articleData.tags || [],
      cover_image: articleData.cover_image || null,
      author_name: articleData.author_name || 'Equipe Editorial UPPA',
      author_role: articleData.author_role || 'Especialista Imobiliário',
      status: articleData.status || 'published',
      featured: articleData.featured || false,
      seo_title: articleData.seo_title || articleData.title,
      seo_description: articleData.seo_description || articleData.summary,
      read_time: articleData.read_time || '5 min de leitura',
      published_at:
        articleData.status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao criar artigo');
  }

  return data as ArticleCMS;
}

export async function updateArticle(id: string, updates: Partial<ArticleCMS>): Promise<boolean> {
  const supabase = createAdminClient();
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.summary !== undefined) payload.summary = updates.summary;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.cover_image !== undefined) payload.cover_image = updates.cover_image;
  if (updates.author_name !== undefined) payload.author_name = updates.author_name;
  if (updates.author_role !== undefined) payload.author_role = updates.author_role;
  if (updates.status !== undefined) {
    payload.status = updates.status;
    if (updates.status === 'published' && !updates.published_at) {
      payload.published_at = new Date().toISOString();
    }
  }
  if (updates.featured !== undefined) payload.featured = updates.featured;
  if (updates.seo_title !== undefined) payload.seo_title = updates.seo_title;
  if (updates.seo_description !== undefined) payload.seo_description = updates.seo_description;
  if (updates.read_time !== undefined) payload.read_time = updates.read_time;

  const { error } = await supabase.from('articles').update(payload).eq('id', id);
  return !error;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('articles').delete().eq('id', id);
  return !error;
}
