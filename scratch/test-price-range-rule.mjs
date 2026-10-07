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

async function runTest() {
  console.log("=== TESTANDO CASO CONTROLADO DE FAIXA DE PREÇO ===");

  // 1. Obtém uma agência existente
  const { data: agencies } = await adminSupabase.from("agencies").select("id").limit(1);
  const agencyId = agencies[0].id;

  // 2. Cria Property X
  const propId = crypto.randomUUID();
  const slugProp = `imovel-teste-preco-${Date.now()}`;
  const { error: propErr } = await adminSupabase.from("properties").insert({
    id: propId,
    agency_id: agencyId,
    external_id: "PROP-TEST-PRICE",
    title: "Imóvel Teste Filtro de Preço",
    slug: slugProp,
    property_type: "apartment",
    transaction_type: "sale",
    status: "active",
    active_offers_count: 2,
    lowest_sale_price: 400000,
    highest_sale_price: 600000,
  });

  if (propErr) throw propErr;

  // 3. Cria Offer A = 400.000 e Offer B = 600.000
  const offerAId = crypto.randomUUID();
  const offerBId = crypto.randomUUID();

  const { error: offersErr } = await adminSupabase.from("property_offers").insert([
    {
      id: offerAId,
      property_id: propId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-A-400K",
      title: "Offer A 400k",
      transaction_type: "sale",
      sale_price: 400000,
      status: "active",
    },
    {
      id: offerBId,
      property_id: propId,
      agency_id: agencyId,
      source: "manual",
      external_id: "OFFER-B-600K",
      title: "Offer B 600k",
      transaction_type: "sale",
      sale_price: 600000,
      status: "active",
    },
  ]);

  if (offersErr) throw offersErr;

  console.log("Property e Offers criadas com sucesso:", { propId, offerAId, offerBId });

  // Função auxiliar para testar query via PostgREST
  async function testQuery(min, max) {
    let q = anonSupabase
      .from("properties")
      .select(`
        id,
        title,
        offers:property_offers!property_offers_property_id_fkey!inner (
          id,
          sale_price,
          status
        )
      `)
      .eq("id", propId)
      .eq("status", "active")
      .is("canonical_property_id", null)
      .eq("offers.status", "active");

    if (min !== undefined && min > 0) {
      q = q.gte("offers.sale_price", min);
    }
    if (max !== undefined && max > 0) {
      q = q.lte("offers.sale_price", max);
    }

    const { data, error } = await q;
    return {
      appears: (data?.length || 0) > 0,
      matchedOffers: data?.[0]?.offers?.map((o) => o.sale_price) || [],
      error,
    };
  }

  // TESTES
  const t1 = await testQuery(300000, 450000);
  console.log("300k - 450k (esperado: APARECE, Offer A 400k):", t1);

  const t2 = await testQuery(450000, 550000);
  console.log("450k - 550k (esperado: NÃO APARECE):", t2);

  const t3 = await testQuery(550000, 650000);
  console.log("550k - 650k (esperado: APARECE, Offer B 600k):", t3);

  const t4 = await testQuery(undefined, 450000);
  console.log("Até 450k (esperado: APARECE, Offer A 400k):", t4);

  const t5 = await testQuery(550000, undefined);
  console.log("Mínimo 550k (esperado: APARECE, Offer B 600k):", t5);

  // Limpeza
  await adminSupabase.from("property_offers").delete().in("id", [offerAId, offerBId]);
  await adminSupabase.from("properties").delete().eq("id", propId);
  console.log("Dados de teste removidos com sucesso.");
}

runTest().catch(console.error);
