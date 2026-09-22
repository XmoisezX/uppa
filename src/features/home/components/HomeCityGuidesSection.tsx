import React from "react";
import { Compass } from "lucide-react";
import { getCityGuides } from "@/features/editorial";
import { ContentSection, CityGuideCard } from "@/features/editorial/components";
import type { ActiveCitySummary } from "../services";

interface HomeCityGuidesSectionProps {
  cities: ActiveCitySummary[];
}

export function HomeCityGuidesSection({ cities }: HomeCityGuidesSectionProps) {
  const guides = getCityGuides(cities);

  if (!guides || guides.length === 0) {
    return null;
  }

  return (
    <ContentSection
      badgeIcon={Compass}
      badgeText="Explorar Cidades"
      title="Guias de Cidades & Polos Regionais"
      subtitle="Conheça os municípios com estoque real de imóveis anunciados por imobiliárias credenciadas"
      actionHref="/comprar"
      actionLabel="Ver todas as cidades"
      className="bg-white dark:bg-slate-950"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.slice(0, 6).map((guide) => (
          <CityGuideCard key={guide.id} guide={guide} />
        ))}
      </div>
    </ContentSection>
  );
}
