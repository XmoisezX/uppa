'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Globe,
  Save,
  Check,
  AlertCircle,
  Search,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Building2,
  FileText,
  Layers,
} from 'lucide-react';
import { saveSiteSettingAction } from '@/features/admin/actions';
import type { SiteSettingsData } from '@/types/admin';
import type { AdminSeoStats } from '@/features/seo/types';

interface Props {
  initialSettings: SiteSettingsData;
  stats?: AdminSeoStats;
}

export function SeoClient({ initialSettings, stats }: Props) {
  const [seo, setSeo] = useState(
    initialSettings.seo_global || {
      meta_title: 'UPPA — Portal Imobiliário Nacional | Casas e Apartamentos',
      meta_description:
        'Busque imóveis para comprar e alugar em todo o Brasil com imobiliárias e corretores credenciados.',
      og_image: '/images/og-uppa.jpg',
      keywords: ['imoveis', 'comprar imovel', 'alugar apartamento', 'uppa'],
    }
  );
  const [keywordsText, setKeywordsText] = useState((seo.keywords || []).join(', '));
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = {
        ...seo,
        keywords: keywordsText.split(',').map((k) => k.trim()).filter(Boolean),
      };

      const res = await saveSiteSettingAction('seo_global', payload);
      if (res.success) {
        showNotice('Configurações de SEO salvas com sucesso!');
      } else {
        showNotice(res.error || 'Erro ao salvar SEO.', 'error');
      }
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            SEO Técnico & Indexação Programática
          </h2>
          <p className="text-xs text-slate-500">
            Painel de observabilidade de indexabilidade, sitemap, canonicals e metadados globais.
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

      {/* PAINEL DE OBSERVABILIDADE TÉCNICA DE SEO */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Imóveis Canônicos Ativos com Ofertas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Imóveis Canônicos (Indexáveis)
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.totalWithOffers.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Com ofertas ativas</span>
                <span className="font-semibold text-emerald-600">index, follow</span>
              </div>
            </div>

            {/* Imóveis Sem Ofertas / Inativos */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Imóveis Sem Ofertas Ativas
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.totalWithoutOffers}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Proteção anti-404</span>
                <span className="font-semibold text-amber-600">noindex, follow</span>
              </div>
            </div>

            {/* Redirecionamentos 301 de Imóveis Consolidados */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Redirecionamentos Merged
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.totalMergedRedirects}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>URLs consolidadas</span>
                <span className="font-semibold text-blue-600">301 Canonical</span>
              </div>
            </div>

            {/* Total de URLs no Sitemap */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                Total no Sitemap XML
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.totalSitemapUrls.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <Link
                  href="/sitemap.xml"
                  target="_blank"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Ver sitemap <ExternalLink className="w-3 h-3" />
                </Link>
                <span>•</span>
                <Link
                  href="/robots.txt"
                  target="_blank"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  robots.txt <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Cobertura Territorial: Cidades e Bairros */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Cobertura Territorial Programática
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>
                  <strong>{stats.indexableCities}</strong> cidades indexáveis (≥ 3 imóveis)
                </span>
                <span>•</span>
                <span>
                  <strong>{stats.noindexCities}</strong> cidades com noindex (&lt; 3 imóveis)
                </span>
                <span>•</span>
                <span>
                  <strong>{stats.indexableNeighborhoods}</strong> bairros indexáveis (≥ 2 imóveis)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {stats.citiesList.slice(0, 9).map((city) => (
                <div
                  key={city.slug}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <Link
                      href={`/imoveis/${city.slug}`}
                      target="_blank"
                      className="text-xs font-bold text-slate-800 hover:text-indigo-600 inline-flex items-center gap-1"
                    >
                      {city.name} - {city.stateCode}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <div className="text-[11px] text-slate-500">
                      {city.count} {city.count === 1 ? 'imóvel' : 'imóveis'}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      city.isIndexable
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {city.isIndexable ? 'Index' : 'Noindex'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Google Preview Snippet */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          Prévia no Google Search (Página Inicial)
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
            <span>https://uppa.com.br</span>
          </div>
          <div className="text-sm font-semibold text-slate-700 hover:underline cursor-pointer">
            {seo.meta_title || 'Título da Página'}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {seo.meta_description || 'Descrição da página nos resultados de busca...'}
          </p>
        </div>
      </div>

      {/* SEO Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Globe className="w-4 h-4 text-indigo-600" />
          Metatags Globais de Fallback
        </h3>

        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-700 uppercase tracking-wider">
            Título Global (Meta Title)
          </label>
          <input
            type="text"
            value={seo.meta_title}
            onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
          <div className="text-[10px] text-slate-500 text-right">
            {seo.meta_title.length}/60 caracteres recomendados
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-700 uppercase tracking-wider">
            Descrição Global (Meta Description)
          </label>
          <textarea
            rows={3}
            value={seo.meta_description}
            onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
          <div className="text-[10px] text-slate-500 text-right">
            {seo.meta_description.length}/160 caracteres recomendados
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-700 uppercase tracking-wider">
            URL da Imagem de Compartilhamento (Open Graph Image)
          </label>
          <input
            type="text"
            value={seo.og_image}
            onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-700 uppercase tracking-wider">
            Palavras-chave (Separadas por vírgula)
          </label>
          <input
            type="text"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Salvando...' : 'Salvar Configurações de SEO'}
        </button>
      </div>
    </div>
  );
}
