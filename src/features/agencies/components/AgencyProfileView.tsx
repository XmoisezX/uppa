"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  User,
  Building2,
  Phone,
  Mail,
  Award,
  KeyRound,
  Check,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  FileText,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { VerifiedIcon } from "@/components/ui/verified-badge";
import {
  updateAgencyUserProfileAction,
  updateAgencyUserPasswordAction,
} from "@/features/agencies/actions";
import type { UserAgencyMembership } from "@/types/agency";

interface AgencyProfileViewProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      phone?: string;
      creci?: string;
      bio?: string;
    };
    created_at?: string;
  };
  membership: UserAgencyMembership | null;
}

export function AgencyProfileView({ user, membership }: AgencyProfileViewProps) {
  const [fullName, setFullName] = useState(
    user.user_metadata?.full_name || ""
  );
  const [phone, setPhone] = useState(
    user.user_metadata?.phone || membership?.agency.whatsapp || ""
  );
  const [creci, setCreci] = useState(
    user.user_metadata?.creci || ""
  );
  const [bio, setBio] = useState(
    user.user_metadata?.bio || ""
  );

  // Senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estados de submissão
  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();
  const [profileNotice, setProfileNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileNotice({
        type: "error",
        message: "O nome completo é obrigatório.",
      });
      return;
    }

    startProfileTransition(async () => {
      const res = await updateAgencyUserProfileAction({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        creci: creci.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (res.success) {
        setProfileNotice({
          type: "success",
          message: "Seu perfil de corretor foi atualizado com sucesso!",
        });
      } else {
        setProfileNotice({
          type: "error",
          message: res.error || "Erro ao atualizar dados do perfil.",
        });
      }
      setTimeout(() => setProfileNotice(null), 4000);
    });
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({
        type: "error",
        message: "A nova senha deve possuir pelo menos 6 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({
        type: "error",
        message: "As senhas digitadas não conferem.",
      });
      return;
    }

    startPasswordTransition(async () => {
      const res = await updateAgencyUserPasswordAction(newPassword);

      if (res.success) {
        setPasswordNotice({
          type: "success",
          message: "Sua senha foi redefinida com sucesso!",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordNotice({
          type: "error",
          message: res.error || "Erro ao atualizar senha.",
        });
      }
      setTimeout(() => setPasswordNotice(null), 5000);
    });
  };

  const roleLabelMap: Record<string, string> = {
    owner: "Proprietário / Titular",
    admin: "Administrador da Imobiliária",
    manager: "Gerente de Vendas",
    broker: "Corretor Credenciado",
    viewer: "Visualizador",
  };

  const initials = (fullName || user.email || "C")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para a Visão Geral
      </Link>

      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Meu Perfil Profissional
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gerencie suas informações de contato profissional, registro no CRECI e credenciais de login no painel.
        </p>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Resumo do Corretor / Agência */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-center flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-600/20 border-2 border-white dark:border-slate-800">
                {initials}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-slate-900 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Nome e Cargo */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {fullName || user.email}
            </h2>
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
              <Award className="w-3.5 h-3.5" />
              <span>
                {membership ? roleLabelMap[membership.role] || membership.role : "Corretor"}
              </span>
            </div>

            <div className="w-full border-t border-slate-100 dark:border-slate-800 my-5" />

            {/* Informações da Imobiliária Vinculada */}
            <div className="w-full space-y-3.5 text-left text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  Imobiliária Parceira
                </span>
                {membership?.agency ? (
                  <div className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">
                        {membership.agency.name}
                      </span>
                      {membership.agency.verifiedAt && (
                        <VerifiedIcon className="w-4 h-4 text-[#1D9BF0] shrink-0" />
                      )}
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                      CRECI Jurídico: {membership.agency.creci}
                    </span>
                    <Link
                      href={`/imobiliaria/${membership.agency.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-2 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver página pública
                    </Link>
                  </div>
                ) : (
                  <span className="text-slate-500 italic mt-0.5 block">
                    Nenhuma agência vinculada no momento.
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  E-mail de Acesso
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              </div>

              {creci && (
                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                    CRECI Físico
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    {creci}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna 2: Formulários de Edição de Perfil e Senha */}
        <div className="lg:col-span-2 space-y-6">
          {/* Formulário: Meus Dados Cadastrais */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Dados Pessoais & Atendimento
              </h2>
            </div>

            {profileNotice && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                  profileNotice.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {profileNotice.type === "success" ? (
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-semibold"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    WhatsApp de Atendimento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-semibold"
                      placeholder="(11) 99999-9999"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Registro CRECI (Individual)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={creci}
                      onChange={(e) => setCreci(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-semibold"
                      placeholder="Ex: 12345-F / SP"
                    />
                    <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    E-mail da Conta
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email || ""}
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                    title="O e-mail é vinculado à sua autenticação"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Apresentação / Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-medium"
                  placeholder="Conte um pouco sobre sua área de atuação, bairros de foco ou especialidades..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isPendingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isPendingProfile ? "Salvando..." : "Salvar Perfil"}
                </button>
              </div>
            </form>
          </div>

          {/* Formulário: Segurança & Senha */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Segurança & Senha de Acesso
              </h2>
            </div>

            {passwordNotice && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                  passwordNotice.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {passwordNotice.type === "success" ? (
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-semibold"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-2.5 top-2.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-semibold"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {isPendingPassword ? "Atualizando..." : "Atualizar Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
