'use client';

import { useState, useTransition } from 'react';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Briefcase,
  ExternalLink,
  Check,
  AlertCircle,
  Pause,
} from 'lucide-react';
import { toggleFeedStatusAction, triggerFeedSyncAction } from '@/features/admin/actions';
import type { AdminFeedItem } from '@/features/admin/services/feeds';

interface Props {
  initialFeeds: AdminFeedItem[];
}

export function FeedsClient({ initialFeeds }: Props) {
  const [feeds, setFeeds] = useState<AdminFeedItem[]>(initialFeeds);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleToggleStatus = (feed: AdminFeedItem) => {
    startTransition(async () => {
      const res = await toggleFeedStatusAction(feed.id, feed.status, feed.agency_name || undefined);
      if (res.success) {
        const nextStatus = feed.status === 'active' ? 'paused' : 'active';
        setFeeds((prev) =>
          prev.map((f) => (f.id === feed.id ? { ...f, status: nextStatus } : f))
        );
        showNotice(`Feed ${nextStatus === 'active' ? 'ativado' : 'pausado'} com sucesso!`);
      } else {
        showNotice(res.error || 'Erro ao alterar status do feed.', 'error');
      }
    });
  };

  const handleManualSync = (feed: AdminFeedItem) => {
    setSyncingFeedId(feed.id);

    startTransition(async () => {
      try {
        const res = await triggerFeedSyncAction(feed.id, feed.agency_name || undefined);
        if (res.success) {
          showNotice(
            `Sincronização manual concluída! Encontrados: ${res.report?.itemsFound || 0}, Novos: ${res.report?.itemsCreated || 0}, Atualizados: ${res.report?.itemsUpdated || 0}.`
          );
          window.location.reload();
        } else {
          showNotice(res.error || 'Erro ao executar sincronização.', 'error');
        }
      } catch (err: any) {
        showNotice(err?.message || 'Erro inesperado na sincronização.', 'error');
      } finally {
        setSyncingFeedId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Integrações de Feeds XML / VRSync
          </h2>
          <p className="text-xs text-slate-400">
            Monitore a importação contínua de estoques imobiliários e execute sincronizações manuais sob demanda.
          </p>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {feeds.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/80 border border-slate-800 rounded-xl">
            Nenhum feed cadastrado na plataforma.
          </div>
        ) : (
          feeds.map((feed) => {
            const isSyncing = syncingFeedId === feed.id;

            return (
              <div
                key={feed.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 font-bold uppercase shrink-0">
                      <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {feed.agency_name || 'Imobiliária sem nome'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-400 border border-slate-700/60 uppercase">
                          {feed.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            feed.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {feed.status === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-md font-mono mt-0.5">
                        {feed.url}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleStatus(feed)}
                      disabled={isPending || isSyncing}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      {feed.status === 'active' ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Ativar
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleManualSync(feed)}
                      disabled={isPending || isSyncing}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Imóveis Importados
                    </span>
                    <span className="font-bold text-slate-200">
                      {feed.properties_count} imóveis
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Última Sincronização
                    </span>
                    <span className="font-mono text-slate-300">
                      {feed.last_sync_at
                        ? new Date(feed.last_sync_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Nunca'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Intervalo de Sinc.
                    </span>
                    <span className="text-slate-300">
                      A cada {Math.round(feed.sync_interval_minutes / 60)} horas
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Status da Última Corrida
                    </span>
                    {feed.latest_run ? (
                      <span
                        className={`font-semibold ${
                          feed.latest_run.status === 'completed'
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {feed.latest_run.status === 'completed'
                          ? `Sucesso (+${feed.latest_run.items_created} / ~${feed.latest_run.items_updated})`
                          : `Falha: ${feed.latest_run.error_message || 'Erro'}`}
                      </span>
                    ) : (
                      <span className="text-slate-500">Sem histórico</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
