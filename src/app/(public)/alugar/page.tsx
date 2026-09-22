import React from "react";
import type { Metadata } from "next";
import { searchProperties } from "@/features/search/services";
import { SearchLayoutView } from "@/features/search/components";
import { BannerSlot } from "@/features/banners/components/BannerSlot";
import type { SearchFilters } from "@/features/search/types";
import type { PropertyType } from "@/types/property";

interface AlugarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Função utilitária para converter searchParams brutos em SearchFilters tipados
 */
function parseSearchParams(params: Record<string, string | string[] | undefined>): SearchFilters {
  const getSingle = (val: string | string[] | undefined) => (Array.isArray(val) ? val[0] : val);

  const north = getSingle(params.north);
  const south = getSingle(params.south);
  const east = getSingle(params.east);
  const west = getSingle(params.west);
  const zoom = getSingle(params.zoom);

  const bbox =
    north && south && east && west
      ? {
          north: Number(north),
          south: Number(south),
          east: Number(east),
          west: Number(west),
          zoom: zoom ? Number(zoom) : undefined,
        }
      : undefined;

  return {
    transactionType: "rent",
    propertyType: getSingle(params.propertyType) as PropertyType | undefined,
    state: getSingle(params.state),
    city: getSingle(params.city),
    neighborhood: getSingle(params.neighborhood),
    priceMin: getSingle(params.priceMin) ? Number(getSingle(params.priceMin)) : undefined,
    priceMax: getSingle(params.priceMax) ? Number(getSingle(params.priceMax)) : undefined,
    bedrooms: getSingle(params.bedrooms) ? Number(getSingle(params.bedrooms)) : undefined,
    bathrooms: getSingle(params.bathrooms) ? Number(getSingle(params.bathrooms)) : undefined,
    parkingSpaces: getSingle(params.parkingSpaces) ? Number(getSingle(params.parkingSpaces)) : undefined,
    areaMin: getSingle(params.areaMin) ? Number(getSingle(params.areaMin)) : undefined,
    areaMax: getSingle(params.areaMax) ? Number(getSingle(params.areaMax)) : undefined,
    financiable: getSingle(params.financiable) === "true" ? true : undefined,
    furnished: getSingle(params.furnished) === "true" ? true : undefined,
    acceptsExchange: getSingle(params.acceptsExchange) === "true" ? true : undefined,
    page: getSingle(params.page) ? Number(getSingle(params.page)) : 1,
    orderBy: getSingle(params.orderBy) as any,
    bbox,
  };
}

/**
 * METADATA DINÂMICA & PROTEÇÃO DE SEO (Seções 46 e 86 do MASTER_PLAN)
 */
export async function generateMetadata({ searchParams }: AlugarPageProps): Promise<Metadata> {
  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uppa.com.br";
  const canonicalUrl = `${siteUrl}/alugar`;

  const hasArbitraryFilters = Boolean(
    filters.priceMin ||
    filters.priceMax ||
    filters.bedrooms ||
    filters.bathrooms ||
    filters.parkingSpaces ||
    filters.areaMin ||
    filters.areaMax ||
    filters.financiable ||
    filters.furnished ||
    filters.acceptsExchange ||
    filters.bbox ||
    (filters.page && filters.page > 1)
  );

  const title = "Imóveis para Alugar no Brasil | UPPA";
  const description =
    "Pesquise apartamentos, casas e salas comerciais para alugar. Negocie diretamente com imobiliárias parceiras credenciadas na UPPA.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: hasArbitraryFilters
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
  };
}

/**
 * PÁGINA PÚBLICA DE LOCAÇÃO DE IMÓVEIS (SERVER COMPONENT)
 */
export default async function AlugarPage({ searchParams }: AlugarPageProps) {
  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);

  // Executa a busca de imóveis para alugar (projeção explícita de colunas, sem SELECT *)
  const result = await searchProperties(filters);

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-6">
      {/* Banner search_top — colapsa se não houver banner ativo */}
      <BannerSlot position="search_top" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SearchLayoutView result={result} />
      </div>
    </main>
  );
}
