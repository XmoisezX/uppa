import React from "react";
import type { Metadata } from "next";
import {
  getActiveCitiesWithCounts,
  getRecentActiveProperties,
} from "@/features/home/services";
import {
  PropertySearchHero,
  PropertyTypeLinks,
  FeatureSearches,
  PopularCities,
  RecentProperties,
  AgencyCTA,
  PublicFAQ,
} from "@/features/home/components";

export const metadata: Metadata = {
  title: "UPPA | Encontre seu Próximo Imóvel",
  description:
    "Compre ou alugue apartamentos, casas, terrenos e salas comerciais em todo o Brasil. Informações atualizadas direto com imobiliárias parceiras.",
};

export default async function HomePage() {
  // Carrega dados 100% reais do banco de dados em paralelo
  const [activeCities, recentProperties] = await Promise.all([
    getActiveCitiesWithCounts(),
    getRecentActiveProperties(6),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* 1. HERO COM BUSCA PROTAGONISTA (Comprar / Alugar, Tipo, Localização) */}
      <PropertySearchHero suggestedCities={activeCities} />

      {/* 2. ATALHOS POR TIPO DE IMÓVEL */}
      <PropertyTypeLinks />

      {/* 3. BUSCAS POR CARACTERÍSTICAS E COMODIDADES */}
      <FeatureSearches />

      {/* 4. VITRINE DE IMÓVEIS RECÉM-PUBLICADOS (DADOS REAIS) */}
      <RecentProperties properties={recentProperties} />

      {/* 5. CIDADES COM ESTOQUE ATIVO REAL */}
      <PopularCities cities={activeCities} />

      {/* 6. CTA OBJETIVO PARA IMOBILIÁRIAS E CORRETORES (SEM DASHBOARD MOCK) */}
      <AgencyCTA />

      {/* 7. FAQ ACCORDION ACESSÍVEL */}
      <PublicFAQ />
    </div>
  );
}
