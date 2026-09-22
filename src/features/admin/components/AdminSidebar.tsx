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
  ShieldCheck,
  Inbox,
  RefreshCw,
  Globe,
  Settings,
  History,
  ExternalLink,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import type { AdminUser } from '@/types/admin';

interface SidebarProps {
  adminUser: AdminUser;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Site & Home', href: '/admin/site', icon: LayoutTemplate, permission: 'site.manage' },
  { label: 'Banners', href: '/admin/banners', icon: Image, permission: 'banners.manage' },
  { label: 'Artigos / CMS', href: '/admin/artigos', icon: BookOpen, permission: 'articles.manage' },
  { label: 'Imóveis', href: '/admin/imoveis', icon: Building2, permission: 'properties.manage' },
  { label: 'Agências', href: '/admin/agencias', icon: Briefcase, permission: 'agencies.manage' },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users, permission: 'users.manage' },
  { label: 'Cargos & Permissões', href: '/admin/cargos', icon: ShieldCheck, permission: 'roles.manage' },
  { label: 'Leads', href: '/admin/leads', icon: Inbox, permission: 'leads.manage' },
  { label: 'Feeds / VRSync', href: '/admin/feeds', icon: RefreshCw, permission: 'feeds.manage' },
  { label: 'SEO & Meta', href: '/admin/seo', icon: Globe, permission: 'seo.manage' },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings, permission: 'settings.manage' },
  { label: 'Auditoria', href: '/admin/auditoria', icon: History, permission: 'audit.view' },
];

export function AdminSidebar({ adminUser, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isSuperAdmin =
    adminUser.email?.toLowerCase() === 'moiseztorres100@gmail.com' ||
    adminUser.role?.slug === 'super_admin';

  const accessibleItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (isSuperAdmin) return true;
    return adminUser.role?.permissions?.includes(item.permission);
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            U
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-lg tracking-wider">UPPA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Admin
              </span>
            </div>
          </div>
        </Link>

        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Mini Card */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow">
            {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {adminUser.name || adminUser.email}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className={`w-3 h-3 ${isSuperAdmin ? 'text-amber-400' : 'text-blue-400'}`} />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isSuperAdmin ? 'text-amber-400' : 'text-blue-400'
                }`}
              >
                {adminUser.role?.name || 'Administrador'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Módulos Administrativos
        </div>

        {accessibleItems.map((item) => {
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
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-800 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Ver Portal UPPA
          </span>
          <span className="text-[10px] text-slate-500">Aba</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:block w-64 h-screen fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
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
