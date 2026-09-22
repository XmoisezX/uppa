'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, Shield, ExternalLink } from 'lucide-react';
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
    if (path === '/admin') return 'Painel Geral';
    if (path.startsWith('/admin/site')) return 'Gerenciamento do Site & Home';
    if (path.startsWith('/admin/banners')) return 'Banners & Campanhas Publicitárias';
    if (path.startsWith('/admin/artigos')) return 'CMS de Artigos & Blog';
    if (path.startsWith('/admin/imoveis')) return 'Moderação de Imóveis';
    if (path.startsWith('/admin/agencias')) return 'Imobiliárias & Anunciantes';
    if (path.startsWith('/admin/usuarios')) return 'Gerenciamento de Usuários';
    if (path.startsWith('/admin/cargos')) return 'Cargos & Matriz de Permissões';
    if (path.startsWith('/admin/leads')) return 'Central de Leads & Contatos';
    if (path.startsWith('/admin/feeds')) return 'Integrações de Feeds & VRSync';
    if (path.startsWith('/admin/seo')) return 'Configurações de SEO & Meta Tags';
    if (path.startsWith('/admin/configuracoes')) return 'Configurações Gerais da Plataforma';
    if (path.startsWith('/admin/auditoria')) return 'Logs de Auditoria Administrativa';
    return 'Área Administrativa';
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

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left side: Hamburger (mobile) and Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileOpen}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">UPPA Admin</span>
          <span className="text-slate-700">/</span>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      {/* Right side: User Profile, Role Badge, Actions */}
      <div className="flex items-center gap-3">
        {/* Role Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
          <Shield className={`w-3.5 h-3.5 ${isSuperAdmin ? 'text-amber-400' : 'text-blue-400'}`} />
          <span className="font-semibold text-slate-200">
            {adminUser.role?.name || 'Admin'}
          </span>
        </div>

        {/* View Portal */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Ver Portal</span>
        </a>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200 leading-tight">
              {adminUser.name || 'Admin'}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
              {adminUser.email}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            title="Sair do painel administrativo"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
