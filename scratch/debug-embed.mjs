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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function debug() {
  // Pega uma property real existente no banco
  const { data: realProps } = await adminSupabase
    .from("properties")
    .select("id, status, title")
    .eq("status", "active")
    .limit(1);

  const realProp = realProps[0];
  console.log("Real prop:", realProp);

  const { data: realOffers } = await adminSupabase
    .from("property_offers")
    .select("id, sale_price, rent_price, status")
    .eq("property_id", realProp.id);

  console.log("Real offers for prop:", realOffers);

  // Testa query anonima
  const { data: anonData, error: anonErr } = await anonSupabase
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
    .eq("id", realProp.id)
    .eq("offers.status", "active");

  console.log("Anon query:", { anonData, anonErr });
}

debug().catch(console.error);
