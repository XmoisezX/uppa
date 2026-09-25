'use client';

import { useState, useTransition } from 'react';
import {
  Briefcase,
  Search,
  CheckCircle,
  XCircle,
  Building2,
  ExternalLink,
  Phone,
  Mail,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { VerifiedIcon } from '@/components/ui/verified-badge';
import {
  toggleAgencyVerificationAction,
  updateAgencyStatusAction,
} from '@/features/admin/actions';
import type { AdminAgencyItem } from '@/features/admin/services/agencies';

interface Props {
  initialAgencies: AdminAgencyItem[];
}

export function AgenciesClient({ initialAgencies }: Props) {
  const [agencies, setAgencies] = useState<AdminAgencyItem[]>(initialAgencies);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const filtered = agencies.filter((a) => {
    return (
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.creci?.toLowerCase().includes(search.toLowerCase()) ||
      a.document?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleToggleVerification = (agency: AdminAgencyItem) => {
    startTransition(async () => {
      const res = await toggleAgencyVerificationAction(agency.id, agency.verified, agency.name);
      if (res.success) {
        setAgencies((prev) =>
          prev.map((a) => (a.id === agency.id ? { ...a, verified: !a.verified } : a))
        );
        showNotice(`Selo de verificação da ${agency.name} atualizado!`);
      } else {
        showNotice(res.error || 'Erro ao alterar verificação.', 'error');
      }
    });
  };

  const handleStatusChange = (agency: AdminAgencyItem, newStatus: string) => {
    startTransition(async () => {
      const res = await updateAgencyStatusAction(agency.id, newStatus, agency.name);
      if (res.success) {
        setAgencies((prev) =>
          prev.map((a) => (a.id === agency.id ? { ...a, status: newStatus } : a))
        );
        showNotice(`Status da ${agency.name} atualizado para "${newStatus}"!`);
      } else {
        showNotice(res.error || 'Erro ao alterar status.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Imobiliárias & Anunciantes Credenciados
          </h2>
          <p className="text-xs text-slate-400">
            {agencies.length} parceiros cadastrados promovendo imóveis no portal.
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

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CRECI, CNPJ ou e-mail..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhuma imobiliária ou anunciante encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Anunciante</th>
                  <th className="px-4 py-3">CRECI / Documento</th>
                  <th className="px-4 py-3">Contatos</th>
                  <th className="px-4 py-3 text-center">Imóveis Ativos</th>
                  <th className="px-4 py-3 text-center">Verificação</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-100/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center font-bold text-slate-900 uppercase shrink-0">
                          {agency.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{agency.name}</span>
                            {agency.verified && (
                              <span title="Imobiliária Verificada">
                                <VerifiedIcon className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                          {agency.legal_name && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {agency.legal_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      <div>{agency.creci ? `CRECI: ${agency.creci}` : 'Sem CRECI'}</div>
                      <div className="text-[10px] text-slate-500">{agency.document || '—'}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      <div className="space-y-0.5">
                        {agency.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[150px]">{agency.email}</span>
                          </div>
                        )}
                        {(agency.phone || agency.whatsapp) && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{agency.whatsapp || agency.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500 border border-slate-200/60">
                        <Building2 className="w-3 h-3" />
                        {agency.properties_count}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleVerification(agency)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                          agency.verified
                            ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {agency.verified ? <VerifiedIcon className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {agency.verified ? 'Verificada' : 'Não Verificada'}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={agency.status}
                        onChange={(e) => handleStatusChange(agency, e.target.value)}
                        disabled={isPending}
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition-colors ${
                          agency.status === 'active'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Pendente/Inativo</option>
                        <option value="suspended">Suspenso</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
