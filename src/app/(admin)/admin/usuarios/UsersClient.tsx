'use client';

import { useState, useTransition } from 'react';
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Check,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { updateUserRoleAction, toggleUserStatusAction } from '@/features/admin/actions';
import type { AdminUser, AdminRole } from '@/types/admin';

interface Props {
  initialUsers: AdminUser[];
  roles: AdminRole[];
}

export function UsersClient({ initialUsers, roles }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const filtered = users.filter((u) => {
    return (
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
    );
  });

  const handleRoleChange = (user: AdminUser, newRoleId: string) => {
    if (user.email.toLowerCase() === 'moiseztorres100@gmail.com') {
      showNotice('O Super Admin principal não pode ter seu cargo alterado.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await updateUserRoleAction(user.id, newRoleId, user.email);
      if (res.success) {
        const foundRole = roles.find((r) => r.id === newRoleId);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role_id: newRoleId, role: foundRole } : u))
        );
        showNotice(`Cargo de ${user.name || user.email} atualizado!`);
      } else {
        showNotice(res.error || 'Erro ao alterar cargo.', 'error');
      }
    });
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.email.toLowerCase() === 'moiseztorres100@gmail.com') {
      showNotice('O Super Admin principal não pode ser desativado.', 'error');
      return;
    }

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    startTransition(async () => {
      const res = await toggleUserStatusAction(user.id, user.status, user.email);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
        showNotice(`Usuário ${newStatus === 'active' ? 'ativado' : 'suspenso'} com sucesso!`);
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
            Gerenciamento de Usuários & Acessos
          </h2>
          <p className="text-xs text-slate-400">
            Controle de cargos e status com segurança. O gerenciamento de senhas é protegido pelo Supabase Auth.
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
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Cargo / Perfil</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data Cadastro</th>
                  <th className="px-4 py-3">Último Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((user) => {
                  const isMainSuper = user.email.toLowerCase() === 'moiseztorres100@gmail.com';

                  return (
                    <tr key={user.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-slate-900 uppercase shrink-0">
                            {user.name ? user.name.charAt(0) : user.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name || 'Sem nome informado'}</span>
                              {isMainSuper && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  SUPER ADMIN RAIZ
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {user.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isMainSuper ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                            <Lock className="w-3 h-3" />
                            SUPER ADMIN
                          </div>
                        ) : (
                          <select
                            value={user.role_id || user.role?.id}
                            onChange={(e) => handleRoleChange(user, e.target.value)}
                            disabled={isPending}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isMainSuper ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            Ativo Permanente
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isPending}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                              user.status === 'active'
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {user.status === 'active' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleString('pt-BR')
                          : 'Recente'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
