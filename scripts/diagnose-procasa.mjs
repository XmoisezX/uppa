import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { VRSyncParser } from "../src/features/feeds/parser/vrsync-parser.ts";
import { PropertyImporter } from "../src/features/feeds/importer/property-importer.ts";

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

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testImport() {
  const filePath = path.resolve(process.cwd(), "procasa_vrsync.xml.xml");
  const xmlContent = fs.readFileSync(filePath, "utf-8");
  const parser = new VRSyncParser();
  const { properties } = parser.parse(xmlContent);

  console.log(`Total de imóveis parseados: ${properties.length}`);

  // Testar resolução de estado e cidade do primeiro imóvel
  const first = properties[0];
  console.log("\nDados do primeiro imóvel:", {
    externalId: first.externalId,
    title: first.title,
    state: first.address.state,
    city: first.address.city,
    neighborhood: first.address.neighborhood,
  });

  const { data: stateData } = await adminClient
    .from("states")
    .select("id, code, name")
    .eq("code", first.address.state)
    .maybeSingle();
  console.log("Estado no banco:", stateData);

  const { data: cityData } = await adminClient
    .from("cities")
    .select("id, name, state_id")
    .ilike("name", first.address.city)
    .maybeSingle();
  console.log("Cidade no banco:", cityData);

  // Buscar uma agência
  const { data: agencies } = await adminClient.from("agencies").select("id").limit(1);
  const agencyId = agencies[0].id;

  // Criar feed de teste
  const { data: feed } = await adminClient
    .from("feeds")
    .insert({
      agency_id: agencyId,
      url: "upload://procasa_vrsync.xml.xml",
      type: "vrsync",
      status: "active",
      sync_interval_minutes: 360,
    })
    .select("id")
    .single();

  const { data: run } = await adminClient
    .from("feed_runs")
    .insert({
      feed_id: feed.id,
      agency_id: agencyId,
      status: "running",
    })
    .select("id")
    .single();

  const importer = new PropertyImporter(adminClient, {
    agencyId,
    feedId: feed.id,
    feedRunId: run.id,
  });

  console.log("\nTestando importação de 3 imóveis...");
  try {
    const res = await importer.importProperties(properties.slice(0, 3), [], (p) => {
      console.log(`Progresso: ${p.current}/${p.total} | [${p.currentProperty?.externalId}] status: ${p.currentProperty?.status} error: ${p.currentProperty?.error}`);
    });
    console.log("Resultado:", res);
  } catch (err) {
    console.error("ERRO NO IMPORT:", err);
  }

  // Limpeza
  await adminClient.from("properties").delete().in("external_id", properties.slice(0, 3).map(p => p.externalId));
  await adminClient.from("feed_runs").delete().eq("id", run.id);
  await adminClient.from("feeds").delete().eq("id", feed.id);
}

testImport().catch(console.error);
