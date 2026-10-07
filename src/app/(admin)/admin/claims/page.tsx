import React from "react";
import type { Metadata } from "next";
import { getAdminClaimsList } from "@/features/agencies/services";
import { ClaimsClient } from "./ClaimsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reivindicações de Imobiliárias (Claims) | Admin UPPA",
  robots: { index: false, follow: false },
};

export default async function AdminClaimsPage() {
  const claims = await getAdminClaimsList();
  return <ClaimsClient initialClaims={claims} />;
}
