'use client';

import { useState, useTransition } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointer,
  AlertCircle,
  Check,
} from 'lucide-react';
import { saveBannerAction, deleteBannerAction } from '@/features/admin/actions';
import type { Banner, BannerPosition } from '@/features/banners/types';

interface Props {
  initialBanners: Banner[];
}

const POSITIONS: { value: BannerPosition; label: string }[] = [
  { value: 'home_hero', label: 'Home — Topo (Hero)' },
  { value: 'home_after_featured', label: 'Home — Após Destaques' },
  { value: 'home_editorial', label: 'Home — Meio (Editorial)' },
  { value: 'search_top', label: 'Busca — Topo' },
  { value: 'search_middle', label: 'Busca — Meio' },
  { value: 'property_bottom', label: 'Ficha do Imóvel — Rodapé' },
];

export function BannersClient({ initialBanners }: Props) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleStatus = (banner: Banner) => {
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';
    startTransition(async () => {
      const res = await saveBannerAction({ id: banner.id, status: newStatus });
      if (res.success) {
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, status: newStatus } : b))
        );
        showNotice(`Banner ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
      } else {
        showNotice(res.error || 'Erro ao alterar status.', 'error');
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o banner "${title}"?`)) return;

    startTransition(async () => {
      const res = await deleteBannerAction(id, title);
      if (res.success) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        showNotice('Banner excluído com sucesso!');
      } else {
        showNotice(res.error || 'Erro ao excluir banner.', 'error');
      }
    });
  };

  const handleSave = () => {
    if (!editingBanner?.title || !editingBanner?.imageUrlDesktop || !editingBanner?.destinationUrl) {
      showNotice('Preencha os campos obrigatórios: Título, Imagem Desktop e Link de Destino.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await saveBannerAction(editingBanner);
      if (res.success) {
        showNotice('Banner salvo com sucesso!');
        setEditingBanner(null);
        // Recarrega a página para atualizar lista
        window.location.reload();
      } else {
        showNotice(res.error || 'Erro ao salvar banner.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gerenciamento de Banners & Campanhas
          </h2>
          <p className="text-xs text-slate-400">
            Controle os espaços publicitários do portal, URLs de destino, imagens e monitore impressões e cliques.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingBanner({
              title: '',
              imageUrlDesktop: '',
              imageUrlMobile: '',
              destinationUrl: '',
              position: 'home_editorial',
              status: 'active',
              priority: 1,
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-lg shadow-slate-200/60"
        >
          <Plus className="w-4 h-4" />
          Novo Banner
        </button>
      </div>

      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {banners.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-600">Nenhum banner cadastrado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Crie o primeiro anúncio publicitário para ser exibido nas páginas do portal UPPA.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Banner / Anúncio</th>
                  <th className="px-4 py-3">Posição (Slot)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Desempenho</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {banners.map((banner) => {
                  const ctr =
                    banner.impressions && banner.impressions > 0
                      ? (((banner.clicks || 0) / banner.impressions) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <tr key={banner.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded-lg bg-slate-100 border border-slate-200/60 overflow-hidden shrink-0 relative">
                            {banner.imageUrlDesktop ? (
                              <img
                                src={banner.imageUrlDesktop}
                                alt={banner.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-xs">{banner.title}</div>
                            <a
                              href={banner.destinationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-slate-500 hover:underline inline-flex items-center gap-1 truncate max-w-xs"
                            >
                              <span className="truncate">{banner.destinationUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60 uppercase">
                          {banner.position}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(banner)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            banner.status === 'active'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-100 border border-slate-200 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {banner.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {banner.status === 'active' ? 'Ativo' : 'Pausado'}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-slate-600">
                          {banner.priority || 0}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-3 text-slate-600 font-medium">
                            <span className="flex items-center gap-1" title="Impressões">
                              <Eye className="w-3 h-3 text-slate-400" />
                              {banner.impressions?.toLocaleString('pt-BR') || 0}
                            </span>
                            <span className="flex items-center gap-1" title="Cliques">
                              <MousePointer className="w-3 h-3 text-emerald-400" />
                              {banner.clicks || 0}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            CTR: <strong className="text-slate-600">{ctr}%</strong>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingBanner(banner)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(banner.id, banner.title)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingBanner.id ? 'Editar Banner Publicitário' : 'Novo Banner Publicitário'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Título do Anúncio *</label>
                <input
                  type="text"
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  placeholder="Ex: Campanha Lançamentos Jardins"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">URL da Imagem Desktop *</label>
                <input
                  type="text"
                  value={editingBanner.imageUrlDesktop || ''}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, imageUrlDesktop: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  placeholder="https://.../banner-desktop.webp"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  URL da Imagem Mobile (Opcional)
                </label>
                <input
                  type="text"
                  value={editingBanner.imageUrlMobile || ''}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, imageUrlMobile: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  placeholder="https://.../banner-mobile.webp"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">URL de Destino (Link do Clique) *</label>
                <input
                  type="text"
                  value={editingBanner.destinationUrl || ''}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, destinationUrl: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  placeholder="https://anunciante.com.br ou /comprar?cidade=sao-paulo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Posição no Layout</label>
                  <select
                    value={editingBanner.position || 'home_editorial'}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        position: e.target.value as BannerPosition,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Prioridade de Exibição</label>
                  <input
                    type="number"
                    value={editingBanner.priority || 0}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        priority: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={editingBanner.startAt ? editingBanner.startAt.slice(0, 10) : ''}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        startAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Data de Término</label>
                  <input
                    type="date"
                    value={editingBanner.endAt ? editingBanner.endAt.slice(0, 10) : ''}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        endAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Status Inicial</label>
                <select
                  value={editingBanner.status || 'active'}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                >
                  <option value="active">Ativo (Em Veiculação)</option>
                  <option value="inactive">Pausado (Inativo)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingBanner(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                Salvar Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
