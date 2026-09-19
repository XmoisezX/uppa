import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Carregar variáveis de .env.local
const envContent = fs.readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [key, ...values] = trimmed.split("=");
    process.env[key.trim()] = values.join("=").trim();
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Credenciais ausentes no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

async function run() {
  console.log("================================================================================");
  console.log("INICIANDO BACKFILL DE BAIRROS (NEIGHBORHOODS) NO SUPABASE");
  console.log("================================================================================");

  // 1. Mapeamento externalId -> Bairro a partir dos arquivos XML locais
  const listingNeighborhoodMap = new Map(); // externalId -> { neighborhood, cityName, stateCode }

  // A) VRSync Procasa XML
  const procasaPath = path.resolve(process.cwd(), "procasa_vrsync.xml.xml");
  if (fs.existsSync(procasaPath)) {
    console.log("📖 Lendo XML Procasa (VRSync)...");
    const xml = fs.readFileSync(procasaPath, "utf-8");
    const listingRegex = /<Listing>([\s\S]*?)<\/Listing>/gi;
    let match;
    while ((match = listingRegex.exec(xml)) !== null) {
      const block = match[1];
      const idMatch = /<ListingID>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/ListingID>/i.exec(block);
      const neighMatch = /<Neighborhood>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/Neighborhood>/i.exec(block);
      const cityMatch = /<City>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/City>/i.exec(block);

      if (idMatch && neighMatch && neighMatch[1].trim()) {
        const id = idMatch[1].trim();
        const neighborhood = neighMatch[1].trim();
        const city = cityMatch ? cityMatch[1].trim() : "Manaus";
        listingNeighborhoodMap.set(id, { neighborhood, city });
      }
    }
    console.log(`✓ Mapeados ${listingNeighborhoodMap.size} imóveis com bairro da Procasa.`);
  }

  // B) Chaves na Mão XML
  const chavesPath = path.resolve(process.cwd(), "scratch-chaves-na-mao-127.xml");
  if (fs.existsSync(chavesPath)) {
    console.log("📖 Lendo XML Chaves na Mão...");
    const xml = fs.readFileSync(chavesPath, "utf-8");
    const imovelRegex = /<imovel>([\s\S]*?)<\/imovel>/gi;
    let match;
    let chavesCount = 0;
    while ((match = imovelRegex.exec(xml)) !== null) {
      const block = match[1];
      const refMatch = /<referencia>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/referencia>/i.exec(block);
      const neighMatch = /<bairro>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/bairro>/i.exec(block);
      const cityMatch = /<cidade>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/cidade>/i.exec(block);

      if (refMatch && neighMatch && neighMatch[1].trim()) {
        const id = refMatch[1].trim();
        const neighborhood = neighMatch[1].trim();
        const city = cityMatch ? cityMatch[1].trim() : "Pelotas";
        listingNeighborhoodMap.set(id, { neighborhood, city });
        chavesCount++;
      }
    }
    console.log(`✓ Mapeados ${chavesCount} imóveis com bairro de Chaves na Mão.`);
  }

  // 2. Carrega cidades do banco para cache
  console.log("\nCarregando cidades do banco para cache...");
  const { data: citiesData } = await supabase.from("cities").select("id, name, slug");
  const cityMap = new Map(); // "manaus" -> city_id
  citiesData?.forEach((c) => {
    cityMap.set(c.slug.toLowerCase(), c.id);
    cityMap.set(c.name.toLowerCase(), c.id);
  });

  // 3. Carrega imóveis que estão no banco
  console.log("Consultando imóveis no banco de dados...");
  const { data: properties, error: propErr } = await supabase
    .from("properties")
    .select("id, external_id, city_id, neighborhood_id, title");

  if (propErr) {
    console.error("Erro ao buscar properties:", propErr);
    process.exit(1);
  }

  console.log(`Total de imóveis cadastrados: ${properties.length}`);

  // 4. Coleta bairros únicos por city_id
  const neighborhoodsToInsert = new Map(); // "cityId:slug" -> { city_id, name, slug }

  for (const prop of properties) {
    const feedInfo = listingNeighborhoodMap.get(prop.external_id);
    let neighborhoodName = feedInfo?.neighborhood;
    let targetCityId = prop.city_id;

    // Se o XML não tiver, tenta extrair do título se houver padrão " / Bairro"
    if (!neighborhoodName && prop.title) {
      const parts = prop.title.split("/");
      if (parts.length >= 3) {
        neighborhoodName = parts[parts.length - 1].trim();
      }
    }

    if (!targetCityId && feedInfo?.city) {
      targetCityId = cityMap.get(feedInfo.city.toLowerCase()) || cityMap.get(slugify(feedInfo.city));
    }

    if (neighborhoodName && targetCityId) {
      const slug = slugify(neighborhoodName);
      const key = `${targetCityId}:${slug}`;
      if (!neighborhoodsToInsert.has(key)) {
        neighborhoodsToInsert.set(key, {
          city_id: targetCityId,
          name: neighborhoodName,
          slug,
        });
      }
    }
  }

  console.log(`\nIdentificados ${neighborhoodsToInsert.size} bairros únicos para cadastrar.`);

  // 5. Insere bairros na tabela neighborhoods com ON CONFLICT (city_id, slug) DO NOTHING
  const neighborhoodCache = new Map(); // "cityId:slug" -> id
  const batch = Array.from(neighborhoodsToInsert.values());

  for (let i = 0; i < batch.length; i += 50) {
    const chunk = batch.slice(i, i + 50);
    const { error: insertErr } = await supabase
      .from("neighborhoods")
      .upsert(chunk, { onConflict: "city_id, slug" });

    if (insertErr) {
      console.warn("Aviso na inserção de chunk:", insertErr.message);
    }
  }

  // 6. Recarrega os bairros inseridos para obter os UUIDs
  const { data: allNeighborhoods } = await supabase.from("neighborhoods").select("id, city_id, name, slug");
  allNeighborhoods?.forEach((n) => {
    neighborhoodCache.set(`${n.city_id}:${n.slug}`, n.id);
  });

  console.log(`✓ Total de bairros ativos na tabela neighborhoods: ${allNeighborhoods?.length || 0}`);

  // 7. Atualiza os imóveis com seus respectivos neighborhood_id
  console.log("\nVinculando neighborhood_id aos imóveis existentes...");
  let updatedCount = 0;

  for (const prop of properties) {
    const feedInfo = listingNeighborhoodMap.get(prop.external_id);
    let neighborhoodName = feedInfo?.neighborhood;
    let targetCityId = prop.city_id;

    if (!neighborhoodName && prop.title) {
      const parts = prop.title.split("/");
      if (parts.length >= 3) {
        neighborhoodName = parts[parts.length - 1].trim();
      }
    }

    if (!targetCityId && feedInfo?.city) {
      targetCityId = cityMap.get(feedInfo.city.toLowerCase()) || cityMap.get(slugify(feedInfo.city));
    }

    if (neighborhoodName && targetCityId) {
      const slug = slugify(neighborhoodName);
      const neighId = neighborhoodCache.get(`${targetCityId}:${slug}`);

      if (neighId && prop.neighborhood_id !== neighId) {
        const { error: updateErr } = await supabase
          .from("properties")
          .update({ neighborhood_id: neighId })
          .eq("id", prop.id);

        if (!updateErr) {
          updatedCount++;
        }
      }
    }
  }

  console.log(`✓ ${updatedCount} imóveis foram atualizados com seus bairros correspondentes!`);

  // 8. Amostra de bairros cadastrados
  console.log("\nAmostra de bairros cadastrados:");
  const sample = (allNeighborhoods || []).slice(0, 10).map((n) => n.name);
  console.log(sample);

  console.log("\n================================================================================");
  console.log("BACKFILL CONCLUÍDO COM SUCESSO!");
  console.log("================================================================================");
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
