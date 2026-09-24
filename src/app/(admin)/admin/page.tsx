import Link from 'next/link';
import {
  Building2,
  Users,
  Briefcase,
  Inbox,
  BookOpen,
  Image,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileText,
  Layers,
} from 'lucide-react';
import { getDashboardStats } from '@/features/admin/services/dashboard';
import { getCurrentAdminUser } from '@/features/admin/services/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [stats, adminUser] = await Promise.all([
    getDashboardStats(),
    getCurrentAdminUser(),
  ]);

  const userName = adminUser?.name || adminUser?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Bem-vindo, {userName}!
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Aqui está o resumo do seu portal imobiliário.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/auditoria"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            Exportar
          </Link>
          <Link
            href="/admin/imoveis"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            + Criar Novo
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid — Clean Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Imóveis Ativos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Imóveis Ativos
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.properties.active.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-600 font-semibold">{stats.properties.featured} destaques</span>
            <span>•</span>
            <span>{stats.properties.total.toLocaleString('pt-BR')} total</span>
          </div>
        </div>

        {/* Agências */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Anunciantes
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.agencies.total.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-600 font-semibold">{stats.agencies.verified} verificadas</span>
            <span>•</span>
            <span>Imobiliárias & Corretores</span>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Leads Gerados
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.leads.total.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-600 font-semibold">+{stats.leads.recent7Days} novos</span>
            <span>•</span>
            <span>últimos 7 dias</span>
          </div>
        </div>

        {/* Banners */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Publicidade Ativa
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Image className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.banners.active}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{stats.banners.totalImpressions.toLocaleString('pt-BR')} imp.</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{stats.banners.totalClicks} cliques</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Activity Table + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Atividades Recentes — Table style like the design */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Atividades Recentes
            </h3>
            <Link
              href="/admin/auditoria"
              className="text-xs text-slate-400 hover:text-slate-900 font-medium transition-colors"
            >
              Ver histórico completo
            </Link>
          </div>

          {stats.recentActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma atividade registrada recentemente.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                <div className="col-span-5">Ação</div>
                <div className="col-span-4">Usuário</div>
                <div className="col-span-3 text-right">Horário</div>
              </div>
              {stats.recentActivities.slice(0, 8).map((act) => (
                <div key={act.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {act.record_title || act.action}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        [{act.module}]
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                      {(act.user_name || act.user_email || 'S')[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-600 truncate">
                      {act.user_name || act.user_email || 'Sistema'}
                    </span>
                  </div>
                  <div className="col-span-3 text-right text-[11px] text-slate-400 font-mono">
                    {new Date(act.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}{' '}
                    {new Date(act.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column — Secondary Stats + Quick Links */}
        <div className="lg:col-span-2 space-y-4">
          {/* Feeds Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Feeds VRSync</h3>
              <Link href="/admin/feeds" className="text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">{stats.feeds.total} feeds</div>
                <div className="text-xs text-slate-400">
                  <span className="text-emerald-600 font-medium">{stats.feeds.active} ativos</span>
                  {stats.feeds.error > 0 && (
                    <>
                      <span> • </span>
                      <span className="text-red-500 font-medium">{stats.feeds.error} com erro</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Articles Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Artigos CMS</h3>
              <Link href="/admin/artigos" className="text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">{stats.articles.total} artigos</div>
                <div className="text-xs text-slate-400">
                  <span className="text-emerald-600 font-medium">{stats.articles.published} publicados</span>
                  <span> • </span>
                  <span>{stats.articles.draft} rascunhos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Usuários</h3>
              <Link href="/admin/usuarios" className="text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">{stats.users.total} cadastrados</div>
                <div className="text-xs text-slate-400">
                  <span className="text-slate-600 font-medium">{stats.users.admins} com privilégio</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — Card Grid like the design's bottom section */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Acesso Rápido
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Personalizar Home', description: 'Edite textos, seções e destaques do portal', href: '/admin/site', icon: Layers },
            { label: 'Novo Banner', description: 'Crie campanhas publicitárias com segmentação', href: '/admin/banners', icon: Image },
            { label: 'Escrever Artigo', description: 'Publique guias e artigos no CMS editorial', href: '/admin/artigos', icon: BookOpen },
            { label: 'Sincronizar Feeds', description: 'Execute importação VRSync de imóveis', href: '/admin/feeds', icon: RefreshCw },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <action.icon className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <div className="text-sm font-bold text-slate-900 mb-0.5">{action.label}</div>
              <div className="text-xs text-slate-400 leading-relaxed">{action.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
