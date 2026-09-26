import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
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
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618";

  // Amostra de cada imobiliária
  for (const agPattern of ["aliança", "taurus", "imperial"]) {
    const { data: props } = await supabase
      .from("properties")
      .select(`
        id, title, ranking_score, published_at, updated_at,
        bedrooms, bathrooms, parking_spaces, usable_area, description, price, rent_price,
        agency:agencies!agency_id(id, name, verified_at),
        media:property_media(id)
      `)
      .eq("neighborhood_id", neighId)
      .eq("status", "active")
      .ilike("agency.name", `%${agPattern}%`)
      .order("ranking_score", { ascending: false })
      .limit(2);

    console.log(`\n=== Amostra ${agPattern.toUpperCase()} ===`);
    props?.forEach(p => {
      console.log({
        id: p.id,
        agency: p.agency?.name,
        verified: !!p.agency?.verified_at,
        score: p.ranking_score,
        published_at: p.published_at,
        photos_count: p.media?.length,
        has_description: !!p.description && p.description.length > 50,
        price: p.price || p.rentPrice,
      });
    });
  }
}

run().catch(console.error);
