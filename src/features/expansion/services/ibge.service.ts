/**
 * Serviço de Integração Populacional com o IBGE (Seção 9)
 * Busca e sincroniza dados populacionais oficiais e persiste no PostgreSQL.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateCityExpansionScore } from "./expansion-score.service";

/**
 * Consulta população oficial do IBGE para um código de município diretamente da API oficial
 * Não utiliza cache hardcoded de cidades no código: consulta fonte oficial e persiste no banco.
 */
export async function fetchIbgePopulation(ibgeCode: number): Promise<{
  population: number;
  year: number;
  source: string;
} | null> {
  // Consulta API pública oficial do IBGE (Indicador 29171: População residente Censo/Estimativas)
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/29171/resultados/${ibgeCode}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }, // Cache de 24h
    });

    if (res.ok) {
      const data = await res.json();
      const resVal = data?.[0]?.res?.[0]?.res;
      if (resVal && typeof resVal === "object") {
        const years = Object.keys(resVal).sort();
        const latestYear = years[years.length - 1];
        const count = parseInt(resVal[latestYear], 10);
        if (!isNaN(count) && count > 0) {
          return {
            population: count,
            year: parseInt(latestYear, 10) || 2022,
            source: "IBGE API Oficial",
          };
        }
      }
    }
  } catch (err) {
    console.warn(`[fetchIbgePopulation] Falha ao consultar API externa para IBGE ${ibgeCode}:`, err);
  }

  return null;
}

export type UpdateCityPopulationResult =
  | { success: true; cityId: string; population: number; score: number; priority: string; error?: never }
  | { success: false; cityId: string; error: string; population?: never; score?: never; priority?: never };

/**
 * Atualiza e persiste os dados populacionais de uma cidade e recalcula o expansion score
 */
export async function updateCityPopulation(cityId: string): Promise<UpdateCityPopulationResult> {
  const supabase = createAdminClient();

  // 1. Carrega dados atuais da cidade
  const { data: city, error: cityErr } = await supabase
    .from("cities")
    .select("id, name, ibge_code, active_properties_count, active_offers_count, known_agencies_count, claimed_agencies_count")
    .eq("id", cityId)
    .single();

  if (cityErr || !city) {
    return { success: false, cityId, error: "Cidade não encontrada no banco." };
  }

  if (!city.ibge_code) {
    return { success: false, cityId, error: "Cidade não possui código IBGE cadastrado." };
  }

  // 2. Consulta população no IBGE
  const ibgeResult = await fetchIbgePopulation(city.ibge_code);
  if (!ibgeResult) {
    return { success: false, cityId, error: "Não foi possível obter dados populacionais do IBGE para este código." };
  }

  // 3. Recalcula o score de expansão
  const scoreBreakdown = calculateCityExpansionScore({
    population: ibgeResult.population,
    activePropertiesCount: (city as any).active_properties_count || 0,
    activeOffersCount: (city as any).active_offers_count || 0,
    knownAgenciesCount: (city as any).known_agencies_count || 0,
    claimedAgenciesCount: (city as any).claimed_agencies_count || 0,
  });

  const nowIso = new Date().toISOString();

  // 4. Persiste no banco de dados
  const { error: updateErr } = await supabase
    .from("cities")
    .update({
      population: ibgeResult.population,
      population_reference_year: ibgeResult.year,
      population_source: ibgeResult.source,
      population_updated_at: nowIso,
      expansion_score: scoreBreakdown.totalScore,
      expansion_priority: scoreBreakdown.priority,
      updated_at: nowIso,
    } as any)
    .eq("id", cityId);

  if (updateErr) {
    return { success: false, cityId, error: updateErr.message };
  }

  return {
    success: true,
    cityId,
    population: ibgeResult.population,
    score: scoreBreakdown.totalScore,
    priority: scoreBreakdown.priority,
  };
}
