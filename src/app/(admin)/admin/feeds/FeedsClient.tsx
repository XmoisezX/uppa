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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
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
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {feeds.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded-xl">
            Nenhum feed cadastrado na plataforma.
          </div>
        ) : (
          feeds.map((feed) => {
            const isSyncing = syncingFeedId === feed.id;

            return (
              <div
                key={feed.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 hover:border-slate-300/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase shrink-0">
                      <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-slate-500' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {feed.agency_name || 'Imobiliária sem nome'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-indigo-500 border border-slate-200/60 uppercase">
                          {feed.type}
                        </span>
                        {/* Health Badge */}
                        {feed.health_status === 'healthy' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Saudável
                          </span>
                        )}
                        {feed.health_status === 'delayed' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Atrasado
                          </span>
                        )}
                        {feed.health_status === 'running' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Executando
                          </span>
                        )}
                        {feed.health_status === 'suspicious' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Trava Ativada (Suspeito)
                          </span>
                        )}
                        {feed.health_status === 'error' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Erro
                          </span>
                        )}
                        {feed.health_status === 'paused' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                            <Pause className="w-3 h-3" /> Pausado
                          </span>
                        )}
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
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Estoque & Encontrados
                    </span>
                    <span className="font-bold text-slate-800 block">
                      {feed.properties_count} ativos
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Último lote: {feed.latest_run?.items_found ?? 0} lidos
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Execução & Sucesso
                    </span>
                    <span className="font-mono text-slate-700 block text-[11px]">
                      Tentativa: {feed.last_sync_at
                        ? new Date(feed.last_sync_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Nunca'}
                    </span>
                    <span className="font-mono text-emerald-600 block text-[11px]">
                      Sucesso: {feed.last_successful_sync_at
                        ? new Date(feed.last_successful_sync_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Nenhum'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Agendamento
                    </span>
                    <span className="text-slate-700 block">
                      Intervalo: {Math.round(feed.sync_interval_minutes / 60)}h
                    </span>
                    <span className="font-mono text-slate-500 block text-[11px]">
                      Próximo: {feed.next_sync_at
                        ? new Date(feed.next_sync_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Pendente'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Último Balanço
                    </span>
                    {feed.latest_run ? (
                      <div>
                        <div className="font-mono text-[11px] flex flex-wrap gap-1.5 mt-0.5">
                          <span className="text-emerald-600 font-semibold">+{feed.latest_run.items_created}</span>
                          <span className="text-blue-600 font-semibold">~{feed.latest_run.items_updated}</span>
                          <span className="text-amber-600 font-semibold">-{feed.latest_run.items_deactivated}</span>
                          {feed.latest_run.items_failed > 0 && (
                            <span className="text-red-500 font-semibold">!{feed.latest_run.items_failed}</span>
                          )}
                        </div>
                        {feed.latest_run.error_message && (
                          <span className="text-[10px] text-red-500 block truncate mt-1" title={feed.latest_run.error_message}>
                            {feed.latest_run.error_message}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">Sem execuções</span>
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
