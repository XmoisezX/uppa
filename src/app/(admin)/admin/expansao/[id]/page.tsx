import React from "react";
import { notFound } from "next/navigation";
import { getCityExpansionDetail } from "@/features/expansion";
import { CityExpansionDetailView } from "@/features/expansion/components/CityExpansionDetailView";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { city } = await getCityExpansionDetail(id);
  return {
    title: city ? `${city.name} (${city.stateCode}) — Expansão Territorial | UPPA Admin` : "Cidade não encontrada",
  };
}

export default async function AdminCityExpansaoDetailPage({ params }: Props) {
  const { id } = await params;
  const { city, agencies, sources, jobs } = await getCityExpansionDetail(id);

  if (!city) {
    notFound();
  }

  return (
    <CityExpansionDetailView
      city={city}
      agencies={agencies}
      sources={sources}
      jobs={jobs}
    />
  );
}
