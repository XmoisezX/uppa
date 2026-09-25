'use client';

import { useState, useTransition } from 'react';
import {
  User,
  Shield,
  Phone,
  Mail,
  KeyRound,
  Check,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { updateAdminProfileAction, updateAdminPasswordAction } from '@/features/admin/actions';
import type { AdminUser } from '@/types/admin';

interface AdminProfileViewProps {
  adminUser: AdminUser;
}

export function AdminProfileView({ adminUser }: AdminProfileViewProps) {
  const [name, setName] = useState(adminUser.name || '');
  const [phone, setPhone] = useState(adminUser.phone || '');
  const [copiedId, setCopiedId] = useState(false);

  // Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados de submissão
  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isSuperAdmin =
    adminUser.email?.toLowerCase() === 'moiseztorres100@gmail.com' ||
    adminUser.role?.slug === 'super_admin';

  const handleCopyId = () => {
    navigator.clipboard.writeText(adminUser.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileNotice({ type: 'error', message: 'O nome completo é obrigatório.' });
      return;
    }

    startProfileTransition(async () => {
      const res = await updateAdminProfileAction({
        name: name.trim(),
        phone: phone.trim() || null,
      });

      if (res.success) {
        setProfileNotice({ type: 'success', message: 'Dados cadastrais atualizados com sucesso!' });
      } else {
        setProfileNotice({ type: 'error', message: res.error || 'Erro ao atualizar dados.' });
      }
      setTimeout(() => setProfileNotice(null), 4000);
    });
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'As senhas informadas não coincidem.' });
      return;
    }

    startPasswordTransition(async () => {
      const res = await updateAdminPasswordAction(newPassword);

      if (res.success) {
        setPasswordNotice({ type: 'success', message: 'Sua senha de acesso foi atualizada com sucesso!' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordNotice({ type: 'error', message: res.error || 'Erro ao redefinir senha.' });
      }
      setTimeout(() => setPasswordNotice(null), 5000);
    });
  };

  const initials = (name || adminUser.email || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Meu Perfil de Administrador
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Gerencie suas informações cadastrais, canais de contato e credenciais de segurança do painel administrativo.
        </p>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Cartão de Identidade / Resumo */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-slate-900/20 border-2 border-white">
                {initials}
              </div>
              <div
                className={`absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full border-2 border-white shadow-xs ${
                  isSuperAdmin ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
                }`}
                title={isSuperAdmin ? 'Super Administrador' : 'Administrador Ativo'}
              >
                <Shield className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Nome e Cargo */}
            <h2 className="text-lg font-bold text-slate-900">{name || adminUser.email}</h2>
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              <Shield className={`w-3 h-3 ${isSuperAdmin ? 'text-amber-500' : 'text-indigo-600'}`} />
              <span>{adminUser.role?.name || (isSuperAdmin ? 'SUPER ADMIN' : 'Administrador')}</span>
            </div>

            <div className="w-full border-t border-slate-100 my-5" />

            {/* Detalhes de Acesso */}
            <div className="w-full space-y-3 text-left text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  E-mail Oficial
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{adminUser.email}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  Status da Conta
                </span>
                <span className="inline-flex items-center gap-1 mt-0.5 text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Ativo no Sistema
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  Data de Cadastro
                </span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {adminUser.created_at ? new Date(adminUser.created_at).toLocaleDateString('pt-BR') : 'Desde o início'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  ID do Administrador
                </span>
                <div className="flex items-center justify-between gap-1 mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-mono text-[11px] text-slate-600 truncate">{adminUser.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Copiar ID"
                  >
                    {copiedId ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Formulários de Edição e Segurança */}
        <div className="lg:col-span-2 space-y-6">
          {/* Formulário: Dados Pessoais */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Dados Pessoais & Contato
              </h2>
            </div>

            {profileNotice && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                  profileNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {profileNotice.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{profileNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                      placeholder="(11) 99999-9999"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    E-mail de Acesso
                  </label>
                  <input
                    type="email"
                    disabled
                    value={adminUser.email}
                    className="w-full bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                    title="O e-mail é vinculado à sua conta de autenticação"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cargo de Administrador
                  </label>
                  <input
                    type="text"
                    disabled
                    value={adminUser.role?.name || (isSuperAdmin ? 'Super Administrador' : 'Administrador')}
                    className="w-full bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isPendingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isPendingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Formulário: Segurança & Redefinição de Senha */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Segurança & Alteração de Senha
              </h2>
            </div>

            {passwordNotice && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                  passwordNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {passwordNotice.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{passwordNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-semibold"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 absolute right-2.5 top-2.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-semibold"
                      placeholder="Repita a nova senha"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isPendingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {isPendingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
