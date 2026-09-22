import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface Props {
  userEmail?: string;
}

export function AdminAccessDenied({ userEmail }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            403 — Acesso Restrito
          </h1>
          <p className="text-sm text-slate-400">
            A conta <strong className="text-slate-200">{userEmail || 'conectada'}</strong> não possui privilégios para acessar a Área Administrativa da UPPA.
          </p>
        </div>

        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 text-left space-y-1">
          <p className="font-semibold text-slate-300">Precisa de permissão?</p>
          <p>
            Solicite a um Super Admin da UPPA a inclusão do seu e-mail na tabela de administradores ou verifique seu cargo atual.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-slate-700"
          >
            <Home className="w-4 h-4" />
            Página Inicial
          </Link>
          <Link
            href="/painel"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Painel da Agência
          </Link>
        </div>
      </div>
    </div>
  );
}
