'use client';

import { useState } from 'react';
import { History, Search, Filter, Clock, User, FileText } from 'lucide-react';
import type { AdminAuditLog } from '@/types/admin';

interface Props {
  initialLogs: AdminAuditLog[];
}

export function AuditClient({ initialLogs }: Props) {
  const [logs] = useState<AdminAuditLog[]>(initialLogs);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.record_title?.toLowerCase().includes(search.toLowerCase());

    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;

    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Trilha de Auditoria & Logs Administrativos
          </h2>
          <p className="text-xs text-slate-400">
            Registro imutável de todas as ações executadas por operadores e administradores no portal.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuário, ação ou registro afetado..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Módulos</option>
            <option value="banners">Banners</option>
            <option value="articles">Artigos / CMS</option>
            <option value="properties">Imóveis</option>
            <option value="users">Usuários</option>
            <option value="roles">Cargos</option>
            <option value="agencies">Agências</option>
            <option value="feeds">Feeds</option>
            <option value="site">Site & FAQs</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum evento de auditoria encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Usuário Responsável</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Registro Afetado</th>
                  <th className="px-4 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        {log.user_name || log.user_email || 'Sistema Automático'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {log.user_email || 'service_role'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-blue-400 border border-slate-700/60 uppercase">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-300 font-semibold">
                        {log.module}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      <div className="font-medium truncate max-w-xs">
                        {log.record_title || 'Registro sem título'}
                      </div>
                      {log.record_id && (
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                          ID: {log.record_id}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {log.changes ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                        >
                          Payload
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Alterações Registradas — {selectedLog.action}
            </h3>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono overflow-x-auto max-h-80">
              <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
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
