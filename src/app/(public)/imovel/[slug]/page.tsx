import React from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getPropertyBySlug,
  getPropertyRedirect,
  getPropertyOffers,
  getSimilarProperties,
} from "@/features/properties/services";
import { resolveRepresentativeOffer } from "@/features/offers/services/representative-offer.service";
import {
  buildPropertyMetaTitle,
  buildPropertyMetaDescription,
  buildPropertyStructuredData,
  SEO_INDEXABILITY_CONFIG,
} from "@/features/seo";
import { BannerSlot } from "@/features/banners/components/BannerSlot";
import {
  PropertyGallery,
  PropertyHeader,
  PropertyPricing,
  RepresentativeOfferHero,
  PropertySpecs,
  PropertyDescription,
  PropertyFeaturesList,
  PropertyLocationView,
  PropertyAgencyCard,
  PropertyStickyCTA,
  SimilarProperties,
} from "@/features/properties/components/public";
import { AlertCircle } from "lucide-react";

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ agency?: string; offer?: string }>;
}

export const revalidate = 120;

/**
 * GERAÇÃO DE METADATA DINÂMICA E CANONICAL (Seções 4, 16, 17 e 20)
 */
export async function generateMetadata({ params, searchParams }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  let property = await getPropertyBySlug(slug);

  if (!property || property.status !== "active") {
    const canonicalSlug = await getPropertyRedirect(slug);
    if (canonicalSlug) {
      property = await getPropertyBySlug(canonicalSlug);
    }
  }

  if (!property || property.status !== "active") {
    return {
      title: "Imóvel não encontrado | UPPA",
      description: "O imóvel solicitado não está ativo ou não foi encontrado.",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const canonicalUrl = `${siteUrl}/imovel/${property.slug}`;
  const coverImage = property.media?.find((m) => m.isCover)?.url || property.media?.[0]?.url || `${siteUrl}/images/og-uppa.jpg`;

  const representativeOffer = await resolveRepresentativeOffer(property.id, {
    preferredOfferId: sParams.offer,
    preferredAgencySlug: sParams.agency,
  });

  const repPrice = property.transactionType === "rent"
    ? representativeOffer?.rentPrice ?? property.rentPrice
    : representativeOffer?.salePrice ?? property.price;
  const repAgencyName = representativeOffer?.agency?.name ?? property.agency?.name;

  const title = buildPropertyMetaTitle(property);
  const description = buildPropertyMetaDescription(property, property.activeOffersCount ?? 1, repPrice, repAgencyName);

  // Se o imóvel não tiver ofertas ativas no momento, mantemos noindex, follow
  const hasActiveOffers = (property.activeOffersCount ?? 0) > 0;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: hasActiveOffers
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "UPPA",
      locale: "pt_BR",
      type: "article",
      images: [{ url: coverImage, alt: property.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverImage],
    },
  };
}

async function SimilarPropertiesAsync({
  propertyId,
  transactionType,
  propertyType,
  cityId,
}: {
  propertyId: string;
  transactionType: any;
  propertyType: any;
  cityId: string | null;
}) {
  const similarProperties = await getSimilarProperties(
    propertyId,
    transactionType,
    propertyType,
    cityId
  );
  return (
    <SimilarProperties
      properties={similarProperties}
      transactionType={transactionType}
    />
  );
}

/**
 * PÁGINA PÚBLICA DO IMÓVEL (SERVER COMPONENT)
 */
export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  let property = await getPropertyBySlug(slug);

  // Se o imóvel não foi encontrado ou foi consolidado, faz redirecionamento 301 para o canônico
  if (!property || property.status !== "active") {
    const canonicalSlug = await getPropertyRedirect(slug);
    if (canonicalSlug && canonicalSlug !== slug) {
      permanentRedirect(`/imovel/${canonicalSlug}`);
    }
    notFound();
  }

  // Resolve a oferta comercial representativa desta jornada (Seções 1, 2, 7, 11 e 12)
  const representativeOffer = await resolveRepresentativeOffer(property.id, {
    preferredOfferId: sParams.offer,
    preferredAgencySlug: sParams.agency,
  });

  // Schema Estruturado JSON-LD adaptado para Property x Representative Offer (Seção 18)
  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const jsonLd = buildPropertyStructuredData(property, representativeOffer, siteUrl);

  const hasNoOffers = !representativeOffer || property.activeOffersCount === 0;

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-24 md:pb-16 pt-4">
      {/* Dados estruturados JSON-LD (schema.org) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* AVISO QUANDO O IMÓVEL NÃO POSSUI OFERTAS ATIVAS NO MOMENTO (SEÇÃO 15) */}
        {hasNoOffers && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Este imóvel não possui ofertas comerciais disponíveis no momento.
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Os anúncios para este imóvel foram temporariamente pausados ou finalizados pelas imobiliárias anunciantes.
                Você pode conferir as especificações físicas abaixo ou navegar pelas opções semelhantes disponíveis nesta região.
              </p>
            </div>
          </div>
        )}

        {/* 1. CABEÇALHO (BREADCRUMBS, TÍTULO, BADGES E LOCALIZAÇÃO) */}
        <PropertyHeader property={property} />

        {/* 2. GALERIA INTERATIVA DE FOTOS */}
        <PropertyGallery
          media={property.media || []}
          title={property.title}
        />

        {/* 3. CONTEÚDO PRINCIPAL (LAYOUT 2 COLUNAS: DADOS À ESQUERDA, STICKY CTA À DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Dados do Imóvel */}
          <div className="lg:col-span-8 space-y-8">
            {/* Oferta comercial representativa selecionada com formulário de interesse (Seções 1, 2, 5 e 31) */}
            {representativeOffer && (
              <RepresentativeOfferHero
                property={property}
                offer={representativeOffer}
              />
            )}

            {/* Especificações Físicas (Áreas, Quartos, Vagas) */}
            <PropertySpecs property={property} />

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Descrição Completa */}
            <PropertyDescription description={property.description} />

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Features e Comodidades */}
            <PropertyFeaturesList features={property.features} />

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Localização e Mapa com PostGIS */}
            <PropertyLocationView property={property} />

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Perfil da Imobiliária Anunciante */}
            {(representativeOffer?.agency || property.agency) && (
              <PropertyAgencyCard agency={(representativeOffer?.agency || property.agency) as any} />
            )}

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Banner property_bottom — colapsa se não houver banner ativo */}
            <BannerSlot position="property_bottom" />

            {/* Imóveis Semelhantes — transmitido via Suspense */}
            <React.Suspense
              fallback={
                <div className="space-y-4 pt-4">
                  <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
                    <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
                  </div>
                </div>
              }
            >
              <SimilarPropertiesAsync
                propertyId={property.id}
                transactionType={property.transactionType}
                propertyType={property.propertyType}
                cityId={property.cityId ?? null}
              />
            </React.Suspense>
          </div>

          {/* Coluna Direita: Sidebar Sticky com CTA de WhatsApp */}
          {!hasNoOffers && (
            <div className="hidden lg:block lg:col-span-4">
              <PropertyStickyCTA property={property} representativeOffer={representativeOffer} />
            </div>
          )}
        </div>
      </div>

      {/* Barra Fixa Inferior Mobile */}
      {!hasNoOffers && (
        <div className="lg:hidden">
          <PropertyStickyCTA property={property} representativeOffer={representativeOffer} />
        </div>
      )}
    </main>
  );
}
