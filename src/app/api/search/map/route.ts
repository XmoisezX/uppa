import { NextRequest, NextResponse } from "next/server";
import { searchPropertiesSpatial, isValidBoundingBox } from "@/features/search/services";
import type { SearchFilters } from "@/features/search/types";
import type { PropertyType, TransactionType } from "@/types/property";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const north = searchParams.get("north") ? Number(searchParams.get("north")) : undefined;
    const south = searchParams.get("south") ? Number(searchParams.get("south")) : undefined;
    const east = searchParams.get("east") ? Number(searchParams.get("east")) : undefined;
    const west = searchParams.get("west") ? Number(searchParams.get("west")) : undefined;
    const zoom = searchParams.get("zoom") ? Number(searchParams.get("zoom")) : undefined;

    const bbox =
      north !== undefined && south !== undefined && east !== undefined && west !== undefined
        ? { north, south, east, west, zoom }
        : undefined;

    // Validação de segurança de coordenadas (Seção 17 do MASTER_PLAN)
    if (bbox && !isValidBoundingBox(bbox)) {
      return NextResponse.json(
        { error: "Coordenadas do Viewport inválidas (-90 a 90, -180 a 180)." },
        { status: 400 }
      );
    }

    const filters: SearchFilters = {
      transactionType: (searchParams.get("transactionType") as TransactionType) || undefined,
      propertyType: (searchParams.get("propertyType") as PropertyType) || undefined,
      state: searchParams.get("state") || undefined,
      city: searchParams.get("city") || undefined,
      neighborhood: searchParams.get("neighborhood") || undefined,
      priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined,
      priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined,
      bedrooms: searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : undefined,
      bathrooms: searchParams.get("bathrooms") ? Number(searchParams.get("bathrooms")) : undefined,
      parkingSpaces: searchParams.get("parkingSpaces")
        ? Number(searchParams.get("parkingSpaces"))
        : undefined,
      areaMin: searchParams.get("areaMin") ? Number(searchParams.get("areaMin")) : undefined,
      areaMax: searchParams.get("areaMax") ? Number(searchParams.get("areaMax")) : undefined,
      financiable: searchParams.get("financiable") === "true" ? true : undefined,
      furnished: searchParams.get("furnished") === "true" ? true : undefined,
      acceptsExchange: searchParams.get("acceptsExchange") === "true" ? true : undefined,
      bbox,
      limit: 100, // Limite seguro para não sobrecarregar o mapa
    };

    const result = await searchPropertiesSpatial(filters);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (error: any) {
    console.error("Erro na busca espacial por mapa:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar imóveis no mapa." },
      { status: 500 }
    );
  }
}
