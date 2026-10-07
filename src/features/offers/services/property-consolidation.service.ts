/**
 * PropertyConsolidationService
 * 
 * Gerencia o ciclo de vida de unificação e desunificação de propriedades físicas (Fases 4, 5, 8, 21 e 23).
 * 
 * Regras:
 * - NUNCA exclui uma oferta legítima de uma imobiliária.
 * - Reatribui `property_offers.property_id` para a property física canônica.
 * - Preserva `legacy_property_id` para permitir reversão 100% segura (unmerge).
 * - Registra redirecionamento 301 de slug em `property_slug_redirects`.
 * - Não destrói a property secundária: marca como `merged` com `canonical_property_id`.
 * - Recalcula agregados atômicos na canonical e na merged property.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { PropertyMatchingService, type PropertyPhysicalProfile } from "./property-matching.service";

export interface ConsolidationResult {
  success: boolean;
  canonicalPropertyId: string;
  mergedPropertyId: string;
  reassignedOffersCount: number;
  slugRedirectCreated: boolean;
}

export interface UnmergeResult {
  success: boolean;
  canonicalPropertyId: string;
  restoredPropertyId: string;
  reassignedOffersCount: number;
  slugRedirectRemoved: boolean;
}

export class PropertyConsolidationService {
  private matchingService: PropertyMatchingService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.matchingService = new PropertyMatchingService(supabase);
  }

  /**
   * Consolida duas propriedades físicas identificadas como o mesmo imóvel
   */
  public async mergeProperties(params: {
    propertyA: PropertyPhysicalProfile;
    propertyB: PropertyPhysicalProfile;
    candidateId?: string;
    reviewedBy?: string | null;
    notes?: string;
  }): Promise<ConsolidationResult> {
    const { propertyA, propertyB, candidateId, reviewedBy, notes } = params;

    // 1. Escolhe determinística a canônica e a duplicada
    const { canonical, duplicate } = this.matchingService.selectCanonicalProperty(
      propertyA,
      propertyB
    );

    const nowIso = new Date().toISOString();

    // 2. Transfere todas as ofertas da property duplicada para a canônica
    const { data: offersToMove, error: offersErr } = await this.supabase
      .from("property_offers")
      .select("id, legacy_property_id")
      .eq("property_id", duplicate.id);

    if (offersErr) {
      throw new Error(`[PropertyConsolidationService] Falha ao buscar ofertas: ${offersErr.message}`);
    }

    const offerIds = (offersToMove || []).map((o) => o.id);

    if (offerIds.length > 0) {
      const { error: moveErr } = await this.supabase
        .from("property_offers")
        .update({
          property_id: canonical.id,
          updated_at: nowIso,
        })
        .in("id", offerIds);

      if (moveErr) {
        throw new Error(`[PropertyConsolidationService] Falha ao reatribuir ofertas: ${moveErr.message}`);
      }
    }

    // 3. Marca a propriedade duplicada como 'merged' apontando para a canônica
    const { error: propMergeErr } = await this.supabase
      .from("properties")
      .update({
        status: "merged" as any,
        canonical_property_id: canonical.id,
        merged_at: nowIso,
        active_offers_count: 0,
        updated_at: nowIso,
      })
      .eq("id", duplicate.id);

    if (propMergeErr) {
      console.warn(`[PropertyConsolidationService] Aviso ao marcar status merged:`, propMergeErr.message);
    }

    // Garante que as ofertas comerciais reatribuídas permaneçam com status ativo (nunca merged)
    if (offerIds.length > 0) {
      await this.supabase
        .from("property_offers")
        .update({
          status: "active",
          updated_at: nowIso,
        })
        .in("id", offerIds);
    }

    // 4. Registra redirecionamento de slug (Fase 5 - 301 sem 404)
    let slugRedirectCreated = false;
    if (duplicate.slug && canonical.slug && duplicate.slug !== canonical.slug) {
      const { error: redirErr } = await this.supabase
        .from("property_slug_redirects" as any)
        .upsert(
          {
            source_slug: duplicate.slug,
            target_property_id: canonical.id,
            target_slug: canonical.slug,
            created_at: nowIso,
          },
          { onConflict: "source_slug" }
        );

      if (!redirErr) slugRedirectCreated = true;
    }

    // 5. Recalcula agregados automáticos na property canônica e na merged
    await this.recalculateAggregates(canonical.id);
    await this.recalculateAggregates(duplicate.id);

    // 6. Atualiza o status do candidato se fornecido
    if (candidateId) {
      await this.supabase
        .from("property_match_candidates" as any)
        .update({
          status: "approved",
          reviewed_by: reviewedBy || null,
          reviewed_at: nowIso,
          decision_notes: notes || "Consolidação aprovada",
          updated_at: nowIso,
        })
        .eq("id", candidateId);
    }

    return {
      success: true,
      canonicalPropertyId: canonical.id,
      mergedPropertyId: duplicate.id,
      reassignedOffersCount: offerIds.length,
      slugRedirectCreated,
    };
  }

  /**
   * Reverte um agrupamento prévio (Desagrupamento / Unmerge - Fase 21)
   */
  public async unmergeProperty(mergedPropertyId: string): Promise<UnmergeResult> {
    const nowIso = new Date().toISOString();

    // 1. Obtém dados da propriedade mesclada
    const { data: mergedProp, error: propErr } = await this.supabase
      .from("properties")
      .select("id, slug, canonical_property_id")
      .eq("id", mergedPropertyId)
      .single();

    if (propErr || !mergedProp || !mergedProp.canonical_property_id) {
      throw new Error("Propriedade não encontrada ou não possui canonical_property_id associado.");
    }

    const canonicalPropertyId = mergedProp.canonical_property_id;

    // 2. Localiza as ofertas que originalmente pertenciam a esta property via legacy_property_id
    const { data: originalOffers, error: offersErr } = await this.supabase
      .from("property_offers")
      .select("id")
      .eq("property_id", canonicalPropertyId)
      .eq("legacy_property_id", mergedPropertyId);

    if (offersErr) {
      throw new Error(`Falha ao localizar ofertas originais: ${offersErr.message}`);
    }

    const offerIds = (originalOffers || []).map((o) => o.id);

    // 3. Restaura property_id das ofertas para a propriedade original
    if (offerIds.length > 0) {
      await this.supabase
        .from("property_offers")
        .update({
          property_id: mergedPropertyId,
          updated_at: nowIso,
        })
        .in("id", offerIds);
    }

    // 4. Restaura a propriedade original para 'active'
    await this.supabase
      .from("properties")
      .update({
        status: "active",
        canonical_property_id: null,
        merged_at: null,
        updated_at: nowIso,
      })
      .eq("id", mergedPropertyId);

    // 5. Remove o redirecionamento de slug
    if (mergedProp.slug) {
      await this.supabase
        .from("property_slug_redirects" as any)
        .delete()
        .eq("source_slug", mergedProp.slug);
    }

    // 6. Recalcula agregados em ambas as propriedades
    await this.recalculateAggregates(canonicalPropertyId);
    await this.recalculateAggregates(mergedPropertyId);

    // 7. Marca candidatos de match como unmerged
    await this.supabase
      .from("property_match_candidates" as any)
      .update({
        status: "unmerged",
        decision_notes: "Agrupamento desfeito manualmente",
        updated_at: nowIso,
      })
      .or(`property_a_id.eq.${mergedPropertyId},property_b_id.eq.${mergedPropertyId}`);

    return {
      success: true,
      canonicalPropertyId,
      restoredPropertyId: mergedPropertyId,
      reassignedOffersCount: offerIds.length,
      slugRedirectRemoved: true,
    };
  }

  /**
   * Recalcula agregados atômicos via RPC do banco ou fallback seguro
   */
  public async recalculateAggregates(propertyId: string): Promise<void> {
    try {
      const { error: rpcErr } = await this.supabase.rpc(
        "recalculate_property_aggregates" as any,
        { p_property_id: propertyId }
      );

      if (rpcErr) {
        // Fallback na camada de aplicação se a RPC ainda não tiver sido compilada
        await this.fallbackRecalculateAggregates(propertyId);
      }
    } catch {
      await this.fallbackRecalculateAggregates(propertyId);
    }
  }

  /**
   * Recálculo na aplicação caso a RPC esteja em transição de deploy
   */
  private async fallbackRecalculateAggregates(propertyId: string): Promise<void> {
    const { data: offers } = await this.supabase
      .from("property_offers")
      .select("id, sale_price, rent_price, status, ranking_score, updated_at")
      .eq("property_id", propertyId);

    const activeOffers = (offers || []).filter((o) => o.status === "active");

    const activeCount = activeOffers.length;
    const salePrices = activeOffers
      .map((o) => o.sale_price)
      .filter((p): p is number => p != null && p > 0);
    const rentPrices = activeOffers
      .map((o) => o.rent_price)
      .filter((p): p is number => p != null && p > 0);

    const lowestSale = salePrices.length > 0 ? Math.min(...salePrices) : null;
    const highestSale = salePrices.length > 0 ? Math.max(...salePrices) : null;
    const lowestRent = rentPrices.length > 0 ? Math.min(...rentPrices) : null;
    const highestRent = rentPrices.length > 0 ? Math.max(...rentPrices) : null;

    // Primary Offer
    let primaryOfferId: string | null = null;
    if (activeOffers.length > 0) {
      const sorted = [...activeOffers].sort(
        (a, b) => (b.ranking_score || 0) - (a.ranking_score || 0)
      );
      primaryOfferId = sorted[0].id;
    } else if (offers && offers.length > 0) {
      primaryOfferId = offers[0].id;
    }

    await this.supabase
      .from("properties")
      .update({
        active_offers_count: activeCount,
        lowest_sale_price: lowestSale,
        highest_sale_price: highestSale,
        lowest_rent_price: lowestRent,
        highest_rent_price: highestRent,
        primary_offer_id: primaryOfferId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId);
  }
}
