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

async function testCounts() {
  const t0 = performance.now();
  const { data, count, error } = await anonSupabase
    .from("properties")
    .select("id", { count: "estimated" })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .range(0, 11);
  const t1 = performance.now();
  console.log("Estimated count duration:", Math.round(t1 - t0), "ms, count:", count, "items:", data?.length);

  const t2 = performance.now();
  const { data: d2, error: e2 } = await anonSupabase
    .from("properties")
    .select("id, title, active_offers_count, lowest_sale_price")
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .range(0, 11);
  const t3 = performance.now();
  console.log("Without count duration:", Math.round(t3 - t2), "ms, items:", d2?.length);
}

testCounts().catch(console.error);
