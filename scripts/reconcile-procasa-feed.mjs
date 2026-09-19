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
const CRON_SECRET = process.env.CRON_SECRET || "test_secret_cron_123";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("================================================================================");
  console.log("🚀 INICIANDO RECONCILIAÇÃO DO FEED PROCASA: UPLOAD -> HTTPS PERMANENTE");
  console.log("================================================================================\n");

  // 1. Identificar agências
  const { data: agencies } = await supabase.from("agencies").select("*");
  const procasaAgency = agencies.find(a => a.slug === "procasa") || agencies[0];
  const testAgency = agencies.find(a => a.slug !== "procasa");

  console.log("🏢 Agência Oficial Procasa:", {
    id: procasaAgency.id,
    name: procasaAgency.name,
    slug: procasaAgency.slug,
  });

  if (testAgency) {
    console.log("🏢 Agência de Teste:", {
      id: testAgency.id,
      name: testAgency.name,
      slug: testAgency.slug,
    });
  }

  // 2. Diagnóstico ANTES
  const { count: totalPropertiesBefore } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { data: allFeedsBefore } = await supabase.from("feeds").select("*");
  const uploadFeedsBefore = allFeedsBefore.filter(f => f.url?.startsWith("upload://"));
  const httpsFeedBefore = allFeedsBefore.find(f => f.url?.startsWith("http"));

  console.log("\n📊 ESTADO ANTES:");
  console.log(`- Total de Imóveis no Banco: ${totalPropertiesBefore}`);
  console.log(`- Feeds upload:// existentes: ${uploadFeedsBefore.length}`);
  uploadFeedsBefore.forEach(f => console.log(`  * [${f.id}] agency: ${f.agency_id} | url: ${f.url} | status: ${f.status}`));
  console.log(`- Feed HTTPS: [${httpsFeedBefore?.id}] agency: ${httpsFeedBefore?.agency_id} | url: ${httpsFeedBefore?.url} | status: ${httpsFeedBefore?.status}`);

  // 3. Reatribuir imóveis para a agência oficial Procasa se estiverem na agência de teste
  if (testAgency) {
    const { count: propsInTestAgency } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", testAgency.id);

    if (propsInTestAgency > 0) {
      console.log(`\n🔄 Reatribuindo ${propsInTestAgency} imóveis da agência de teste para a agência oficial Procasa (${procasaAgency.id})...`);
      
      const { error: updatePropErr } = await supabase
        .from("properties")
        .update({ agency_id: procasaAgency.id })
        .eq("agency_id", testAgency.id);

      if (updatePropErr) {
        throw new Error(`Falha ao reatribuir imóveis: ${updatePropErr.message}`);
      }

      // Reatribuir leads também se houver
      await supabase
        .from("leads")
        .update({ agency_id: procasaAgency.id })
        .eq("agency_id", testAgency.id);

      console.log("✅ Imóveis e leads reatribuídos com sucesso para a agência Procasa.");
    }
  }

  // 4. Remover / Desativar os feeds de upload antigos
  console.log("\n🧹 Removendo feeds de upload antigos...");
  for (const uploadFeed of uploadFeedsBefore) {
    console.log(`- Removendo feed ${uploadFeed.id} (${uploadFeed.url})...`);
    await supabase.from("feed_runs").delete().eq("feed_id", uploadFeed.id);
    await supabase.from("feeds").delete().eq("id", uploadFeed.id);
  }
  console.log("✅ Feeds upload:// removidos com sucesso.");

  // Se a agência de teste não possuir mais dados, removemos para manter o banco limpo
  if (testAgency) {
    const { count: remainingTestProps } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", testAgency.id);
    if (remainingTestProps === 0) {
      await supabase.from("agencies").delete().eq("id", testAgency.id);
      console.log(`✅ Agência de teste temporária "${testAgency.name}" removida.`);
    }
  }

  // 5. Configurar o Feed HTTPS como ACTIVE com next_sync_at = now()
  console.log(`\n⚙️ Configurando feed HTTPS [${httpsFeedBefore.id}] como ACTIVE...`);
  const { error: feedUpdateErr } = await supabase
    .from("feeds")
    .update({
      status: "active",
      next_sync_at: new Date().toISOString(),
      sync_locked_until: null,
      retry_count: 0,
    })
    .eq("id", httpsFeedBefore.id);

  if (feedUpdateErr) {
    throw new Error(`Falha ao atualizar feed HTTPS: ${feedUpdateErr.message}`);
  }
  console.log("✅ Feed HTTPS configurado com sucesso como active e next_sync_at = now().");

  // 6. Executar sincronização completa do feed HTTPS via Endpoint /api/feeds/sync
  console.log("\n⚡ DISPARANDO SINCRONIZAÇÃO VIA ENDPOINT /api/feeds/sync (POST com Bearer Token)...");
  const syncStartTime = Date.now();
  const res = await fetch("http://localhost:3000/api/feeds/sync", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CRON_SECRET}`,
      "Content-Type": "application/json"
    }
  });

  const syncDurationMs = Date.now() - syncStartTime;
  console.log(`HTTP Status da Sincronização: ${res.status} ${res.statusText} (${(syncDurationMs / 1000).toFixed(2)}s)`);

  const syncResult = await res.json();
  console.log("\n📊 RELATÓRIO DA SINCRONIZAÇÃO RETORNADO PELO ENDPOINT:");
  console.log(JSON.stringify(syncResult, null, 2));

  // 7. Validação de duplicidade por agency_id + source + external_id (Item 9 do prompt)
  console.log("\n🔍 VALIDANDO DUPLICIDADE NO BANCO (Item 9 do prompt)...");
  const { data: allProps } = await supabase
    .from("properties")
    .select("agency_id, source, external_id");

  const countsMap = new Map();
  for (const p of allProps || []) {
    const key = `${p.agency_id}|${p.source}|${p.external_id}`;
    countsMap.set(key, (countsMap.get(key) || 0) + 1);
  }

  let duplicatesCount = 0;
  for (const [key, count] of countsMap.entries()) {
    if (count > 1) {
      duplicatesCount++;
      console.error(`❌ Duplicado encontrado: ${key} -> count: ${count}`);
    }
  }

  if (duplicatesCount === 0) {
    console.log("✅ TESTE DE DUPLICIDADE: 0 linhas duplicadas encontradas (SUCESSO TOTAL).");
  } else {
    console.error(`❌ ALERTA: ${duplicatesCount} duplicatas encontradas!`);
  }

  // 8. Estado DEPOIS
  const { count: totalPropertiesAfter } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { data: allFeedsAfter } = await supabase.from("feeds").select("*");

  const report = syncResult.reports?.[0] || {};

  console.log("\n================================================================================");
  console.log("RESUMO FINAL CONFORME ITEM 10:");
  console.log("================================================================================");
  console.log("ANTES");
  console.log(`- imóveis: ${totalPropertiesBefore}`);
  console.log(`- feeds upload: ${uploadFeedsBefore.length}`);
  console.log(`- feed HTTPS: 1 (status: ${httpsFeedBefore.status})`);
  console.log("\nDEPOIS");
  console.log(`- imóveis: ${totalPropertiesAfter}`);
  console.log(`- feeds ativos: ${allFeedsAfter.filter(f => f.status === 'active').length}`);
  console.log(`- criados: ${report.itemsCreated ?? 0}`);
  console.log(`- atualizados: ${report.itemsUpdated ?? 0}`);
  console.log(`- duplicados: ${duplicatesCount}`);
  console.log(`- erros: ${report.itemsFailed ?? 0}`);
  console.log("================================================================================");
}

run().catch(console.error);
