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

async function testAliases() {
  const propId = '9f5e4dcd-7c58-4896-985e-9c3de1ef4208'; // sale_price = 230000

  // Teste 1: offers.sale_price
  const res1 = await anonSupabase
    .from("properties")
    .select("id, offers:property_offers!property_offers_property_id_fkey!inner(id, sale_price)")
    .eq("id", propId)
    .gte("offers.sale_price", 200000);
  console.log("Teste 1 (offers.sale_price):", { length: res1.data?.length, error: res1.error });

  // Teste 2: property_offers.sale_price
  const res2 = await anonSupabase
    .from("properties")
    .select("id, property_offers!property_offers_property_id_fkey!inner(id, sale_price)")
    .eq("id", propId)
    .gte("property_offers.sale_price", 200000);
  console.log("Teste 2 (property_offers.sale_price):", { length: res2.data?.length, error: res2.error });
}

testAliases().catch(console.error);
