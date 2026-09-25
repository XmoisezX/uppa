'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LayoutTemplate,
  Image,
  BookOpen,
  Building2,
  Briefcase,
  Users,
  User,
  ShieldCheck,
  Inbox,
  RefreshCw,
  Globe,
  Settings,
  History,
  ExternalLink,
  X,
  Search,
  ChevronRight,
  Shield,
  FolderPlus,
} from 'lucide-react';
import type { AdminUser } from '@/types/admin';

interface SidebarProps {
  adminUser: AdminUser;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_MAIN = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Imóveis', href: '/admin/imoveis', icon: Building2, permission: 'properties.manage' },
  { label: 'Agências', href: '/admin/agencias', icon: Briefcase, permission: 'agencies.manage' },
  { label: 'Leads', href: '/admin/leads', icon: Inbox, permission: 'leads.manage' },
  { label: 'Feeds / VRSync', href: '/admin/feeds', icon: RefreshCw, permission: 'feeds.manage' },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings, permission: 'settings.manage' },
];

const NAV_CONTENT = [
  { label: 'Site & Home', href: '/admin/site', icon: LayoutTemplate, permission: 'site.manage' },
  { label: 'Banners', href: '/admin/banners', icon: Image, permission: 'banners.manage' },
  { label: 'Artigos / CMS', href: '/admin/artigos', icon: BookOpen, permission: 'articles.manage' },
  { label: 'SEO & Meta', href: '/admin/seo', icon: Globe, permission: 'seo.manage' },
];

const NAV_SYSTEM = [
  { label: 'Meu Perfil', href: '/admin/perfil', icon: User, permission: 'dashboard.view' },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users, permission: 'users.manage' },
  { label: 'Cargos & Permissões', href: '/admin/cargos', icon: ShieldCheck, permission: 'roles.manage' },
  { label: 'Auditoria', href: '/admin/auditoria', icon: History, permission: 'audit.view' },
];

// Re-export flat list for permission checks elsewhere
export const ADMIN_NAV_ITEMS = [...NAV_MAIN, ...NAV_CONTENT, ...NAV_SYSTEM];

export function AdminSidebar({ adminUser, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isSuperAdmin =
    adminUser.email?.toLowerCase() === 'moiseztorres100@gmail.com' ||
    adminUser.role?.slug === 'super_admin';

  const hasAccess = (permission: string) => {
    if (isSuperAdmin) return true;
    return adminUser.role?.permissions?.includes(permission);
  };

  const renderLink = (item: { label: string; href: string; icon: React.ElementType; permission: string }) => {
    if (!hasAccess(item.permission)) return null;
    const Icon = item.icon;
    const isActive =
      item.href === '/admin'
        ? pathname === '/admin'
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onMobileClose}
        className={`flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-all group ${
          isActive
            ? 'bg-slate-900 text-white font-semibold shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] transition-colors shrink-0 ${
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60 shrink-0" />}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-slate-700 select-none">
      {/* Brand Header */}
      <div className="h-[60px] flex items-center justify-between px-5 border-b border-slate-100">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-extrabold text-sm group-hover:scale-105 transition-transform">
            U
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-slate-900 text-[17px] tracking-wider">UPPA</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
              Admin
            </span>
          </div>
        </Link>

        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Bar (Visual) */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-xs">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>Pesquisar...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">/</kbd>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
        {/* Main Nav */}
        <div className="space-y-0.5">
          {NAV_MAIN.map(renderLink)}
        </div>

        {/* Content & Marketing */}
        <div className="space-y-0.5">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Conteúdo & Marketing
          </div>
          {NAV_CONTENT.map(renderLink)}
        </div>

        {/* System & Permissions */}
        <div className="space-y-0.5">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Sistema & Permissões
          </div>
          {NAV_SYSTEM.map(renderLink)}
        </div>
      </nav>

      {/* User Mini Card at Bottom */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <Link
          href="/admin/perfil"
          onClick={onMobileClose}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors group cursor-pointer block"
          title="Ver e editar meu perfil"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
              {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                {adminUser.name || adminUser.email}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className={`w-3 h-3 ${isSuperAdmin ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {adminUser.role?.name || 'Administrador'}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Ver Portal UPPA
          </span>
          <span className="text-[10px] text-slate-400">↗</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:block w-[260px] h-screen fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
