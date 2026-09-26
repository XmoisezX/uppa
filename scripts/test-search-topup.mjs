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

const SEARCH_PROPERTIES_SELECT = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  price,
  rent_price,
  usable_area,
  bedrooms,
  bathrooms,
  published_at,
  updated_at,
  agency:agencies!agency_id (
    id,
    name
  )
`;

async function testSearch(page = 1, limit = 12) {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618";
  const offset = (page - 1) * limit;

  // Base query with filters
  let query = supabase
    .from("properties")
    .select(SEARCH_PROPERTIES_SELECT, { count: "exact" })
    .eq("status", "active")
    .eq("neighborhood_id", neighId);

  query = query
    .order("ranking_score", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false });

  // 1. Initial pool of candidates
  const initialPoolSize = 180;
  const { data: initialData, count, error } = await query.range(0, initialPoolSize - 1);
  if (error || !initialData) {
    console.error("Error:", error);
    return [];
  }

  const rawData = [...initialData];
  const totalCount = count || 0;

  // 2. Multi-agency representation check:
  // If there are more matching properties in the database than the initial candidate pool,
  // ensure partner agencies with active listings in this filter are not excluded.
  if (totalCount > initialData.length) {
    const agencyCounts = new Map();
    for (const r of rawData) {
      const agId = r.agency?.id || "independent";
      agencyCounts.set(agId, (agencyCounts.get(agId) || 0) + 1);
    }

    const { data: allAgencies } = await supabase.from("agencies").select("id, name");
    const underrepresented = (allAgencies || []).filter(ag => (agencyCounts.get(ag.id) || 0) < 12);

    if (underrepresented.length > 0) {
      const existingIds = new Set(rawData.map(r => r.id));
      const topUpPromises = underrepresented.map(ag => {
        let agQuery = supabase
          .from("properties")
          .select(SEARCH_PROPERTIES_SELECT)
          .eq("status", "active")
          .eq("neighborhood_id", neighId)
          .eq("agency_id", ag.id)
          .order("ranking_score", { ascending: false, nullsFirst: false })
          .limit(12);
        return agQuery;
      });

      const topUpResults = await Promise.all(topUpPromises);
      for (const res of topUpResults) {
        if (res.data) {
          for (const item of res.data) {
            if (!existingIds.has(item.id)) {
              existingIds.add(item.id);
              rawData.push(item);
            }
          }
        }
      }
    }
  }

  // Interleave using the cohort round robin logic
  const itemsWithRanking = rawData.map(item => ({
    item,
    ranking: {
      score: item.ranking_score || 0,
      breakdown: {
        relevance: 25,
        quality: 15,
        featured: 0,
        verified_brokerage: 10,
        freshness: 10,
        completeness: 5,
        media: 5,
        price: 5,
        engagement: 0,
      }
    }
  }));

  // Import sortPropertiesByRanking from the engine
  const { sortPropertiesByRanking } = await import("../src/features/ranking/engine");
  const sorted = sortPropertiesByRanking(itemsWithRanking);

  return {
    properties: sorted.slice(offset, offset + limit),
    total: totalCount,
    page
  };
}

async function run() {
  console.log("=== TESTANDO PÁGINA 1 ===");
  const p1 = await testSearch(1, 12);
  p1.properties.forEach((p, i) => console.log(`${i+1}. [${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`));

  console.log("\n=== TESTANDO PÁGINA 2 ===");
  const p2 = await testSearch(2, 12);
  p2.properties.forEach((p, i) => console.log(`${i+13}. [${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`));

  const p1Ids = new Set(p1.properties.map(p => p.id));
  const dupes = p2.properties.filter(p => p1Ids.has(p.id));
  console.log("\nDuplicatas entre P1 e P2:", dupes.length);
}

run().catch(console.error);
