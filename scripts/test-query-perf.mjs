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

async function testPerformance() {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618"; // Três Vendas
  
  // Strategy 1: Fetch top candidates per agency in parallel
  const t0 = performance.now();
  const { data: agencies } = await supabase.from("agencies").select("id, name");
  
  const promises = agencies.map(ag => 
    supabase
      .from("properties")
      .select("id, title, ranking_score, agency_id, published_at")
      .eq("neighborhood_id", neighId)
      .eq("status", "active")
      .eq("agency_id", ag.id)
      .order("ranking_score", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(30)
  );
  
  const results = await Promise.all(promises);
  const t1 = performance.now();
  
  let totalCandidates = 0;
  results.forEach((r, i) => {
    console.log(`${agencies[i].name}: fetched ${r.data?.length || 0} candidates`);
    totalCandidates += r.data?.length || 0;
  });
  console.log(`Total candidates: ${totalCandidates} in ${(t1 - t0).toFixed(1)}ms`);
}

testPerformance().catch(console.error);
