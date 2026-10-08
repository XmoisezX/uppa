'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Search,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import type { AdminLeadItem } from '@/features/admin/services/leads';

interface Props {
  initialLeads: AdminLeadItem[];
  observability?: {
    leadsToday: number;
    leads7Days: number;
    whatsappCount: number;
    formCount: number;
    totalAttempts: number;
    deliveredCount: number;
    failedCount: number;
    missingDestinationCount: number;
    providerNotConfiguredCount: number;
  };
}

export function LeadsClient({ initialLeads, observability }: Props) {
  const [leads] = useState<AdminLeadItem[]>(initialLeads);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<AdminLeadItem | null>(null);

  const filtered = leads.filter((l) => {
    return (
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.property_title?.toLowerCase().includes(search.toLowerCase()) ||
      l.agency_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Central de Leads & Observabilidade
          </h2>
          <p className="text-xs text-slate-400">
            {leads.length} contatos de compradores e inquilinos gerados para os anunciantes da UPPA.
          </p>
        </div>
      </div>

      {/* CARDS DE OBSERVABILIDADE ADMIN (Seção 45) */}
      {observability && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Leads Hoje
            </span>
            <div className="text-2xl font-black text-slate-900">
              {observability.leadsToday}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Últimos 7 Dias
            </span>
            <div className="text-2xl font-black text-slate-900">
              {observability.leads7Days}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Canais (WA / Form)
            </span>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
              <span className="text-emerald-600">{observability.whatsappCount} WA</span>
              <span className="text-slate-300">/</span>
              <span className="text-indigo-600">{observability.formCount} Form</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Entregas / Pendências
            </span>
            <div className="text-xs font-semibold text-slate-700 flex flex-wrap gap-1 mt-1">
              {observability.providerNotConfiguredCount > 0 && (
                <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px]">
                  {observability.providerNotConfiguredCount} s/ provedor
                </span>
              )}
              {observability.missingDestinationCount > 0 && (
                <span className="inline-flex px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-mono text-[10px]">
                  {observability.missingDestinationCount} s/ destino
                </span>
              )}
              {observability.providerNotConfiguredCount === 0 && observability.missingDestinationCount === 0 && (
                <span className="text-emerald-600 font-bold">100% normal</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por interessado, imóvel, e-mail ou anunciante..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum lead encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Interessado</th>
                  <th className="px-4 py-3">Contatos</th>
                  <th className="px-4 py-3">Imóvel de Interesse</th>
                  <th className="px-4 py-3">Anunciante</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-100/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{lead.name}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      <div className="space-y-0.5">
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {lead.property_title ? (
                        <div className="max-w-xs">
                          <Link
                            href={`/imovel/${lead.property_id}`}
                            target="_blank"
                            className="font-semibold text-slate-500 hover:underline truncate block"
                          >
                            {lead.property_title}
                          </Link>
                          {lead.property_code && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{lead.property_code}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Contato geral</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {lead.agency_name ? (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-slate-500" />
                          <span>{lead.agency_name}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                        {lead.source}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(lead.created_at).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {lead.message ? (
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Ver
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

      {/* Message Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Mensagem de {selectedLead.name}
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
              {selectedLead.message}
            </div>

            <div className="space-y-1 text-[11px] text-slate-400">
              <div><strong>E-mail:</strong> {selectedLead.email || '—'}</div>
              <div><strong>Telefone:</strong> {selectedLead.phone || '—'}</div>
              {selectedLead.property_title && (
                <div><strong>Imóvel:</strong> {selectedLead.property_title}</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-700"
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
