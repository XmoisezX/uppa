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

async function testInterleaving() {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618"; // Três Vendas
  
  // Can we execute a raw SQL query or check if RPC exists?
  // Let's test using an RPC or executing via pg
  console.log("Testing round-robin logic in JS vs SQL...");
  
  // Fetch top 60 properties per agency
  const { data: agencies } = await supabase.from("agencies").select("id, name");
  
  const allByAgency = {};
  for (const ag of agencies || []) {
    const { data } = await supabase
      .from("properties")
      .select("id, title, ranking_score, agency_id, agency:agencies!agency_id(name), published_at, updated_at")
      .eq("neighborhood_id", neighId)
      .eq("status", "active")
      .eq("agency_id", ag.id)
      .order("ranking_score", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(60);
      
    if (data && data.length > 0) {
      allByAgency[ag.name] = data;
    }
  }
  
  console.log("Found agencies with properties in Três Vendas:", Object.keys(allByAgency));
  for (const [name, list] of Object.entries(allByAgency)) {
    console.log(`- ${name}: ${list.length} properties fetched`);
  }
  
  // Interleave round robin
  const interleaved = [];
  const agencyNames = Object.keys(allByAgency);
  let round = 0;
  let hasMore = true;
  
  while (hasMore && interleaved.length < 36) {
    hasMore = false;
    for (const name of agencyNames) {
      const list = allByAgency[name];
      if (round < list.length) {
        interleaved.push(list[round]);
        if (round + 1 < list.length) hasMore = true;
      }
    }
    round++;
  }
  
  console.log("\n--- RESULTADO PÁGINA 1 (primeiros 12 imóveis) ---");
  interleaved.slice(0, 12).forEach((p, idx) => {
    console.log(`${idx + 1}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 50)}`);
  });

  console.log("\n--- RESULTADO PÁGINA 2 (imóveis 13 a 24) ---");
  interleaved.slice(12, 24).forEach((p, idx) => {
    console.log(`${idx + 13}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 50)}`);
  });
}

testInterleaving().catch(console.error);
