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

async function inspectGeo() {
  const { data: cities } = await adminSupabase
    .from("cities")
    .select("id, name, slug, state_id, state:states(id, code, name)")
    .limit(10);
  console.log("Cities sample:", cities);

  const { data: neighborhoods } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug, city_id")
    .limit(10);
  console.log("Neighborhoods sample:", neighborhoods);

  // Contagem de properties ativas por cidade
  const { data: cityCounts } = await adminSupabase
    .from("properties")
    .select("city_id, city:cities(name, slug, state:states(code))")
    .eq("status", "active")
    .is("canonical_property_id", null);

  const countByCity = {};
  for (const p of cityCounts || []) {
    const name = p.city ? `${p.city.name} - ${p.city.state?.code}` : "Sem cidade";
    const slug = p.city ? `${p.city.slug}-${p.city.state?.code?.toLowerCase()}` : "sem-slug";
    countByCity[name] = (countByCity[name] || 0) + 1;
  }
  console.log("Active properties by city:", countByCity);
}

inspectGeo().catch(console.error);
