import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Carregar variáveis de .env.local
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("=== 1. BUSCANDO IMOBILIÁRIA PROCASA ===");
  const { data: agencies, error: agErr } = await supabase
    .from("agencies")
    .select("*");

  if (agErr) {
    console.error("Erro ao listar agências:", agErr);
    return;
  }

  console.log(`Total de agências encontradas: ${agencies.length}`);
  agencies.forEach(a => console.log(`- ID: ${a.id} | Nome: "${a.name}" | Slug: "${a.slug}"`));

  const procasa = agencies.find(a => 
    a.name.toLowerCase().includes("procasa") || 
    a.slug.toLowerCase().includes("procasa")
  ) || agencies[0];

  console.log(`\nImobiliária alvo selecionada: [${procasa.id}] "${procasa.name}" (slug: ${procasa.slug})`);

  console.log("\n=== 2. FEEDS VINCULADOS À IMOBILIÁRIA ===");
  const { data: feeds, error: feedsErr } = await supabase
    .from("feeds")
    .select("*")
    .eq("agency_id", procasa.id);

  if (feedsErr) {
    console.error("Erro ao buscar feeds:", feedsErr);
    return;
  }

  console.log(`Total de feeds encontrados para a agência: ${feeds.length}`);
  feeds.forEach(f => {
    console.log(`- ID: ${f.id}`);
    console.log(`  URL: ${f.url}`);
    console.log(`  Type: ${f.type} | Status: ${f.status}`);
    console.log(`  NextSyncAt: ${f.next_sync_at} | LastSyncAt: ${f.last_sync_at}`);
  });

  console.log("\n=== 3. ESTRUTURA DA TABELA PROPERTIES (COLUNAS DE ORIGEM/FEED) ===");
  // Consultar uma linha de properties para ver as colunas
  const { data: sampleProp, error: propErr } = await supabase
    .from("properties")
    .select("*")
    .eq("agency_id", procasa.id)
    .limit(1);

  if (propErr) {
    console.error("Erro ao buscar sample de properties:", propErr);
  } else if (sampleProp && sampleProp.length > 0) {
    const keys = Object.keys(sampleProp[0]);
    console.log("Colunas presentes em properties:", keys.join(", "));
    console.log("Campos relevantes de identificação:", {
      id: sampleProp[0].id,
      agency_id: sampleProp[0].agency_id,
      source: sampleProp[0].source,
      external_id: sampleProp[0].external_id,
      feed_id: sampleProp[0].feed_id,
      import_batch_id: sampleProp[0].import_batch_id,
      metadata: sampleProp[0].metadata,
    });
  } else {
    console.log("Nenhum imóvel encontrado para essa agência.");
  }

  console.log("\n=== 4. CONTAGEM E COMPOSIÇÃO DOS IMÓVEIS ===");
  // Total de imóveis
  const { count: totalProps } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", procasa.id);

  // Imóveis por source
  const { data: sourcesData } = await supabase
    .from("properties")
    .select("source")
    .eq("agency_id", procasa.id);

  const sourceCounts = {};
  for (const row of sourcesData || []) {
    sourceCounts[row.source || "NULL"] = (sourceCounts[row.source || "NULL"] || 0) + 1;
  }

  console.log(`Total de imóveis na agência: ${totalProps}`);
  console.log("Distribuição por source:", sourceCounts);

  // Imóveis manuais (source = 'manual' ou sem external_id)
  const manualCount = (sourcesData || []).filter(r => r.source === "manual" || !r.source).length;
  console.log(`Imóveis cadastrados manualmente: ${manualCount}`);

  // Verificar se há feed HTTPS
  const httpsFeed = feeds.find(f => f.url && f.url.startsWith("http"));
  console.log(`Feed HTTPS encontrado:`, httpsFeed ? { id: httpsFeed.id, url: httpsFeed.url, status: httpsFeed.status } : "NENHUM");

  // Se houver feed HTTPS, testar download ou parse dos primeiros itens
  if (httpsFeed) {
    console.log(`\n=== 5. ANALISANDO FEED HTTPS: ${httpsFeed.url} ===`);
    try {
      const response = await fetch(httpsFeed.url);
      if (!response.ok) {
        console.error(`Falha ao acessar feed HTTPS: HTTP ${response.status} ${response.statusText}`);
      } else {
        const xmlText = await response.text();
        console.log(`Download do feed HTTPS concluído com sucesso. Tamanho: ${(xmlText.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Extrair ListingIDs do feed HTTPS
        const regex = /<ListingID\b[^>]*>([\s\S]*?)<\/ListingID>/gi;
        const httpsListingIds = new Set();
        let m;
        while ((m = regex.exec(xmlText)) !== null) {
          const id = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
          if (id) httpsListingIds.add(id);
        }
        console.log(`Total de ListingIDs no feed HTTPS: ${httpsListingIds.size}`);

        // Buscar todos os external_id atualmente no banco para essa agência
        const { data: dbProps } = await supabase
          .from("properties")
          .select("external_id")
          .eq("agency_id", procasa.id);

        const dbExternalIds = new Set((dbProps || []).map(p => p.external_id).filter(Boolean));
        console.log(`Total de external_ids no banco para esta agência: ${dbExternalIds.size}`);

        // Interseção e diferenças
        let inBoth = 0;
        let onlyInDb = 0;
        let onlyInHttps = 0;

        for (const id of dbExternalIds) {
          if (httpsListingIds.has(id)) {
            inBoth++;
          } else {
            onlyInDb++;
          }
        }

        for (const id of httpsListingIds) {
          if (!dbExternalIds.has(id)) {
            onlyInHttps++;
          }
        }

        console.log(`\n--- COMPARAÇÃO EXTERNAL_ID ---`);
        console.log(`Presentes em AMBOS (banco e HTTPS): ${inBoth}`);
        console.log(`Exclusivos do banco (upload): ${onlyInDb}`);
        console.log(`Exclusivos do feed HTTPS (novos a importar): ${onlyInHttps}`);
      }
    } catch (err) {
      console.error("Erro ao consultar feed HTTPS:", err);
    }
  }
}

run().catch(console.error);
