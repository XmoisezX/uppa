import { cache } from "react";
import { createClient, createPublicServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { Property, PropertyWithDetails, Feature, PropertyMedia, PropertyStatus, MediaType } from "@/types/property";
import type { State, City } from "@/types/geo";
import type { CreatePropertyInput, UpdatePropertyInput } from "@/lib/validations/property";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

/**
 * Retorna catálogo completo de características disponíveis
 */
export async function listFeatures(): Promise<Feature[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("features")
    .select("*")
    .order("name");

  if (error || !data) return [];

  return data.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    category: f.category,
    createdAt: f.created_at,
  }));
}

/**
 * Consulta de imóvel ativo por slug para visualização pública.
 * Envolvido em React.cache para deduplicação entre generateMetadata e Page.
 */
export const getPropertyBySlug = cache(
  async (slug: string): Promise<PropertyWithDetails | null> => {
    const supabase = createPublicServerClient();

  const { data, error } = await supabase
    .from("properties")
    .select(`
      *,
      agency:agencies (*),
      state:states (*),
      city:cities (*),
      neighborhood:neighborhoods (*),
      media:property_media (*),
      features:property_features (
        feature:features (*)
      )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  let isFeatured = false;
  try {
    const { data: featRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "featured_property_ids")
      .maybeSingle();
    if (featRow?.value && Array.isArray(featRow.value)) {
      isFeatured = featRow.value.includes(data.id);
    }
  } catch {
    // ignore
  }

  return {
    id: data.id,
    featured: isFeatured,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    agency: data.agency
      ? {
          id: (data.agency as any).id,
          name: (data.agency as any).name,
          slug: (data.agency as any).slug,
          legalName: (data.agency as any).legal_name,
          document: (data.agency as any).document,
          creci: (data.agency as any).creci,
          phone: (data.agency as any).phone,
          whatsapp: (data.agency as any).whatsapp,
          email: (data.agency as any).email,
          website: (data.agency as any).website,
          logoUrl: (data.agency as any).logo_url,
          description: (data.agency as any).description,
          cityId: (data.agency as any).city_id,
          verifiedAt: (data.agency as any).verified_at,
          status: (data.agency as any).status,
          createdAt: (data.agency as any).created_at,
          updatedAt: (data.agency as any).updated_at,
        }
      : undefined,
    state: data.state as any,
    city: data.city as any,
    neighborhood: data.neighborhood as any,
    media: ((data.media as any[]) || []).map((m) => ({
      id: m.id,
      propertyId: m.property_id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url,
      width: m.width,
      height: m.height,
      position: m.position,
      isCover: m.is_cover,
      sourceUrl: m.source_url,
      createdAt: m.created_at,
    })).sort((a, b) => a.position - b.position),
    features: ((data.features as any[]) || [])
      .map((item) => item.feature)
      .filter(Boolean)
      .map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        category: f.category,
        createdAt: f.created_at,
      })),
  };
});

/**
 * Criação de imóvel no banco de dados (respeita RLS - apenas membros da imobiliária)
 */
export async function createProperty(input: CreatePropertyInput): Promise<Property> {
  const supabase = await createClient();

  const insertData: PropertyInsert = {
    agency_id: input.agencyId,
    broker_id: input.brokerId || null,
    external_id: input.externalId.trim(),
    source: input.source,
    slug: input.slug.trim().toLowerCase(),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    transaction_type: input.transactionType,
    property_type: input.propertyType,
    status: input.status,
    price: input.price || null,
    rent_price: input.rentPrice || null,
    condominium_fee: input.condominiumFee || null,
    iptu: input.iptu || null,
    bedrooms: input.bedrooms,
    suites: input.suites,
    bathrooms: input.bathrooms,
    parking_spaces: input.parkingSpaces,
    usable_area: input.usableArea || null,
    total_area: input.totalArea || null,
    lot_area: input.lotArea || null,
    year_built: input.yearBuilt || null,
    financiable: input.financiable,
    accepts_exchange: input.acceptsExchange,
    accepts_vehicle: input.acceptsVehicle,
    furnished: input.furnished,
    pet_friendly: input.petFriendly,
    address_visible: input.addressVisible,
    street: input.street || null,
    number: input.number || null,
    complement: input.complement || null,
    zipcode: input.zipcode || null,
    state_id: input.stateId || null,
    city_id: input.cityId || null,
    neighborhood_id: input.neighborhoodId || null,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    published_at: input.status === "active" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("properties")
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Erro ao cadastrar imóvel.");
  }

  // Vincular características se fornecidas
  if (input.featureIds && input.featureIds.length > 0) {
    const featureRecords = input.featureIds.map((featureId) => ({
      property_id: data.id,
      feature_id: featureId,
    }));
    await supabase.from("property_features").insert(featureRecords);
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Atualização de dados de imóvel (respeita RLS - membros da imobiliária dona)
 */
export async function updateProperty(propertyId: string, input: Partial<CreatePropertyInput>): Promise<Property> {
  const supabase = await createClient();

  const updateData: PropertyUpdate = {};
  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.transactionType !== undefined) updateData.transaction_type = input.transactionType;
  if (input.propertyType !== undefined) updateData.property_type = input.propertyType;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.price !== undefined) updateData.price = input.price || null;
  if (input.rentPrice !== undefined) updateData.rent_price = input.rentPrice || null;
  if (input.condominiumFee !== undefined) updateData.condominium_fee = input.condominiumFee || null;
  if (input.iptu !== undefined) updateData.iptu = input.iptu || null;
  if (input.bedrooms !== undefined) updateData.bedrooms = input.bedrooms;
  if (input.suites !== undefined) updateData.suites = input.suites;
  if (input.bathrooms !== undefined) updateData.bathrooms = input.bathrooms;
  if (input.parkingSpaces !== undefined) updateData.parking_spaces = input.parkingSpaces;
  if (input.usableArea !== undefined) updateData.usable_area = input.usableArea || null;
  if (input.totalArea !== undefined) updateData.total_area = input.totalArea || null;
  if (input.lotArea !== undefined) updateData.lot_area = input.lotArea || null;
  if (input.yearBuilt !== undefined) updateData.year_built = input.yearBuilt || null;
  if (input.financiable !== undefined) updateData.financiable = input.financiable;
  if (input.acceptsExchange !== undefined) updateData.accepts_exchange = input.acceptsExchange;
  if (input.acceptsVehicle !== undefined) updateData.accepts_vehicle = input.acceptsVehicle;
  if (input.furnished !== undefined) updateData.furnished = input.furnished;
  if (input.petFriendly !== undefined) updateData.pet_friendly = input.petFriendly;
  if (input.addressVisible !== undefined) updateData.address_visible = input.addressVisible;
  if (input.street !== undefined) updateData.street = input.street || null;
  if (input.number !== undefined) updateData.number = input.number || null;
  if (input.complement !== undefined) updateData.complement = input.complement || null;
  if (input.zipcode !== undefined) updateData.zipcode = input.zipcode || null;
  if (input.latitude !== undefined) updateData.latitude = input.latitude || null;
  if (input.longitude !== undefined) updateData.longitude = input.longitude || null;

  const { data, error } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", propertyId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Erro ao atualizar dados do imóvel.");
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Consulta de imóvel por ID com detalhes completos (mídias, características, endereço)
 */
export async function getPropertyById(propertyId: string): Promise<PropertyWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .select(`
      *,
      agency:agencies (*),
      state:states (*),
      city:cities (*),
      neighborhood:neighborhoods (*),
      media:property_media (*),
      features:property_features (
        feature:features (*)
      )
    `)
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !data) return null;

  const mediaList = ((data.media as any[]) || []).map((m) => ({
    id: m.id,
    propertyId: m.property_id,
    type: m.type,
    url: m.url,
    thumbnailUrl: m.thumbnail_url,
    width: m.width,
    height: m.height,
    position: m.position,
    isCover: m.is_cover,
    sourceUrl: m.source_url,
    createdAt: m.created_at,
  })).sort((a, b) => a.position - b.position);

  const featuresList = ((data.features as any[]) || [])
    .map((item) => item.feature)
    .filter(Boolean)
    .map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      category: f.category,
      createdAt: f.created_at,
    }));

  return {
    id: data.id,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    agency: data.agency as any,
    state: data.state as any,
    city: data.city as any,
    neighborhood: data.neighborhood as any,
    media: mediaList,
    features: featuresList,
  };
}

/**
 * Consulta de imóveis da imobiliária com paginação e filtros de status
 */
export async function getAgencyProperties(
  agencyId: string,
  options?: {
    status?: PropertyStatus | "all";
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ properties: PropertyWithDetails[]; total: number }> {
  const supabase = await createClient();
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  let query = supabase
    .from("properties")
    .select(`
      *,
      state:states (*),
      city:cities (*),
      media:property_media (*)
    `, { count: "exact" })
    .eq("agency_id", agencyId);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.search && options.search.trim() !== "") {
    const term = `%${options.search.trim()}%`;
    query = query.or(`title.ilike.${term},external_id.ilike.${term}`);
  }

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    return { properties: [], total: 0 };
  }

  let featuredIds: string[] = [];
  try {
    const { data: featRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "featured_property_ids")
      .maybeSingle();
    if (featRow?.value && Array.isArray(featRow.value)) {
      featuredIds = featRow.value;
    }
  } catch {
    // ignore
  }

  const properties: PropertyWithDetails[] = data.map((item) => {
    const mediaList = ((item.media as any[]) || []).map((m) => ({
      id: m.id,
      propertyId: m.property_id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url,
      width: m.width,
      height: m.height,
      position: m.position,
      isCover: m.is_cover,
      sourceUrl: m.source_url,
      createdAt: m.created_at,
    })).sort((a, b) => a.position - b.position);

    return {
      id: item.id,
      featured: featuredIds.includes(item.id),
      agencyId: item.agency_id,
      brokerId: item.broker_id,
      externalId: item.external_id,
      source: item.source,
      slug: item.slug,
      title: item.title,
      description: item.description,
      transactionType: item.transaction_type,
      propertyType: item.property_type,
      status: item.status,
      price: item.price,
      rentPrice: item.rent_price,
      condominiumFee: item.condominium_fee,
      iptu: item.iptu,
      bedrooms: item.bedrooms || 0,
      suites: item.suites || 0,
      bathrooms: item.bathrooms || 0,
      parkingSpaces: item.parking_spaces || 0,
      usableArea: item.usable_area,
      totalArea: item.total_area,
      lotArea: item.lot_area,
      yearBuilt: item.year_built,
      financiable: item.financiable || false,
      acceptsExchange: item.accepts_exchange || false,
      acceptsVehicle: item.accepts_vehicle || false,
      furnished: item.furnished || false,
      petFriendly: item.pet_friendly || false,
      addressVisible: item.address_visible || false,
      street: item.street,
      number: item.number,
      complement: item.complement,
      zipcode: item.zipcode,
      stateId: item.state_id,
      cityId: item.city_id,
      neighborhoodId: item.neighborhood_id,
      latitude: item.latitude,
      longitude: item.longitude,
      publishedAt: item.published_at,
      sourceUpdatedAt: item.source_updated_at,
      missingFromFeedAt: item.missing_from_feed_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      state: item.state as any,
      city: item.city as any,
      media: mediaList,
    };
  });

  return { properties, total: count || 0 };
}

/**
 * Retorna a lista de todos os 27 estados brasileiros
 */
export async function getStatesList(): Promise<State[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("states")
    .select("*")
    .order("name");

  if (error || !data) return [];

  return data.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    ibgeCode: s.ibge_code,
    slug: s.slug,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

/**
 * Retorna municípios vinculados a um estado
 */
export async function getCitiesByState(stateId: string): Promise<City[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("state_id", stateId)
    .order("name");

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    stateId: c.state_id,
    name: c.name,
    ibgeCode: c.ibge_code,
    slug: c.slug,
    latitude: c.latitude,
    longitude: c.longitude,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

/**
 * Inicializa um novo imóvel como Rascunho (draft) para a imobiliária
 */
export async function createDraftProperty(agencyId: string, brokerId?: string | null): Promise<Property> {
  const supabase = await createClient();
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const externalId = `MAN-${Date.now().toString().slice(-6)}-${randomSuffix}`;
  const slug = `rascunho-${externalId.toLowerCase()}`;

  const insertData: PropertyInsert = {
    agency_id: agencyId,
    broker_id: brokerId || null,
    external_id: externalId,
    source: "manual",
    slug: slug,
    title: "Novo Imóvel (Rascunho)",
    description: null,
    transaction_type: "sale",
    property_type: "apartment",
    status: "draft",
    price: null,
    bedrooms: 0,
    suites: 0,
    bathrooms: 0,
    parking_spaces: 0,
  };

  const { data, error } = await supabase
    .from("properties")
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Erro ao criar rascunho de imóvel.");
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Sincroniza a lista de comodidades/características vinculadas a um imóvel
 */
export async function syncPropertyFeatures(propertyId: string, featureIds: string[]): Promise<void> {
  const supabase = await createClient();

  // Remove associações anteriores
  const { error: deleteError } = await supabase
    .from("property_features")
    .delete()
    .eq("property_id", propertyId);

  if (deleteError) {
    throw new Error(`Erro ao limpar características anteriores: ${deleteError.message}`);
  }

  // Insere as novas seleções se houver
  if (featureIds.length > 0) {
    const insertRows = featureIds.map((fid) => ({
      property_id: propertyId,
      feature_id: fid,
    }));

    const { error: insertError } = await supabase
      .from("property_features")
      .insert(insertRows);

    if (insertError) {
      throw new Error(`Erro ao associar novas características: ${insertError.message}`);
    }
  }
}

/**
 * Adiciona mídia (foto/planta/vídeo) vinculada a um imóvel
 */
export async function addPropertyMedia(
  propertyId: string,
  data: {
    url: string;
    type?: MediaType;
    isCover?: boolean;
    position?: number;
    thumbnailUrl?: string;
  }
): Promise<PropertyMedia> {
  const supabase = await createClient();

  // Se marcada como capa, remove capa de outras mídias do imóvel
  if (data.isCover) {
    await supabase
      .from("property_media")
      .update({ is_cover: false })
      .eq("property_id", propertyId);
  }

  // Se position não especificada, define a próxima
  let position = data.position;
  if (position === undefined) {
    const { count } = await supabase
      .from("property_media")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId);
    position = count || 0;
  }

  const { data: media, error } = await supabase
    .from("property_media")
    .insert({
      property_id: propertyId,
      url: data.url.trim(),
      type: data.type || "image",
      is_cover: data.isCover || false,
      position: position,
      thumbnail_url: data.thumbnailUrl || null,
    })
    .select()
    .single();

  if (error || !media) {
    throw new Error(error?.message || "Erro ao adicionar mídia ao imóvel.");
  }

  return {
    id: media.id,
    propertyId: media.property_id,
    type: media.type,
    url: media.url,
    thumbnailUrl: media.thumbnail_url,
    width: media.width,
    height: media.height,
    position: media.position,
    isCover: media.is_cover,
    sourceUrl: media.source_url,
    createdAt: media.created_at,
  };
}

/**
 * Remove mídia vinculada a um imóvel
 */
export async function deletePropertyMedia(propertyId: string, mediaId: string): Promise<void> {
  const supabase = await createClient();

  // Verifica se era capa antes de deletar
  const { data: current } = await supabase
    .from("property_media")
    .select("is_cover")
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .maybeSingle();

  const { error } = await supabase
    .from("property_media")
    .delete()
    .eq("id", mediaId)
    .eq("property_id", propertyId);

  if (error) {
    throw new Error(error.message || "Erro ao excluir mídia.");
  }

  // Se era capa, promove a primeira mídia restante para capa
  if (current?.is_cover) {
    const { data: nextCover } = await supabase
      .from("property_media")
      .select("id")
      .eq("property_id", propertyId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextCover) {
      await supabase
        .from("property_media")
        .update({ is_cover: true })
        .eq("id", nextCover.id);
    }
  }
}

/**
 * Define uma mídia como capa principal do imóvel
 */
export async function setCoverPropertyMedia(propertyId: string, mediaId: string): Promise<void> {
  const supabase = await createClient();

  // Desmarca todas as outras
  await supabase
    .from("property_media")
    .update({ is_cover: false })
    .eq("property_id", propertyId);

  // Marca a selecionada
  const { error } = await supabase
    .from("property_media")
    .update({ is_cover: true })
    .eq("id", mediaId)
    .eq("property_id", propertyId);

  if (error) {
    throw new Error(error.message || "Erro ao definir imagem de capa.");
  }
}

/**
 * Reordena as mídias de um imóvel
 */
export async function reorderPropertyMedia(propertyId: string, orderedIds: string[]): Promise<void> {
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("property_media")
      .update({ position: i })
      .eq("id", orderedIds[i])
      .eq("property_id", propertyId);
  }
}

/**
 * Publica o imóvel no portal (status = 'active')
 */
export async function publishProperty(propertyId: string): Promise<Property> {
  const supabase = await createClient();

  // Validação mínima antes de publicar
  const { data: prop, error: checkError } = await supabase
    .from("properties")
    .select("title, price, rent_price, transaction_type, city_id")
    .eq("id", propertyId)
    .single();

  if (checkError || !prop) {
    throw new Error("Imóvel não encontrado para publicação.");
  }

  if (!prop.title || prop.title.trim() === "" || prop.title === "Novo Imóvel (Rascunho)") {
    throw new Error("Informe um título definitivo antes de publicar.");
  }

  if (prop.transaction_type === "sale" && !prop.price) {
    throw new Error("Informe o valor de venda para publicar o anúncio.");
  }

  if (prop.transaction_type === "rent" && !prop.rent_price) {
    throw new Error("Informe o valor de locação para publicar o anúncio.");
  }

  const { data, error } = await supabase
    .from("properties")
    .update({
      status: "active",
      published_at: new Date().toISOString(),
    })
    .eq("id", propertyId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Erro ao publicar imóvel.");
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Salva o imóvel com status Rascunho (draft)
 */
export async function savePropertyAsDraft(propertyId: string): Promise<Property> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .update({ status: "draft" })
    .eq("id", propertyId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Erro ao salvar imóvel como rascunho.");
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    brokerId: data.broker_id,
    externalId: data.external_id,
    source: data.source,
    slug: data.slug,
    title: data.title,
    description: data.description,
    transactionType: data.transaction_type,
    propertyType: data.property_type,
    status: data.status,
    price: data.price,
    rentPrice: data.rent_price,
    condominiumFee: data.condominium_fee,
    iptu: data.iptu,
    bedrooms: data.bedrooms || 0,
    suites: data.suites || 0,
    bathrooms: data.bathrooms || 0,
    parkingSpaces: data.parking_spaces || 0,
    usableArea: data.usable_area,
    totalArea: data.total_area,
    lotArea: data.lot_area,
    yearBuilt: data.year_built,
    financiable: data.financiable || false,
    acceptsExchange: data.accepts_exchange || false,
    acceptsVehicle: data.accepts_vehicle || false,
    furnished: data.furnished || false,
    petFriendly: data.pet_friendly || false,
    addressVisible: data.address_visible || false,
    street: data.street,
    number: data.number,
    complement: data.complement,
    zipcode: data.zipcode,
    stateId: data.state_id,
    cityId: data.city_id,
    neighborhoodId: data.neighborhood_id,
    latitude: data.latitude,
    longitude: data.longitude,
    publishedAt: data.published_at,
    sourceUpdatedAt: data.source_updated_at,
    missingFromFeedAt: data.missing_from_feed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retorna até 4 imóveis semelhantes para exibir no final da página do imóvel.
 *
 * Critério: mesmo transaction_type + property_type + cidade, excluindo o imóvel atual.
 * Cumpre MASTER_PLAN seção 14 (item 14: imóveis semelhantes) e seção 23 (sem SELECT *).
 */
export async function getSimilarProperties(
  currentId: string,
  transactionType: Database["public"]["Enums"]["transaction_type"],
  propertyType: Database["public"]["Enums"]["property_type"],
  cityId: string | null,
  limit = 4
): Promise<import("@/features/search/types").SearchPropertyItem[]> {
  if (!cityId) return [];

  try {
    const supabase = createPublicServerClient();

    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        slug,
        external_id,
        title,
        transaction_type,
        property_type,
        price,
        rent_price,
        condominium_fee,
        usable_area,
        total_area,
        bedrooms,
        suites,
        bathrooms,
        parking_spaces,
        financiable,
        furnished,
        accepts_exchange,
        address_visible,
        street,
        number,
        latitude,
        longitude,
        published_at,
        city:cities!city_id (
          id,
          name,
          slug
        ),
        neighborhood:neighborhoods!neighborhood_id (
          id,
          name,
          slug
        ),
        state:states!state_id (
          id,
          code,
          name
        ),
        agency:agencies!agency_id (
          id,
          name,
          slug,
          logo_url,
          creci,
          verified_at,
          phone
        ),
        media:property_media (
          id,
          url,
          is_cover,
          position
        )
      `)
      .eq("status", "active")
      .eq("transaction_type", transactionType)
      .eq("property_type", propertyType)
      .eq("city_id", cityId)
      .neq("id", currentId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    let results = (data as any[]) || [];

    // Fallback inteligente: se houver menos resultados que o limite na mesma categoria,
    // busca outros imóveis ativos da mesma cidade para não deixar espaço vazio
    if (results.length < limit) {
      const alreadyIds = [currentId, ...results.map((r) => r.id)];
      const needed = limit - results.length;

      const { data: fallbackData } = await supabase
        .from("properties")
        .select(`
          id,
          slug,
          external_id,
          title,
          transaction_type,
          property_type,
          price,
          rent_price,
          condominium_fee,
          usable_area,
          total_area,
          bedrooms,
          suites,
          bathrooms,
          parking_spaces,
          financiable,
          furnished,
          accepts_exchange,
          address_visible,
          street,
          number,
          latitude,
          longitude,
          published_at,
          city:cities!city_id (
            id,
            name,
            slug
          ),
          neighborhood:neighborhoods!neighborhood_id (
            id,
            name,
            slug
          ),
          state:states!state_id (
            id,
            code,
            name
          ),
          agency:agencies!agency_id (
            id,
            name,
            slug,
            logo_url,
            creci,
            verified_at,
            phone
          ),
          media:property_media (
            id,
            url,
            is_cover,
            position
          )
        `)
        .eq("status", "active")
        .eq("transaction_type", transactionType)
        .eq("city_id", cityId)
        .not("id", "in", `(${alreadyIds.join(",")})`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(needed);

      if (fallbackData && fallbackData.length > 0) {
        results = [...results, ...fallbackData];
      }
    }

    if (results.length === 0) {
      return [];
    }

    return results.map((row) => {
      const rawMedia = (row.media as any[]) || [];
      const sortedMedia = rawMedia
        .map((m) => ({
          id: m.id,
          url: m.url,
          isCover: Boolean(m.is_cover),
          position: m.position || 0,
        }))
        .sort((a, b) => {
          if (a.isCover) return -1;
          if (b.isCover) return 1;
          return a.position - b.position;
        });

      return {
        id: row.id,
        slug: row.slug,
        externalId: row.external_id,
        title: row.title,
        transactionType: row.transaction_type,
        propertyType: row.property_type,
        price: row.price,
        rentPrice: row.rent_price,
        condominiumFee: row.condominium_fee,
        usableArea: row.usable_area,
        totalArea: row.total_area,
        bedrooms: row.bedrooms || 0,
        suites: row.suites || 0,
        bathrooms: row.bathrooms || 0,
        parkingSpaces: row.parking_spaces || 0,
        financiable: Boolean(row.financiable),
        furnished: Boolean(row.furnished),
        acceptsExchange: Boolean(row.accepts_exchange),
        addressVisible: Boolean(row.address_visible),
        street: row.address_visible ? row.street : null,
        number: row.address_visible ? row.number : null,
        latitude: row.latitude,
        longitude: row.longitude,
        publishedAt: row.published_at,
        city: row.city,
        neighborhood: row.neighborhood,
        state: row.state,
        agency: row.agency
          ? {
              id: row.agency.id,
              name: row.agency.name,
              slug: row.agency.slug,
              logoUrl: row.agency.logo_url,
              creci: row.agency.creci,
              verifiedAt: row.agency.verified_at,
              phone: row.agency.phone,
            }
          : null,
        media: sortedMedia,
      };
    });
  } catch (err) {
    console.error("[getSimilarProperties] Erro:", err);
    return [];
  }
}

/**
 * Remove um imóvel pertencente à imobiliária informada
 */
export async function deleteProperty(propertyId: string, agencyId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("agency_id", agencyId);

  if (error) {
    throw new Error(`Erro ao excluir imóvel: ${error.message}`);
  }
}

/**
 * Remove múltiplos imóveis pertencentes à imobiliária informada (exclusão em lote)
 */
export async function deletePropertiesBatch(propertyIds: string[], agencyId: string): Promise<number> {
  if (!propertyIds || propertyIds.length === 0) return 0;
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("properties")
    .delete({ count: "exact" })
    .in("id", propertyIds)
    .eq("agency_id", agencyId);

  if (error) {
    throw new Error(`Erro ao excluir lote de imóveis: ${error.message}`);
  }

  return count ?? propertyIds.length;
}

