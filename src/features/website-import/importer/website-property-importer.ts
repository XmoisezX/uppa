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
import type { CrawlResult, CrawlRunStatus } from "../types";
import { computePropertyContentHash } from "../utils/content-hash";

export interface WebsiteImporterContext {
  agencyId: string;
  websiteSourceId: string;
  crawlRunId: string;
}

export class WebsitePropertyImporter {
  private supabase: SupabaseClient<Database>;
  private context: WebsiteImporterContext;

  private stateCache = new Map<string, string>();
  private cityCache = new Map<string, string>();
  private neighborhoodCache = new Map<string, string>();
  private featureCache = new Map<string, string>();

  constructor(
    supabase: SupabaseClient<Database>,
    context: WebsiteImporterContext
  ) {
    this.supabase = supabase;
    this.context = context;
  }

  /**
   * Executa a importação idempotente da lista de imóveis normalizados
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
    const startTime = Date.now();
    const { agencyId, websiteSourceId, crawlRunId } = this.context;

    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsFailed = initialErrors.length;

    // 1. Registra erros iniciais de descoberta / parsing em crawl_errors
    for (const err of initialErrors) {
      await this.recordCrawlError(
        err.url || null,
        err.externalId || null,
        err.errorType,
        err.message,
        err.payload
      );
    }

    // 2. Pré-carrega caches geográficos e de features para otimizar tempo
    await this.preloadCaches();

    // 3. Processamento concorrente controlado dos imóveis normalizados
    const concurrency = 4;
    const processedExternalIds: string[] = [];

    for (let i = 0; i < properties.length; i += concurrency) {
      const chunk = properties.slice(i, i + concurrency);

      await Promise.all(
        chunk.map(async (prop) => {
          try {
            const outcome = await this.persistSingleProperty(prop);
            if (outcome === "created") {
              itemsCreated++;
            } else if (outcome === "updated") {
              itemsUpdated++;
            }
            // "skipped" (content hash idêntico) não incrementa updated nem created
            processedExternalIds.push(prop.externalId);
          } catch (err: any) {
            itemsFailed++;
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

    // 4. Desativação segura em duas etapas de imóveis ausentes
    const itemsDeactivated = await this.handleMissingProperties(
      agencyId,
      processedExternalIds
    );

    // 5. Determinação de status final e duração
    const itemsFound = properties.length + initialErrors.length;
    const durationMs = Date.now() - startTime;

    let finalStatus: CrawlRunStatus = "completed";
    if (itemsFailed > 0) {
      finalStatus =
        itemsCreated + itemsUpdated > 0 ? "completed_with_errors" : "failed";
    }

    // 6. Atualiza registro em crawl_runs
    await this.supabase
      .from("crawl_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        items_found: itemsFound,
        items_created: itemsCreated,
        items_updated: itemsUpdated,
        items_deactivated: itemsDeactivated,
        items_failed: itemsFailed,
        pages_crawled: pagesCrawled,
        duration_ms: durationMs,
      })
      .eq("id", crawlRunId);

    // 7. Atualiza timestamp de última varredura em website_sources
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
      itemsCreated,
      itemsUpdated,
      itemsDeactivated,
      itemsFailed,
      pagesCrawled,
      durationMs,
      status: finalStatus,
    };
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

    // Verificação de identidade: agency_id + source ('website') + external_id
    const { data: existing, error: searchError } = await this.supabase
      .from("properties")
      .select("id, content_hash, status")
      .eq("agency_id", agencyId)
      .eq("source", "website")
      .eq("external_id", prop.externalId)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Falha na busca de idempotência: ${searchError.message}`);
    }

    if (existing) {
      const propertyId = existing.id;

      // HASH CHECK: Se o content hash for idêntico, poupa writes pesados
      if (existing.content_hash === contentHash) {
        // Apenas marca que o imóvel foi visto nesta execução e limpa marcação de ausência
        await this.supabase
          .from("properties")
          .update({
            last_seen_at: nowIso,
            missing_from_feed_at: null,
            status: existing.status === "inactive" ? "active" : existing.status,
          })
          .eq("id", propertyId);

        return "skipped";
      }

      // Conteúdo alterado: executa UPDATE completo
      const { error: updateError } = await this.supabase
        .from("properties")
        .update({
          title: prop.title,
          description: prop.description || null,
          transaction_type: prop.transactionType,
          property_type: prop.propertyType,
          price: prop.price || null,
          rent_price: prop.rentPrice || null,
          condominium_fee: prop.condominiumFee || null,
          iptu: prop.iptu || null,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          suites: prop.suites || 0,
          parking_spaces: prop.parkingSpaces || 0,
          usable_area: this.safeArea(prop.usableArea),
          total_area: this.safeArea(prop.totalArea),
          lot_area: this.safeArea(prop.lotArea),
          street: prop.address.street || null,
          number: prop.address.number || null,
          complement: prop.address.complement || null,
          zipcode: prop.address.postalCode || null,
          state_id: stateId || null,
          city_id: cityId || null,
          neighborhood_id: neighborhoodId || null,
          latitude: prop.address.latitude || null,
          longitude: prop.address.longitude || null,
          source_url: prop.sourceUrl || null,
          content_hash: contentHash,
          last_seen_at: nowIso,
          missing_from_feed_at: null,
          source_updated_at: prop.sourceUpdatedAt
            ? new Date(prop.sourceUpdatedAt).toISOString()
            : nowIso,
          updated_at: nowIso,
        })
        .eq("id", propertyId);

      if (updateError) {
        throw new Error(`Falha ao atualizar imóvel: ${updateError.message}`);
      }

      // Sincroniza mídias e características
      await this.syncMedia(propertyId, prop.images);
      await this.syncFeatures(propertyId, prop.features);

      return "updated";
    } else {
      // Inserção de Novo Anúncio
      const baseSlug = this.generateSlug(prop.title, prop.externalId);

      const { data: newProperty, error: insertError } = await this.supabase
        .from("properties")
        .insert({
          agency_id: agencyId,
          source: "website",
          external_id: prop.externalId,
          slug: baseSlug,
          title: prop.title,
          description: prop.description || null,
          transaction_type: prop.transactionType,
          property_type: prop.propertyType,
          status: "active",
          price: prop.price || null,
          rent_price: prop.rentPrice || null,
          condominium_fee: prop.condominiumFee || null,
          iptu: prop.iptu || null,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          suites: prop.suites || 0,
          parking_spaces: prop.parkingSpaces || 0,
          usable_area: this.safeArea(prop.usableArea),
          total_area: this.safeArea(prop.totalArea),
          lot_area: this.safeArea(prop.lotArea),
          street: prop.address.street || null,
          number: prop.address.number || null,
          complement: prop.address.complement || null,
          zipcode: prop.address.postalCode || null,
          state_id: stateId || null,
          city_id: cityId || null,
          neighborhood_id: neighborhoodId || null,
          latitude: prop.address.latitude || null,
          longitude: prop.address.longitude || null,
          source_url: prop.sourceUrl || null,
          content_hash: contentHash,
          last_seen_at: nowIso,
          published_at: nowIso,
          source_updated_at: prop.sourceUpdatedAt
            ? new Date(prop.sourceUpdatedAt).toISOString()
            : nowIso,
        })
        .select("id")
        .single();

      if (insertError || !newProperty) {
        throw new Error(`Falha ao inserir imóvel: ${insertError?.message}`);
      }

      const propertyId = newProperty.id;

      await this.syncMedia(propertyId, prop.images);
      await this.syncFeatures(propertyId, prop.features);

      return "created";
    }
  }

  /**
   * Desativação segura em duas etapas de imóveis não mais encontrados no website
   * NUNCA executa DELETE físico
   */
  private async handleMissingProperties(
    agencyId: string,
    presentExternalIds: string[]
  ): Promise<number> {
    const presentSet = new Set(presentExternalIds);

    const { data: dbProperties, error } = await this.supabase
      .from("properties")
      .select("id, external_id, status, missing_from_feed_at")
      .eq("agency_id", agencyId)
      .eq("source", "website");

    if (error || !dbProperties) {
      console.warn(
        "[WebsitePropertyImporter] Falha ao consultar imóveis para detecção de ausência:",
        error?.message
      );
      return 0;
    }

    let deactivatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const prop of dbProperties) {
      const isPresent = presentSet.has(prop.external_id);

      if (isPresent) {
        // Imóvel presente: se estava marcado como ausente ou inativo, restaura
        if (prop.missing_from_feed_at !== null || prop.status === "inactive") {
          await this.supabase
            .from("properties")
            .update({
              missing_from_feed_at: null,
              status: "active",
              updated_at: nowIso,
            })
            .eq("id", prop.id);
        }
      } else {
        // Imóvel ausente no site
        if (prop.missing_from_feed_at === null) {
          // 1ª ausência: apenas marca timestamp e mantém ativo
          await this.supabase
            .from("properties")
            .update({
              missing_from_feed_at: nowIso,
            })
            .eq("id", prop.id);
        } else {
          // 2ª ausência: confirmação de exclusão na origem -> desativa
          if (prop.status === "active") {
            await this.supabase
              .from("properties")
              .update({
                status: "inactive",
                updated_at: nowIso,
              })
              .eq("id", prop.id);

            deactivatedCount++;
          }
        }
      }
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
