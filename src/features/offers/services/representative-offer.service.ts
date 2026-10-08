import { cache } from "react";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Agency } from "@/types/agency";

export interface ResolvedRepresentativeOffer {
  offerId: string;
  propertyId: string;
  source: string;
  externalId: string;
  salePrice: number | null;
  rentPrice: number | null;
  condominiumFee: number | null;
  iptu: number | null;
  title: string;
  description: string | null;
  originalUrl: string | null;
  updatedAt: string;
  agency: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    creci?: string | null;
    verifiedAt?: string | null;
    claimStatus: "discovered" | "claimed";
    isOfficialProfile: boolean;
  };
  brokerId?: string | null;
  coverImage?: string | null;
  photos: { url: string; isCover: boolean; position: number }[];
  isPrimaryOffer: boolean;
  selectionReason: "preferred_offer" | "preferred_agency" | "primary_offer" | "scored_winner" | "fallback";
}

interface ResolveContext {
  preferredOfferId?: string | null;
  preferredAgencySlug?: string | null;
  preferredAgencyId?: string | null;
}

/**
 * Calcula a pontuação determinística e auditável de elegibilidade de uma oferta (Seção 9)
 * NÃO utiliza menor preço como critério determinante (Seção 8)
 */
function scoreOffer(offer: any): number {
  let score = 0;

  // 1. Agência ativa
  if (offer.agency?.status === "active") {
    score += 100;
  }

  // 2. Agência verificada pela UPPA
  if (offer.agency?.verified_at) {
    score += 30;
  }

  // 3. Agência com perfil reivindicado/oficial
  if (offer.agency?.claim_status === "claimed" || offer.agency?.is_official_profile) {
    score += 20;
  }

  // 4. Qualidade e completude de fotos
  const mediaCount = Array.isArray(offer.media) ? offer.media.length : 0;
  if (mediaCount >= 5) {
    score += 25;
  } else if (mediaCount >= 1) {
    score += 10;
  }

  // 5. Preço consistente e válido
  if ((offer.sale_price && offer.sale_price > 0) || (offer.rent_price && offer.rent_price > 0)) {
    score += 15;
  }

  // 6. Atualização recente (nos últimos 30 dias)
  if (offer.updated_at) {
    const diffDays = (Date.now() - new Date(offer.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 30) {
      score += 15;
    } else if (diffDays <= 90) {
      score += 5;
    }
  }

  // 7. Descrição rica
  if (offer.description && offer.description.length > 50) {
    score += 10;
  }

  return score;
}

/**
 * Mapeia o registro da oferta resolvida para o formato tipado da aplicação
 */
function mapResolvedOffer(
  offer: any,
  propertyId: string,
  isPrimary: boolean,
  reason: ResolvedRepresentativeOffer["selectionReason"]
): ResolvedRepresentativeOffer {
  const mediaList = (offer.media || [])
    .map((m: any) => ({
      url: m.url,
      isCover: Boolean(m.is_cover),
      position: m.position || 0,
    }))
    .sort((a: any, b: any) => {
      if (a.isCover) return -1;
      if (b.isCover) return 1;
      return a.position - b.position;
    });

  const cover = mediaList.find((m: any) => m.isCover)?.url || mediaList[0]?.url || null;

  return {
    offerId: offer.id,
    propertyId,
    source: offer.source,
    externalId: offer.external_id,
    salePrice: offer.sale_price,
    rentPrice: offer.rent_price,
    condominiumFee: offer.condominium_fee,
    iptu: offer.iptu,
    title: offer.title,
    description: offer.description,
    originalUrl: offer.original_url,
    updatedAt: offer.updated_at,
    agency: {
      id: offer.agency.id,
      name: offer.agency.name,
      slug: offer.agency.slug,
      logoUrl: offer.agency.logo_url,
      phone: offer.agency.phone,
      whatsapp: offer.agency.whatsapp,
      creci: offer.agency.creci,
      verifiedAt: offer.agency.verified_at,
      claimStatus: offer.agency.claim_status || "discovered",
      isOfficialProfile: offer.agency.is_official_profile || false,
    },
    brokerId: offer.broker_id || null,
    coverImage: cover,
    photos: mediaList,
    isPrimaryOffer: isPrimary,
    selectionReason: reason,
  };
}

/**
 * Seleciona a REPRESENTATIVE OFFER para uma exposição pública de uma PROPERTY (Seções 2, 7, 8, 9, 11, 13, 14, 15)
 * Garante que cada exibição da property apresente 1 única offer comercial (1 preço, 1 anunciante, 1 CTA).
 * Envolvido em React.cache para deduplicação entre generateMetadata e Page.
 */
export const resolveRepresentativeOffer = cache(
  async function resolveRepresentativeOffer(
    propertyId: string,
    context?: ResolveContext
  ): Promise<ResolvedRepresentativeOffer | null> {
  const supabase = createPublicServerClient();

  // 1. Busca dados da propriedade para verificar primary_offer_id
  const { data: prop } = await supabase
    .from("properties")
    .select("id, primary_offer_id, status")
    .eq("id", propertyId)
    .single();

  if (!prop || prop.status !== "active") {
    return null;
  }

  // 2. Busca todas as ofertas ativas desta propriedade física
  const { data: offers, error } = await supabase
    .from("property_offers")
    .select(`
      id,
      property_id,
      agency_id,
      broker_id,
      source,
      external_id,
      sale_price,
      rent_price,
      condominium_fee,
      iptu,
      title,
      description,
      original_url,
      status,
      updated_at,
      agency:agencies!agency_id (
        id,
        name,
        slug,
        logo_url,
        phone,
        whatsapp,
        creci,
        verified_at,
        status,
        claim_status,
        is_official_profile
      ),
      media:offer_media (
        id,
        url,
        is_cover,
        position
      )
    `)
    .eq("property_id", propertyId)
    .eq("status", "active");

  if (error || !offers || offers.length === 0) {
    return null;
  }

  // Filtra ofertas com agências ativas
  const activeOffers = offers.filter((o) => o.agency && o.agency.status === "active");
  const candidates = activeOffers.length > 0 ? activeOffers : offers;

  // CASO A: Usuário veio com contexto de oferta específica (?offer=[id]) - Preservação de Jornada (Seção 11 e 12)
  if (context?.preferredOfferId) {
    const match = candidates.find((o) => o.id === context.preferredOfferId);
    if (match) {
      return mapResolvedOffer(
        match,
        propertyId,
        match.id === prop.primary_offer_id,
        "preferred_offer"
      );
    }
  }

  // CASO B: Usuário navegou pela página de determinada imobiliária (/imobiliaria/[slug]) (Seção 13)
  if (context?.preferredAgencySlug || context?.preferredAgencyId) {
    const match = candidates.find((o) =>
      context.preferredAgencySlug
        ? o.agency?.slug === context.preferredAgencySlug
        : o.agency_id === context.preferredAgencyId
    );
    if (match) {
      return mapResolvedOffer(
        match,
        propertyId,
        match.id === prop.primary_offer_id,
        "preferred_agency"
      );
    }
  }

  // CASO C: Acesso direto / busca geral sem contexto explícito -> Usa primary_offer_id (Seção 16)
  if (prop.primary_offer_id) {
    const primaryMatch = candidates.find((o) => o.id === prop.primary_offer_id);
    if (primaryMatch) {
      return mapResolvedOffer(primaryMatch, propertyId, true, "primary_offer");
    }
  }

  // CASO D: Fallback determinístico por pontuação de qualidade/distribuição (Seção 9 e 10)
  const scoredCandidates = candidates.map((o) => ({
    offer: o,
    score: scoreOffer(o),
  }));

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Desempate estável: data mais recente de atualização, depois ID alfabético
    const dateDiff = new Date(b.offer.updated_at).getTime() - new Date(a.offer.updated_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.offer.id.localeCompare(b.offer.id);
  });

  const winner = scoredCandidates[0]?.offer || candidates[0];

  return mapResolvedOffer(
    winner,
    propertyId,
    winner.id === prop.primary_offer_id,
    "scored_winner"
  );
});

/**
 * Registra impressão da representative offer para métricas de distribuição e observabilidade (Seção 21)
 */
export async function recordOfferImpression(
  propertyId: string,
  offerId: string,
  agencyId: string,
  context = "search"
): Promise<void> {
  try {
    const supabase = createPublicServerClient();
    await supabase.from("offer_impressions" as any).insert({
      property_id: propertyId,
      offer_id: offerId,
      agency_id: agencyId,
      context,
    });
  } catch (err) {
    // Falha em métrica não deve quebrar a renderização
    console.warn("[recordOfferImpression] Falha ao registrar impressão:", err);
  }
}
