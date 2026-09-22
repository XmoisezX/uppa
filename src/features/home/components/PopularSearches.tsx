import React from "react";
import { PopularSearches as EditorialPopularSearches } from "@/features/editorial/components";
import { getPopularSearchGroups } from "@/features/editorial";
import type { ActiveCitySummary } from "../services";

interface PopularSearchesProps {
  cities?: ActiveCitySummary[];
}

export function PopularSearches({ cities = [] }: PopularSearchesProps) {
  const groups = getPopularSearchGroups(cities);

  return (
    <EditorialPopularSearches
      groups={groups}
      title="Buscas Populares no Portal"
      subtitle="Acesse rapidamente os filtros, finalidades e cidades mais procurados no momento"
    />
  );
}
