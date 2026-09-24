'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, Shield, ExternalLink, Building2, Bell, LayoutGrid } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import type { AdminUser } from '@/types/admin';

interface HeaderProps {
  adminUser: AdminUser;
  onMobileOpen: () => void;
}

export function AdminHeader({ adminUser, onMobileOpen }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const getPageTitle = (path: string) => {
    if (path === '/admin') return 'Dashboard';
    if (path.startsWith('/admin/site')) return 'Site & Home';
    if (path.startsWith('/admin/banners')) return 'Banners';
    if (path.startsWith('/admin/artigos')) return 'Artigos / CMS';
    if (path.startsWith('/admin/imoveis')) return 'Imóveis';
    if (path.startsWith('/admin/agencias')) return 'Agências';
    if (path.startsWith('/admin/usuarios')) return 'Usuários';
    if (path.startsWith('/admin/cargos')) return 'Cargos & Permissões';
    if (path.startsWith('/admin/leads')) return 'Leads';
    if (path.startsWith('/admin/feeds')) return 'Feeds / VRSync';
    if (path.startsWith('/admin/seo')) return 'SEO & Meta';
    if (path.startsWith('/admin/configuracoes')) return 'Configurações';
    if (path.startsWith('/admin/auditoria')) return 'Auditoria';
    return 'Admin';
  };

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createBrowserClient(supabaseUrl, supabaseKey);
      await supabase.auth.signOut();
      router.push('/entrar');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const isSuperAdmin =
    adminUser.email?.toLowerCase() === 'moiseztorres100@gmail.com' ||
    adminUser.role?.slug === 'super_admin';

  const now = new Date();
  const lastUpdated = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="h-[60px] bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileOpen}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <LayoutGrid className="w-4 h-4 text-slate-400" />
          <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Last updated */}
        <span className="hidden md:inline text-xs text-slate-400 mr-2">
          Atualizado às {lastUpdated}
        </span>

        {/* Painel Imobiliária */}
        <Link
          href="/painel"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          title="Alternar para o Painel da sua Imobiliária"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Painel Imobiliária</span>
        </Link>

        {/* View Portal */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          <span>Ver Portal</span>
        </a>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {adminUser.name || 'Admin'}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
              {adminUser.role?.name || 'Administrador'}
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            title="Sair do painel administrativo"
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
