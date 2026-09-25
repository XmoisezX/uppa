'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Award,
  Check,
  AlertCircle,
  Save,
  RotateCcw,
  ShieldCheck,
  Star,
  Sparkles,
  Clock,
  FileCheck,
  Image as ImageIcon,
  DollarSign,
  Activity,
  Sliders,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import type { RankingConfig, RankingWeights } from '@/features/ranking/types';
import {
  DEFAULT_RANKING_CONFIG,
  RANKING_CRITERIA_METADATA,
  validateRankingWeights,
} from '@/features/ranking/config';
import { updateRankingConfigAction } from '@/features/ranking/actions';
import { calculatePropertyRanking } from '@/features/ranking/engine';

interface Props {
  initialConfig: RankingConfig;
}

const CRITERIA_ICONS: Record<keyof RankingWeights, React.ElementType> = {
  relevance: Sparkles,
  quality: Award,
  featured: Star,
  verified_brokerage: ShieldCheck,
  freshness: Clock,
  completeness: FileCheck,
  media: ImageIcon,
  price: DollarSign,
  engagement: Activity,
};

export function RankingDashboardClient({ initialConfig }: Props) {
  const [config, setConfig] = useState<RankingConfig>(initialConfig);
  const [weights, setWeights] = useState<RankingWeights>(initialConfig.weights);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Simulador de Sandbox interativo
  const [simFeatured, setSimFeatured] = useState(true);
  const [simVerified, setSimVerified] = useState(true);
  const [simAgeDays, setSimAgeDays] = useState(2);
  const [simPhotos, setSimPhotos] = useState(8);
  const [simHasVideo, setSimHasVideo] = useState(true);

  // Calcula a soma dos pesos em tempo real
  const currentSum = useMemo(() => {
    return Object.values(weights).reduce((acc, val) => acc + (Number(val) || 0), 0);
  }, [weights]);

  const isValidSum = currentSum === 100;

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleWeightChange = (key: keyof RankingWeights, value: number) => {
    const cleanVal = Math.max(0, Math.min(100, Math.round(value)));
    setWeights((prev) => ({
      ...prev,
      [key]: cleanVal,
    }));
  };

  const handleResetDefaults = () => {
    setWeights(DEFAULT_RANKING_CONFIG.weights);
    showNotice('Pesos restaurados para a distribuição padrão (soma = 100).');
  };

  const handleSave = () => {
    const validation = validateRankingWeights(weights);
    if (!validation.valid) {
      showNotice(validation.error || 'A soma dos pesos deve ser exatamente 100.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await updateRankingConfigAction(weights);
      if (res.success) {
        if (res.config) setConfig(res.config);
        showNotice('Pesos do algoritmo de ranking salvos e ativados com sucesso!');
      } else {
        showNotice(res.error || 'Erro ao salvar configuração.', 'error');
      }
    });
  };

  // Simulação ao vivo com a configuração atual
  const simulationResult = useMemo(() => {
    const dummyDate = new Date();
    dummyDate.setDate(dummyDate.getDate() - simAgeDays);

    const dummyMedia = Array.from({ length: simPhotos }, (_, i) => ({
      id: String(i),
      url: 'https://example.com/img.jpg',
      isCover: i === 0,
      position: i,
    }));

    if (simHasVideo) {
      dummyMedia.push({
        id: 'video-1',
        url: 'https://example.com/video.mp4',
        isCover: false,
        position: dummyMedia.length,
      });
    }

    return calculatePropertyRanking(
      {
        id: 'simulated-prop',
        title: 'Apartamento de Alto Padrão no Centro',
        description:
          'Lindo apartamento com acabamento impecável, piso em porcelanato, sacada com churrasqueira e vista panorâmica.',
        propertyType: 'apartment',
        transactionType: 'sale',
        price: 450000,
        usableArea: 85,
        bedrooms: 2,
        suites: 1,
        bathrooms: 2,
        parkingSpaces: 1,
        publishedAt: dummyDate.toISOString(),
        updatedAt: dummyDate.toISOString(),
        city: { id: 'c1', name: 'Pelotas', slug: 'pelotas' },
        neighborhood: { id: 'n1', name: 'Centro', slug: 'centro' },
        agency: {
          id: 'a1',
          name: 'Imobiliária Exemplo',
          slug: 'imobiliaria-exemplo',
          verifiedAt: simVerified ? new Date().toISOString() : null,
        },
        media: dummyMedia,
      },
      {
        rankingConfig: { ...config, weights },
        isFeatured: simFeatured,
        isAgencyVerified: simVerified,
      }
    );
  }, [weights, config, simFeatured, simVerified, simAgeDays, simPhotos, simHasVideo]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Algoritmo de Ranking de Imóveis (0 a 100 Pontos)
              </h2>
              <p className="text-xs text-slate-500">
                Configuração centralizada dos 9 critérios de pontuação e priorização dos anúncios.
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            {feedback.message}
          </div>
        )}
      </div>

      {/* Sum Status & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-bold text-lg border ${
              isValidSum
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}
          >
            {currentSum}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Soma dos Pesos:</span>
              <span className={isValidSum ? 'text-emerald-600' : 'text-red-600 font-mono'}>
                {currentSum} / 100
              </span>
              {isValidSum ? (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  <Check className="w-3 h-3" /> Válido (100 pts)
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3" /> Inválido: ajuste {100 - currentSum > 0 ? `+${100 - currentSum}` : `${100 - currentSum}`} pts
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              A soma exata dos 9 critérios deve totalizar 100 pontos para garantir consistência algorítmica.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isValidSum || isPending}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isValidSum && !isPending
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {isPending ? 'Salvando...' : 'Salvar Pesos'}
          </button>
        </div>
      </div>

      {/* Grid of 9 Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {RANKING_CRITERIA_METADATA.map((meta) => {
          const key = meta.key as keyof RankingWeights;
          const currentWeight = weights[key] ?? meta.defaultWeight;
          const isActive = currentWeight > 0;
          const Icon = CRITERIA_ICONS[key] || Award;

          return (
            <div
              key={key}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{meta.label}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Padrão: {meta.defaultWeight} pts
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed mb-4 min-h-[44px]">
                  {meta.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Peso Configurado:</label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentWeight}
                      onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                      className="w-16 px-2 py-1 text-right text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                    />
                    <span className="text-xs text-slate-400">pts</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={40}
                  value={currentWeight}
                  onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulator / Sandbox */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Simulador em Tempo Real do Algoritmo
            </h3>
            <p className="text-xs text-slate-400">
              Teste interativamente como os pesos configurados afetam um imóvel de exemplo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Parâmetros do Imóvel Teste
            </div>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-xl hover:bg-slate-700/40">
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Imóvel em Destaque
              </span>
              <input
                type="checkbox"
                checked={simFeatured}
                onChange={(e) => setSimFeatured(e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-xl hover:bg-slate-700/40">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Imobiliária Verificada
              </span>
              <input
                type="checkbox"
                checked={simVerified}
                onChange={(e) => setSimVerified(e.target.checked)}
                className="w-4 h-4 accent-blue-400 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-xl hover:bg-slate-700/40">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                Possui Vídeo ou Tour Virtual
              </span>
              <input
                type="checkbox"
                checked={simHasVideo}
                onChange={(e) => setSimHasVideo(e.target.checked)}
                className="w-4 h-4 accent-pink-400 rounded"
              />
            </label>

            <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Idade da Última Atualização:</span>
                <span className="font-mono text-amber-400 font-bold">{simAgeDays} dias</span>
              </div>
              <input
                type="range"
                min={0}
                max={120}
                value={simAgeDays}
                onChange={(e) => setSimAgeDays(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Quantidade de Fotos:</span>
                <span className="font-mono text-amber-400 font-bold">{simPhotos} fotos</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={simPhotos}
                onChange={(e) => setSimPhotos(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Results Summary & Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Score Calculado no Sandbox:</div>
                <div className="text-3xl font-black font-mono text-white mt-1">
                  {simulationResult.score}{' '}
                  <span className="text-sm font-normal text-slate-400">/ 100 pontos</span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Determinístico
                </span>
              </div>
            </div>

            {/* Breakdown Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {RANKING_CRITERIA_METADATA.map((meta) => {
                const key = meta.key as keyof RankingWeights;
                const score = (simulationResult.breakdown as any)[key] ?? 0;
                const max = weights[key] ?? meta.defaultWeight;
                const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;

                return (
                  <div key={key} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="truncate max-w-[150px]">{meta.label}</span>
                      <span className="font-mono font-bold text-white">
                        {score} <span className="text-slate-400 font-normal">/ {max}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
