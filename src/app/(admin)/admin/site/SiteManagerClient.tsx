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

  const handleSaveHomeTexts = () => {
    startTransition(async () => {
      const res = await saveSiteSettingAction('home_hero', {
        hero_headline: settings.hero_headline,
        hero_subheadline: settings.hero_subheadline,
        hero_search_placeholder: settings.hero_search_placeholder,
      });

      if (res.success) {
        showNotice('Textos da Home salvos com sucesso!');
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
          <h2 className="text-xl font-bold text-white tracking-tight">
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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'home'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          Textos & Hero da Home
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'sections'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          Ordem & Ativação de Seções
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'faqs'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Perguntas Frequentes (FAQs)
        </button>

        <button
          onClick={() => setActiveTab('footer')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'footer'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Rodapé & Contatos
        </button>
      </div>

      {/* Tab 1: Textos da Home */}
      {activeTab === 'home' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 max-w-3xl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Título Principal da Home (Hero Headline)
            </label>
            <input
              type="text"
              value={settings.hero_headline || ''}
              onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Ex: Encontre o imóvel ideal no maior portal imobiliário do Brasil"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Subtítulo Descritivo (Hero Subheadline)
            </label>
            <textarea
              rows={3}
              value={settings.hero_subheadline || ''}
              onChange={(e) => setSettings({ ...settings, hero_subheadline: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Ex: Milhares de casas e apartamentos à venda..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Texto de Ajuda da Barra de Busca (Placeholder)
            </label>
            <input
              type="text"
              value={settings.hero_search_placeholder || ''}
              onChange={(e) => setSettings({ ...settings, hero_search_placeholder: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Ex: Digite cidade, bairro ou código..."
            />
          </div>

          <button
            onClick={handleSaveHomeTexts}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Salvando...' : 'Salvar Alterações da Home'}
          </button>
        </div>
      )}

      {/* Tab 2: Ordem e Ativação de Seções */}
      {activeTab === 'sections' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 max-w-3xl">
          <p className="text-xs text-slate-400">
            Ative ou oculte seções completas na página principal do portal com um clique.
          </p>

          <div className="divide-y divide-slate-800">
            {(settings.home_sections || []).map((sec) => (
              <div key={sec.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{sec.label}</div>
                  <div className="text-xs text-slate-500 font-mono">ID: {sec.id}</div>
                </div>

                <button
                  onClick={() => handleToggleSection(sec.id)}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sec.enabled
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
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
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-blue-400">
                      {faq.category}
                    </span>
                    <span className={`text-[10px] font-bold ${faq.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {faq.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{faq.question}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{faq.answer}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setEditingFaq(faq)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs"
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <h3 className="text-base font-bold text-white">
                  {editingFaq.id ? 'Editar Pergunta Frequente' : 'Nova Pergunta Frequente'}
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Pergunta</label>
                    <input
                      type="text"
                      value={editingFaq.question || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      placeholder="Ex: Como anunciar no portal?"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Resposta</label>
                    <textarea
                      rows={4}
                      value={editingFaq.answer || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      placeholder="Explique a resposta de forma clara e objetiva..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-300 block mb-1">Categoria</label>
                      <select
                        value={editingFaq.category || 'geral'}
                        onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="geral">Geral</option>
                        <option value="anunciantes">Anunciantes</option>
                        <option value="integracoes">Integrações & Feeds</option>
                        <option value="compradores">Compradores</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-300 block mb-1">Status</label>
                      <select
                        value={editingFaq.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setEditingFaq({ ...editingFaq, is_active: e.target.value === 'active' })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
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
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveFaq}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 max-w-3xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Informações Oficiais de Contato
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Telefone Comercial</label>
              <input
                type="text"
                value={settings.contact_info?.phone || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, phone: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">WhatsApp</label>
              <input
                type="text"
                value={settings.contact_info?.whatsapp || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, whatsapp: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">E-mail de Suporte</label>
              <input
                type="email"
                value={settings.contact_info?.email || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, email: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Endereço Sede</label>
              <input
                type="text"
                value={settings.contact_info?.address || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact_info: { ...settings.contact_info!, address: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
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
