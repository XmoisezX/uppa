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
  console.log("=== 1. BUSCANDO IMOBILIÁRIAS (Aliança, Taurus, Imperial Paris) ===");
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name, slug");
  
  const relevantAgencies = agencies.filter(a => 
    /aliança|alianca|taurus|imperial/i.test(a.name) || /alianca|taurus|imperial/i.test(a.slug)
  );
  console.log("Imobiliárias encontradas:", relevantAgencies);

  console.log("\n=== 2. BUSCANDO BAIRROS COM 'VENDAS' / 'TRÊS' / 'TRES' ===");
  const { data: neighborhoods } = await supabase
    .from("neighborhoods")
    .select("id, name, slug, city_id");
  
  const matchedNeighs = neighborhoods.filter(n =>
    /vendas|três|tres/i.test(n.name) || /vendas|tres/i.test(n.slug)
  );
  console.log("Bairros correspondentes:", matchedNeighs);

  console.log("\n=== 3. CONTAGEM DE IMÓVEIS ATIVOS POR BAIRRO E IMOBILIÁRIA ===");
  for (const n of matchedNeighs) {
    const { data: props } = await supabase
      .from("properties")
      .select("id, title, agency_id, neighborhood_id, status, ranking_score")
      .eq("neighborhood_id", n.id)
      .eq("status", "active");

    console.log(`\nBairro: "${n.name}" (slug: "${n.slug}", id: ${n.id}) - Total ativos: ${props.length}`);
    
    const countByAgency = {};
    for (const p of props) {
      const ag = agencies.find(a => a.id === p.agency_id);
      const agName = ag ? ag.name : "Desconhecida (" + p.agency_id + ")";
      countByAgency[agName] = (countByAgency[agName] || 0) + 1;
    }
    console.log("Por Imobiliária:", countByAgency);

    // Amostra dos scores
    console.log("Top 5 imóveis por ranking_score:");
    props.sort((a,b) => (b.ranking_score || 0) - (a.ranking_score || 0));
    props.slice(0, 5).forEach(p => {
      const ag = agencies.find(a => a.id === p.agency_id);
      console.log(`  - [Score: ${p.ranking_score}] ${ag?.name}: ${p.title?.substring(0, 40)}`);
    });
  }

  console.log("\n=== 4. BUSCANDO SE TAURUS OU IMPERIAL TÊM IMÓVEIS EM OUTRO BAIRRO QUE CONTÉM 'VENDAS' OU NO TÍTULO/ENDEREÇO ===");
  for (const ag of relevantAgencies) {
    if (/taurus|imperial/i.test(ag.name)) {
      const { data: props } = await supabase
        .from("properties")
        .select("id, title, neighborhood_id, status, street")
        .eq("agency_id", ag.id)
        .eq("status", "active")
        .limit(200);

      const tresVendasProps = (props || []).filter(p => {
        const titleMatch = /três vendas|tres vendas|3 vendas/i.test(p.title || "");
        const streetMatch = /três vendas|tres vendas/i.test(p.street || "");
        return titleMatch || streetMatch;
      });

      console.log(`\n${ag.name}: ${props?.length || 0} imóveis ativos. Com 'três vendas' no título/rua: ${tresVendasProps.length}`);
      for (const p of tresVendasProps) {
        const neigh = neighborhoods.find(n => n.id === p.neighborhood_id);
        console.log(`  - Imóvel ${p.id} (${p.title?.substring(0, 40)}) está associado ao neighborhood_id: "${neigh?.name}" (${p.neighborhood_id})`);
      }
    }
  }
}

run().catch(console.error);
