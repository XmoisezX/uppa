/**
 * Content Hash para Propriedades Normalizadas
 * Gera um hash determinístico SHA-256 com base apenas nos campos relevantes de conteúdo.
 * Permite evitar UPDATEs e escritas desnecessárias no banco de dados quando nada mudou.
 */

import crypto from "node:crypto";
import type { NormalizedProperty } from "@/types/feed";

export function computePropertyContentHash(prop: NormalizedProperty): string {
  // Ordena características e mídias para garantir determinismo
  const sortedFeatures = [...(prop.features || [])].sort();
  const sortedImageUrls = [...(prop.images || [])]
    .map((img) => (typeof img === "string" ? img : img.url))
    .filter(Boolean)
    .sort();

  const payload = {
    title: prop.title?.trim() || "",
    description: prop.description?.trim() || "",
    transactionType: prop.transactionType,
    propertyType: prop.propertyType,
    price: prop.price ?? null,
    rentPrice: prop.rentPrice ?? null,
    condominiumFee: prop.condominiumFee ?? null,
    iptu: prop.iptu ?? null,
    bedrooms: prop.bedrooms ?? 0,
    bathrooms: prop.bathrooms ?? 0,
    suites: prop.suites ?? 0,
    parkingSpaces: prop.parkingSpaces ?? 0,
    usableArea: prop.usableArea ?? null,
    totalArea: prop.totalArea ?? null,
    lotArea: prop.lotArea ?? null,
    address: {
      street: prop.address?.street?.trim() || "",
      number: prop.address?.number?.trim() || "",
      neighborhood: prop.address?.neighborhood?.trim() || "",
      city: prop.address?.city?.trim() || "",
      state: prop.address?.state?.trim() || "",
      postalCode: prop.address?.postalCode?.trim() || "",
    },
    features: sortedFeatures,
    images: sortedImageUrls,
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}
