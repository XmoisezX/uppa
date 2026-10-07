/**
 * PropertyOfferIngestionService
 * 
 * Camada central de persistência e ingestão da UPPA (Fase 2 de Property x Offer).
 * Responsável por orquestrar a gravação nativa de dados físicos em `properties`,
 * dados comerciais em `property_offers` e mídias em `offer_media`, mantendo a
 * compatibilidade temporária com as tabelas legadas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface IngestionMediaInput {
  type?: Database["public"]["Enums"]["media_type"];
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  position?: number;
  isCover?: boolean;
  sourceUrl?: string | null;
}

export interface IngestionPropertyOfferInput {
  agencyId: string;
  brokerId?: string | null;
  source: Database["public"]["Enums"]["listing_source"];
  externalId: string;

  // 1. Dados Físicos (properties)
  propertyType: Database["public"]["Enums"]["property_type"];
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  zipcode?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  neighborhoodId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  usableArea?: number | null;
  totalArea?: number | null;
  lotArea?: number | null;
  bedrooms?: number;
  suites?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  yearBuilt?: number | null;
  featureIds?: string[];

  // 2. Dados Comerciais (property_offers)
  transactionType: Database["public"]["Enums"]["transaction_type"];
  status: Database["public"]["Enums"]["property_status"];
  salePrice?: number | null;
  rentPrice?: number | null;
  condominiumFee?: number | null;
  iptu?: number | null;
  financiable?: boolean;
  acceptsExchange?: boolean;
  acceptsVehicle?: boolean;
  furnished?: boolean;
  petFriendly?: boolean;
  addressVisible?: boolean;
  title: string;
  description?: string | null;
  originalUrl?: string | null;
  publishedAt?: string | null;
  sourceUpdatedAt?: string | null;
  missingFromFeedAt?: string | null;
  contentHash?: string | null;
  lastSeenAt?: string | null;
  slug?: string;

  // 3. Mídias
  media?: IngestionMediaInput[];
}

export interface IngestionResult {
  action: "created" | "updated";
  propertyId: string;
  offerId: string;
}

export class PropertyOfferIngestionService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Localiza uma oferta existente pela sua chave comercial de identidade:
   * agency_id + source + external_id
   */
  public async findOfferByIdentity(
    agencyId: string,
    source: Database["public"]["Enums"]["listing_source"],
    externalId: string
  ) {
    const { data, error } = await this.supabase
      .from("property_offers")
      .select(`
        id,
        property_id,
        legacy_property_id,
        agency_id,
        source,
        external_id,
        transaction_type,
        status,
        sale_price,
        rent_price,
        title,
        content_hash,
        missing_from_feed_at,
        last_seen_at
      `)
      .eq("agency_id", agencyId)
      .eq("source", source)
      .eq("external_id", externalId)
      .maybeSingle();

    if (error) {
      throw new Error(`[PropertyOfferIngestionService] Erro ao buscar oferta: ${error.message}`);
    }

    return data;
  }

  /**
   * Upsert centralizado de imóvel e oferta:
   * 1. Se existir offer: atualiza dados físicos na property e dados comerciais na offer.
   * 2. Se for nova offer: cria property física provisória 1:1 e offer comercial correspondente.
   */
  public async upsertPropertyOffer(
    input: IngestionPropertyOfferInput
  ): Promise<IngestionResult> {
    const existingOffer = await this.findOfferByIdentity(
      input.agencyId,
      input.source,
      input.externalId
    );

    const nowIso = new Date().toISOString();

    if (existingOffer) {
      // =======================================================================
      // CASO 1: OFERTA EXISTENTE -> ATUALIZAÇÃO
      // =======================================================================
      const propertyId = existingOffer.property_id;
      const offerId = existingOffer.id;

      // 1. Atualiza atributos físicos em properties (e campos legados de espelho)
      const { error: propUpdateErr } = await this.supabase
        .from("properties")
        .update({
          // Atributos físicos
          property_type: input.propertyType,
          street: input.street || null,
          number: input.number || null,
          complement: input.complement || null,
          zipcode: input.zipcode || null,
          state_id: input.stateId || null,
          city_id: input.cityId || null,
          neighborhood_id: input.neighborhoodId || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          usable_area: input.usableArea || null,
          total_area: input.totalArea || null,
          lot_area: input.lotArea || null,
          bedrooms: input.bedrooms ?? 0,
          suites: input.suites ?? 0,
          bathrooms: input.bathrooms ?? 0,
          parking_spaces: input.parkingSpaces ?? 0,
          year_built: input.yearBuilt || null,
          // Campos legados para compatibilidade da busca pública e visualização
          title: input.title,
          description: input.description || null,
          transaction_type: input.transactionType,
          status: input.status,
          price: input.salePrice || null,
          rent_price: input.rentPrice || null,
          condominium_fee: input.condominiumFee || null,
          iptu: input.iptu || null,
          financiable: input.financiable || false,
          accepts_exchange: input.acceptsExchange || false,
          accepts_vehicle: input.acceptsVehicle || false,
          furnished: input.furnished || false,
          pet_friendly: input.petFriendly || false,
          address_visible: input.addressVisible || false,
          source_url: input.originalUrl || null,
          source_updated_at: input.sourceUpdatedAt || nowIso,
          missing_from_feed_at: input.missingFromFeedAt ?? null,
          content_hash: input.contentHash || null,
          last_seen_at: input.lastSeenAt || nowIso,
          updated_at: nowIso,
        })
        .eq("id", propertyId);

      if (propUpdateErr) {
        throw new Error(
          `[PropertyOfferIngestionService] Erro ao atualizar property ${propertyId}: ${propUpdateErr.message}`
        );
      }

      // 2. Atualiza atributos comerciais nativos em property_offers
      const { error: offerUpdateErr } = await this.supabase
        .from("property_offers")
        .update({
          broker_id: input.brokerId || null,
          transaction_type: input.transactionType,
          status: input.status,
          sale_price: input.salePrice || null,
          rent_price: input.rentPrice || null,
          condominium_fee: input.condominiumFee || null,
          iptu: input.iptu || null,
          financiable: input.financiable || false,
          accepts_exchange: input.acceptsExchange || false,
          accepts_vehicle: input.acceptsVehicle || false,
          furnished: input.furnished || false,
          pet_friendly: input.petFriendly || false,
          address_visible: input.addressVisible || false,
          title: input.title,
          description: input.description || null,
          original_url: input.originalUrl || null,
          published_at: input.publishedAt || null,
          source_updated_at: input.sourceUpdatedAt || nowIso,
          missing_from_feed_at: input.missingFromFeedAt ?? null,
          content_hash: input.contentHash || null,
          last_seen_at: input.lastSeenAt || nowIso,
          updated_at: nowIso,
        })
        .eq("id", offerId);

      if (offerUpdateErr) {
        throw new Error(
          `[PropertyOfferIngestionService] Erro ao atualizar offer ${offerId}: ${offerUpdateErr.message}`
        );
      }

      // 3. Auditoria nativa de preço se houver alteração
      const isPriceChanged =
        (input.salePrice ?? null) !== (existingOffer.sale_price ?? null) ||
        (input.rentPrice ?? null) !== (existingOffer.rent_price ?? null);

      if (isPriceChanged && (input.salePrice || input.rentPrice)) {
        // Verifica se a ponte ou gravação nativa já registrou este valor recentemente
        let priceQuery = this.supabase
          .from("offer_price_history")
          .select("id")
          .eq("offer_id", offerId);

        if (input.salePrice) {
          priceQuery = priceQuery.eq("price", input.salePrice);
        }

        const { data: recentPriceHist } = await priceQuery.limit(1);

        if (!recentPriceHist || recentPriceHist.length === 0) {
          await this.supabase.from("offer_price_history").insert({
            offer_id: offerId,
            price: input.salePrice || null,
            rent_price: input.rentPrice || null,
            source: input.source,
            recorded_at: nowIso,
          });
        }
      }

      // 4. Auditoria nativa de status se houver transição
      if (input.status !== existingOffer.status) {
        // Verifica se a transição já foi registrada recentemente
        const { data: recentStatusHist } = await this.supabase
          .from("offer_status_history")
          .select("id")
          .eq("offer_id", offerId)
          .eq("to_status", input.status)
          .limit(1);

        if (!recentStatusHist || recentStatusHist.length === 0) {
          await this.supabase.from("offer_status_history").insert({
            offer_id: offerId,
            from_status: existingOffer.status,
            to_status: input.status,
            reason: "Atualização via fluxo de ingestão",
            recorded_at: nowIso,
          });
        }
      }

      // 5. Sincroniza mídias e características
      if (input.media) {
        await this.syncMedia(propertyId, offerId, input.media);
      }

      if (input.featureIds) {
        await this.syncFeatures(propertyId, input.featureIds);
      }

      return { action: "updated", propertyId, offerId };
    } else {
      // =======================================================================
      // CASO 2: NOVA OFERTA -> INSERÇÃO
      // =======================================================================
      const baseSlug = input.slug || this.generateSlug(input.title, input.externalId);

      // 1. Cria a property física provisória (1:1) com dados físicos + legados
      const { data: newProp, error: propInsertErr } = await this.supabase
        .from("properties")
        .insert({
          agency_id: input.agencyId,
          broker_id: input.brokerId || null,
          external_id: input.externalId,
          source: input.source,
          slug: baseSlug,
          property_type: input.propertyType,
          street: input.street || null,
          number: input.number || null,
          complement: input.complement || null,
          zipcode: input.zipcode || null,
          state_id: input.stateId || null,
          city_id: input.cityId || null,
          neighborhood_id: input.neighborhoodId || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          usable_area: input.usableArea || null,
          total_area: input.totalArea || null,
          lot_area: input.lotArea || null,
          bedrooms: input.bedrooms ?? 0,
          suites: input.suites ?? 0,
          bathrooms: input.bathrooms ?? 0,
          parking_spaces: input.parkingSpaces ?? 0,
          year_built: input.yearBuilt || null,
          // Compatibilidade Legada comercial
          title: input.title,
          description: input.description || null,
          transaction_type: input.transactionType,
          status: input.status,
          price: input.salePrice || null,
          rent_price: input.rentPrice || null,
          condominium_fee: input.condominiumFee || null,
          iptu: input.iptu || null,
          financiable: input.financiable || false,
          accepts_exchange: input.acceptsExchange || false,
          accepts_vehicle: input.acceptsVehicle || false,
          furnished: input.furnished || false,
          pet_friendly: input.petFriendly || false,
          address_visible: input.addressVisible || false,
          source_url: input.originalUrl || null,
          published_at: input.publishedAt || (input.status === "active" ? nowIso : null),
          source_updated_at: input.sourceUpdatedAt || nowIso,
          missing_from_feed_at: null,
          content_hash: input.contentHash || null,
          last_seen_at: input.lastSeenAt || nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("id")
        .single();

      if (propInsertErr || !newProp) {
        throw new Error(
          `[PropertyOfferIngestionService] Erro ao criar property para ${input.externalId}: ${propInsertErr?.message}`
        );
      }

      const propertyId = newProp.id;

      // 2. Garante a criação da property_offer com vínculos canônicos e legados
      const { data: offerRecord, error: offerUpsertErr } = await this.supabase
        .from("property_offers")
        .upsert(
          {
            property_id: propertyId,
            legacy_property_id: propertyId,
            agency_id: input.agencyId,
            broker_id: input.brokerId || null,
            source: input.source,
            external_id: input.externalId,
            transaction_type: input.transactionType,
            status: input.status,
            sale_price: input.salePrice || null,
            rent_price: input.rentPrice || null,
            condominium_fee: input.condominiumFee || null,
            iptu: input.iptu || null,
            financiable: input.financiable || false,
            accepts_exchange: input.acceptsExchange || false,
            accepts_vehicle: input.acceptsVehicle || false,
            furnished: input.furnished || false,
            pet_friendly: input.petFriendly || false,
            address_visible: input.addressVisible || false,
            title: input.title,
            description: input.description || null,
            original_url: input.originalUrl || null,
            published_at: input.publishedAt || (input.status === "active" ? nowIso : null),
            source_updated_at: input.sourceUpdatedAt || nowIso,
            missing_from_feed_at: null,
            content_hash: input.contentHash || null,
            last_seen_at: input.lastSeenAt || nowIso,
            created_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "legacy_property_id" }
        )
        .select("id")
        .single();

      if (offerUpsertErr || !offerRecord) {
        throw new Error(
          `[PropertyOfferIngestionService] Erro ao criar offer para ${input.externalId}: ${offerUpsertErr?.message}`
        );
      }

      const offerId = offerRecord.id;

      // 3. Registra histórico inicial nativo (com prevenção de duplicata da ponte)
      if (input.salePrice || input.rentPrice) {
        let initPriceQuery = this.supabase
          .from("offer_price_history")
          .select("id")
          .eq("offer_id", offerId);

        if (input.salePrice) {
          initPriceQuery = initPriceQuery.eq("price", input.salePrice);
        }

        const { data: existingInitPrice } = await initPriceQuery.limit(1);

        if (!existingInitPrice || existingInitPrice.length === 0) {
          await this.supabase.from("offer_price_history").insert({
            offer_id: offerId,
            price: input.salePrice || null,
            rent_price: input.rentPrice || null,
            source: input.source,
            recorded_at: nowIso,
          });
        }
      }

      const { data: existingInitStatus } = await this.supabase
        .from("offer_status_history")
        .select("id")
        .eq("offer_id", offerId)
        .eq("to_status", input.status)
        .limit(1);

      if (!existingInitStatus || existingInitStatus.length === 0) {
        await this.supabase.from("offer_status_history").insert({
          offer_id: offerId,
          from_status: null,
          to_status: input.status,
          reason: "Cadastro inicial da oferta",
          recorded_at: nowIso,
        });
      }

      // 4. Salva mídias e características
      if (input.media && input.media.length > 0) {
        await this.syncMedia(propertyId, offerId, input.media);
      }

      if (input.featureIds && input.featureIds.length > 0) {
        await this.syncFeatures(propertyId, input.featureIds);
      }

      return { action: "created", propertyId, offerId };
    }
  }

  /**
   * Reconciliação e detecção segura de ausência:
   * Opera prioritariamente sobre `property_offers` e sincroniza o status legado.
   */
  public async reconcileMissingOffers(params: {
    agencyId: string;
    source: Database["public"]["Enums"]["listing_source"];
    presentExternalIds: string[];
    crawlRunStartedAt?: string;
  }): Promise<number> {
    const { agencyId, source, presentExternalIds, crawlRunStartedAt } = params;
    const presentSet = new Set(presentExternalIds);

    // Consulta ofertas existentes da imobiliária para a fonte específica
    const { data: offers, error } = await this.supabase
      .from("property_offers")
      .select("id, property_id, external_id, status, missing_from_feed_at, last_seen_at")
      .eq("agency_id", agencyId)
      .eq("source", source);

    if (error || !offers) {
      console.warn("[PropertyOfferIngestionService] Falha ao consultar ofertas para ausência:", error?.message);
      return 0;
    }

    let deactivatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const offer of offers) {
      const isPresent =
        presentSet.has(offer.external_id) ||
        Boolean(
          crawlRunStartedAt &&
            offer.last_seen_at &&
            new Date(offer.last_seen_at).getTime() >= new Date(crawlRunStartedAt).getTime()
        );

      if (isPresent) {
        // Oferta presente: limpa timestamp de ausência se estava marcado
        if (offer.missing_from_feed_at !== null || offer.status === "inactive") {
          await this.supabase
            .from("property_offers")
            .update({
              missing_from_feed_at: null,
              status: "active",
              updated_at: nowIso,
            })
            .eq("id", offer.id);

          // Sincroniza property legada
          await this.supabase
            .from("properties")
            .update({
              missing_from_feed_at: null,
              status: "active",
              updated_at: nowIso,
            })
            .eq("id", offer.property_id);
        }
      } else {
        // Oferta ausente do feed/site
        if (offer.missing_from_feed_at === null) {
          // Etapa 1: Primeira ausência -> apenas marca timestamp, mantém ativa
          await this.supabase
            .from("property_offers")
            .update({ missing_from_feed_at: nowIso })
            .eq("id", offer.id);

          await this.supabase
            .from("properties")
            .update({ missing_from_feed_at: nowIso })
            .eq("id", offer.property_id);
        } else {
          // Etapa 2: Ausência confirmada em sincronização subsequente -> Inativação
          if (offer.status === "active") {
            await this.supabase
              .from("property_offers")
              .update({
                status: "inactive",
                updated_at: nowIso,
              })
              .eq("id", offer.id);

            await this.supabase
              .from("properties")
              .update({
                status: "inactive",
                updated_at: nowIso,
              })
              .eq("id", offer.property_id);

            // Registro nativo no histórico de status
            await this.supabase.from("offer_status_history").insert({
              offer_id: offer.id,
              from_status: "active",
              to_status: "inactive",
              reason: "Ausência confirmada no feed/crawler",
              recorded_at: nowIso,
            });

            deactivatedCount++;
          }
        }
      }
    }

    return deactivatedCount;
  }

  /**
   * Sincronização consistente de mídias:
   * Grava prioritariamente em `offer_media` e mantém `property_media` compatível.
   */
  public async syncMedia(
    propertyId: string,
    offerId: string,
    mediaList: IngestionMediaInput[]
  ): Promise<void> {
    if (!mediaList || mediaList.length === 0) return;

    // 1. Busca mídias já cadastradas na oferta
    const { data: currentOfferMedia } = await this.supabase
      .from("offer_media")
      .select("id, url, position, is_cover")
      .eq("offer_id", offerId);

    const existingUrlMap = new Map((currentOfferMedia || []).map((m) => [m.url, m]));
    const newUrls = new Set(mediaList.map((m) => m.url));

    // 2. Remove da oferta e da property as mídias que não existem mais
    for (const [url, item] of existingUrlMap.entries()) {
      if (!newUrls.has(url)) {
        await this.supabase.from("offer_media").delete().eq("id", item.id);
        await this.supabase.from("property_media").delete().eq("id", item.id);
      }
    }

    // 3. Insere ou atualiza as mídias da lista
    let hasCover = mediaList.some((m) => m.isCover);
    for (let i = 0; i < mediaList.length; i++) {
      const item = mediaList[i];
      if (!item.url || typeof item.url !== "string" || item.url.trim() === "") continue;

      const isCover = hasCover ? Boolean(item.isCover) : i === 0;
      const position = typeof item.position === "number" ? item.position : i;
      const existing = existingUrlMap.get(item.url);

      if (existing) {
        // Atualiza posição/capa se mudou
        if (existing.position !== position || existing.is_cover !== isCover) {
          await this.supabase
            .from("offer_media")
            .update({ position, is_cover: isCover })
            .eq("id", existing.id);

          await this.supabase
            .from("property_media")
            .update({ position, is_cover: isCover })
            .eq("id", existing.id);
        }
      } else {
        // Nova foto: insere em offer_media e property_media com o mesmo ID
        const mediaId = crypto.randomUUID();
        const mediaRecord = {
          id: mediaId,
          media_type: item.type || ("image" as const),
          url: item.url.trim(),
          thumbnail_url: item.thumbnailUrl || null,
          width: item.width || null,
          height: item.height || null,
          position,
          is_cover: isCover,
          source_url: item.sourceUrl || null,
        };

        await this.supabase.from("offer_media").insert({
          ...mediaRecord,
          offer_id: offerId,
        });

        const { media_type: discMediaType, ...propMediaRecord } = mediaRecord;
        await this.supabase.from("property_media").insert({
          ...propMediaRecord,
          type: discMediaType,
          property_id: propertyId,
        });
      }
    }
  }

  /**
   * Sincronização de características físicas
   */
  private async syncFeatures(propertyId: string, featureIds: string[]): Promise<void> {
    if (!featureIds) return;

    // Remove características anteriores
    await this.supabase.from("property_features").delete().eq("property_id", propertyId);

    // Insere conjunto atualizado
    if (featureIds.length > 0) {
      const records = featureIds.map((featureId) => ({
        property_id: propertyId,
        feature_id: featureId,
      }));
      await this.supabase.from("property_features").insert(records);
    }
  }

  /**
   * Utilitário para geração de slug amigável
   */
  private generateSlug(title: string, externalId: string): string {
    const cleanTitle = (title || "imovel")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const cleanCode = (externalId || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    const base = `${cleanTitle}-${cleanCode}`.slice(0, 80);
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }
}
