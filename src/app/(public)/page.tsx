import React from "react";
import type { Metadata } from "next";
import {
  getActiveCitiesWithCounts,
  getRecentActiveProperties,
} from "@/features/home/services";
import { BannerSlot } from "@/features/banners/components/BannerSlot";
import {
  PropertySearchHero,
  PropertyTypeLinks,
  FeatureSearches,
  RecentProperties,
  HomeAdBanner,
  PopularCities,
  PopularSearches,
  HomeEditorialSection,
  HomeToolsSection,
  AgencyCTA,
  PublicFAQ,
} from "@/features/home/components";

export const metadata: Metadata = {
  title: "UPPA | Encontre seu Próximo Imóvel | Portal Imobiliário Nacional",
  description:
    "Compre ou alugue apartamentos, casas, terrenos e salas comerciais em todo o Brasil. Estoque real com contato direto no WhatsApp de imobiliárias e corretores parceiros.",
};

export default async function HomePage() {
  // Carrega dados 100% reais do banco de dados em paralelo
  const [activeCities, recentProperties] = await Promise.all([
    getActiveCitiesWithCounts(),
    getRecentActiveProperties(6),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* 1. HERO VISUAL & BUSCA PRINCIPAL (Comprar, Alugar, Lançamentos, Tipos e Cidades) */}
      <PropertySearchHero suggestedCities={activeCities} />

      {/* 2. BANNER PUBLICITÁRIO — HOME HERO (colapsa se não houver banner ativo) */}
      <BannerSlot position="home_hero" />

      {/* 3. ATALHOS DE DESCOBERTA POR TIPO DE IMÓVEL */}
      <PropertyTypeLinks />

      {/* 3. VITRINE DE IMÓVEIS RECÉM-PUBLICADOS (DADOS REAIS EM GRID COM PROPERTYCARD) */}
      <RecentProperties properties={recentProperties} />

      {/* 4. BLOCO DE PUBLICIDADE RESERVADO */}
      <HomeAdBanner />

      {/* 5. CIDADES COM ESTOQUE ATIVO REAL */}
      <PopularCities cities={activeCities} />

      {/* 6. BUSCAS POR CARACTERÍSTICAS E COMODIDADES */}
      <FeatureSearches />

      {/* 7. BUSCAS POPULARES & SEO DE DESCOBERTA */}
      <PopularSearches cities={activeCities} />

      {/* 8. CONTEÚDO EDITORIAL & GUIAS PRÁTICOS */}
      <HomeEditorialSection />

      {/* 9. FERRAMENTAS & SERVIÇOS DO PORTAL */}
      <HomeToolsSection />

      {/* 10. CTA DE ALTO IMPACTO PARA ANUNCIANTES E IMOBILIÁRIAS */}
      <AgencyCTA />

      {/* 11. PERGUNTAS FREQUENTES (FAQ) */}
      <PublicFAQ />
    </div>
  );
}
