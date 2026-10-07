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

async function testSearchQuery() {
  const t0 = performance.now();
  const { data, count, error } = await anonSupabase
    .from("properties")
    .select(`
      id,
      slug,
      title,
      transaction_type,
      property_type,
      status,
      active_offers_count,
      lowest_sale_price,
      highest_sale_price,
      lowest_rent_price,
      highest_rent_price,
      bedrooms,
      suites,
      bathrooms,
      parking_spaces,
      usable_area,
      total_area,
      primary_offer:property_offers!primary_offer_id (
        id,
        title,
        agency:agencies(id, name, slug, logo_url, verified_at),
        media:offer_media(id, url, thumbnail_url, is_cover)
      )
    `, { count: "exact" })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .order("created_at", { ascending: false })
    .range(0, 19);

  const t1 = performance.now();
  console.log({
    error,
    count,
    itemsLength: data?.length,
    durationMs: Math.round(t1 - t0),
    firstItem: data?.[0] ? {
      id: data[0].id,
      title: data[0].title,
      active_offers_count: data[0].active_offers_count,
      lowest_sale_price: data[0].lowest_sale_price,
      primary_offer: data[0].primary_offer ? {
        id: data[0].primary_offer.id,
        agency: data[0].primary_offer.agency?.name,
        mediaCount: data[0].primary_offer.media?.length
      } : null
    } : null
  });
}

testSearchQuery().catch(console.error);
