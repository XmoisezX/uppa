/**
 * Serviço de Cálculo de Score de Expansão Territorial da UPPA
 * Algoritmo determinístico e explicável (Seções 10, 11 e 12)
 */

import type {
  CityExpansionPriority,
  CityExpansionScoreBreakdown,
} from "../types";

/**
 * Configuração central e editável de pesos e faixas de prioridade
 */
export const CITY_EXPANSION_CONFIG = {
  weights: {
    population: 0.30, // 30% do score pelo porte municipal
    stockGap: 0.35, // 35% do score pela lacuna entre demanda populacional e estoque atual
    agencyOpportunity: 0.20, // 20% pela proporção de imobiliárias ainda não integradas
    currentDensity: 0.15, // 15% pela densidade/tração já existente
  },
  thresholds: {
    // Estimativa de mercado: ~0.8% a 1.2% da população reflete o estoque imobiliário total ativo de uma cidade
    expectedPropertiesPerCapita: 0.008,
    priorityA: {
      minScore: 70,
      minPopulation: 200000,
    },
    priorityB: {
      minScore: 50,
      minPopulation: 80000,
    },
    priorityC: {
      minScore: 30,
      minPopulation: 30000,
    },
  },
};

/**
 * Calcula determinística e auditavelmente o Expansion Score de um município
 */
export function calculateCityExpansionScore(params: {
  population?: number | null;
  activePropertiesCount: number;
  activeOffersCount: number;
  knownAgenciesCount: number;
  claimedAgenciesCount: number;
}): CityExpansionScoreBreakdown {
  const pop = Math.max(0, params.population || 0);
  const activeProps = Math.max(0, params.activePropertiesCount || 0);
  const knownAgencies = Math.max(0, params.knownAgenciesCount || 0);
  const claimedAgencies = Math.max(0, params.claimedAgenciesCount || 0);

  const reasons: string[] = [];

  // 1. FATOR POPULAÇÃO (0-100)
  // Escala logarítmica/faixas para cidades brasileiras (referência: 10k a 500k+)
  let populationScore = 0;
  if (pop >= 500000) populationScore = 100;
  else if (pop >= 300000) populationScore = 85;
  else if (pop >= 150000) populationScore = 70;
  else if (pop >= 80000) populationScore = 55;
  else if (pop >= 40000) populationScore = 40;
  else if (pop >= 15000) populationScore = 25;
  else if (pop > 0) populationScore = 10;
  reasons.push(`População oficial de ${pop.toLocaleString("pt-BR")} habitantes (Score População: ${populationScore})`);

  // 2. FATOR GAP DE ESTOQUE (0-100)
  // Relação entre estoque esperado pela população e o estoque real indexado na UPPA
  const expectedStock = Math.max(50, Math.round(pop * CITY_EXPANSION_CONFIG.thresholds.expectedPropertiesPerCapita));
  const coverageRatio = expectedStock > 0 ? activeProps / expectedStock : 0;

  let gapScore = 0;
  if (coverageRatio < 0.1) {
    gapScore = 100; // Gap gigante: menos de 10% do estoque da cidade capturado
    reasons.push(`Alta lacuna de estoque: apenas ${(coverageRatio * 100).toFixed(1)}% do estoque potencial indexado (Score Gap: 100)`);
  } else if (coverageRatio < 0.3) {
    gapScore = 80;
    reasons.push(`Lacuna expressiva de estoque: ${(coverageRatio * 100).toFixed(1)}% indexado (Score Gap: 80)`);
  } else if (coverageRatio < 0.6) {
    gapScore = 50;
    reasons.push(`Média cobertura de estoque: ${(coverageRatio * 100).toFixed(1)}% indexado (Score Gap: 50)`);
  } else {
    gapScore = 20; // Já bastante coberto
    reasons.push(`Cidade com boa cobertura: ${(coverageRatio * 100).toFixed(1)}% indexado (Score Gap: 20)`);
  }

  // 3. FATOR OPORTUNIDADE DE IMOBILIÁRIAS (0-100)
  // Avalia o volume de agências conhecidas e quantas ainda precisam ser atraídas/reivindicadas
  let agencyOpportunityScore = 0;
  if (knownAgencies === 0) {
    agencyOpportunityScore = 50; // Município ainda sem descoberta iniciada
    reasons.push("Nenhuma imobiliária mapeada ainda: alto potencial de descoberta inicial (Score Agências: 50)");
  } else {
    const unclaimedRate = (knownAgencies - claimedAgencies) / knownAgencies;
    agencyOpportunityScore = Math.min(100, Math.round(knownAgencies * 5 * unclaimedRate));
    agencyOpportunityScore = Math.max(20, Math.min(100, agencyOpportunityScore));
    reasons.push(`${knownAgencies} agências mapeadas (${claimedAgencies} claimed): potencial de atração ${(unclaimedRate * 100).toFixed(0)}% (Score Agências: ${agencyOpportunityScore})`);
  }

  // 4. FATOR DENSIDADE ATUAL (0-100)
  // Cidades com algum estoque e ofertas já possuem tração de matching
  let densityScore = 0;
  if (activeProps >= 3000) densityScore = 100;
  else if (activeProps >= 1000) densityScore = 75;
  else if (activeProps >= 300) densityScore = 50;
  else if (activeProps >= 50) densityScore = 30;
  else densityScore = 10;
  reasons.push(`Densidade atual de ${activeProps} imóveis e ${params.activeOffersCount} ofertas (Score Densidade: ${densityScore})`);

  // PONTUAÇÃO PONDERADA FINAL
  const totalScore = Math.round(
    populationScore * CITY_EXPANSION_CONFIG.weights.population +
    gapScore * CITY_EXPANSION_CONFIG.weights.stockGap +
    agencyOpportunityScore * CITY_EXPANSION_CONFIG.weights.agencyOpportunity +
    densityScore * CITY_EXPANSION_CONFIG.weights.currentDensity
  );

  // DETERMINAÇÃO DA FAIXA DE PRIORIDADE
  let priority: CityExpansionPriority = "not_prioritized";
  if (
    totalScore >= CITY_EXPANSION_CONFIG.thresholds.priorityA.minScore ||
    (pop >= CITY_EXPANSION_CONFIG.thresholds.priorityA.minPopulation && gapScore >= 70)
  ) {
    priority = "A";
  } else if (
    totalScore >= CITY_EXPANSION_CONFIG.thresholds.priorityB.minScore ||
    pop >= CITY_EXPANSION_CONFIG.thresholds.priorityB.minPopulation
  ) {
    priority = "B";
  } else if (
    totalScore >= CITY_EXPANSION_CONFIG.thresholds.priorityC.minScore ||
    pop >= CITY_EXPANSION_CONFIG.thresholds.priorityC.minPopulation
  ) {
    priority = "C";
  }

  return {
    totalScore,
    priority,
    factors: {
      populationScore,
      gapScore,
      agencyOpportunityScore,
      densityScore,
    },
    reasons,
  };
}
