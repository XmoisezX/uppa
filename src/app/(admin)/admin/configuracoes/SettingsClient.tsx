'use client';

import { useState, useTransition } from 'react';
import { Settings, Save, Check, AlertCircle, Shield, Server, Database } from 'lucide-react';
import { saveSiteSettingAction } from '@/features/admin/actions';
import type { SiteSettingsData } from '@/types/admin';

interface Props {
  initialSettings: SiteSettingsData;
}

export function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Configurações Gerais da Plataforma UPPA
          </h2>
          <p className="text-xs text-slate-400">
            Parâmetros operacionais e status do ecossistema Supabase + Next.js.
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

      {/* System Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Server className="w-4 h-4 text-blue-400" />
            Ambiente Next.js
          </div>
          <div className="text-base font-bold text-white">Next.js 16 (App Router)</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Servidor Operacional
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Database className="w-4 h-4 text-indigo-400" />
            Banco de Dados
          </div>
          <div className="text-base font-bold text-white">PostgreSQL + PostGIS</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Conectado ao Supabase
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Shield className="w-4 h-4 text-amber-400" />
            Segurança RLS
          </div>
          <div className="text-base font-bold text-white">Row Level Security</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Políticas Ativas
          </div>
        </div>
      </div>

      {/* Security & Architecture Guidelines Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Diretrizes de Segurança do MASTER_PLAN
        </h3>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            • <strong>Service Role Key</strong> é estritamente isolada no servidor (`createAdminClient()`) e nunca exposta em componentes cliente ou APIs públicas.
          </p>
          <p>
            • A rota <strong>/admin</strong> é protegida duplamente por <code>proxy.ts</code>/<code>middleware.ts</code> e checagem de privilégio via <code>getCurrentAdminUser()</code> no layout do servidor.
          </p>
          <p>
            • O Super Administrador raiz (<code>moiseztorres100@gmail.com</code>) possui privilégios totais e irreversíveis através de validação atômica no banco de dados e na aplicação.
          </p>
          <p>
            • Todas as operações de criação, edição ou exclusão de dados administrativos são registradas automaticamente na tabela <code>admin_audit_logs</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
