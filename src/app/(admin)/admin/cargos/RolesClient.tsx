'use client';

import { useState, useTransition } from 'react';
import {
  ShieldCheck,
  Check,
  AlertCircle,
  Save,
  Lock,
} from 'lucide-react';
import { updateRolePermissionsAction } from '@/features/admin/actions';
import type { AdminRole, AdminPermission } from '@/types/admin';

interface Props {
  initialRoles: AdminRole[];
  permissions: AdminPermission[];
}

export function RolesClient({ initialRoles, permissions }: Props) {
  const [roles, setRoles] = useState<AdminRole[]>(initialRoles);
  const [selectedRole, setSelectedRole] = useState<AdminRole>(initialRoles[0]);
  const [rolePermissions, setRolePermissions] = useState<string[]>(
    initialRoles[0]?.permissions || []
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSelectRole = (r: AdminRole) => {
    setSelectedRole(r);
    setRolePermissions(r.permissions || []);
  };

  const handleTogglePermission = (code: string) => {
    if (selectedRole.slug === 'super_admin') {
      showNotice('O SUPER ADMIN possui acesso total irrevogável.', 'error');
      return;
    }

    setRolePermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = () => {
    if (selectedRole.slug === 'super_admin') {
      showNotice('O cargo SUPER ADMIN já possui todas as permissões.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await updateRolePermissionsAction(
        selectedRole.id,
        rolePermissions,
        selectedRole.name
      );
      if (res.success) {
        setRoles((prev) =>
          prev.map((r) =>
            r.id === selectedRole.id ? { ...r, permissions: rolePermissions } : r
          )
        );
        showNotice(`Permissões do cargo ${selectedRole.name} salvas com sucesso!`);
      } else {
        showNotice(res.error || 'Erro ao salvar permissões.', 'error');
      }
    });
  };

  const isSuper = selectedRole.slug === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Cargos & Matriz Dinâmica de Permissões
          </h2>
          <p className="text-xs text-slate-400">
            Defina granularmente quais módulos e ações cada perfil administrativo pode executar.
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Cargos Administrativos
          </div>

          <div className="space-y-1">
            {roles.map((r) => {
              const isSelected = r.id === selectedRole.id;
              const isSuperRole = r.slug === 'super_admin';

              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-sm'
                      : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{r.name}</span>
                      {isSuperRole && <Lock className="w-3 h-3 text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {isSuperRole ? 'Acesso Total' : `${r.permissions?.length || 0} permissões`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Matrix for Selected Role */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Permissões do Cargo: <span className="text-slate-500">{selectedRole.name}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedRole.description || 'Configuração de privilégios para este cargo.'}
              </p>
            </div>

            {!isSuper && (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            )}
          </div>

          {isSuper ? (
            <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
              <Lock className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-bold text-amber-300">
                Super Administrador possui Acesso Irrestrito
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Por motivos de segurança e integridade da plataforma, o cargo SUPER ADMIN possui automaticamente todas as permissões ativas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((perm) => {
                const isChecked = rolePermissions.includes(perm.code);

                return (
                  <label
                    key={perm.code}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-colors ${
                      isChecked
                        ? 'bg-blue-500/5 border-blue-500/30 text-white'
                        : 'bg-slate-50/40 border-slate-200/80 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(perm.code)}
                      className="mt-0.5 rounded border-slate-200 bg-slate-100 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-700">{perm.name}</div>
                      <div className="text-[10px] text-slate-500">{perm.description}</div>
                      <div className="text-[9px] font-mono text-slate-500">{perm.code}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
