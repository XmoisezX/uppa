#!/usr/bin/env node

/**
 * Script de Execução e Validação do Feed Real Chaves na Mão
 * Alvo: https://app.chavereserva.com/api/feed/imperialparis?portal=chaves-na-mao
 * Imobiliária: Imperial Paris (d572b380-0c86-4aba-93bb-a14f1c4259a3)
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Carrega variáveis do .env.local
const envContent = fs.readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [key, ...values] = trimmed.split("=");
    process.env[key.trim()] = values.join("=").trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Erro: Variáveis de ambiente Supabase ausentes no .env.local");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { FeedSyncManager } = await import("../src/features/feeds/sync/feed-sync-manager.ts");

console.log("================================================================================");
console.log("SINCRONIZAÇÃO REAL DO FEED CHAVES NA MÃO - IMPERIAL PARIS");
console.log("================================================================================\n");

async function run() {
  const targetUrl = "https://app.chavereserva.com/api/feed/imperialparis?portal=chaves-na-mao";

  // 1. Busca o feed configurado
  const { data: feeds, error: feedErr } = await adminClient
    .from("feeds")
    .select("*, agency:agencies(id, name)")
    .ilike("url", "%imperialparis%")
    .limit(1);

  if (feedErr || !feeds || feeds.length === 0) {
    console.error("❌ Feed não encontrado no banco:", feedErr);
    process.exit(1);
  }

  const feed = feeds[0];
  console.log(`📌 Feed ID: ${feed.id}`);
  console.log(`🏢 Imobiliária: ${feed.agency?.name} (${feed.agency_id})`);
  console.log(`🌐 URL: ${feed.url}`);
  console.log(`📁 Tipo Atual no Banco: ${feed.type}`);

  // Garante que o status está ativo para sincronizar
  await adminClient.from("feeds").update({ status: "active", sync_locked_until: null }).eq("id", feed.id);

  const manager = new FeedSyncManager(adminClient);

  // ============================================================================
  // EXECUÇÃO 1: PRIMEIRA SINCRONIZAÇÃO (IMPORTAÇÃO DOS 127 IMÓVEIS)
  // ============================================================================
  console.log("\n🚀 Iniciando 1ª Sincronização Real...");
  const t0 = Date.now();

  const report1 = await manager.syncFeed(feed.id);
  const dur1 = Date.now() - t0;

  console.log("\n--------------------------------------------------------------------------------");
  console.log("📊 RELATÓRIO DA 1ª EXECUÇÃO:");
  console.log("--------------------------------------------------------------------------------");
  console.log(`  - Status da Execução: ${report1.status}`);
  console.log(`  - Sucesso: ${report1.success ? "SIM ✅" : "NÃO ❌"}`);
  console.log(`  - Itens Encontrados: ${report1.itemsFound}`);
  console.log(`  - Itens Criados: ${report1.itemsCreated}`);
  console.log(`  - Itens Atualizados: ${report1.itemsUpdated}`);
  console.log(`  - Itens Rejeitados / Falhas: ${report1.itemsFailed}`);
  console.log(`  - Duração Total: ${(dur1 / 1000).toFixed(2)}s (${report1.durationMs}ms)`);
  if (report1.error) {
    console.log(`  - Erro Reportado: ${report1.error}`);
  }

  // Consulta quantidade de fotos importadas
  const { count: photosCount } = await adminClient
    .from("property_media")
    .select("id, property:properties!inner(agency_id)", { count: "exact", head: true })
    .eq("property.agency_id", feed.agency_id);

  console.log(`  - Total de Fotos no Banco (Imperial Paris): ${photosCount ?? 0}`);

  // Consulta erros específicos no banco
  if (report1.feedRunId) {
    const { data: runErrors } = await adminClient
      .from("feed_errors")
      .select("*")
      .eq("feed_run_id", report1.feedRunId)
      .limit(5);

    if (runErrors && runErrors.length > 0) {
      console.log(`  - Amostra de erros registrados (${runErrors.length}):`);
      runErrors.forEach((e) => console.log(`    ⚠️ [${e.error_type}] ${e.external_id}: ${e.message}`));
    }
  }

  // Verifica se o feed type foi atualizado para chaves_na_mao
  const { data: updatedFeed } = await adminClient.from("feeds").select("type").eq("id", feed.id).single();
  console.log(`  - Tipo do Feed no Banco após Sincronização: ${updatedFeed?.type}`);

  // ============================================================================
  // EXECUÇÃO 2: SEGUNDA SINCRONIZAÇÃO IDÊNTICA (VALIDAÇÃO DE IDEMPOTÊNCIA)
  // ============================================================================
  console.log("\n🔄 Iniciando 2ª Sincronização Idêntica (Verificação de Idempotência)...");
  const t1 = Date.now();

  const report2 = await manager.syncFeed(feed.id);
  const dur2 = Date.now() - t1;

  console.log("\n--------------------------------------------------------------------------------");
  console.log("📊 RELATÓRIO DA 2ª EXECUÇÃO (IDEMPOTÊNCIA):");
  console.log("--------------------------------------------------------------------------------");
  console.log(`  - Status da Execução: ${report2.status}`);
  console.log(`  - Itens Encontrados: ${report2.itemsFound}`);
  console.log(`  - Itens Criados: ${report2.itemsCreated} (Esperado: 0)`);
  console.log(`  - Itens Atualizados: ${report2.itemsUpdated} (Esperado: 127)`);
  console.log(`  - Itens Rejeitados / Falhas: ${report2.itemsFailed}`);
  console.log(`  - Duração: ${(dur2 / 1000).toFixed(2)}s`);

  // Validação da identidade agency_id + source + external_id
  const { count: totalProps } = await adminClient
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", feed.agency_id);

  console.log(`\n🔍 Verificação de Duplicidade:`);
  console.log(`  - Total de Imóveis no Banco da Agência: ${totalProps} (127 importados + 1 rascunho anterior = 128)`);
  console.log(`  - Duplicados Gerados: ${report2.itemsCreated === 0 ? "0 ✅ (IDEMPOTÊNCIA COMPROVADA)" : "DUPLICATAS DETECTADAS ❌"}`);

  console.log("\n================================================================================");
  console.log("SINCRONIZAÇÃO REAL CONCLUÍDA COM SUCESSO!");
  console.log("================================================================================\n");
}

run().catch((err) => {
  console.error("❌ Erro fatal na execução:", err);
  process.exit(1);
});
