import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isCleanNeighborhoodName(name: string): boolean {
  if (!name || name.trim().length < 2 || name.trim().length > 25) return false;
  const lower = name.toLowerCase();

  // Filtra lixos de scraping ou slugs concatenados
  if (
    lower.includes("cód") ||
    lower.includes("apartamento") ||
    lower.includes("casa") ||
    lower.includes("buscar") ||
    lower.includes("imovel") ||
    lower.includes("imóvel") ||
    lower.includes("home") ||
    lower.includes("http") ||
    lower.includes("www") ||
    lower.includes("boxgaragem") ||
    lower.includes("garagem") ||
    lower.includes("terreno") ||
    lower.includes("pelotas") ||
    lower.includes("distrito") ||
    lower.includes(" - ") ||
    /-\w{2}$/.test(lower)
  ) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    const clean = query.toLowerCase();
    const supabase = await createClient();

    // 1. Busca Cidades correspondentes (ex: Pelotas, Bagé, Porto Alegre)
    let matchedCities: any[] | null = null;
    if (!clean) {
      const { data } = await supabase
        .from("cities")
        .select("id, name, slug, states(code, name)")
        .in("slug", ["pelotas", "bage", "porto-alegre", "rio-grande", "caxias-do-sul"])
        .limit(5);
      matchedCities = data;
    } else {
      const { data } = await supabase
        .from("cities")
        .select("id, name, slug, states(code, name)")
        .or(`name.ilike.%${clean}%,slug.ilike.%${clean}%`)
        .order("name")
        .limit(5);
      matchedCities = data;
    }

    const cities = (matchedCities || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      stateCode: c.states?.code || "",
      stateName: c.states?.name || "",
      type: "city" as const,
    }));

    // 2. Busca Bairros
    const neighborhoodsMap = new Map<string, any>();

    // 2a. Se encontrou cidade correspondente (ex: Pelotas):
    // Puxa os bairros dessa cidade que possuem imóveis ativos primeiro
    if (cities.length > 0) {
      const primaryCity = cities[0];

      // Busca bairros mais representativos com imóveis na cidade
      const { data: propsInCity } = await supabase
        .from("properties")
        .select("neighborhood_id, neighborhoods(id, name, slug)")
        .eq("city_id", primaryCity.id)
        .eq("status", "active")
        .not("neighborhood_id", "is", null)
        .limit(1000);

      const countByNeighborhood: Record<string, { id: string; name: string; slug: string; count: number }> = {};

      for (const p of propsInCity || []) {
        if (p.neighborhoods?.id) {
          const nid = p.neighborhoods.id;
          const nName = (p.neighborhoods as any).name;
          const nSlug = (p.neighborhoods as any).slug;

          if (isCleanNeighborhoodName(nName)) {
            if (!countByNeighborhood[nid]) {
              countByNeighborhood[nid] = { id: nid, name: nName, slug: nSlug, count: 0 };
            }
            countByNeighborhood[nid].count++;
          }
        }
      }

      // Ordena por quantidade de imóveis decrescente (ex: Centro, Areal, Três Vendas, Fragata...)
      const sortedCityBairros = Object.values(countByNeighborhood).sort((a, b) => b.count - a.count);

      for (const b of sortedCityBairros) {
        neighborhoodsMap.set(b.id, {
          id: b.id,
          name: b.name,
          slug: b.slug,
          cityId: primaryCity.id,
          cityName: primaryCity.name,
          citySlug: primaryCity.slug,
          stateCode: primaryCity.stateCode,
          count: b.count,
          type: "neighborhood" as const,
        });
      }

      // Se ainda couber mais bairros da cidade cadastrados na tabela
      if (neighborhoodsMap.size < 15) {
        const { data: moreCityBairros } = await supabase
          .from("neighborhoods")
          .select("id, name, slug")
          .eq("city_id", primaryCity.id)
          .order("name")
          .limit(30);

        for (const b of moreCityBairros || []) {
          if (isCleanNeighborhoodName(b.name) && !neighborhoodsMap.has(b.id)) {
            neighborhoodsMap.set(b.id, {
              id: b.id,
              name: b.name,
              slug: b.slug,
              cityId: primaryCity.id,
              cityName: primaryCity.name,
              citySlug: primaryCity.slug,
              stateCode: primaryCity.stateCode,
              type: "neighborhood" as const,
            });
          }
        }
      }
    }

    // 2b. Bairros cujo nome bate diretamente com a busca do usuário (ex: digitou "centro" ou "fragata")
    const { data: directBairros } = await supabase
      .from("neighborhoods")
      .select("id, name, slug, city_id, cities(name, slug, states(code))")
      .or(`name.ilike.%${clean}%,slug.ilike.%${clean}%`)
      .order("name")
      .limit(20);

    for (const b of directBairros || []) {
      if (isCleanNeighborhoodName(b.name) && !neighborhoodsMap.has(b.id)) {
        neighborhoodsMap.set(b.id, {
          id: b.id,
          name: b.name,
          slug: b.slug,
          cityId: b.city_id,
          cityName: (b.cities as any)?.name || "",
          citySlug: (b.cities as any)?.slug || "",
          stateCode: (b.cities as any)?.states?.code || "",
          type: "neighborhood" as const,
        });
      }
    }

    const neighborhoods = Array.from(neighborhoodsMap.values()).slice(0, 20);

    return NextResponse.json({
      cities,
      neighborhoods,
    });
  } catch (error: any) {
    console.error("[/api/locations/autocomplete] Erro ao buscar locais:", error);
    return NextResponse.json(
      { error: "Erro ao buscar sugestões de localização." },
      { status: 500 }
    );
  }
}
