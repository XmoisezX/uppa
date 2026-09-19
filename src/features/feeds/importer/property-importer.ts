/**
 * PropertyImporter - Responsável pela persistência e sincronização idempotente de imóveis
 * Conforme Seções 16, 24, 25, 26 e 28 do MASTER_PLAN:
 * "Usar agency_id + source + external_id para idempotência. Criar logs de execução.
 * Importação NÃO deve parar completamente porque um imóvel possui erro."
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { NormalizedProperty } from "@/types/feed";

export interface PropertyImporterContext {
  agencyId: string;
  feedId: string;
  feedRunId: string;
}

export interface ImportResult {
  feedRunId: string;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  status: "completed" | "completed_with_errors" | "failed";
}

export interface ImportProgressData {
  current: number;
  total: number;
  created: number;
  updated: number;
  failed: number;
  currentProperty?: {
    externalId: string;
    title: string;
    status: "created" | "updated" | "failed";
    error?: string;
  };
}

export class PropertyImporter {
  private supabase: SupabaseClient<Database>;
  private context: PropertyImporterContext;

  // Caches em memória durante a execução para evitar consultas repetitivas ao banco
  private stateCache = new Map<string, string>(); // UF ou Nome -> UUID
  private cityCache = new Map<string, string>(); // "Nome-StateId" -> UUID
  private neighborhoodCache = new Map<string, string>(); // "Nome-CityId" -> UUID
  private featureCache = new Map<string, string>(); // slug -> UUID

  constructor(supabase: SupabaseClient<Database>, context: PropertyImporterContext) {
    this.supabase = supabase;
    this.context = context;
  }

  /**
   * Executa a importação idempotente de uma lista de propriedades normalizadas
   */
  public async importProperties(
    properties: NormalizedProperty[],
    initialErrors: {
      externalId?: string;
      errorType: string;
      message: string;
      payload?: any;
    }[] = [],
    onProgress?: (progress: ImportProgressData) => Promise<void> | void
  ): Promise<ImportResult> {
    const { agencyId, feedRunId, feedId } = this.context;

    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsFailed = initialErrors.length;

    // 1. Registra os erros de sintaxe ou parsing iniciais em feed_errors
    for (const err of initialErrors) {
      await this.recordFeedError(
        err.externalId || null,
        err.errorType,
        err.message,
        err.payload
      );
    }

    // 1.1 Pré-carrega estados e features existentes para otimizar tempo de rede em lote
    try {
      if (this.stateCache.size === 0) {
        const { data: states } = await this.supabase.from("states").select("id, code, name");
        if (states) {
          for (const s of states) {
            if (s.code) this.stateCache.set(s.code.toUpperCase(), s.id);
            if (s.name) this.stateCache.set(s.name.toUpperCase(), s.id);
          }
        }
      }

      if (this.featureCache.size === 0) {
        const { data: features } = await this.supabase.from("features").select("id, slug");
        if (features) {
          for (const f of features) {
            if (f.slug && f.id) this.featureCache.set(f.slug, f.id);
          }
        }
      }
    } catch (cacheErr) {
      console.warn("[PropertyImporter] Falha ao pré-carregar cache inicial:", cacheErr);
    }

    // 2. Processa cada imóvel normalizado de forma isolada e tolerante a falhas (concorrência controlada)
    let processedCount = 0;
    const concurrency = 6;

    for (let i = 0; i < properties.length; i += concurrency) {
      const chunk = properties.slice(i, i + concurrency);

      await Promise.all(
        chunk.map(async (prop) => {
          let itemStatus: "created" | "updated" | "failed" = "failed";
          let errorMsg: string | undefined;

          try {
            const result = await this.persistSingleProperty(prop);
            if (result === "created") {
              itemsCreated++;
              itemStatus = "created";
            } else if (result === "updated") {
              itemsUpdated++;
              itemStatus = "updated";
            }
          } catch (err: any) {
            itemsFailed++;
            errorMsg = err?.message || "Erro inesperado de persistência.";
            console.error(`[PropertyImporter] Erro no imóvel ${prop.externalId}:`, err?.message);

            await this.recordFeedError(
              prop.externalId,
              "persistence_error",
              errorMsg || "Erro inesperado de persistência.",
              { externalId: prop.externalId, title: prop.title }
            );
          }

          processedCount++;

          // Callback em tempo real
          if (onProgress) {
            await onProgress({
              current: processedCount,
              total: properties.length,
              created: itemsCreated,
              updated: itemsUpdated,
              failed: itemsFailed,
              currentProperty: {
                externalId: prop.externalId,
                title: prop.title,
                status: itemStatus,
                error: errorMsg,
              },
            });
          }
        })
      );
    }

    // 3. Determina status final da execução
    const itemsFound = properties.length + initialErrors.length;
    let finalStatus: ImportResult["status"] = "completed";

    if (itemsFailed > 0) {
      finalStatus = itemsCreated + itemsUpdated > 0 ? "completed_with_errors" : "failed";
    }

    // 4. Finaliza registro em feed_runs
    await this.supabase
      .from("feed_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        items_found: itemsFound,
        items_created: itemsCreated,
        items_updated: itemsUpdated,
        items_failed: itemsFailed,
      })
      .eq("id", feedRunId);

    // 5. Atualiza timestamp de última sincronização do feed
    await this.supabase
      .from("feeds")
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", feedId);

    return {
      feedRunId,
      itemsFound,
      itemsCreated,
      itemsUpdated,
      itemsFailed,
      status: finalStatus,
    };
  }

  /**
   * Persiste ou atualiza um único imóvel garantindo idempotência
   */
  private async persistSingleProperty(
    prop: NormalizedProperty
  ): Promise<"created" | "updated"> {
    const { agencyId } = this.context;

    // Resolução de IDs geográficos
    const stateId = await this.resolveStateId(prop.address.state);
    const cityId = await this.resolveCityId(prop.address.city, stateId);
    const neighborhoodId = await this.resolveNeighborhoodId(
      prop.address.neighborhood,
      cityId
    );

    // Verificação de identidade: agency_id + source + external_id (Seção 28 do MASTER_PLAN)
    const { data: existingProperty, error: searchError } = await this.supabase
      .from("properties")
      .select("id, price, rent_price, status, slug")
      .eq("agency_id", agencyId)
      .eq("source", "vrsync")
      .eq("external_id", prop.externalId)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Falha ao verificar idempotência: ${searchError.message}`);
    }

    if (existingProperty) {
      // ==========================================
      // OPERAÇÃO UPDATE (Imóvel existente)
      // ==========================================
      const propertyId = existingProperty.id;

      // 1. Atualiza dados principais (históricos de preço e status são gerados automaticamente pelas triggers no Postgres)

      // 2. Atualiza dados principais
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
          source_updated_at: prop.sourceUpdatedAt
            ? new Date(prop.sourceUpdatedAt).toISOString()
            : new Date().toISOString(),
          missing_from_feed_at: null, // Limpa marcação de ausência pois foi encontrado
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId);

      if (updateError) {
        throw new Error(`Falha ao atualizar imóvel: ${updateError.message}`);
      }

      // 3. Sincroniza mídias e características
      await this.syncMedia(propertyId, prop.images);
      await this.syncFeatures(propertyId, prop.features);

      return "updated";
    } else {
      // ==========================================
      // OPERAÇÃO INSERT (Novo imóvel)
      // ==========================================
      const baseSlug = this.generateSlug(prop.title, prop.externalId);

      const { data: newProperty, error: insertError } = await this.supabase
        .from("properties")
        .insert({
          agency_id: agencyId,
          source: "vrsync",
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
          published_at: new Date().toISOString(),
          source_updated_at: prop.sourceUpdatedAt
            ? new Date(prop.sourceUpdatedAt).toISOString()
            : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !newProperty) {
        throw new Error(`Falha ao inserir imóvel: ${insertError?.message}`);
      }

      const propertyId = newProperty.id;

      // Históricos de preço e status iniciais são gerados automaticamente pelas triggers no PostgreSQL
      // trg_property_price_history e trg_property_status_history após o INSERT

      // Mídias e características
      await this.syncMedia(propertyId, prop.images);
      await this.syncFeatures(propertyId, prop.features);

      return "created";
    }
  }

  /**
   * Sincroniza fotos e mídias do imóvel de forma tolerante a falhas
   */
  private async syncMedia(propertyId: string, images: NormalizedProperty["images"]) {
    if (!images || images.length === 0) return;

    try {
      // Filtra e sanitiza mídias com URLs válidas
      const validImages = images
        .filter((img) => img && typeof img.url === "string" && img.url.trim().startsWith("http"))
        .slice(0, 50);

      if (validImages.length === 0) return;

      // Substitui conjunto de imagens para manter ordenação e integridade da origem
      await this.supabase.from("property_media").delete().eq("property_id", propertyId);

      const mediaRows = validImages.map((img, index) => ({
        property_id: propertyId,
        type: img.type || "image",
        url: img.url.trim(),
        position: index,
        is_cover: img.isCover ?? index === 0,
        source_url: img.url.trim(),
      }));

      const { error: mediaErr } = await this.supabase.from("property_media").insert(mediaRows);
      if (mediaErr) {
        console.warn(`[PropertyImporter] Aviso ao sincronizar mídias do imóvel ${propertyId}:`, mediaErr.message);
      }
    } catch (err: any) {
      console.warn(`[PropertyImporter] Falha ao processar mídias do imóvel ${propertyId}:`, err?.message);
    }
  }

  /**
   * Sincroniza características (features)
   */
  private async syncFeatures(propertyId: string, featureNames: string[]) {
    if (!featureNames || featureNames.length === 0) return;

    try {
      const featureIds: string[] = [];

      for (const name of featureNames) {
        const slug = this.slugify(name);
        if (!slug) continue;

        let featureId = this.featureCache.get(slug);

        if (!featureId) {
          // Busca feature existente
          const { data: existingFeature } = await this.supabase
            .from("features")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

          if (existingFeature) {
            featureId = existingFeature.id;
          } else {
            // Cria nova feature se não existir
            const { data: newFeature } = await this.supabase
              .from("features")
              .insert({ name, slug, category: "general" })
              .select("id")
              .maybeSingle();

            if (newFeature) {
              featureId = newFeature.id;
            }
          }

          if (featureId) {
            this.featureCache.set(slug, featureId);
          }
        }

        if (featureId) {
          featureIds.push(featureId);
        }
      }

      if (featureIds.length > 0) {
        // Insere vínculos em property_features ignorando duplicatas
        const featureLinks = featureIds.map((fId) => ({
          property_id: propertyId,
          feature_id: fId,
        }));

        await this.supabase
          .from("property_features")
          .upsert(featureLinks, { onConflict: "property_id,feature_id", ignoreDuplicates: true });
      }
    } catch (err: any) {
      console.warn(`[PropertyImporter] Aviso ao sincronizar características do imóvel ${propertyId}:`, err?.message);
    }
  }

  /**
   * Resolução de Estado com cache
   */
  private async resolveStateId(stateStr?: string): Promise<string | null> {
    if (!stateStr) return null;
    const clean = stateStr.trim().toUpperCase();

    if (this.stateCache.has(clean)) {
      return this.stateCache.get(clean) || null;
    }

    let query = this.supabase.from("states").select("id");
    if (clean.length === 2) {
      query = query.eq("code", clean);
    } else {
      query = query.ilike("name", clean);
    }

    const { data } = await query.maybeSingle();
    const id = data?.id || null;

    if (id) {
      this.stateCache.set(clean, id);
    }

    return id;
  }

  /**
   * Resolução de Cidade com cache
   */
  private async resolveCityId(
    cityStr?: string,
    stateId?: string | null
  ): Promise<string | null> {
    if (!cityStr) return null;
    const clean = cityStr.trim();
    const cacheKey = `${clean.toLowerCase()}-${stateId || "no-state"}`;

    if (this.cityCache.has(cacheKey)) {
      return this.cityCache.get(cacheKey) || null;
    }

    let query = this.supabase.from("cities").select("id").ilike("name", clean);
    if (stateId) {
      query = query.eq("state_id", stateId);
    }

    const { data } = await query.limit(1).maybeSingle();
    const id = data?.id || null;

    if (id) {
      this.cityCache.set(cacheKey, id);
    }

    return id;
  }

  /**
   * Resolução de Bairro com cache
   */
  private async resolveNeighborhoodId(
    neighborhoodStr?: string,
    cityId?: string | null
  ): Promise<string | null> {
    if (!neighborhoodStr || !cityId) return null;
    const clean = neighborhoodStr.trim();
    const cacheKey = `${clean.toLowerCase()}-${cityId}`;

    if (this.neighborhoodCache.has(cacheKey)) {
      return this.neighborhoodCache.get(cacheKey) || null;
    }

    const { data } = await this.supabase
      .from("neighborhoods")
      .select("id")
      .eq("city_id", cityId)
      .ilike("name", clean)
      .maybeSingle();

    const id = data?.id || null;
    if (id) {
      this.neighborhoodCache.set(cacheKey, id);
    }

    return id;
  }

  /**
   * Registra um erro granular em feed_errors
   */
  private async recordFeedError(
    externalId: string | null,
    errorType: string,
    message: string,
    payload?: any
  ) {
    try {
      await this.supabase.from("feed_errors").insert({
        feed_run_id: this.context.feedRunId,
        external_id: externalId,
        error_type: errorType,
        message,
        payload: payload || null,
      });
    } catch (err) {
      console.warn("[PropertyImporter] Falha ao registrar log de erro:", err);
    }
  }

  private generateSlug(title: string, externalId: string): string {
    const slugTitle = this.slugify(title);
    const cleanExtId = this.slugify(externalId);
    const combined = `${slugTitle || "imovel"}-${cleanExtId || Math.random().toString(36).substring(2, 7)}`;
    return combined.replace(/--+/g, "-").replace(/^-+|-+$/g, "");
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
      .replace(/^-+|-+$/g, "")
      .trim();
  }

  private safeArea(val?: number): number | null {
    if (val === undefined || val === null || isNaN(val)) return null;
    if (val <= 0) return null;
    return Math.min(val, 99999999.99);
  }
}
