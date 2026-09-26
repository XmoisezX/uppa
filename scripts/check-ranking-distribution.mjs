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

  const { data: props, error } = await supabase
    .from("properties")
    .select("id, title, ranking_score, agency:agencies!agency_id(id, name), published_at, updated_at")
    .eq("neighborhood_id", neighId)
    .eq("status", "active")
    .order("ranking_score", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false });

  console.log(`Total de imóveis em Três Vendas: ${props.length}`);

  console.log("\nPrimeiros 30 imóveis ordenados por ranking_score DESC, published_at DESC:");
  props.slice(0, 30).forEach((p, idx) => {
    console.log(`${idx + 1}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`);
  });

  const agencyScores = {};
  props.forEach(p => {
    const name = p.agency?.name || "Desconhecida";
    if (!agencyScores[name]) agencyScores[name] = [];
    agencyScores[name].push(p.ranking_score || 0);
  });

  console.log("\nEstatísticas de ranking_score por imobiliária em Três Vendas:");
  for (const [name, scores] of Object.entries(agencyScores)) {
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    console.log(`${name} (${scores.length} imóveis): Max=${max}, Min=${min}, Média=${avg}`);
  }

  // Onde aparece o primeiro imóvel de Taurus e Imperial Paris?
  const firstTaurusIdx = props.findIndex(p => /taurus/i.test(p.agency?.name));
  const firstImperialIdx = props.findIndex(p => /imperial/i.test(p.agency?.name));

  console.log(`\nPosição do 1º imóvel da Taurus na lista ordenada por score: ${firstTaurusIdx + 1}`);
  console.log(`Posição do 1º imóvel da Imperial Paris na lista ordenada por score: ${firstImperialIdx + 1}`);
}

run().catch(console.error);
