import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicAgencyProfileBySlug } from "@/features/agencies/services";
import { AgencyPublicView } from "@/features/agencies/components/AgencyPublicView";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";

interface AgencyPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ claim?: string }>;
}

export async function generateMetadata({
  params,
}: AgencyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicAgencyProfileBySlug(slug);

  if (!profile) {
    return {
      title: "Imobiliária não encontrada | UPPA",
      robots: { index: false, follow: false },
    };
  }

  const { agency, activeOffersCount, saleCount, rentCount, neighborhoods } = profile;
  const primaryCity = neighborhoods[0]?.name
    ? `em ${neighborhoods[0].name}`
    : "no Rio Grande do Sul";

  const title = `Imobiliária ${agency.name} | Imóveis à venda e aluguel | UPPA`;

  const descriptionParts: string[] = [];
  if (activeOffersCount > 0) {
    descriptionParts.push(`Confira ${activeOffersCount} imóveis anunciados por ${agency.name}`);
    if (saleCount > 0 && rentCount > 0) {
      descriptionParts.push(`com ${saleCount} opções para compra e ${rentCount} para alugar`);
    } else if (saleCount > 0) {
      descriptionParts.push(`com ${saleCount} opções à venda`);
    } else if (rentCount > 0) {
      descriptionParts.push(`com ${rentCount} opções para locação`);
    }
  } else {
    descriptionParts.push(`Perfil e catálogo imobiliário de ${agency.name}`);
  }
  descriptionParts.push(`no Portal Imobiliário UPPA.`);

  const description = descriptionParts.join(" ");
  const canonicalUrl = `${SEO_INDEXABILITY_CONFIG.SITE_URL}/imobiliaria/${agency.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: profile.isIndexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
          },
        }
      : {
          index: false,
          follow: true,
        },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: agency.logoUrl ? [{ url: agency.logoUrl, alt: agency.name }] : undefined,
    },
  };
}

export default async function PublicAgencyPage({
  params,
  searchParams,
}: AgencyPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const profile = await getPublicAgencyProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUser = user
    ? {
        id: user.id,
        email: user.email,
      }
    : null;

  // Schema.org RealEstateAgent Structured Data (Seção 23)
  const schemaData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: profile.agency.name,
    url: `${SEO_INDEXABILITY_CONFIG.SITE_URL}/imobiliaria/${profile.agency.slug}`,
  };

  if (profile.agency.logoUrl) {
    schemaData.image = profile.agency.logoUrl;
  }
  if (profile.agency.phone || profile.agency.whatsapp) {
    schemaData.telephone = profile.agency.phone || profile.agency.whatsapp;
  }
  if (profile.agency.commercialAddress) {
    schemaData.address = {
      "@type": "PostalAddress",
      streetAddress: profile.agency.commercialAddress,
    };
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Navegação e Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            Início
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/imoveis" className="hover:text-indigo-600 transition-colors">
            Imóveis
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {profile.agency.name}
          </span>
        </nav>

        {/* Visualização Completa */}
        <AgencyPublicView
          profile={profile}
          currentUser={currentUser}
          initialClaimModalOpen={sParams.claim === "true"}
        />
      </div>
    </div>
  );
}
