import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { calculatePropertyRanking } from "./src/features/ranking/engine.js";
import { DEFAULT_RANKING_CONFIG } from "./src/features/ranking/config.js";

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

  const { data: props } = await supabase
    .from("properties")
    .select(`
      id, title, ranking_score, published_at, updated_at, description,
      bedrooms, bathrooms, parking_spaces, usable_area, total_area, price, rent_price,
      agency_id,
      agency:agencies!agency_id(id, name, verified_at),
      media:property_media(id, url, is_cover, position)
    `)
    .eq("neighborhood_id", neighId)
    .eq("status", "active");

  const alianca = props.find(p => p.agency_id === "e4632a9d-03dd-4ef4-9954-c1b390b3c93f");
  const taurus = props.find(p => p.agency_id === "6dcd90ea-3371-4d84-88db-9b189ae96224");
  const imperial = props.find(p => p.agency_id === "d572b380-0c86-4aba-93bb-a14f1c4259a3");

  for (const [name, p] of [["Aliança", alianca], ["Taurus", taurus], ["Imperial Paris", imperial]]) {
    if (!p) {
      console.log(`Não encontrou imóvel de ${name}`);
      continue;
    }
    const r = calculatePropertyRanking(
      {
        ...p,
        media: p.media || []
      },
      {
        rankingConfig: DEFAULT_RANKING_CONFIG,
        isAgencyVerified: !!p.agency?.verified_at,
        isFeatured: false,
      }
    );
    console.log(`\n=== Ranking de ${name}: ${p.title?.substring(0, 40)} ===`);
    console.log("Score:", r.score, "Stored DB score:", p.ranking_score);
    console.log("Breakdown:", r.breakdown);
    console.log("Agency verified:", !!p.agency?.verified_at);
    console.log("Published at:", p.published_at);
  }
}

run().catch(console.error);
