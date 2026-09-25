'use client';

import { useState, useTransition } from 'react';
import {
  LayoutTemplate,
  HelpCircle,
  Link as LinkIcon,
  Save,
  Check,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  saveSiteSettingAction,
  saveFAQAction,
  deleteFAQAction,
} from '@/features/admin/actions';
import type { SiteFAQ, SiteSettingsData } from '@/types/admin';

interface Props {
  initialSettings: SiteSettingsData;
  initialFaqs: SiteFAQ[];
}

export function SiteManagerClient({ initialSettings, initialFaqs }: Props) {
  const [activeTab, setActiveTab] = useState<'home' | 'sections' | 'faqs' | 'footer'>('home');
  const [settings, setSettings] = useState<SiteSettingsData>(initialSettings);
  const [faqs, setFaqs] = useState<SiteFAQ[]>(initialFaqs);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // FAQ modal state
  const [editingFaq, setEditingFaq] = useState<Partial<SiteFAQ> | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotice('Por favor selecione um arquivo de imagem válido (JPG, PNG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.82);
          setSettings((prev) => ({
            ...prev,
            hero_background_image: compressedDataUrl,
          }));
          showNotice('Imagem carregada! Lembre-se de clicar em "Salvar Alterações da Home" para aplicar.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSettings((prev) => ({
      ...prev,
      hero_background_image: null,
    }));
    showNotice('Imagem de fundo removida. Clique em "Salvar Alterações da Home" para confirmar.');
  };

  const handleSaveHomeTexts = () => {
    startTransition(async () => {
      const res = await saveSiteSettingAction('home_hero', {
        hero_headline: settings.hero_headline,
        hero_subheadline: settings.hero_subheadline,
        hero_search_placeholder: settings.hero_search_placeholder,
        hero_background_image: settings.hero_background_image,
        hero_image_layout: settings.hero_image_layout || 'side',
        hero_image_fit: settings.hero_image_fit || 'cover',
        hero_background_color: settings.hero_background_color || '#FAF7F5',
      });

      if (res.success) {
        showNotice('Textos e visual da Home salvos com sucesso!');
      } else {
        showNotice(res.error || 'Erro ao salvar.', 'error');
      }
    });
  };

  const handleToggleSection = (sectionId: string) => {
    const updated = (settings.home_sections || []).map((sec) =>
      sec.id === sectionId ? { ...sec, enabled: !sec.enabled } : sec
    );
    setSettings((prev) => ({ ...prev, home_sections: updated }));

    startTransition(async () => {
      const res = await saveSiteSettingAction('home_sections', updated);
      if (res.success) {
        showNotice('Seção atualizada!');
      } else {
        showNotice(res.error || 'Erro ao atualizar.', 'error');
      }
    });
  };

  const handleSaveFaq = () => {
    if (!editingFaq?.question || !editingFaq?.answer) {
      showNotice('Pergunta e resposta são obrigatórias.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await saveFAQAction(editingFaq);
      if (res.success) {
        showNotice('FAQ salvo com sucesso!');
        setEditingFaq(null);
      } else {
        showNotice(res.error || 'Erro ao salvar FAQ.', 'error');
      }
    });
  };

  const handleDeleteFaq = (id: string) => {
    if (!confirm('Deseja realmente remover esta pergunta frequente?')) return;

    startTransition(async () => {
      const res = await deleteFAQAction(id);
      if (res.success) {
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        showNotice('FAQ excluído.');
      } else {
        showNotice(res.error || 'Erro ao excluir.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gerenciamento do Site & Conteúdo
          </h2>
          <p className="text-xs text-slate-400">
            Configure títulos, seções dinâmicas da página inicial, FAQs e rodapé sem alterar código.
          </p>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'home'
              ? 'border-blue-500 text-slate-500 bg-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          Textos & Hero da Home
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'sections'
              ? 'border-blue-500 text-slate-500 bg-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          Ordem & Ativação de Seções
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'faqs'
              ? 'border-blue-500 text-slate-500 bg-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Perguntas Frequentes (FAQs)
        </button>

        <button
          onClick={() => setActiveTab('footer')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'footer'
              ? 'border-blue-500 text-slate-500 bg-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Rodapé & Contatos
        </button>
      </div>

      {/* Tab 1: Textos da Home */}
      {activeTab === 'home' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Título Principal da Home (Hero Headline)
            </label>
            <input
              type="text"
              value={settings.hero_headline || ''}
              onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Ex: Encontre o imóvel ideal no maior portal imobiliário do Brasil"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Subtítulo Descritivo (Hero Subheadline)
            </label>
            <textarea
              rows={3}
              value={settings.hero_subheadline || ''}
              onChange={(e) => setSettings({ ...settings, hero_subheadline: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Ex: Milhares de casas e apartamentos à venda..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Texto de Ajuda da Barra de Busca (Placeholder)
            </label>
            <input
              type="text"
              value={settings.hero_search_placeholder || ''}
              onChange={(e) => setSettings({ ...settings, hero_search_placeholder: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Ex: Digite cidade, bairro ou código..."
            />
          </div>

          {/* Cor de Fundo Unificada (Do Menu até o Fim do Filtro) */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Cor de Fundo do Topo & Hero (Menu ao Filtro)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha uma cor de fundo personalizável (HEX ou RGB). Ela engloba a navbar do menu até o término do filtro atrás, criando um fundo contínuo elegante estilo Zap.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pr-3">
                <input
                  type="color"
                  value={settings.hero_background_color?.startsWith('#') ? settings.hero_background_color : '#FAF7F5'}
                  onChange={(e) => setSettings({ ...settings, hero_background_color: e.target.value })}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={settings.hero_background_color || '#FAF7F5'}
                  onChange={(e) => setSettings({ ...settings, hero_background_color: e.target.value })}
                  placeholder="#FAF7F5 ou rgb(250, 247, 245)"
                  className="w-44 bg-transparent text-xs font-mono font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              {/* Sugestões Rápidas de Cores */}
              <div className="flex items-center gap-1.5">
                {[
                  { name: 'Creme Zap', value: '#FAF7F5' },
                  { name: 'Branco Puro', value: '#FFFFFF' },
                  { name: 'Cinza Slate', value: '#F8FAFC' },
                  { name: 'Azul Suave', value: '#EEF2FF' },
                  { name: 'Dark Mode', value: '#0B0F19' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, hero_background_color: preset.value })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      settings.hero_background_color === preset.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: preset.value }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Imagem de Fundo / Lado do Filtro */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Imagem do Portal (Hero)
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faça o upload da foto e escolha se deseja posicioná-la ao lado do filtro (estilo Zap) ou ocupando o fundo inteiro.
                </p>
              </div>
              {settings.hero_background_image && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover Imagem
                </button>
              )}
            </div>

            {settings.hero_background_image ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-sm">
                  <img
                    src={settings.hero_background_image}
                    alt="Pré-visualização da Imagem"
                    className="w-full h-56 object-cover object-center opacity-85 group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="font-semibold flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        Imagem Ativa no Portal
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Substituir Imagem
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Opções de Posicionamento e Tamanho */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Como a imagem vai ficar (Posição)
                    </label>
                    <select
                      value={settings.hero_image_layout || 'side'}
                      onChange={(e) => setSettings({ ...settings, hero_image_layout: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                    >
                      <option value="side">Ao lado do filtro (Estilo Zap — Recomendado)</option>
                      <option value="cover">Fundo todo (Atrás do filtro cobrindo a tela)</option>
                      <option value="right">Alinhada à direita no fundo (Com fade suave)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Enquadramento da Imagem (Tamanho / Fit)
                    </label>
                    <select
                      value={settings.hero_image_fit || 'cover'}
                      onChange={(e) => setSettings({ ...settings, hero_image_fit: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                    >
                      <option value="cover">Cover — Preencher espaço (Proporcional com corte)</option>
                      <option value="contain">Contain — Conter imagem inteira sem cortes</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 bg-slate-50/70 hover:bg-blue-50/30 transition-all cursor-pointer group text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-800">
                  Clique ou arraste uma foto para o hero do portal
                </span>
                <span className="text-xs text-slate-500 mt-1 max-w-sm">
                  Formatos aceitos: JPG, PNG ou WEBP em alta resolução (1920x1080).
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>

          <button
            onClick={handleSaveHomeTexts}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Salvando...' : 'Salvar Alterações da Home'}
          </button>
        </div>
      )}

      {/* Tab 2: Ordem e Ativação de Seções */}
      {activeTab === 'sections' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-3xl">
          <p className="text-xs text-slate-400">
            Ative ou oculte seções completas na página principal do portal com um clique.
          </p>

          <div className="divide-y divide-slate-100">
            {(settings.home_sections || []).map((sec) => (
              <div key={sec.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{sec.label}</div>
                  <div className="text-xs text-slate-500 font-mono">ID: {sec.id}</div>
                </div>

                <button
                  onClick={() => handleToggleSection(sec.id)}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sec.enabled
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {sec.enabled ? 'Ativo' : 'Oculto'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Perguntas e respostas exibidas na Home e nas páginas públicas.
            </span>
            <button
              onClick={() => setEditingFaq({ question: '', answer: '', category: 'geral', position: faqs.length + 1, is_active: true })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Pergunta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {faq.category}
                    </span>
                    <span className={`text-[10px] font-bold ${faq.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {faq.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{faq.question}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{faq.answer}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setEditingFaq(faq)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 text-xs"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 text-xs"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal de Edição/Criação de FAQ */}
          {editingFaq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <h3 className="text-base font-bold text-slate-900">
                  {editingFaq.id ? 'Editar Pergunta Frequente' : 'Nova Pergunta Frequente'}
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Pergunta</label>
                    <input
                      type="text"
                      value={editingFaq.question || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                      placeholder="Ex: Como anunciar no portal?"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Resposta</label>
                    <textarea
                      rows={4}
                      value={editingFaq.answer || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                      placeholder="Explique a resposta de forma clara e objetiva..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Categoria</label>
                      <select
                        value={editingFaq.category || 'geral'}
                        onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                      >
                        <option value="geral">Geral</option>
                        <option value="anunciantes">Anunciantes</option>
                        <option value="integracoes">Integrações & Feeds</option>
                        <option value="compradores">Compradores</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Status</label>
                      <select
                        value={editingFaq.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setEditingFaq({ ...editingFaq, is_active: e.target.value === 'active' })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                      >
                        <option value="active">Ativo (Visível)</option>
                        <option value="inactive">Inativo (Oculto)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditingFaq(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveFaq}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    Salvar FAQ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Rodapé & Contatos */}
      {activeTab === 'footer' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Informações Oficiais de Contato
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Telefone Comercial</label>
              <input
                type="text"
                value={settings.contact_info?.phone || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, phone: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">WhatsApp</label>
              <input
                type="text"
                value={settings.contact_info?.whatsapp || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, whatsapp: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">E-mail de Suporte</label>
              <input
                type="email"
                value={settings.contact_info?.email || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, email: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Endereço Sede</label>
              <input
                type="text"
                value={settings.contact_info?.address || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, address: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <button
            onClick={() => {
              startTransition(async () => {
                const res = await saveSiteSettingAction('contact_info', settings.contact_info);
                if (res.success) showNotice('Informações de contato salvas!');
                else showNotice(res.error || 'Erro ao salvar.', 'error');
              });
            }}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Salvando...' : 'Salvar Dados de Contato'}
          </button>
        </div>
      )}
    </div>
  );
}
