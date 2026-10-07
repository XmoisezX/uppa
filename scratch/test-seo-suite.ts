import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SEO_INDEXABILITY_CONFIG } from "@/features/seo/config";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getPropertyRedirect } from "@/features/properties/services";
import {
  getCityTerritorialData,
  getNeighborhoodTerritorialData,
  buildPropertyMetaTitle,
  buildPropertyMetaDescription,
  buildPropertyStructuredData,
  getAdminSeoStats,
} from "@/features/seo/services";

// 1. Carrega variáveis de ambiente
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [k, ...v] = trimmed.split("=");
      process.env[k.trim()] = v.join("=").trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function runSeoSuite() {
  console.log("=== INICIANDO SUÍTE DE TESTES SEO TÉCNICO E PROGRAMÁTICO UPPA ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  // TESTE 1: Configuração Central de Indexabilidade
  assert(
    SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_CITY === 3 &&
    SEO_INDEXABILITY_CONFIG.MIN_PROPERTIES_NEIGHBORHOOD === 2,
    "1. Configuração central SEO_INDEXABILITY_CONFIG carregada com limiares objetivos",
    JSON.stringify(SEO_INDEXABILITY_CONFIG)
  );

  // TESTE 2: robots.ts
  const robotsConfig = robots();
  const rule = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
  const disallowList = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
  assert(
    rule &&
    disallowList.includes("/admin/") &&
    disallowList.includes("/painel/") &&
    disallowList.includes("/api/") &&
    disallowList.includes("/*?*minPrice=*") &&
    Boolean(robotsConfig.sitemap?.includes("/sitemap.xml")),
    "2. robots.txt bloqueia áreas administrativas, APIs e armadilhas de filtros infinitos, apontando sitemap",
    JSON.stringify(robotsConfig)
  );

  // TESTE 3: sitemap.ts
  console.log("\nGerando sitemap dinâmico...");
  const sitemapUrls = await sitemap();
  console.log(`Total de URLs geradas no sitemap: ${sitemapUrls.length}`);

  const siteUrl = SEO_INDEXABILITY_CONFIG.SITE_URL;
  const hasHome = sitemapUrls.some((u) => u.url === `${siteUrl}`);
  const hasComprar = sitemapUrls.some((u) => u.url === `${siteUrl}/comprar`);
  const hasAlugar = sitemapUrls.some((u) => u.url === `${siteUrl}/alugar`);
  const hasPelotas = sitemapUrls.some((u) => u.url.includes("/imoveis/pelotas-rs"));
  const hasCentro = sitemapUrls.some((u) => u.url.includes("/imoveis/pelotas-rs/centro"));

  assert(
    hasHome && hasComprar && hasAlugar && hasPelotas && hasCentro,
    "3. Sitemap contém páginas institucionais, cidade indexável e bairro indexável",
    `hasHome: ${hasHome}, hasComprar: ${hasComprar}, hasPelotas: ${hasPelotas}, hasCentro: ${hasCentro}`
  );

  // Validação negativa no sitemap: Cidades de baixo estoque NÃO entram no sitemap
  const hasLowStockCity = sitemapUrls.some((u) => u.url.includes("/imoveis/morro-redondo-rs") || u.url.includes("/imoveis/cangucu-rs"));
  assert(
    !hasLowStockCity,
    "4. Cidades com estoque insuficiente (< 3) são EXCLUÍDAS do sitemap",
    `hasLowStockCity: ${hasLowStockCity}`
  );

  // Validação negativa: NENHUMA property merged deve estar no sitemap
  const { data: mergedSlugs } = await supabase
    .from("properties")
    .select("slug")
    .eq("status", "merged");

  const mergedSlugSet = new Set((mergedSlugs || []).map((m) => m.slug));
  let mergedInSitemapCount = 0;
  for (const item of sitemapUrls) {
    for (const mSlug of mergedSlugSet) {
      if (item.url.endsWith(`/imovel/${mSlug}`)) {
        mergedInSitemapCount++;
      }
    }
  }
  assert(
    mergedInSitemapCount === 0,
    "5. NENHUMA propriedade consolidada (merged) está presente no sitemap",
    `Encontradas ${mergedInSitemapCount} properties merged no sitemap`
  );

  // TESTE 6: Redirecionamento 301 de Property Merged para Canônica
  const testMerged = mergedSlugs?.[0]?.slug;
  if (testMerged) {
    const canonicalRedirect = await getPropertyRedirect(testMerged);
    assert(
      Boolean(canonicalRedirect && canonicalRedirect !== testMerged),
      `6. Property merged '${testMerged}' redireciona em 1 salto para canônica '${canonicalRedirect}'`,
      `canonicalRedirect: ${canonicalRedirect}`
    );
  }

  // TESTE 7: Metadata Dinâmica e Structured Data de Imóvel Multi-Oferta
  const { data: sampleProp } = await supabase
    .from("properties")
    .select(`
      *,
      agency:agencies (*),
      state:states (*),
      city:cities (*),
      neighborhood:neighborhoods (*),
      media:property_media (*)
    `)
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .limit(1)
    .maybeSingle();

  if (sampleProp) {
    const metaTitle = buildPropertyMetaTitle(sampleProp as any);
    // Simula 3 ofertas comerciais disponíveis
    const metaDesc = buildPropertyMetaDescription(sampleProp as any, 3, 445000);
    assert(
      metaTitle.includes("UPPA") && metaDesc.includes("Compare 3 ofertas disponíveis a partir de R$ 445.000"),
      "7. Metadata dinâmica de imóvel com múltiplas ofertas formata título e descrição reais",
      `Title: ${metaTitle} | Desc: ${metaDesc}`
    );

    const jsonLd = buildPropertyStructuredData(sampleProp as any, [
      { salePrice: 445000, agency: { name: "Imobiliária A", slug: "imob-a" } },
      { salePrice: 450000, agency: { name: "Imobiliária B", slug: "imob-b" } },
      { salePrice: 460000, agency: { name: "Imobiliária C", slug: "imob-c" } },
    ], siteUrl);

    const listing = jsonLd.find((s: any) => s["@type"] === "RealEstateListing") as any;
    const breadcrumb = jsonLd.find((s: any) => s["@type"] === "BreadcrumbList") as any;

    assert(
      Array.isArray(listing?.offers) && listing.offers.length === 3 && breadcrumb !== undefined,
      "8. JSON-LD multi-ofertas representa múltiplas ofertas comerciais sob o mesmo imóvel físico + BreadcrumbList",
      `Offers length: ${listing?.offers?.length}, Breadcrumbs: ${breadcrumb ? 'Sim' : 'Não'}`
    );
  }

  // TESTE 9: Dados Territoriais de Cidade
  const pelotasData = await getCityTerritorialData("pelotas-rs");
  assert(
    pelotasData !== null &&
    pelotasData.totalCount >= 3 &&
    pelotasData.isIndexable === true &&
    Boolean(pelotasData.neighborhoods && pelotasData.neighborhoods.length > 0),
    "9. Cidade com estoque (Pelotas - RS) retorna contagem real, bairros e isIndexable = true",
    `Total: ${pelotasData?.totalCount}, isIndexable: ${pelotasData?.isIndexable}`
  );

  const morroData = await getCityTerritorialData("morro-redondo-rs");
  assert(
    morroData !== null &&
    morroData.totalCount < 3 &&
    morroData.isIndexable === false,
    "10. Cidade com estoque insuficiente (Morro Redondo - RS) retorna isIndexable = false (noindex, follow)",
    `Total: ${morroData?.totalCount}, isIndexable: ${morroData?.isIndexable}`
  );

  // TESTE 11: Dados Territoriais de Bairro
  const centroData = await getNeighborhoodTerritorialData("pelotas-rs", "centro");
  assert(
    centroData !== null &&
    centroData.totalCount >= 2 &&
    centroData.isIndexable === true,
    "11. Bairro com estoque (Centro) retorna isIndexable = true",
    `Total: ${centroData?.totalCount}`
  );

  // TESTE 12: Estatísticas para o Admin SEO
  const stats = await getAdminSeoStats();
  assert(
    stats.totalCanonicalProperties > 0 &&
    stats.totalMergedRedirects === 41 &&
    stats.indexableCities >= 3 &&
    stats.totalSitemapUrls > 0,
    "12. Admin SEO calcula métricas precisas (imóveis canônicos, 41 merged, cidades indexáveis)",
    JSON.stringify({
      canonical: stats.totalCanonicalProperties,
      withOffers: stats.totalWithOffers,
      merged: stats.totalMergedRedirects,
      cities: stats.indexableCities,
      noindexCities: stats.noindexCities,
      sitemapUrls: stats.totalSitemapUrls
    })
  );

  console.log(`\n=== RESUMO: ${passed} PASSOU, ${failed} FALHOU ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSeoSuite().catch((err) => {
  console.error("Erro na execução da suíte SEO:", err);
  process.exit(1);
});
