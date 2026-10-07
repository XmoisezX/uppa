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

async function runRentTest() {
  console.log("=== TESTANDO CASO CONTROLADO DE FAIXA DE ALUGUEL ===");

  const { data: agencies } = await adminSupabase.from("agencies").select("id").limit(1);
  const agencyId = agencies[0].id;

  const propId = crypto.randomUUID();
  const slugProp = `imovel-teste-aluguel-${Date.now()}`;
  await adminSupabase.from("properties").insert({
    id: propId,
    agency_id: agencyId,
    external_id: "PROP-TEST-RENT",
    title: "Imóvel Teste Aluguel",
    slug: slugProp,
    property_type: "apartment",
    transaction_type: "rent",
    status: "active",
    active_offers_count: 2,
    lowest_rent_price: 2000,
    highest_rent_price: 4000,
  });

  const offerAId = crypto.randomUUID();
  const offerBId = crypto.randomUUID();

  await adminSupabase.from("property_offers").insert([
    {
      id: offerAId,
      property_id: propId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-A-RENT-2K",
      title: "Offer A 2k Rent",
      transaction_type: "rent",
      rent_price: 2000,
      status: "active",
    },
    {
      id: offerBId,
      property_id: propId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-B-RENT-4K",
      title: "Offer B 4k Rent",
      transaction_type: "rent",
      rent_price: 4000,
      status: "active",
    },
  ]);

  async function testRentQuery(min, max) {
    let q = anonSupabase
      .from("properties")
      .select(`
        id,
        title,
        offers:property_offers!property_offers_property_id_fkey!inner (
          id,
          rent_price,
          status
        )
      `)
      .eq("id", propId)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .eq("offers.status", "active");

    if (min !== undefined && min > 0) {
      q = q.gte("offers.rent_price", min);
    }
    if (max !== undefined && max > 0) {
      q = q.lte("offers.rent_price", max);
    }

    const { data, error } = await q;
    return {
      appears: (data?.length || 0) > 0,
      matchedOffers: data?.[0]?.offers?.map((o) => o.rent_price) || [],
      error,
    };
  }

  const t1 = await testRentQuery(1500, 2500);
  console.log("Aluguel 1.500 - 2.500 (esperado: APARECE, Offer A 2k):", t1);

  const t2 = await testRentQuery(2500, 3500);
  console.log("Aluguel 2.500 - 3.500 (esperado: NÃO APARECE):", t2);

  const t3 = await testRentQuery(3500, 4500);
  console.log("Aluguel 3.500 - 4.500 (esperado: APARECE, Offer B 4k):", t3);

  const t4 = await testRentQuery(undefined, 2500);
  console.log("Aluguel até 2.500 (esperado: APARECE, Offer A 2k):", t4);

  const t5 = await testRentQuery(3500, undefined);
  console.log("Aluguel mínimo 3.500 (esperado: APARECE, Offer B 4k):", t5);

  // Limpeza
  await adminSupabase.from("property_offers").delete().in("id", [offerAId, offerBId]);
  await adminSupabase.from("properties").delete().eq("id", propId);
  console.log("Dados de teste de aluguel removidos com sucesso.");
}

runRentTest().catch(console.error);
