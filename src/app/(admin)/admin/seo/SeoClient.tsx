'use client';

import { useState, useTransition } from 'react';
import { Globe, Save, Check, AlertCircle, Search } from 'lucide-react';
import { saveSiteSettingAction } from '@/features/admin/actions';
import type { SiteSettingsData } from '@/types/admin';

interface Props {
  initialSettings: SiteSettingsData;
}

export function SeoClient({ initialSettings }: Props) {
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            SEO & Indexação nos Mecanismos de Busca
          </h2>
          <p className="text-xs text-slate-400">
            Ajuste os títulos, descrições e Open Graph tags exibidos no Google e redes sociais.
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

      {/* Google Preview Snippet */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          Prévia no Google Search
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
            <span>https://uppa.com.br</span>
          </div>
          <div className="text-sm font-semibold text-slate-500 hover:underline cursor-pointer">
            {seo.meta_title || 'Título da Página'}
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {seo.meta_description || 'Descrição da página nos resultados de busca...'}
          </p>
        </div>
      </div>

      {/* SEO Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
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
