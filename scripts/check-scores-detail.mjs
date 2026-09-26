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
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618"; // Três Vendas

  const { data: props } = await supabase
    .from("properties")
    .select("id, title, ranking_score, published_at, updated_at, agency:agencies!agency_id(name)")
    .eq("neighborhood_id", neighId)
    .eq("status", "active")
    .gte("ranking_score", 70)
    .order("ranking_score", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false });

  console.log(`Total com score >= 70 em Três Vendas: ${props.length}`);

  const byAgency = {};
  props.forEach(p => {
    byAgency[p.agency?.name] = (byAgency[p.agency?.name] || 0) + 1;
  });
  console.log("Distribuição dos scores >= 70 por imobiliária:", byAgency);

  const taurusTop = props.filter(p => /taurus/i.test(p.agency?.name));
  console.log(`\nImóveis da Taurus com score >= 70: ${taurusTop.length}`);
  taurusTop.slice(0, 5).forEach(p => {
    console.log(`  - [Score: ${p.ranking_score}] published_at: ${p.published_at} | ${p.title}`);
  });

  const aliancaTop = props.filter(p => /aliança/i.test(p.agency?.name));
  console.log(`\nImóveis da Aliança com score >= 70: ${aliancaTop.length}`);
  aliancaTop.slice(0, 5).forEach(p => {
    console.log(`  - [Score: ${p.ranking_score}] published_at: ${p.published_at} | ${p.title}`);
  });

  const imperialTop = props.filter(p => /imperial/i.test(p.agency?.name));
  console.log(`\nImóveis da Imperial Paris com score >= 70: ${imperialTop.length}`);
  const imperialAll = props.filter(p => /imperial/i.test(p.agency?.name));
  imperialAll.forEach(p => {
    console.log(`  - [Score: ${p.ranking_score}] published_at: ${p.published_at} | ${p.title}`);
  });
}

run().catch(console.error);
