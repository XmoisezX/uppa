/**
 * Serviço de Gestão e Visão de Expansão Territorial por Cidade (Seções 7, 8, 13, 14, 15)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CityExpansionMetrics,
  CityExpansionStatus,
  CityExpansionPriority,
} from "../types";
import { calculateCityExpansionScore } from "./expansion-score.service";

/**
 * Consulta lista de cidades no plano de expansão territorial com métricas calculadas
 */
export async function getCitiesExpansionList(options?: {
  orderBy?: "population" | "score" | "gap" | "coverage" | "updated_at";
  status?: string;
  priority?: string;
  limit?: number;
}): Promise<CityExpansionMetrics[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("cities")
    .select(`
      id,
      name,
      slug,
      ibge_code,
      population,
      population_reference_year,
      population_source,
      population_updated_at,
      expansion_status,
      expansion_priority,
      expansion_score,
      last_discovery_at,
      next_discovery_at,
      known_agencies_count,
      claimed_agencies_count,
      active_properties_count,
      active_offers_count,
      state:states!state_id(code)
    `)
    .limit(options?.limit || 50);

  if (options?.status) {
    query = query.eq("expansion_status", options.status);
  }

  if (options?.priority) {
    query = query.eq("expansion_priority", options.priority);
  }

  // Ordenação
  if (options?.orderBy === "score") {
    query = query.order("expansion_score", { ascending: false, nullsFirst: false });
  } else if (options?.orderBy === "population") {
    query = query.order("population", { ascending: false, nullsFirst: false });
  } else if (options?.orderBy === "updated_at") {
    query = query.order("updated_at", { ascending: false });
  } else {
    // Padrão: maior score, depois maior população
    query = query.order("expansion_score", { ascending: false, nullsFirst: false }).order("population", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as any[]).map((c) => {
    const pop = c.population || 0;
    const activeProps = c.active_properties_count || 0;
    const expected = Math.max(50, Math.round(pop * 0.008));
    const coverageRatio = expected > 0 ? activeProps / expected : 0;

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      stateCode: (c.state as any)?.code || "RS",
      ibgeCode: c.ibge_code,
      population: c.population,
      populationReferenceYear: c.population_reference_year,
      populationSource: c.population_source,
      populationUpdatedAt: c.population_updated_at,
      expansionStatus: (c.expansion_status as CityExpansionStatus) || "not_started",
      expansionPriority: (c.expansion_priority as CityExpansionPriority) || "not_prioritized",
      expansionScore: Number(c.expansion_score) || 0,
      lastDiscoveryAt: c.last_discovery_at,
      nextDiscoveryAt: c.next_discovery_at,
      knownAgenciesCount: c.known_agencies_count || 0,
      claimedAgenciesCount: c.claimed_agencies_count || 0,
      activePropertiesCount: activeProps,
      activeOffersCount: c.active_offers_count || 0,
      coverageRatio,
    };
  });
}

/**
 * Consulta detalhada de uma cidade na expansão territorial (Seção 15)
 */
export async function getCityExpansionDetail(cityIdOrSlug: string): Promise<{
  city: CityExpansionMetrics | null;
  agencies: any[];
  sources: any[];
  jobs: any[];
}> {
  const supabase = createAdminClient();

  // 1. Busca dados da cidade
  let query = supabase
    .from("cities")
    .select(`
      id,
      name,
      slug,
      ibge_code,
      population,
      population_reference_year,
      population_source,
      population_updated_at,
      expansion_status,
      expansion_priority,
      expansion_score,
      last_discovery_at,
      next_discovery_at,
      known_agencies_count,
      claimed_agencies_count,
      active_properties_count,
      active_offers_count,
      state:states!state_id(code)
    `);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cityIdOrSlug);
  if (isUuid) {
    query = query.eq("id", cityIdOrSlug);
  } else {
    query = query.eq("slug", cityIdOrSlug);
  }

  const { data: rawCity, error } = await query.maybeSingle();
  if (error || !rawCity) {
    return { city: null, agencies: [], sources: [], jobs: [] };
  }

  const c = rawCity as any;
  const pop = c.population || 0;
  const activeProps = c.active_properties_count || 0;
  const expected = Math.max(50, Math.round(pop * 0.008));
  const coverageRatio = expected > 0 ? activeProps / expected : 0;

  const city: CityExpansionMetrics = {
    id: c.id,
    name: c.name,
    slug: c.slug,
    stateCode: (c.state as any)?.code || "RS",
    ibgeCode: c.ibge_code,
    population: c.population,
    populationReferenceYear: c.population_reference_year,
    populationSource: c.population_source,
    populationUpdatedAt: c.population_updated_at,
    expansionStatus: (c.expansion_status as CityExpansionStatus) || "not_started",
    expansionPriority: (c.expansion_priority as CityExpansionPriority) || "not_prioritized",
    expansionScore: Number(c.expansion_score) || 0,
    lastDiscoveryAt: c.last_discovery_at,
    nextDiscoveryAt: c.next_discovery_at,
    knownAgenciesCount: c.known_agencies_count || 0,
    claimedAgenciesCount: c.claimed_agencies_count || 0,
    activePropertiesCount: activeProps,
    activeOffersCount: c.active_offers_count || 0,
    coverageRatio,
  };

  // 2. Busca agências vinculadas a este município
  const [{ data: agencies }, { data: sources }, { data: jobs }] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, slug, claim_status, is_official_profile, creci, phone, website, created_source, created_at")
      .eq("city_id", city.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("website_sources")
      .select("id, domain, base_url, status, ingestion_origin, last_crawl_at, agency:agencies!agency_id(name, slug)")
      .eq("city_id", city.id)
      .limit(50),
    supabase
      .from("crawl_jobs" as any)
      .select("id, status, started_at, finished_at, offers_found, offers_created, offers_updated, errors")
      .eq("city_id", city.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    city,
    agencies: agencies || [],
    sources: sources || [],
    jobs: (jobs as any[]) || [],
  };
}

/**
 * Altera o status e prioridade de expansão de uma cidade (Seção 13)
 */
export async function updateCityExpansionStatus(
  cityId: string,
  status: CityExpansionStatus,
  priority?: CityExpansionPriority
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const updateData: any = {
    expansion_status: status,
    updated_at: new Date().toISOString(),
  };

  if (priority) {
    updateData.expansion_priority = priority;
  }

  const { error } = await supabase.from("cities").update(updateData).eq("id", cityId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
