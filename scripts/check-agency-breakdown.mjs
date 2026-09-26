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

async function check() {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618"; // Três Vendas
  
  const { data: agencies } = await supabase.from("agencies").select("id, name");
  console.log("Agências cadastradas:", agencies);

  for (const ag of agencies || []) {
    const { count, data } = await supabase
      .from("properties")
      .select("id, title, ranking_score, property_type, transaction_type, price, published_at", { count: "exact" })
      .eq("neighborhood_id", neighId)
      .eq("status", "active")
      .eq("agency_id", ag.id)
      .order("ranking_score", { ascending: false })
      .limit(5);

    console.log(`\n=== Agência: ${ag.name} (Total em Três Vendas: ${count}) ===`);
    data?.forEach((p, i) => console.log(`  ${i+1}. [Score: ${p.ranking_score}] [${p.transaction_type}] ${p.property_type} - R$ ${p.price} | ${p.title?.substring(0, 40)}`));
  }
}

check().catch(console.error);
