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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);

async function testInnerJoin() {
  // Encontra uma property com 2 ou mais offers ativas
  const { data: multiProps } = await anonSupabase
    .from("properties")
    .select("id, active_offers_count, lowest_sale_price, highest_sale_price")
    .gt("active_offers_count", 1)
    .limit(1);

  const targetProp = multiProps?.[0];
  console.log("Target property com múltiplas offers:", targetProp);

  // Testa query com property_offers!inner
  const { data, count, error } = await anonSupabase
    .from("properties")
    .select(`
      id,
      title,
      active_offers_count,
      lowest_sale_price,
      highest_sale_price,
      offers:property_offers!property_offers_property_id_fkey!inner (
        id,
        sale_price,
        status
      )
    `, { count: "exact" })
    .eq("id", targetProp.id)
    .eq("offers.status", "active");

  console.log("Resultado com !inner:", {
    error,
    count,
    itemsLength: data?.length,
    offersInResult: data?.[0]?.offers?.length
  });
}

testInnerJoin().catch(console.error);
