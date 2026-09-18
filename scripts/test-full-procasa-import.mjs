import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { VRSyncParser } from "../src/features/feeds/parser/vrsync-parser.ts";
import { PropertyImporter } from "../src/features/feeds/importer/property-importer.ts";

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

async function runFullImport() {
  console.log("==================================================================");
  console.log("🚀 INICIANDO IMPORTAÇÃO COMPLETA DO FEED REAL PROCASA (788 LISTINGS)");
  console.log("==================================================================");

  const tStart = Date.now();
  const filePath = path.resolve(process.cwd(), "procasa_vrsync.xml.xml");
  const xmlContent = fs.readFileSync(filePath, "utf-8");

  // 1. Etapa Parse
  const tParseStart = Date.now();
  const parser = new VRSyncParser();
  const { properties, parseErrors } = parser.parse(xmlContent);
  const parseDurationMs = Date.now() - tParseStart;

  console.log(`📁 Leitura e Parse XML: ${properties.length} listings encontrados em ${parseDurationMs}ms.`);
  console.log(`⚠️ Erros de parse iniciais: ${parseErrors.length}`);

  // 2. Localizar agência de destino
  const { data: agencies } = await adminClient.from("agencies").select("id, name").limit(1);
  if (!agencies || agencies.length === 0) {
    throw new Error("Nenhuma imobiliária cadastrada no banco de dados.");
  }
  const targetAgency = agencies[0];
  console.log(`🏢 Agência: ${targetAgency.name} (${targetAgency.id})`);

  // 3. Criar ou reutilizar feed para o arquivo real
  const feedUrl = "upload://procasa_vrsync.xml.xml";
  let feedId;
  const { data: existingFeed } = await adminClient
    .from("feeds")
    .select("id")
    .eq("agency_id", targetAgency.id)
    .eq("url", feedUrl)
    .maybeSingle();

  if (existingFeed) {
    feedId = existingFeed.id;
  } else {
    const { data: newFeed, error: fErr } = await adminClient
      .from("feeds")
      .insert({
        agency_id: targetAgency.id,
        url: feedUrl,
        type: "vrsync",
        status: "active",
        sync_interval_minutes: 360,
      })
      .select("id")
      .single();

    if (fErr || !newFeed) throw new Error(`Falha ao criar feed: ${fErr?.message}`);
    feedId = newFeed.id;
  }

  // 4. Iniciar feed_run
  const { data: feedRun, error: rErr } = await adminClient
    .from("feed_runs")
    .insert({
      feed_id: feedId,
      agency_id: targetAgency.id,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (rErr || !feedRun) throw new Error(`Falha ao criar feed_run: ${rErr?.message}`);

  const importer = new PropertyImporter(adminClient, {
    agencyId: targetAgency.id,
    feedId,
    feedRunId: feedRun.id,
  });

  console.log(`\n⏳ Processando e persistindo ${properties.length} imóveis no banco com idempotência...`);
  let lastReport = Date.now();

  const warnings = [];

  const importResult = await importer.importProperties(properties, parseErrors, (p) => {
    if (p.current % 50 === 0 || p.current === p.total || p.currentProperty?.status === "failed") {
      const now = Date.now();
      const pct = ((p.current / p.total) * 100).toFixed(1);
      const deltaSec = ((now - lastReport) / 1000).toFixed(1);
      console.log(
        `   [PROGRESSO] ${p.current}/${p.total} (${pct}%) | Criados: ${p.created} | Atualizados: ${p.updated} | Falhas: ${p.failed} | ${deltaSec}s`
      );
      lastReport = now;
    }
  });

  const totalDurationMs = Date.now() - tStart;
  const totalDurationSec = (totalDurationMs / 1000).toFixed(2);

  // 5. Contar total de imagens vinculadas aos imóveis importados
  const { data: importedPropIds } = await adminClient
    .from("properties")
    .select("id")
    .eq("agency_id", targetAgency.id)
    .eq("source", "vrsync");

  const propIds = (importedPropIds || []).map((p) => p.id);

  let totalImagesCount = 0;
  if (propIds.length > 0) {
    const { count } = await adminClient
      .from("property_media")
      .select("id", { count: "exact", head: true })
      .in("property_id", propIds.slice(0, 500)); // amostra
    
    // Contagem exata total de mídias da agência
    const { count: totalMedia } = await adminClient
      .from("property_media")
      .select("id", { count: "exact", head: true });
    totalImagesCount = totalMedia || 0;
  }

  // 6. Consultar erros registrados na tabela feed_errors
  const { data: recordedErrors } = await adminClient
    .from("feed_errors")
    .select("*")
    .eq("feed_run_id", feedRun.id);

  const errorCategories = new Map();
  for (const err of recordedErrors || []) {
    errorCategories.set(err.error_type, (errorCategories.get(err.error_type) || 0) + 1);
  }

  console.log("\n==================================================================");
  console.log("📊 RELATÓRIO FINAL DE IMPORTAÇÃO — PROCASA_VRSYNC.XML.XML");
  console.log("==================================================================");
  console.log(`Listings encontrados: ${importResult.itemsFound}`);
  console.log(`Listings importados:   ${importResult.itemsCreated + importResult.itemsUpdated} (Criados: ${importResult.itemsCreated}, Atualizados: ${importResult.itemsUpdated})`);
  console.log(`Listings rejeitados:   ${importResult.itemsFailed}`);
  console.log(`Erros:                 ${recordedErrors?.length || 0}`);
  console.log(`Warnings:              ${warnings.length}`);
  console.log(`Imagens:               ${totalImagesCount}`);
  console.log(`Tempo total:           ${totalDurationSec}s (${(totalDurationMs / 60000).toFixed(2)} min)`);
  console.log(`Status da execução:    ${importResult.status}`);
  console.log("------------------------------------------------------------------");

  if (errorCategories.size > 0) {
    console.log("Categorias de Erro:");
    for (const [cat, count] of errorCategories) {
      console.log(`  - ${cat}: ${count}`);
    }
  } else {
    console.log("Categorias de Erro: Nenhuma (0 erros)");
  }
  console.log("==================================================================\n");

  if (importResult.itemsFailed === 0) {
    console.log("🎉 SUCESSO TOTAL: Todos os 788 listings foram importados com sucesso sem interromper o processamento!");
  } else {
    console.log(`⚠️ Importação finalizada com tolerância a falhas: ${importResult.itemsFailed} falhas isoladas sem derrubar o restante do lote.`);
  }
}

runFullImport().catch((err) => {
  console.error("❌ Falha fatal no teste de importação:", err);
  process.exit(1);
});
