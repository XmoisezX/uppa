/**
 * WebsitePropertyImporter
 * Responsável pela persistência e sincronização idempotente de NormalizedProperty[]
 * com origem source = 'website'.
 *
 * Características:
 * - Identidade: agency_id + 'website' + external_id
 * - Content Hash SHA-256 para pular UPDATEs quando o anúncio não sofreu alterações
 * - Atualização de source_url e last_seen_at
 * - Desativação segura em 2 etapas para imóveis ausentes (zero hard deletes)
 * - Tolerância a falhas: um imóvel ruim registra erro em crawl_errors e NÃO para o lote
 * - Observabilidade completa em crawl_runs
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { NormalizedProperty } from "@/types/feed";
import type { PropertyStatus } from "@/types/property";
import type { CrawlResult, CrawlRunStatus } from "../types";
import { computePropertyContentHash } from "../utils/content-hash";
import { PropertyOfferIngestionService } from "@/features/offers";

export interface WebsiteImporterContext {
  agencyId: string;
  websiteSourceId: string;
  crawlRunId: string;
  initialCounts?: {
    created?: number;
    updated?: number;
    failed?: number;
  };
}

export class WebsitePropertyImporter {
  private supabase: SupabaseClient<Database>;
  private context: WebsiteImporterContext;
  private ingestionService: PropertyOfferIngestionService;

  private stateCache = new Map<string, string>();
  private cityCache = new Map<string, string>();
  private neighborhoodCache = new Map<string, string>();
  private featureCache = new Map<string, string>();

  private _itemsCreated = 0;
  private _itemsUpdated = 0;
  private _itemsFailed = 0;
  private _processedExternalIds: string[] = [];
  private _startTime = Date.now();
  private _initialized = false;

  constructor(
    supabase: SupabaseClient<Database>,
    context: WebsiteImporterContext
  ) {
    this.supabase = supabase;
    this.context = context;
    this.ingestionService = new PropertyOfferIngestionService(supabase);
    this._itemsCreated = context.initialCounts?.created || 0;
    this._itemsUpdated = context.initialCounts?.updated || 0;
    this._itemsFailed = context.initialCounts?.failed || 0;
  }

  public get itemsCreated(): number {
    return this._itemsCreated;
  }

  public get itemsUpdated(): number {
    return this._itemsUpdated;
  }

  public get itemsFailed(): number {
    return this._itemsFailed;
  }

  public get processedExternalIds(): string[] {
    return this._processedExternalIds;
  }

  /**
   * Inicializa e pré-carrega caches necessários
   */
  public async init(): Promise<void> {
    if (this._initialized) return;
    await this.preloadCaches();
    this._initialized = true;
  }

  /**
   * Registra falha granular em crawl_errors
   */
  public async recordError(
    url: string | null,
    externalId: string | null,
    errorType: string,
    message: string,
    payload?: any
  ): Promise<void> {
    this._itemsFailed++;
    await this.recordCrawlError(url, externalId, errorType, message, payload);
  }

  /**
   * Persiste um lote de anúncios normalizados de forma progressiva
   */
  public async importBatch(
    chunk: NormalizedProperty[],
    concurrency = 4
  ): Promise<{ created: number; updated: number; failed: number }> {
    await this.init();

    let batchCreated = 0;
    let batchUpdated = 0;
    let batchFailed = 0;

    for (let i = 0; i < chunk.length; i += concurrency) {
      const subChunk = chunk.slice(i, i + concurrency);

      await Promise.all(
        subChunk.map(async (prop) => {
          try {
            const outcome = await this.persistSingleProperty(prop);
            if (outcome === "created") {
              this._itemsCreated++;
              batchCreated++;
            } else if (outcome === "updated" || outcome === "skipped") {
              this._itemsUpdated++;
              batchUpdated++;
            }
            this._processedExternalIds.push(prop.externalId);
            const cleanCode = prop.externalId.replace(/_[A-Z0-9]+$/i, "");
            if (cleanCode && cleanCode !== prop.externalId) {
              this._processedExternalIds.push(cleanCode);
            }
          } catch (err: any) {
            this._itemsFailed++;
            batchFailed++;
            console.error(
              `[WebsitePropertyImporter] Falha no imóvel ${prop.externalId}:`,
              err?.message
            );

            await this.recordCrawlError(
              prop.sourceUrl || null,
              prop.externalId,
              "persistence_error",
              err?.message || "Erro inesperado de persistência.",
              { externalId: prop.externalId, title: prop.title }
            );
          }
        })
      );
    }

    return { created: batchCreated, updated: batchUpdated, failed: batchFailed };
  }

  /**
   * Finaliza o ciclo de crawling:
   * - Executa verificação em 2 etapas para desativação de ausentes
   * - Atualiza crawl_runs com os números finais consolidados
   * - Atualiza timestamp de last_crawl_at em website_sources
   */
  public async finalize(
    itemsFound: number,
    pagesCrawled = 1,
    skipDeactivation = false,
    crawlRunStartedAt?: string
  ): Promise<CrawlResult> {
    const { agencyId, websiteSourceId, crawlRunId } = this.context;

    // Desativação segura em duas etapas de imóveis ausentes
    // Ignora quando for continuação parcial (skipDeactivation = true) para proteger imóveis anteriores
    const itemsDeactivated = skipDeactivation
      ? 0
      : await this.handleMissingProperties(
          agencyId,
          this._processedExternalIds,
          crawlRunStartedAt
        );

    const durationMs = Date.now() - this._startTime;

    let finalStatus: CrawlRunStatus = "completed";
    if (this._itemsFailed > 0) {
      finalStatus =
        this._itemsCreated + this._itemsUpdated > 0
          ? "completed_with_errors"
          : "failed";
    }

    await this.supabase
      .from("crawl_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        items_found: itemsFound,
        items_created: this._itemsCreated,
        items_updated: this._itemsUpdated,
        items_deactivated: itemsDeactivated,
        items_failed: this._itemsFailed,
        pages_crawled: pagesCrawled,
        duration_ms: durationMs,
      })
      .eq("id", crawlRunId);

    await this.supabase
      .from("website_sources")
      .update({
        last_crawl_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteSourceId);

    return {
      success: finalStatus !== "failed",
      crawlRunId,
      itemsFound,
      itemsCreated: this._itemsCreated,
      itemsUpdated: this._itemsUpdated,
      itemsDeactivated,
      itemsFailed: this._itemsFailed,
      pagesCrawled,
      durationMs,
      status: finalStatus,
    };
  }

  /**
   * Executa a importação idempotente da lista completa de imóveis normalizados
   */
  public async importProperties(
    properties: NormalizedProperty[],
    initialErrors: {
      url?: string;
      externalId?: string;
      errorType: string;
      message: string;
      payload?: any;
    }[] = [],
    pagesCrawled = 1
  ): Promise<CrawlResult> {
    await this.init();

    // 1. Registra erros iniciais de descoberta / parsing em crawl_errors
    for (const err of initialErrors) {
      await this.recordError(
        err.url || null,
        err.externalId || null,
        err.errorType,
        err.message,
        err.payload
      );
    }

    // 2. Persiste imóveis
    await this.importBatch(properties);

    // 3. Finaliza com desativação e registro em banco
    return this.finalize(properties.length + initialErrors.length, pagesCrawled);
  }

  /**
   * Persiste um único imóvel garantindo idempotência e content hash
   */
  private async persistSingleProperty(
    prop: NormalizedProperty
  ): Promise<"created" | "updated" | "skipped"> {
    const { agencyId } = this.context;
    const nowIso = new Date().toISOString();
    const contentHash = computePropertyContentHash(prop);

    // Resolução de IDs geográficos
    const stateId = await this.resolveStateId(prop.address.state);
    const cityId = await this.resolveCityId(prop.address.city, stateId);
    const neighborhoodId = await this.resolveNeighborhoodId(
      prop.address.neighborhood,
      cityId
    );

    // 1. Verificação de identidade comercial nativa: agency_id + source ('website') + external_id em property_offers
    let existingOffer = await this.ingestionService.findOfferByIdentity(
      agencyId,
      "website",
      prop.externalId
    );

    // 2. Análise de código limpo se não localizado diretamente
    if (!existingOffer) {
      const cleanCode = prop.externalId.replace(/_[A-Z0-9]+$/i, "");
      if (cleanCode !== prop.externalId) {
        existingOffer = await this.ingestionService.findOfferByIdentity(
          agencyId,
          "website",
          cleanCode
        );
      }
    }

    // Imóveis sem imagens válidas, sem descrição ou sem preço devem ficar inativos como padrão
    const hasValidImages =
      Array.isArray(prop.images) &&
      prop.images.some(
        (img) => img && typeof img.url === "string" && img.url.trim().length > 0
      );
    const hasValidDescription = Boolean(
      prop.description && prop.description.trim().length >= 10
    );
    const hasValidPrice = Boolean(
      (typeof prop.price === "number" && prop.price > 0) ||
      (typeof prop.rentPrice === "number" && prop.rentPrice > 0)
    );

    let targetStatus: PropertyStatus = "active";
    if (prop.isUnavailable || !hasValidImages || !hasValidDescription || !hasValidPrice) {
      targetStatus = "inactive";
    }

    if (existingOffer) {
      // HASH CHECK: Se o content hash for idêntico, poupa writes pesados
      if (existingOffer.content_hash === contentHash) {
        // Apenas marca que a oferta e o imóvel foram vistos nesta execução
        await this.supabase
          .from("property_offers")
          .update({
            last_seen_at: nowIso,
            missing_from_feed_at: null,
            status: targetStatus,
          })
          .eq("id", existingOffer.id);

        await this.supabase
          .from("properties")
          .update({
            last_seen_at: nowIso,
            missing_from_feed_at: null,
            status: targetStatus,
          })
          .eq("id", existingOffer.property_id);

        return "skipped";
      }
    }

    // Determina precisão do endereço: pontual (exato) vs região/bairro
    const isExactAddress = Boolean(
      prop.address.street &&
      prop.address.number &&
      prop.address.number !== "0" &&
      prop.address.number !== "0000" &&
      prop.address.number.toLowerCase() !== "sn" &&
      prop.address.number.toLowerCase() !== "s/n"
    );

    const addressVisible =
      typeof prop.address.addressVisible === "boolean"
        ? prop.address.addressVisible
        : isExactAddress;

    let resolvedLat = prop.address.latitude || null;
    let resolvedLng = prop.address.longitude || null;

    if ((!resolvedLat || !resolvedLng) && neighborhoodId) {
      try {
        const { data: nRow } = await this.supabase
          .from("neighborhoods")
          .select("latitude, longitude")
          .eq("id", neighborhoodId)
          .single();
        if (nRow?.latitude && nRow?.longitude) {
          resolvedLat = Number(nRow.latitude);
          resolvedLng = Number(nRow.longitude);
        }
      } catch {}
    }

    if ((!resolvedLat || !resolvedLng) && cityId) {
      try {
        const { data: cRow } = await this.supabase
          .from("cities")
          .select("latitude, longitude")
          .eq("id", cityId)
          .single();
        if (cRow?.latitude && cRow?.longitude) {
          resolvedLat = Number(cRow.latitude);
          resolvedLng = Number(cRow.longitude);
        }
      } catch {}
    }

    // Gravação central via PropertyOfferIngestionService
    const result = await this.ingestionService.upsertPropertyOffer({
      agencyId,
      source: "website",
      externalId: prop.externalId,
      propertyType: prop.propertyType,
      street: prop.address.street || null,
      number: prop.address.number || null,
      complement: prop.address.complement || null,
      zipcode: prop.address.postalCode || null,
      stateId: stateId || null,
      cityId: cityId || null,
      neighborhoodId: neighborhoodId || null,
      latitude: resolvedLat,
      longitude: resolvedLng,
      usableArea: this.safeArea(prop.usableArea),
      totalArea: this.safeArea(prop.totalArea),
      lotArea: this.safeArea(prop.lotArea),
      bedrooms: prop.bedrooms || 0,
      suites: prop.suites || 0,
      bathrooms: prop.bathrooms || 0,
      parkingSpaces: prop.parkingSpaces || 0,
      addressVisible,
      title: prop.title,
      description: prop.description || null,
      transactionType: prop.transactionType,
      status: targetStatus,
      salePrice: prop.price || null,
      rentPrice: prop.rentPrice || null,
      condominiumFee: prop.condominiumFee || null,
      iptu: prop.iptu || null,
      originalUrl: prop.sourceUrl || null,
      contentHash,
      lastSeenAt: nowIso,
      missingFromFeedAt: null,
      sourceUpdatedAt: prop.sourceUpdatedAt
        ? new Date(prop.sourceUpdatedAt).toISOString()
        : nowIso,
      media: (prop.images || []).map((img, idx) => ({
        url: img.url,
        isCover: Boolean(img.isCover || idx === 0),
        position: idx,
        type: "image",
      })),
    });

    // Sincroniza características na property
    await this.syncFeatures(result.propertyId, prop.features);

    return result.action;
  }

  /**
   * Desativação segura em duas etapas de imóveis não mais encontrados no website
   * Opera prioritariamente através do PropertyOfferIngestionService
   */
  private async handleMissingProperties(
    agencyId: string,
    presentExternalIds: string[],
    crawlRunStartedAt?: string
  ): Promise<number> {
    return await this.ingestionService.reconcileMissingOffers({
      agencyId,
      source: "website",
      presentExternalIds,
      crawlRunStartedAt,
    });
  }

    return deactivatedCount;
  }

  private async syncMedia(propertyId: string, images: NormalizedProperty["images"]) {
    if (!images || images.length === 0) return;

    try {
      const validImages = images
        .filter(
          (img) => img && typeof img.url === "string" && img.url.startsWith("http")
        )
        .slice(0, 50);

      if (validImages.length === 0) return;

      await this.supabase.from("property_media").delete().eq("property_id", propertyId);

      const mediaRows = validImages.map((img, index) => ({
        property_id: propertyId,
        type: img.type || "image",
        url: img.url.trim(),
        position: index,
        is_cover: img.isCover ?? index === 0,
        source_url: img.url.trim(),
      }));

      await this.supabase.from("property_media").insert(mediaRows);
    } catch (err: any) {
      console.warn(`[WebsitePropertyImporter] Falha ao sincronizar mídias:`, err?.message);
    }
  }

  private async syncFeatures(propertyId: string, featureNames: string[]) {
    if (!featureNames || featureNames.length === 0) return;

    try {
      const featureIds: string[] = [];

      for (const name of featureNames) {
        const slug = this.slugify(name);
        if (!slug) continue;

        let featureId = this.featureCache.get(slug);
        if (!featureId) {
          const { data: existing } = await this.supabase
            .from("features")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

          if (existing) {
            featureId = existing.id;
          } else {
            const { data: created } = await this.supabase
              .from("features")
              .insert({ name, slug, category: "general" })
              .select("id")
              .maybeSingle();
            if (created) featureId = created.id;
          }

          if (featureId) this.featureCache.set(slug, featureId);
        }

        if (featureId) featureIds.push(featureId);
      }

      if (featureIds.length > 0) {
        const featureLinks = featureIds.map((fId) => ({
          property_id: propertyId,
          feature_id: fId,
        }));

        await this.supabase.from("property_features").upsert(featureLinks, {
          onConflict: "property_id,feature_id",
          ignoreDuplicates: true,
        });
      }
    } catch (err: any) {
      console.warn(`[WebsitePropertyImporter] Falha ao sincronizar features:`, err?.message);
    }
  }

  private async preloadCaches() {
    try {
      if (this.stateCache.size === 0) {
        const { data: states } = await this.supabase
          .from("states")
          .select("id, code, name");
        if (states) {
          for (const s of states) {
            if (s.code) this.stateCache.set(s.code.toUpperCase(), s.id);
            if (s.name) this.stateCache.set(s.name.toUpperCase(), s.id);
          }
        }
      }

      if (this.featureCache.size === 0) {
        const { data: features } = await this.supabase
          .from("features")
          .select("id, slug");
        if (features) {
          for (const f of features) {
            if (f.slug && f.id) this.featureCache.set(f.slug, f.id);
          }
        }
      }
    } catch {
      // Ignora erro de pré-carregamento
    }
  }

  private async resolveStateId(stateStr?: string): Promise<string | null> {
    if (!stateStr) return null;
    const clean = stateStr.trim().toUpperCase();
    if (this.stateCache.has(clean)) return this.stateCache.get(clean) || null;

    let query = this.supabase.from("states").select("id");
    if (clean.length === 2) {
      query = query.eq("code", clean);
    } else {
      query = query.ilike("name", clean);
    }

    const { data } = await query.maybeSingle();
    const id = data?.id || null;
    if (id) this.stateCache.set(clean, id);
    return id;
  }

  private async resolveCityId(
    cityStr?: string,
    stateId?: string | null
  ): Promise<string | null> {
    if (!cityStr) return null;
    const clean = cityStr.trim();
    const cacheKey = `${clean.toLowerCase()}-${stateId || "no-state"}`;
    if (this.cityCache.has(cacheKey)) return this.cityCache.get(cacheKey) || null;

    let query = this.supabase.from("cities").select("id").ilike("name", clean);
    if (stateId) query = query.eq("state_id", stateId);

    const { data } = await query.limit(1).maybeSingle();
    const id = data?.id || null;
    if (id) this.cityCache.set(cacheKey, id);
    return id;
  }

  private async resolveNeighborhoodId(
    neighborhoodStr?: string,
    cityId?: string | null
  ): Promise<string | null> {
    if (!neighborhoodStr || !cityId) return null;
    const clean = neighborhoodStr.trim();
    const cacheKey = `${clean.toLowerCase()}-${cityId}`;
    if (this.neighborhoodCache.has(cacheKey))
      return this.neighborhoodCache.get(cacheKey) || null;

    const { data } = await this.supabase
      .from("neighborhoods")
      .select("id")
      .eq("city_id", cityId)
      .ilike("name", clean)
      .maybeSingle();

    let id = data?.id || null;
    if (!id) {
      const slug = this.slugify(clean) || `bairro-${Math.random().toString(36).slice(2, 6)}`;
      const { data: created } = await this.supabase
        .from("neighborhoods")
        .insert({ city_id: cityId, name: clean, slug })
        .select("id")
        .maybeSingle();
      id = created?.id || null;
    }

    if (id) this.neighborhoodCache.set(cacheKey, id);
    return id;
  }

  private async recordCrawlError(
    url: string | null,
    externalId: string | null,
    errorType: string,
    message: string,
    payload?: any
  ) {
    try {
      await this.supabase.from("crawl_errors").insert({
        crawl_run_id: this.context.crawlRunId,
        url,
        external_id: externalId,
        error_type: errorType,
        message,
        payload: payload || null,
      });
    } catch {
      // Ignora falha de gravação de log
    }
  }

  private generateSlug(title: string, externalId: string): string {
    const slugTitle = this.slugify(title);
    const cleanExtId = this.slugify(externalId);
    return `${slugTitle || "imovel"}-${cleanExtId || Math.random().toString(36).slice(2, 7)}`
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  }

  private safeArea(val?: number): number | null {
    if (val === undefined || val === null || isNaN(val)) return null;
    if (val <= 0) return null;
    return Math.min(val, 99999999.99);
  }
}
