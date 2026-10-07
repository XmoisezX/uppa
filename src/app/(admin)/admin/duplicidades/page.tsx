import { Metadata } from "next";
import { getMatchCandidatesAction } from "@/features/offers/actions/duplicates";
import { DuplicatesClient } from "./DuplicatesClient";

export const metadata: Metadata = {
  title: "Revisão de Duplicidades | UPPA Admin",
  description: "Gerenciamento e auditoria de duplicidades de imóveis (Property x Offer)",
};

export const dynamic = "force-dynamic";

export default async function DuplicatesAdminPage() {
  const result = await getMatchCandidatesAction({
    limit: 50,
  });

  return (
    <DuplicatesClient
      initialCandidates={result.candidates}
      total={result.total}
    />
  );
}
