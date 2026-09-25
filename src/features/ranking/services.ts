import { cache } from "react";
import { createClient, createPublicServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SearchFilters } from "@/features/search/types";
import type {
  RankingConfig,
  RankingWeights,
  PropertyRankingResult,
  CohortPriceStats,
  PropertyEngagementData,
} from "./types";
import { DEFAULT_RANKING_CONFIG, validateRankingWeights } from "./config";
import { calculatePropertyRanking } from "./engine";

/**
 * Consulta a configuração central do Ranking (site_settings.ranking_config).
 * Envolvida em cache para deduplicação durante renderização.
 */
export const getRankingConfig = cache(async (): Promise<RankingConfig> => {
  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "ranking_config")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const val = data.value as any;
      if (val.weights && typeof val.weights.relevance === "number") {
        return {
          ...DEFAULT_RANKING_CONFIG,
          ...val,
          weights: {
            ...DEFAULT_RANKING_CONFIG.weights,
            ...val.weights,
          },
        };
      }
    }
  } catch (err) {
    console.error("[getRankingConfig] Falha ao ler ranking_config:", err);
  }

  return DEFAULT_RANKING_CONFIG;
});

/**
 * Atualiza os pesos e configurações do Ranking pelo Super Administrador.
 * Valida obrigatoriamente que a soma dos pesos seja igual a 100.
 */
export async function updateRankingConfig(
  weights: RankingWeights,
  adminEmail = "moiseztorres100@gmail.com"
): Promise<{ success: boolean; error?: string; config?: RankingConfig }> {
  const validation = validateRankingWeights(weights);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = createAdminClient();
    const current = await getRankingConfig();

    const newConfig: RankingConfig = {
      ...current,
      weights,
      updated_at: new Date().toISOString(),
      updated_by: adminEmail,
    };

    const { error } = await supabase.from("site_settings").upsert({
      key: "ranking_config",
      value: newConfig,
      description: "Pesos e parâmetros centrais do algoritmo de ranking (0 a 100 pontos)",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, config: newConfig };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro inesperado ao salvar configuração do ranking.",
    };
  }
}

/**
 * Consulta estatísticas de preço por m² de uma coorte comparável (mesma cidade, tipo e finalidade).
 */
export async function getCohortPriceStats(
  cityId?: string | null,
  propertyType?: string | null,
  transactionType?: string | null
): Promise<CohortPriceStats | null> {
  if (!cityId || !propertyType || !transactionType) return null;

  try {
    const supabase = createPublicServerClient();
    const priceCol = transactionType === "rent" ? "rent_price" : "price";

    const { data } = await supabase
      .from("properties")
      .select(`id, ${priceCol}, usable_area`)
      .eq("status", "active")
      .eq("city_id", cityId)
      .eq("property_type", propertyType as any)
      .gt(priceCol, 0)
      .gt("usable_area", 10)
      .limit(60);

    if (!data || data.length < 3) {
      return null; // Amostra insuficiente
    }

    const pricesM2: number[] = [];
    for (const item of data) {
      const price = Number((item as any)[priceCol]);
      const area = Number(item.usable_area);
      if (price > 0 && area > 10) {
        pricesM2.push(price / area);
      }
    }

    if (pricesM2.length < 3) return null;

    pricesM2.sort((a, b) => a - b);
    const mid = Math.floor(pricesM2.length / 2);
    const median =
      pricesM2.length % 2 !== 0
        ? pricesM2[mid]
        : (pricesM2[mid - 1] + pricesM2[mid]) / 2;

    const sum = pricesM2.reduce((acc, val) => acc + val, 0);

    return {
      cohortKey: `${cityId}_${propertyType}_${transactionType}`,
      sampleSize: pricesM2.length,
      medianPriceM2: Math.round(median * 100) / 100,
      avgPriceM2: Math.round((sum / pricesM2.length) * 100) / 100,
      minPriceM2: pricesM2[0],
      maxPriceM2: pricesM2[pricesM2.length - 1],
    };
  } catch (err) {
    console.error("[getCohortPriceStats] Erro ao obter coorte de preços:", err);
    return null;
  }
}

/**
 * Consulta engajamento em lote para múltiplos imóveis via tabela de leads.
 */
export async function getPropertiesEngagementBatch(
  propertyIds: string[]
): Promise<Map<string, PropertyEngagementData>> {
  const result = new Map<string, PropertyEngagementData>();
  if (!propertyIds || propertyIds.length === 0) return result;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("leads")
      .select("property_id, source, created_at")
      .in("property_id", propertyIds);

    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (!row.property_id) continue;
        const current = result.get(row.property_id) || {
          propertyId: row.property_id,
          totalLeads: 0,
          whatsappClicks: 0,
          formLeads: 0,
          otherEvents: 0,
          publishedAt: null,
        };

        current.totalLeads += 1;
        if (row.source === "whatsapp") {
          current.whatsappClicks += 1;
        } else if (row.source === "form") {
          current.formLeads += 1;
        } else {
          current.otherEvents += 1;
        }

        result.set(row.property_id, current);
      }
    }
  } catch (err) {
    console.error("[getPropertiesEngagementBatch] Erro ao consultar leads:", err);
  }

  return result;
}

/**
 * Diagnóstico completo do score de um imóvel específico para a administração.
 */
export async function getPropertyRankingBreakdown(
  propertyId: string,
  searchFilters?: SearchFilters
): Promise<PropertyRankingResult | null> {
  try {
    const supabase = createAdminClient();

    // 1. Busca imóvel completo
    const { data: prop, error } = await supabase
      .from("properties")
      .select(`
        id,
        property_type,
        transaction_type,
        title,
        description,
        price,
        rent_price,
        condominium_fee,
        iptu,
        usable_area,
        total_area,
        bedrooms,
        suites,
        bathrooms,
        parking_spaces,
        neighborhood_id,
        city_id,
        state_id,
        latitude,
        longitude,
        external_id,
        updated_at,
        published_at,
        agency:agencies!agency_id (id, name, verified_at),
        city:cities!city_id (id, name, slug),
        neighborhood:neighborhoods!neighborhood_id (id, name, slug),
        state:states!state_id (id, code, name),
        media:property_media (url, type, is_cover),
        features:property_features (feature_id)
      `)
      .eq("id", propertyId)
      .maybeSingle();

    if (error || !prop) return null;

    // 2. Configuração central
    const config = await getRankingConfig();

    // 3. Checa destaque
    let isFeatured = false;
    try {
      const { data: featRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "featured_property_ids")
        .maybeSingle();
      if (featRow?.value && Array.isArray(featRow.value)) {
        isFeatured = featRow.value.includes(propertyId);
      }
    } catch {
      // ignore
    }

    // 4. Estatísticas de coorte de preço
    const cohortStats = await getCohortPriceStats(
      prop.city_id,
      prop.property_type,
      prop.transaction_type
    );

    // 5. Engajamento do imóvel
    const engagementMap = await getPropertiesEngagementBatch([propertyId]);
    const engagement = engagementMap.get(propertyId) || {
      propertyId,
      totalLeads: 0,
      whatsappClicks: 0,
      formLeads: 0,
      otherEvents: 0,
      publishedAt: prop.published_at,
    };
    engagement.publishedAt = prop.published_at;

    // 6. Calcula o ranking
    return calculatePropertyRanking(
      {
        id: prop.id,
        propertyType: prop.property_type,
        transactionType: prop.transaction_type,
        title: prop.title,
        description: prop.description,
        price: prop.price,
        rentPrice: prop.rent_price,
        condominiumFee: prop.condominium_fee,
        iptu: prop.iptu,
        usableArea: prop.usable_area,
        totalArea: prop.total_area,
        bedrooms: prop.bedrooms,
        suites: prop.suites,
        bathrooms: prop.bathrooms,
        parkingSpaces: prop.parking_spaces,
        neighborhoodId: prop.neighborhood_id,
        cityId: prop.city_id,
        stateId: prop.state_id,
        latitude: prop.latitude ? Number(prop.latitude) : null,
        longitude: prop.longitude ? Number(prop.longitude) : null,
        externalId: prop.external_id,
        updatedAt: prop.updated_at,
        publishedAt: prop.published_at,
        agency: { verifiedAt: (prop.agency as any)?.verified_at },
        city: prop.city as any,
        neighborhood: prop.neighborhood as any,
        state: prop.state as any,
        media: (prop.media as any) || [],
        features: (prop.features as any) || [],
        featured: isFeatured,
      },
      {
        searchFilters,
        config,
        cohortStats,
        engagementData: engagement,
        isFeatured,
        isAgencyVerified: Boolean((prop.agency as any)?.verified_at),
      }
    );
  } catch (err) {
    console.error("[getPropertyRankingBreakdown] Falha ao calcular score do imóvel:", err);
    return null;
  }
}
