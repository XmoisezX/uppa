import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPropertyBySlug, getSimilarProperties } from "@/features/properties/services";
import { BannerSlot } from "@/features/banners/components/BannerSlot";
import {
  PropertyGallery,
  PropertyHeader,
  PropertyPricing,
  PropertySpecs,
  PropertyDescription,
  PropertyFeaturesList,
  PropertyLocationView,
  PropertyAgencyCard,
  PropertyStickyCTA,
  SimilarProperties,
} from "@/features/properties/components/public";

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * GERAÇÃO DE METADATA DINÂMICA E CANONICAL (Seções 45 e 85 do MASTER_PLAN)
 */
export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property || property.status !== "active") {
    return {
      title: "Imóvel não encontrado",
      description: "O imóvel solicitado não está ativo ou não foi encontrado.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uppa.com.br";
  const canonicalUrl = `${siteUrl}/imovel/${property.slug}`;
  const coverImage = property.media?.find((m) => m.isCover)?.url || property.media?.[0]?.url;

  const city = property.city?.name || "";
  const state = property.state?.code || "";
  const priceVal = property.transactionType === "rent" ? property.rentPrice : property.price;
  const priceFormatted = priceVal ? ` - R$ ${priceVal.toLocaleString("pt-BR")}` : "";

  const title = `${property.title}${priceFormatted} | UPPA`;
  const description = property.description
    ? property.description.slice(0, 160).trim() + "..."
    : `${property.title} em ${city} - ${state}. Confira fotos, valores e comodidades na UPPA.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "UPPA",
      locale: "pt_BR",
      type: "article",
      images: coverImage ? [{ url: coverImage, alt: property.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: coverImage ? [coverImage] : [],
    },
  };
}

export const revalidate = 120;

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
export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  // Regra do MASTER_PLAN: Somente properties status='active' podem aparecer publicamente
  if (!property || property.status !== "active") {
    notFound();
  }

  // Schema Estruturado JSON-LD (schema.org) para indexação rica no Google
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uppa.com.br";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description || property.title,
    url: `${siteUrl}/imovel/${property.slug}`,
    image: property.media?.map((m) => m.url) || [],
    offers: {
      "@type": "Offer",
      price: property.price || property.rentPrice || 0,
      priceCurrency: "BRL",
      businessFunction:
        property.transactionType === "rent"
          ? "http://purl.org/goodrelations/v1#LeaseOut"
          : "http://purl.org/goodrelations/v1#Sell",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.addressVisible ? property.street : undefined,
      addressLocality: property.city?.name,
      addressRegion: property.state?.code,
      postalCode: property.addressVisible ? property.zipcode : undefined,
      addressCountry: "BR",
    },
    geo: property.addressVisible && property.latitude && property.longitude ? {
      "@type": "GeoCoordinates",
      latitude: property.latitude,
      longitude: property.longitude,
    } : undefined,
    seller: property.agency ? {
      "@type": "RealEstateAgent",
      name: property.agency.name,
      url: `${siteUrl}/imobiliaria/${property.agency.slug}`,
      telephone: property.agency.phone || property.agency.whatsapp,
    } : undefined,
  };

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-24 md:pb-16 pt-4">
      {/* Dados estruturados JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
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
            {/* Preços e Encargos */}
            <PropertyPricing property={property} />

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
            <PropertyAgencyCard agency={property.agency} />

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
          <div className="hidden lg:block lg:col-span-4">
            <PropertyStickyCTA property={property} />
          </div>
        </div>
      </div>

      {/* Barra Fixa Inferior Mobile */}
      <div className="lg:hidden">
        <PropertyStickyCTA property={property} />
      </div>
    </main>
  );
}
