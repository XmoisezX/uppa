'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Tag,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { saveArticleAction, deleteArticleAction } from '@/features/admin/actions';
import type { ArticleCMS } from '@/types/admin';

interface Props {
  initialArticles: ArticleCMS[];
}

const CATEGORIES = [
  'Mercado Imobiliário',
  'Comprar Imóvel',
  'Aluguel',
  'Financiamento',
  'Investimentos',
  'Documentação & Jurídico',
  'Arquitetura & Decoração',
];

export function ArticlesClient({ initialArticles }: Props) {
  const [articles, setArticles] = useState<ArticleCMS[]>(initialArticles);
  const [editingArticle, setEditingArticle] = useState<Partial<ArticleCMS> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleStatus = (article: ArticleCMS) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    startTransition(async () => {
      const res = await saveArticleAction({ id: article.id, status: newStatus, slug: article.slug });
      if (res.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, status: newStatus } : a))
        );
        showNotice(`Artigo ${newStatus === 'published' ? 'publicado' : 'colocado em rascunho'}!`);
      } else {
        showNotice(res.error || 'Erro ao alterar status.', 'error');
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o artigo "${title}"?`)) return;

    startTransition(async () => {
      const res = await deleteArticleAction(id, title);
      if (res.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        showNotice('Artigo excluído com sucesso!');
      } else {
        showNotice(res.error || 'Erro ao excluir artigo.', 'error');
      }
    });
  };

  const handleSave = () => {
    if (!editingArticle?.title || !editingArticle?.content) {
      showNotice('Título e Conteúdo são obrigatórios.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await saveArticleAction(editingArticle);
      if (res.success) {
        showNotice('Artigo salvo com sucesso!');
        setEditingArticle(null);
        window.location.reload();
      } else {
        showNotice(res.error || 'Erro ao salvar artigo.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            CMS de Artigos, Guias & Blog
          </h2>
          <p className="text-xs text-slate-400">
            Publique conteúdos editoriais para fortalecer a autoridade do portal UPPA e a indexação no Google.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingArticle({
              title: '',
              slug: '',
              summary: '',
              content: '',
              category: 'Mercado Imobiliário',
              tags: ['guia', 'imoveis'],
              cover_image: '',
              author_name: 'Equipe Editorial UPPA',
              author_role: 'Especialista Imobiliário',
              status: 'published',
              featured: false,
              seo_title: '',
              seo_description: '',
              read_time: '4 min de leitura',
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Novo Artigo
        </button>
      </div>

      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-300">Nenhum artigo encontrado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Comece a produzir conteúdo editorial sobre mercado imobiliário para atrair compradores e inquilinos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Artigo / Título</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {articles.map((art) => (
                  <tr key={art.id || art.slug} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0">
                          {art.cover_image ? (
                            <img
                              src={art.cover_image}
                              alt={art.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate max-w-xs">{art.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-500">/{art.slug}</span>
                            {art.featured && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Destaque
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-purple-400 border border-slate-700/60">
                        {art.category}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(art)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                          art.status === 'published'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {art.status === 'published' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {art.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{art.author_name}</div>
                      <div className="text-[10px] text-slate-500">{art.author_role}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {art.published_at ? new Date(art.published_at).toLocaleDateString('pt-BR') : '—'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/guias/${art.slug}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                          title="Visualizar Artigo Público"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setEditingArticle(art)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(art.id, art.title)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingArticle.id ? 'Editar Artigo no CMS' : 'Criar Novo Artigo'}
            </h3>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Título do Artigo *</label>
                  <input
                    type="text"
                    value={editingArticle.title || ''}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '');
                      setEditingArticle({
                        ...editingArticle,
                        title,
                        slug: editingArticle.id ? editingArticle.slug : slug,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="Ex: Como Escolher o Primeiro Imóvel"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Slug da URL amigável</label>
                  <input
                    type="text"
                    value={editingArticle.slug || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, slug: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="como-escolher-o-primeiro-imovel"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Resumo / Subtítulo</label>
                <textarea
                  rows={2}
                  value={editingArticle.summary || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Breve resumo que aparece nos cards e meta description..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Categoria</label>
                  <select
                    value={editingArticle.category || 'Mercado Imobiliário'}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Status</label>
                  <select
                    value={editingArticle.status || 'published'}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        status: e.target.value as 'draft' | 'published',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="published">Publicado</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Tempo de Leitura</label>
                  <input
                    type="text"
                    value={editingArticle.read_time || '4 min de leitura'}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, read_time: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">URL da Imagem de Capa</label>
                <input
                  type="text"
                  value={editingArticle.cover_image || ''}
                  onChange={(e) =>
                    setEditingArticle({ ...editingArticle, cover_image: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="https://.../capa.jpg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Conteúdo Completo (Markdown / Texto Rico) *</label>
                <textarea
                  rows={10}
                  value={editingArticle.content || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono leading-relaxed"
                  placeholder="Escreva o artigo completo com parágrafos, subtítulos (##) e tópicos..."
                />
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200">SEO & Indexação</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editingArticle.seo_title || ''}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, seo_title: e.target.value })
                    }
                    placeholder="Meta Title (Opcional)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={editingArticle.seo_description || ''}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, seo_description: e.target.value })
                    }
                    placeholder="Meta Description (Opcional)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingArticle(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                Salvar Artigo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
