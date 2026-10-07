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

async function testRealSearch() {
  const t0 = performance.now();
  const { data, count, error } = await anonSupabase
    .from("properties")
    .select(SEARCH_PROPERTIES_SELECT, { count: "exact" })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .gt("active_offers_count", 0)
    .range(0, 11);

  const t1 = performance.now();
  console.log({
    error,
    count,
    itemsLength: data?.length,
    durationMs: Math.round(t1 - t0),
    firstCard: data?.[0] ? {
      id: data[0].id,
      title: data[0].title,
      active_offers_count: data[0].active_offers_count,
      lowest_sale_price: data[0].lowest_sale_price,
      highest_sale_price: data[0].highest_sale_price,
      agency: data[0].agency?.name,
      mediaCount: data[0].media?.length
    } : null
  });
}

testRealSearch().catch(console.error);
