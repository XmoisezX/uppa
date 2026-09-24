import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface Props {
  userEmail?: string;
}

export function AdminAccessDenied({ userEmail }: Props) {
  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-8 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            403 — Acesso Restrito
          </h1>
          <p className="text-sm text-slate-500">
            A conta <strong className="text-slate-700">{userEmail || 'conectada'}</strong> não possui privilégios para acessar a Área Administrativa da UPPA.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-500 text-left space-y-1">
          <p className="font-semibold text-slate-700">Precisa de permissão?</p>
          <p>
            Solicite a um Super Admin da UPPA a inclusão do seu e-mail na tabela de administradores ou verifique seu cargo atual.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium transition-colors border border-slate-200"
          >
            <Home className="w-4 h-4" />
            Página Inicial
          </Link>
          <Link
            href="/painel"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Painel da Agência
          </Link>
        </div>
      </div>
    </div>
  );
}
