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
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testInsert() {
  const agencyId = crypto.randomUUID();
  const { error: agencyErr } = await adminSupabase.from("agencies").insert({
    id: agencyId,
    name: "Imobiliária Teste Preço",
    slug: `imob-teste-preco-${Date.now()}`,
    status: "active",
  });
  console.log("Agency insert error:", agencyErr);

  const propId = crypto.randomUUID();
  const { error: propErr } = await adminSupabase.from("properties").insert({
    id: propId,
    agency_id: agencyId,
    external_id: "PROP-TEST-PRICE",
    title: "Imóvel Teste Filtro de Preço",
    slug: `imovel-teste-preco-${Date.now()}`,
    property_type: "apartment",
    transaction_type: "sale",
    status: "active",
    active_offers_count: 2,
    lowest_sale_price: 400000,
    highest_sale_price: 600000,
  });
  console.log("Property insert error:", propErr);

  // cleanup
  await adminSupabase.from("properties").delete().eq("id", propId);
  await adminSupabase.from("agencies").delete().eq("id", agencyId);
}

testInsert().catch(console.error);
