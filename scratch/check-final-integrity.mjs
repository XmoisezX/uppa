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

async function checkFinalIntegrity() {
  console.log("=== VERIFICAÇÃO FINAL DE INTEGRIDADE ===");

  const { count: totalOffers } = await adminSupabase.from("property_offers").select("id", { count: "exact", head: true });
  const { count: unassignedOffers } = await adminSupabase.from("property_offers").select("id", { count: "exact", head: true }).is("property_id", null);
  const { count: totalProps } = await adminSupabase.from("properties").select("id", { count: "exact", head: true });
  const { count: activeProps } = await adminSupabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "active").is("canonical_property_id", null);
  const { count: mergedProps } = await adminSupabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "merged");
  const { count: candidatesCount } = await adminSupabase.from("property_match_candidates").select("id", { count: "exact", head: true });
  const { count: highApproved } = await adminSupabase.from("property_match_candidates").select("id", { count: "exact", head: true }).eq("confidence", "HIGH").eq("status", "auto_approved");

  console.log(`Total de offers: ${totalOffers}`);
  console.log(`Offers sem property: ${unassignedOffers}`);
  console.log(`Total de properties: ${totalProps}`);
  console.log(`Properties ativas canônicas: ${activeProps}`);
  console.log(`Properties agrupadas/merged: ${mergedProps}`);
  console.log(`Candidatos a duplicidade: ${candidatesCount}`);
  console.log(`Agrupamentos HIGH mantidos: ${highApproved}`);
}

checkFinalIntegrity().catch(console.error);
