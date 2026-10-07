import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("c:/Users/Moise/Desktop/PORTAL IMOBILIÁRIO/package.json");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.resolve("c:/Users/Moise/Desktop/PORTAL IMOBILIÁRIO", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      process.env[key.trim()] = values.join("=").trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);
const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);

const SEARCH_PROPERTIES_SELECT = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  price,
  rent_price,
  active_offers_count,
  lowest_sale_price,
  highest_sale_price,
  lowest_rent_price,
  highest_rent_price,
  primary_offer_id,
  condominium_fee,
  usable_area,
  total_area,
  bedrooms,
  suites,
  bathrooms,
  parking_spaces,
  financiable,
  furnished,
  accepts_exchange,
  address_visible,
  street,
  number,
  latitude,
  longitude,
  published_at,
  updated_at,
  description,
  city:cities!city_id (
    id,
    name,
    slug
  ),
  neighborhood:neighborhoods!neighborhood_id (
    id,
    name,
    slug
  ),
  state:states!state_id (
    id,
    code,
    name
  ),
  agency:agencies!agency_id (
    id,
    name,
    slug,
    logo_url,
    creci,
    verified_at,
    phone
  ),
  media:property_media (
    id,
    url,
    is_cover,
    position
  )
`;

// Função que emula a lógica exata de searchProperties com a nova cláusula de preço
async function runSearchQuery(filters) {
  const isRent = filters.transactionType === "rent";
  const hasPriceMin = filters.priceMin !== undefined && filters.priceMin > 0;
  const hasPriceMax = filters.priceMax !== undefined && filters.priceMax > 0;
  const hasPriceFilter = hasPriceMin || hasPriceMax;

  let selectProjection = SEARCH_PROPERTIES_SELECT;
  if (hasPriceFilter) {
    selectProjection += `,\n  matching_offers:property_offers!property_offers_property_id_fkey!inner (\n    id,\n    sale_price,\n    rent_price,\n    status\n  )`;
  }

  let query = anonSupabase
    .from("properties")
    .select(selectProjection, { count: "exact" })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0);

  if (filters.id) {
    query = query.eq("id", filters.id);
  }

  if (filters.transactionType) {
    if (filters.transactionType === "sale") {
      query = query.in("transaction_type", ["sale", "sale_or_rent"]);
    } else if (filters.transactionType === "rent") {
      query = query.in("transaction_type", ["rent", "sale_or_rent"]);
    }
  }

  const offerPriceCol = isRent ? "matching_offers.rent_price" : "matching_offers.sale_price";

  if (hasPriceFilter) {
    query = query.eq("matching_offers.status", "active");

    if (hasPriceMin) {
      query = query.gte(offerPriceCol, filters.priceMin);
    }
    if (hasPriceMax) {
      query = query.lte(offerPriceCol, filters.priceMax);
    }
  }

  const { data, count, error } = await query;
  return {
    appears: (data?.length || 0) > 0,
    count: count || 0,
    items: data || [],
    error,
  };
}

async function main() {
  console.log("=== EXECUTANDO TESTES CONTROLADOS DE PREÇO (FASE 5) ===\n");

  // 1. Obtém imobiliária existente
  const { data: agencies } = await adminSupabase.from("agencies").select("id").limit(1);
  const agencyId = agencies[0].id;

  // ==========================================
  // CASO CONTROLADO 1: VENDA (Property X)
  // Offer A = 400.000, Offer B = 600.000
  // ==========================================
  const propSaleId = crypto.randomUUID();
  const slugSale = `prop-x-venda-${Date.now()}`;
  await adminSupabase.from("properties").insert({
    id: propSaleId,
    agency_id: agencyId,
    external_id: "PROP-X-SALE",
    title: "Property X Venda",
    slug: slugSale,
    property_type: "apartment",
    transaction_type: "sale",
    status: "active",
    active_offers_count: 2,
    lowest_sale_price: 400000,
    highest_sale_price: 600000,
  });

  const offerSaleAId = crypto.randomUUID();
  const offerSaleBId = crypto.randomUUID();
  await adminSupabase.from("property_offers").insert([
    {
      id: offerSaleAId,
      property_id: propSaleId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-SALE-A",
      title: "Offer A 400k",
      transaction_type: "sale",
      sale_price: 400000,
      status: "active",
    },
    {
      id: offerSaleBId,
      property_id: propSaleId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-SALE-B",
      title: "Offer B 600k",
      transaction_type: "sale",
      sale_price: 600000,
      status: "active",
    },
  ]);

  console.log("--- TESTES DE VENDA (Property X: 400k e 600k) ---");

  // Teste 1.1: 300–450 -> aparece (Offer A 400k)
  const s1 = await runSearchQuery({ id: propSaleId, transactionType: "sale", priceMin: 300000, priceMax: 450000 });
  console.log(`1. 300k - 450k: ${s1.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // Teste 1.2: 450–550 -> NÃO aparece (nenhuma offer na faixa)
  const s2 = await runSearchQuery({ id: propSaleId, transactionType: "sale", priceMin: 450000, priceMax: 550000 });
  console.log(`2. 450k - 550k: ${!s2.appears ? "NÃO APARECE (PASSOU)" : "APARECE (FALHOU)"}`);

  // Teste 1.3: 550–650 -> aparece (Offer B 600k)
  const s3 = await runSearchQuery({ id: propSaleId, transactionType: "sale", priceMin: 550000, priceMax: 650000 });
  console.log(`3. 550k - 650k: ${s3.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // Teste 1.4: até 450 -> aparece (Offer A 400k)
  const s4 = await runSearchQuery({ id: propSaleId, transactionType: "sale", priceMax: 450000 });
  console.log(`4. Até 450k: ${s4.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // Teste 1.5: mínimo 550 -> aparece (Offer B 600k)
  const s5 = await runSearchQuery({ id: propSaleId, transactionType: "sale", priceMin: 550000 });
  console.log(`5. Mínimo 550k: ${s5.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // ==========================================
  // CASO CONTROLADO 2: ALUGUEL (Property Y)
  // Offer A = 2.000, Offer B = 4.000
  // ==========================================
  const propRentId = crypto.randomUUID();
  const slugRent = `prop-y-aluguel-${Date.now()}`;
  await adminSupabase.from("properties").insert({
    id: propRentId,
    agency_id: agencyId,
    external_id: "PROP-Y-RENT",
    title: "Property Y Aluguel",
    slug: slugRent,
    property_type: "apartment",
    transaction_type: "rent",
    status: "active",
    active_offers_count: 2,
    lowest_rent_price: 2000,
    highest_rent_price: 4000,
  });

  const offerRentAId = crypto.randomUUID();
  const offerRentBId = crypto.randomUUID();
  await adminSupabase.from("property_offers").insert([
    {
      id: offerRentAId,
      property_id: propRentId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-RENT-A",
      title: "Offer A 2k",
      transaction_type: "rent",
      rent_price: 2000,
      status: "active",
    },
    {
      id: offerRentBId,
      property_id: propRentId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-RENT-B",
      title: "Offer B 4k",
      transaction_type: "rent",
      rent_price: 4000,
      status: "active",
    },
  ]);

  console.log("\n--- TESTES DE ALUGUEL (Property Y: 2.000 e 4.000) ---");

  // Teste 2.1: 1.500–2.500 -> aparece (Offer A 2k)
  const r1 = await runSearchQuery({ id: propRentId, transactionType: "rent", priceMin: 1500, priceMax: 2500 });
  console.log(`1. 1.500 - 2.500: ${r1.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // Teste 2.2: 2.500–3.500 -> NÃO aparece (nenhuma offer na faixa)
  const r2 = await runSearchQuery({ id: propRentId, transactionType: "rent", priceMin: 2500, priceMax: 3500 });
  console.log(`2. 2.500 - 3.500: ${!r2.appears ? "NÃO APARECE (PASSOU)" : "APARECE (FALHOU)"}`);

  // Teste 2.3: 3.500–4.500 -> aparece (Offer B 4k)
  const r3 = await runSearchQuery({ id: propRentId, transactionType: "rent", priceMin: 3500, priceMax: 4500 });
  console.log(`3. 3.500 - 4.500: ${r3.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // Teste 2.4: até 2.500 -> aparece (Offer A 2k)
  const r4 = await runSearchQuery({ id: propRentId, transactionType: "rent", priceMax: 2500 });
  console.log(`4. Até 2.500: ${r4.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // Teste 2.5: mínimo 3.500 -> aparece (Offer B 4k)
  const r5 = await runSearchQuery({ id: propRentId, transactionType: "rent", priceMin: 3500 });
  console.log(`5. Mínimo 3.500: ${r5.appears ? "APARECE (PASSOU)" : "NÃO APARECE (FALHOU)"}`);

  // LIMPEZA COMPLETA DOS DADOS DE TESTE
  await adminSupabase.from("property_offers").delete().in("id", [offerSaleAId, offerSaleBId, offerRentAId, offerRentBId]);
  await adminSupabase.from("properties").delete().in("id", [propSaleId, propRentId]);
  console.log("\nDados de teste de venda e aluguel removidos com sucesso.");
}

main().catch(console.error);
