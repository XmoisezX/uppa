'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Star,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Filter,
  Check,
  AlertCircle,
  Briefcase,
  Radio,
  Award,
  X,
} from 'lucide-react';
import {
  togglePropertyFeaturedAction,
  updatePropertyStatusAction,
} from '@/features/admin/actions';
import type { AdminPropertyItem } from '@/features/admin/services/properties';

interface Props {
  initialProperties: AdminPropertyItem[];
  total: number;
}

export function PropertiesClient({ initialProperties, total }: Props) {
  const [properties, setProperties] = useState<AdminPropertyItem[]>(initialProperties);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRankingProperty, setSelectedRankingProperty] = useState<AdminPropertyItem | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.agency_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.status === 'active') ||
      (statusFilter === 'inactive' && p.status !== 'active');

    return matchesSearch && matchesStatus;
  });

  const handleToggleFeatured = (property: AdminPropertyItem) => {
    startTransition(async () => {
      const res = await togglePropertyFeaturedAction(
        property.id,
        property.featured,
        property.title
      );
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) => (p.id === property.id ? { ...p, featured: !p.featured } : p))
        );
        showNotice(
          `Imóvel ${property.featured ? 'removido dos destaques' : 'adicionado aos destaques'}!`
        );
      } else {
        showNotice(res.error || 'Erro ao alterar destaque.', 'error');
      }
    });
  };

  const handleStatusChange = (property: AdminPropertyItem, newStatus: string) => {
    startTransition(async () => {
      const res = await updatePropertyStatusAction(property.id, newStatus, property.title);
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) => (p.id === property.id ? { ...p, status: newStatus } : p))
        );
        showNotice(`Status atualizado para "${newStatus}"!`);
      } else {
        showNotice(res.error || 'Erro ao alterar status.', 'error');
      }
    });
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Moderação & Gerenciamento de Imóveis
          </h2>
          <p className="text-xs text-slate-400">
            {total} imóveis cadastrados no estoque geral do portal UPPA.
          </p>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, código, cidade ou imobiliária..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredProperties.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-600">Nenhum imóvel encontrado</div>
            <p className="text-xs text-slate-500">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cód / Imóvel</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Valores</th>
                  <th className="px-4 py-3">Origem & Anunciante</th>
                  <th className="px-4 py-3 text-center">Destaque</th>
                  <th className="px-4 py-3 text-center">Ranking</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-100/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 truncate max-w-xs">{prop.title}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-slate-500">#{prop.code || prop.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span className="capitalize">{prop.type}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-600 font-medium">
                        {prop.city ? `${prop.city}, ${prop.state || ''}` : 'Local não informado'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                        {prop.neighborhood || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono">
                      {prop.price_sale ? (
                        <div className="text-emerald-400 font-semibold">
                          {formatCurrency(prop.price_sale)}
                        </div>
                      ) : null}
                      {prop.price_rent ? (
                        <div className="text-slate-500 font-semibold">
                          {formatCurrency(prop.price_rent)}/mês
                        </div>
                      ) : null}
                      {!prop.price_sale && !prop.price_rent && (
                        <span className="text-slate-500">Sob consulta</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[140px]">{prop.agency_name || 'Particular'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Radio className="w-2.5 h-2.5 text-indigo-400" />
                        <span>{prop.feed_type ? `Feed: ${prop.feed_type}` : 'Cadastro Manual'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleFeatured(prop)}
                        disabled={isPending}
                        title={prop.featured ? 'Remover destaque' : 'Destacar na Home'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          prop.featured
                            ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-slate-600 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${prop.featured ? 'fill-amber-400' : ''}`} />
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRankingProperty(prop)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs cursor-pointer ${
                          (prop.ranking_score ?? 0) >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : (prop.ranking_score ?? 0) >= 60
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                            : (prop.ranking_score ?? 0) >= 40
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Ver diagnóstico detalhado do ranking"
                      >
                        <Award className="w-3 h-3" />
                        <span className="font-mono">{prop.ranking_score ?? 0}</span>
                        <span className="text-[9px] opacity-70">/100</span>
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={prop.status}
                        onChange={(e) => handleStatusChange(prop, e.target.value)}
                        disabled={isPending}
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition-colors ${
                          prop.status === 'active'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        <option value="draft">Rascunho</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/imovel/${prop.id}`}
                        target="_blank"
                        className="p-1.5 text-slate-400 hover:text-slate-500 rounded-lg hover:bg-slate-100 inline-flex"
                        title="Ver no portal"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Diagnóstico de Ranking */}
      {selectedRankingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Diagnóstico de Ranking</h3>
                  <p className="text-[11px] text-slate-500">Auditoria completa dos 9 critérios do algoritmo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRankingProperty(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs truncate max-w-[280px]">
                    {selectedRankingProperty.title}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>{selectedRankingProperty.agency_name || 'Particular'}</span>
                    {selectedRankingProperty.agency_verified && (
                      <span className="text-blue-500 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 inline" /> Verificada
                      </span>
                    )}
                    {selectedRankingProperty.featured && (
                      <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                        <Star className="w-3 h-3 inline fill-amber-400" /> Destaque
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {selectedRankingProperty.ranking_score ?? 0}
                    <span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score Total</div>
                </div>
              </div>

              {/* Lista dos 9 Critérios */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Discriminação dos 9 Critérios
                </div>

                {[
                  {
                    key: 'relevance',
                    label: 'Relevância da Busca',
                    score: selectedRankingProperty.ranking_breakdown?.relevance ?? 25,
                    max: 25,
                    color: 'bg-indigo-500',
                  },
                  {
                    key: 'quality',
                    label: 'Qualidade do Anúncio',
                    score: selectedRankingProperty.ranking_breakdown?.quality ?? 0,
                    max: 15,
                    color: 'bg-emerald-500',
                  },
                  {
                    key: 'featured',
                    label: 'Imóvel em Destaque',
                    score: selectedRankingProperty.ranking_breakdown?.featured ?? 0,
                    max: 15,
                    color: 'bg-amber-500',
                  },
                  {
                    key: 'verified_brokerage',
                    label: 'Imobiliária Verificada',
                    score: selectedRankingProperty.ranking_breakdown?.verified_brokerage ?? 0,
                    max: 10,
                    color: 'bg-blue-500',
                  },
                  {
                    key: 'freshness',
                    label: 'Atualização / Recência',
                    score: selectedRankingProperty.ranking_breakdown?.freshness ?? 0,
                    max: 10,
                    color: 'bg-teal-500',
                  },
                  {
                    key: 'completeness',
                    label: 'Completude dos Dados',
                    score: selectedRankingProperty.ranking_breakdown?.completeness ?? 0,
                    max: 5,
                    color: 'bg-violet-500',
                  },
                  {
                    key: 'media',
                    label: 'Qualidade de Mídia',
                    score: selectedRankingProperty.ranking_breakdown?.media ?? 0,
                    max: 5,
                    color: 'bg-pink-500',
                  },
                  {
                    key: 'price',
                    label: 'Competitividade de Preço',
                    score: selectedRankingProperty.ranking_breakdown?.price ?? 0,
                    max: 5,
                    color: 'bg-orange-500',
                  },
                  {
                    key: 'engagement',
                    label: 'Engajamento do Anúncio',
                    score: selectedRankingProperty.ranking_breakdown?.engagement ?? 0,
                    max: 5,
                    color: 'bg-purple-500',
                  },
                ].map((crit) => {
                  const pct = Math.min(100, Math.max(0, (crit.score / crit.max) * 100));
                  return (
                    <div key={crit.key} className="bg-slate-50/70 border border-slate-100 rounded-lg p-2.5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-700">{crit.label}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {crit.score} <span className="text-slate-400 font-normal">/ {crit.max}</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${crit.color} transition-all duration-300 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRankingProperty(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
