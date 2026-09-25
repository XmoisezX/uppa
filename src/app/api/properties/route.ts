import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/features/search/services";
import type { SearchFilters } from "@/features/search/types";
import type { PropertyType, TransactionType } from "@/types/property";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawPropertyType = searchParams.get("propertyType");
    let propertyType: PropertyType | PropertyType[] | undefined;
    if (rawPropertyType) {
      if (rawPropertyType.includes(",")) {
        propertyType = rawPropertyType
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) as PropertyType[];
      } else {
        propertyType = rawPropertyType.trim() as PropertyType;
      }
    }

    const page = searchParams.get("page") ? Math.max(1, Number(searchParams.get("page"))) : 1;
    const limit = searchParams.get("limit") ? Math.max(1, Math.min(50, Number(searchParams.get("limit")))) : 12;

    const filters: SearchFilters = {
      transactionType: (searchParams.get("transactionType") as TransactionType) || "sale",
      propertyType,
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
      page,
      limit,
      orderBy: (searchParams.get("orderBy") as any) || "recent",
    };

    const result = await searchProperties(filters);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    console.error("[api/properties] Erro ao buscar imóveis paginados:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar catálogo de imóveis" },
      { status: 500 }
    );
  }
}
