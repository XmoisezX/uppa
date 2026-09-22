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
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getDashboardStats } from '@/features/admin/services/dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Centro de Controle UPPA
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Painel Geral do Portal Imobiliário
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Monitore imóveis, parceiros, campanhas publicitárias, artigos editoriais e sincronizações de feeds VRSync em tempo real.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Imóveis */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estoque de Imóveis
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.properties.total.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">{stats.properties.active} ativos</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">{stats.properties.featured} destaques</span>
            </div>
          </div>
          <Link
            href="/admin/imoveis"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 pt-1"
          >
            Gerenciar imóveis <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Agências & Anunciantes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Anunciantes Credenciados
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.agencies.total.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">{stats.agencies.verified} verificadas</span>
              <span>•</span>
              <span>Imobiliárias & Corretores</span>
            </div>
          </div>
          <Link
            href="/admin/agencias"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 pt-1"
          >
            Ver anunciantes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Leads Gerados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contatos & Oportunidades
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.leads.total.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">+{stats.leads.recent7Days} novos</span>
              <span>últimos 7 dias</span>
            </div>
          </div>
          <Link
            href="/admin/leads"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 pt-1"
          >
            Ver oportunidades <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Banners & Audiência */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Publicidade Ativa
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Image className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.banners.active} Banners
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span>{stats.banners.totalImpressions.toLocaleString('pt-BR')} imp.</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{stats.banners.totalClicks} cliques</span>
            </div>
          </div>
          <Link
            href="/admin/banners"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 pt-1"
          >
            Configurar banners <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Feeds */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Feeds VRSync Conectados</div>
              <div className="text-base font-bold text-white">
                {stats.feeds.total} feeds ({stats.feeds.active} sincronizando)
              </div>
            </div>
          </div>
          <Link href="/admin/feeds" className="text-xs text-slate-400 hover:text-white">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Artigos Editorial */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-purple-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">CMS de Guias & Artigos</div>
              <div className="text-base font-bold text-white">
                {stats.articles.total} publicados
              </div>
            </div>
          </div>
          <Link href="/admin/artigos" className="text-xs text-slate-400 hover:text-white">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Usuários Administrativos */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Usuários & Acessos</div>
              <div className="text-base font-bold text-white">
                {stats.users.total} cadastrados ({stats.users.admins} com privilégio)
              </div>
            </div>
          </div>
          <Link href="/admin/usuarios" className="text-xs text-slate-400 hover:text-white">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Grid: Quick Actions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes (Audit) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Atividades & Auditoria Recente
              </h3>
            </div>
            <Link
              href="/admin/auditoria"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Ver histórico completo
            </Link>
          </div>

          {stats.recentActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma atividade administrativa registrada recentemente.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {stats.recentActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {act.user_name || act.user_email || 'Sistema'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                        {act.action}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        [{act.module}]
                      </span>
                    </div>
                    <p className="text-slate-400 truncate">
                      {act.record_title || `Registro ${act.record_id || ''}`}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                    {new Date(act.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atalhos Rápidos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Acesso Rápido
          </h3>

          <div className="space-y-2">
            <Link
              href="/admin/site"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>Personalizar Textos da Home</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/banners"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>Novo Banner Publicitário</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/artigos"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>Escrever Artigo no CMS</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/cargos"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>Configurar Cargos & Permissões</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/feeds"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>Executar Sincronização VRSync</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
