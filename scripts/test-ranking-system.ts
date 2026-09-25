#!/usr/bin/env node

/**
 * TEST SUITE: SISTEMA COMPLETO DE RANKING DE IMÓVEIS (0 A 100 PONTOS)
 * Validação rigorosa dos 14 cenários da Seção 24 do Prompt.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

import {
  calculatePropertyRanking,
  calculateRelevanceScore,
  calculateQualityScore,
  calculateFeaturedScore,
  calculateVerifiedScore,
  calculateFreshnessScore,
  calculateCompletenessScore,
  calculateMediaScore,
  calculatePriceScore,
  calculateEngagementScore,
  sortPropertiesByRanking,
} from '../src/features/ranking/engine';

import {
  DEFAULT_RANKING_CONFIG,
  validateRankingWeights,
} from '../src/features/ranking/config';

// Carregar variáveis de .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...values] = trimmed.split('=');
      process.env[key.trim()] = values.join('=').trim();
    }
  }
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' INICIANDO BATERIA DE TESTES DO RANKING DE IMÓVEIS');
  console.log('======================================================\n');

  // TESTE 1: Validação dos Pesos Padrão (Soma = 95 ou 100)
  console.log('--- GRUPO 1: Validação Central de Pesos e Limites ---');
  const defaultValidation = validateRankingWeights(DEFAULT_RANKING_CONFIG.weights);
  assert(defaultValidation.valid === true, 'Pesos padrão são validados com sucesso');
  assert(defaultValidation.sum === 95 || defaultValidation.sum === 100, `Soma dos pesos padrão é válida (obtido: ${defaultValidation.sum})`);

  const invalidWeights: any = { ...DEFAULT_RANKING_CONFIG.weights, relevance: 50 };
  const invalidValidation = validateRankingWeights(invalidWeights);
  assert(invalidValidation.valid === false, 'Pesos com soma arbitrária fora do padrão são rejeitados com erro');

  // TESTE 2: Imobiliária Não Verificada + Imóvel Normal -> 0 pontos nesses critérios
  console.log('\n--- GRUPO 2: Critérios de Verificação e Destaque ---');
  const scoreUnverified = calculateVerifiedScore(false, 10);
  const scoreUnfeatured = calculateFeaturedScore(false, 15);
  assert(scoreUnverified === 0, 'Imobiliária não verificada recebe 0 pontos');
  assert(scoreUnfeatured === 0, 'Imóvel sem destaque recebe 0 pontos');

  // TESTE 3: Imobiliária Verificada -> +10 pontos
  const scoreVerified = calculateVerifiedScore(true, 10);
  assert(scoreVerified === 10, 'Imobiliária verificada recebe exatamente +10 pontos');

  // TESTE 4: Imóvel em Destaque -> +15 pontos
  const scoreFeatured = calculateFeaturedScore(true, 15);
  assert(scoreFeatured === 15, 'Imóvel em destaque recebe exatamente +15 pontos');

  // TESTE 5: Imóvel Destacado + Imobiliária Verificada -> +25 pontos combinados
  const combined = scoreVerified + scoreFeatured;
  assert(combined === 25, 'Imóvel destacado + imobiliária verificada totalizam +25 pontos');

  // TESTE 6: Destaque Expirado -> 0 pontos de destaque
  const expiredDate = new Date(Date.now() - 3600 * 1000).toISOString();
  const scoreExpired = calculateFeaturedScore(true, 15, expiredDate);
  assert(scoreExpired === 0, 'Destaque com endAt no passado recebe 0 pontos automaticamente');

  // TESTE 7: Recência / Atualização (Intervalos Centralizados)
  console.log('\n--- GRUPO 3: Atualização e Recência ---');
  const now = new Date();
  const date2DaysAgo = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString();
  const date6DaysAgo = new Date(now.getTime() - 6 * 24 * 3600 * 1000).toISOString();
  const date10DaysAgo = new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString();
  const date20DaysAgo = new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString();
  const date45DaysAgo = new Date(now.getTime() - 45 * 24 * 3600 * 1000).toISOString();
  const date75DaysAgo = new Date(now.getTime() - 75 * 24 * 3600 * 1000).toISOString();
  const date100DaysAgo = new Date(now.getTime() - 100 * 24 * 3600 * 1000).toISOString();

  assert(calculateFreshnessScore(date2DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 10, '0-3 dias = 10 pts');
  assert(calculateFreshnessScore(date6DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 9, '4-7 dias = 9 pts');
  assert(calculateFreshnessScore(date10DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 8, '8-14 dias = 8 pts');
  assert(calculateFreshnessScore(date20DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 6, '15-30 dias = 6 pts');
  assert(calculateFreshnessScore(date45DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 4, '31-60 dias = 4 pts');
  assert(calculateFreshnessScore(date75DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 2, '61-90 dias = 2 pts');
  assert(calculateFreshnessScore(date100DaysAgo, DEFAULT_RANKING_CONFIG.freshness_intervals, 10) === 0, '>90 dias = 0 pts');

  // TESTE 8: Qualidade Contextual por Tipo de Imóvel
  console.log('\n--- GRUPO 4: Qualidade Contextual & Completude ---');
  const aptComplete = {
    title: 'Lindo Apartamento 3 Quartos Centro com Sacada Gourmet',
    description: 'Excelente apartamento totalmente reformado, com 3 dormitórios sendo 1 suíte, sala dois ambientes, cozinha planejada, sacada gourmet com churrasqueira e vaga de garagem coberta.',
    propertyType: 'apartment',
    transactionType: 'sale',
    price: 450000,
    usableArea: 95,
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    features: ['churrasqueira', 'piscina', 'elevador'],
  };
  const qApt = calculateQualityScore(aptComplete, 15);
  assert(qApt >= 13, `Qualidade de apartamento completo é alta (obtido: ${qApt}/15)`);

  // Terreno não precisa de quartos nem suítes para pontuar alto
  const landComplete = {
    title: 'Excelente Terreno em Condomínio Fechado',
    description: 'Terreno plano pronto para construir, medindo 12x30 metros em condomínio fechado com infraestrutura completa de lazer e segurança 24 horas.',
    propertyType: 'land',
    transactionType: 'sale',
    price: 180000,
    usableArea: 360,
    totalArea: 360,
    neighborhood: { id: 'b1', name: 'Laranjal' },
  };
  const qLand = calculateQualityScore(landComplete, 15);
  assert(qLand >= 12, `Terreno não é penalizado por ausência de quartos (obtido: ${qLand}/15)`);

  // TESTE 9: Qualidade de Mídia e Bônus de Vídeo/Tour
  console.log('\n--- GRUPO 5: Qualidade de Mídia ---');
  const media0: any[] = [];
  const media2: any[] = [{ id: '1', url: 'a' }, { id: '2', url: 'b' }];
  const media5: any[] = Array.from({ length: 5 }, (_, i) => ({ id: String(i), url: 'a' }));
  const media8: any[] = Array.from({ length: 8 }, (_, i) => ({ id: String(i), url: 'a' }));
  const media12: any[] = Array.from({ length: 12 }, (_, i) => ({ id: String(i), url: 'a' }));
  const media12WithVideo: any[] = [...media12, { id: 'v', url: 'v', type: 'video' }];

  assert(calculateMediaScore(media0, DEFAULT_RANKING_CONFIG.media_intervals, 1, 5) === 0, '0 fotos = 0 pts');
  assert(calculateMediaScore(media2, DEFAULT_RANKING_CONFIG.media_intervals, 1, 5) === 1, '1-3 fotos = 1 pt');
  assert(calculateMediaScore(media5, DEFAULT_RANKING_CONFIG.media_intervals, 1, 5) === 2, '4-6 fotos = 2 pts');
  assert(calculateMediaScore(media8, DEFAULT_RANKING_CONFIG.media_intervals, 1, 5) === 3, '7-10 fotos = 3 pts');
  assert(calculateMediaScore(media12, DEFAULT_RANKING_CONFIG.media_intervals, 1, 5) === 4, '11+ fotos = 4 pts');
  assert(calculateMediaScore(media12WithVideo, DEFAULT_RANKING_CONFIG.media_intervals, 1, 5) === 5, '11+ fotos com vídeo = 5 pts (teto)');

  // TESTE 10: Competitividade de Preço com Proteção contra Amostra Insuficiente
  console.log('\n--- GRUPO 6: Competitividade de Preço e Engajamento ---');
  const propPriceTest = { price: 300000, usableArea: 100, propertyType: 'apartment', transactionType: 'sale' };
  // Sem estatísticas suficientes -> neutro (2.5)
  assert(calculatePriceScore(propPriceTest, null, 5) === 2.5, 'Sem dados suficientes de coorte retorna nota neutra (2.5 pts)');

  // Com amostra válida (mediana = R$ 3.500/m², imóvel = R$ 3.000/m² -> 14% abaixo da mediana -> pontuação competitiva)
  const cohortStats = { cohortKey: 'c1', sampleSize: 10, medianPriceM2: 3500, avgPriceM2: 3500, minPriceM2: 2500, maxPriceM2: 5000 };
  const priceScoreComp = calculatePriceScore(propPriceTest, cohortStats, 5);
  assert(priceScoreComp >= 3.5, `Preço competitivo recebe bônus justo (obtido: ${priceScoreComp}/5)`);

  // Preço artificialmente absurdo (ex: R$ 1) não quebra o sistema
  const propFakeCheap = { price: 1, usableArea: 100, propertyType: 'apartment', transactionType: 'sale' };
  const priceScoreFake = calculatePriceScore(propFakeCheap, cohortStats, 5);
  assert(priceScoreFake <= 5 && priceScoreFake >= 0, `Preço outlier anormal permanece limitado a [0, 5] (obtido: ${priceScoreFake})`);

  // Engajamento normalizado por tempo
  const engagementData = { leadsCount: 6, whatsappClicks: 3, formSubmissions: 2, daysActive: 30 };
  const engScore = calculateEngagementScore(engagementData, 5);
  assert(engScore >= 3 && engScore <= 5, `Engajamento ativo normalizado pontua adequadamente (obtido: ${engScore}/5)`);

  // TESTE 11: Score Total, Teto (100) e Piso (0)
  console.log('\n--- GRUPO 7: Teto, Piso e Robustez a Dados Nulos ---');
  const perfectProp: any = {
    ...aptComplete,
    updatedAt: new Date().toISOString(),
    media: media12WithVideo,
  };
  const maxRanking = calculatePropertyRanking(perfectProp, {
    rankingConfig: DEFAULT_RANKING_CONFIG,
    cohortStats,
    engagementData: { leadsCount: 15, whatsappClicks: 8, formSubmissions: 5, daysActive: 20 },
    isFeatured: true,
    isAgencyVerified: true,
  });
  assert(maxRanking.score <= 100, `Score máximo nunca ultrapassa 100 (obtido: ${maxRanking.score})`);
  assert(maxRanking.score >= 80, `Imóvel excelente atinge pontuação de topo (obtido: ${maxRanking.score})`);

  // Imóvel com ausência total de dados não quebra
  const emptyProp: any = { id: 'empty-1', propertyType: 'other', transactionType: 'sale' };
  const minRanking = calculatePropertyRanking(emptyProp, {
    rankingConfig: DEFAULT_RANKING_CONFIG,
    isFeatured: false,
    isAgencyVerified: false,
  });
  assert(minRanking.score >= 0, `Score mínimo nunca fica abaixo de 0 (obtido: ${minRanking.score})`);
  assert(!isNaN(minRanking.score), 'Imóvel vazio calcula número válido sem NaN');

  // TESTE 12: Dois Anúncios do Mesmo Imóvel Físico por Imobiliárias Diferentes
  console.log('\n--- GRUPO 8: Imobiliárias Distintas no Mesmo Imóvel ---');
  const baseListing: any = {
    title: 'Casa no Laranjal 3 Dormitórios',
    description: 'Casa no Laranjal com piscina e amplo pátio.',
    propertyType: 'house',
    transactionType: 'sale',
    price: 650000,
    usableArea: 200,
    updatedAt: new Date().toISOString(),
    media: media5,
  };

  // Anúncio A: Imobiliária Verificada + Em Destaque
  const listingA = calculatePropertyRanking(baseListing, {
    rankingConfig: DEFAULT_RANKING_CONFIG,
    isFeatured: true,
    isAgencyVerified: true,
  });

  // Anúncio B: Imobiliária Não Verificada + Sem Destaque
  const listingB = calculatePropertyRanking(baseListing, {
    rankingConfig: DEFAULT_RANKING_CONFIG,
    isFeatured: false,
    isAgencyVerified: false,
  });

  const breakdownDiff =
    listingA.breakdown.featured +
    listingA.breakdown.verified_brokerage -
    (listingB.breakdown.featured + listingB.breakdown.verified_brokerage);
  assert(
    breakdownDiff === 25,
    `Diferença no breakdown (+15 destaque, +10 verificada) é de exatamente 25 pontos (obtido: ${breakdownDiff})`
  );
  assert(listingA.score > listingB.score, 'Anúncio A ranqueia acima do Anúncio B sem eliminar o Anúncio B');

  // TESTE 13: Desempate Determinístico (9 Níveis)
  console.log('\n--- GRUPO 9: Critérios de Desempate Determinísticos ---');
  const tiedA = {
    item: { id: 'uuid-1', title: 'Imóvel 1', updatedAt: '2026-09-20T10:00:00Z' },
    ranking: {
      score: 80,
      breakdown: { relevance: 25, quality: 13, featured: 15, verified_brokerage: 10, freshness: 9, completeness: 5, media: 4, price: 4, engagement: 3 },
    },
  };
  const tiedB = {
    item: { id: 'uuid-2', title: 'Imóvel 2', updatedAt: '2026-09-22T10:00:00Z' },
    ranking: {
      score: 80,
      breakdown: { relevance: 25, quality: 13, featured: 15, verified_brokerage: 10, freshness: 9, completeness: 5, media: 4, price: 4, engagement: 3 },
    },
  };

  // Tied A vs B: B tem updatedAt mais recente (22/09 vs 20/09)
  const sortedTied = sortPropertiesByRanking([tiedA, tiedB]);
  assert(sortedTied[0].id === 'uuid-2', 'Desempate por updated_at mais recente prioriza o imóvel atualizado por último');

  // TESTE 14: Busca Pública Integrada com Supabase (Filtros Estritos + Paginação)
  console.log('\n--- GRUPO 10: Busca Pública e Integração de Banco ---');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: searchRows, error: searchError } = await supabase
    .from('properties')
    .select(`
      id,
      title,
      transaction_type,
      property_type,
      price,
      rent_price,
      usable_area,
      bedrooms,
      updated_at,
      published_at,
      agency:agencies!agency_id (id, name, verified_at),
      media:property_media (id, url, is_cover, position)
    `)
    .eq('status', 'active')
    .in('transaction_type', ['sale', 'sale_or_rent'])
    .limit(10);

  assert(!searchError && Array.isArray(searchRows) && searchRows.length > 0, `Banco retornou ${searchRows?.length} imóveis ativos`);

  if (searchRows && searchRows.length > 0) {
    const rankedRows = searchRows.map((row: any) => {
      const isAgencyVerified = Boolean(row.agency?.verified_at);
      const ranking = calculatePropertyRanking(
        {
          id: row.id,
          title: row.title,
          propertyType: row.property_type,
          transactionType: row.transaction_type,
          price: row.price,
          rentPrice: row.rent_price,
          usableArea: row.usable_area,
          bedrooms: row.bedrooms,
          updatedAt: row.updated_at,
          publishedAt: row.published_at,
          media: row.media || [],
        },
        {
          rankingConfig: DEFAULT_RANKING_CONFIG,
          isAgencyVerified,
          isFeatured: false,
        }
      );
      return { item: row, ranking };
    });

    const sortedRows = sortPropertiesByRanking(rankedRows);
    assert(sortedRows.length === searchRows.length, 'Todos os imóveis ranqueados e preservados');

    const allHaveScore = rankedRows.every(
      (r) => typeof r.ranking.score === 'number' && r.ranking.score >= 0 && r.ranking.score <= 100
    );
    assert(allHaveScore, 'Todos os imóveis possuem score válido calculado entre 0 e 100');
  }

  console.log('\n======================================================');
  console.log(` RESULTADO FINAL: ${passedTests} DE ${totalTests} TESTES PASSARAM COM SUCESSO!`);
  console.log('======================================================\n');

  if (passedTests === totalTests) {
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exitCode = 1;
});
