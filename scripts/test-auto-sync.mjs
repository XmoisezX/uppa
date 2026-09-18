#!/usr/bin/env node

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Erro: Variáveis de ambiente Supabase ausentes no .env.local");
  process.exitCode = 1;
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { FeedSyncManager } = await import("../src/features/feeds/sync/feed-sync-manager.ts");

async function runAutoSyncVerification() {
  console.log("🚀 Iniciando verificação de Sincronização Automática (Prompt 10)...\n");

  // =========================================================================
  // TESTE 1: RPC de Lock Concorrente Atômico
  // =========================================================================
  console.log("1️⃣ Verificando RPCs de Lock Concorrente (acquire_feed_sync_lock e release_feed_sync_lock)...");

  // Buscar ou criar uma imobiliária de teste
  let testAgency = null;
  let createdAgencyId = null;

  const { data: agencies } = await adminClient.from("agencies").select("id, name").limit(1);
  if (agencies && agencies.length > 0) {
    testAgency = agencies[0];
  } else {
    const slug = "agency-test-" + Math.random().toString(36).substring(2, 8);
    const { data: newAg, error: agErr } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Teste AutoSync",
        slug,
        creci: "12345-J",
        whatsapp: "11999999999",
        email: "contato@test-agency.com.br",
        status: "active",
      })
      .select("id, name")
      .single();

    if (agErr || !newAg) {
      console.error("❌ Falha ao criar imobiliária de teste:", agErr?.message);
      process.exitCode = 1;
      return;
    }
    testAgency = newAg;
    createdAgencyId = newAg.id;
  }

  console.log(`✅ Imobiliária: "${testAgency.name}" (${testAgency.id})`);

  // Criar feed temporário para o teste
  const { data: testFeed, error: feedErr } = await adminClient
    .from("feeds")
    .insert({
      agency_id: testAgency.id,
      url: "https://example.com/mock-vrsync.xml",
      type: "vrsync",
      sync_interval_minutes: 360,
    })
    .select()
    .single();

  if (feedErr || !testFeed) {
    console.error("❌ Falha ao criar feed para teste:", feedErr?.message);
    console.log("ℹ️ Certifique-se de executar a migration 20260918000007_add_feed_sync_lock_and_cron.sql no Supabase.");
    process.exitCode = 1;
    return;
  }

  // Tentativa 1 de Lock: deve ter sucesso (retornar true)
  const { data: lock1, error: l1Err } = await adminClient.rpc("acquire_feed_sync_lock", {
    p_feed_id: testFeed.id,
    p_lock_duration_seconds: 60,
  });

  if (l1Err || !lock1) {
    console.error("❌ Falha ao adquirir lock inicial:", l1Err?.message);
    console.log("ℹ️ Certifique-se de executar a migration 20260918000007_add_feed_sync_lock_and_cron.sql no Supabase.");
    await adminClient.from("feeds").delete().eq("id", testFeed.id);
    if (createdAgencyId) {
      await adminClient.from("agencies").delete().eq("id", createdAgencyId);
    }
    process.exitCode = 1;
    return;
  }
  console.log("✅ Lock 1 adquirido com sucesso.");

  // Tentativa 2 de Lock Concorrente: deve falhar/ser rejeitada (retornar false)
  const { data: lock2 } = await adminClient.rpc("acquire_feed_sync_lock", {
    p_feed_id: testFeed.id,
    p_lock_duration_seconds: 60,
  });

  if (lock2 === true) {
    console.error("❌ Falha de Concorrência: Segundo lock foi adquirido indevidamente!");
    process.exitCode = 1;
    return;
  }
  console.log("✅ Lock 2 concorrente rejeitado com sucesso (bloqueio atômico funcionando).");

  // Liberação do Lock
  await adminClient.rpc("release_feed_sync_lock", { p_feed_id: testFeed.id });

  // Tentativa 3 após liberação: deve ter sucesso novamente
  const { data: lock3 } = await adminClient.rpc("acquire_feed_sync_lock", {
    p_feed_id: testFeed.id,
    p_lock_duration_seconds: 60,
  });

  if (!lock3) {
    console.error("❌ Falha ao readquirir lock após liberação.");
    process.exitCode = 1;
    return;
  }
  console.log("✅ Lock readquirido com sucesso após liberação.");
  await adminClient.rpc("release_feed_sync_lock", { p_feed_id: testFeed.id });

  // =========================================================================
  // TESTE 2: Desativação Segura em Duas Etapas (Seção 29 do MASTER_PLAN)
  // =========================================================================
  console.log("\n2️⃣ Testando Desativação Segura em Duas Etapas (Seção 29)...");

  const manager = new FeedSyncManager(adminClient);

  // Payload 1: Contém Imóvel A e Imóvel B
  const xmlPayloadBoth = `<?xml version="1.0" encoding="UTF-8"?>
  <ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync">
    <Listings>
      <Listing>
        <ListingID>AUTO-SYNC-A</ListingID>
        <Title>Imóvel A - Presente</Title>
        <TransactionType>For Sale</TransactionType>
        <PropertyType>Residential / Apartment</PropertyType>
        <ListPrice>500000</ListPrice>
      </Listing>
      <Listing>
        <ListingID>AUTO-SYNC-B</ListingID>
        <Title>Imóvel B - Desaparecerá</Title>
        <TransactionType>For Sale</TransactionType>
        <PropertyType>Residential / Home</PropertyType>
        <ListPrice>600000</ListPrice>
      </Listing>
    </Listings>
  </ListingDataFeed>`;

  // Execução 1: Criar ambos
  console.log("▶️ Executando Ciclo 1 (Importando Imóveis A e B)...");
  const rep1 = await manager.syncFeed(testFeed.id, { customXmlPayload: xmlPayloadBoth });
  console.log(`   - Criados: ${rep1.itemsCreated} | Atualizados: ${rep1.itemsUpdated} | Desativados: ${rep1.itemsDeactivated}`);

  const { data: propB1 } = await adminClient
    .from("properties")
    .select("status, missing_from_feed_at")
    .eq("agency_id", testAgency.id)
    .eq("external_id", "AUTO-SYNC-B")
    .single();

  if (propB1?.status !== "active" || propB1?.missing_from_feed_at !== null) {
    console.error("❌ Imóvel B deveria estar ativo e sem marcação de ausência:", propB1);
    process.exitCode = 1;
    return;
  }
  console.log("✅ Ciclo 1: Ambos os imóveis criados com status = 'active'.");

  // Payload 2: Contém APENAS Imóvel A (Imóvel B ausente pela 1ª vez)
  const xmlPayloadOnlyA = `<?xml version="1.0" encoding="UTF-8"?>
  <ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync">
    <Listings>
      <Listing>
        <ListingID>AUTO-SYNC-A</ListingID>
        <Title>Imóvel A - Presente</Title>
        <TransactionType>For Sale</TransactionType>
        <PropertyType>Residential / Apartment</PropertyType>
        <ListPrice>500000</ListPrice>
      </Listing>
    </Listings>
  </ListingDataFeed>`;

  // Execução 2: Primeira ausência do Imóvel B
  console.log("\n▶️ Executando Ciclo 2 (1ª ausência do Imóvel B)...");
  const rep2 = await manager.syncFeed(testFeed.id, { customXmlPayload: xmlPayloadOnlyA });
  console.log(`   - Criados: ${rep2.itemsCreated} | Atualizados: ${rep2.itemsUpdated} | Desativados: ${rep2.itemsDeactivated}`);

  const { data: propB2 } = await adminClient
    .from("properties")
    .select("status, missing_from_feed_at")
    .eq("agency_id", testAgency.id)
    .eq("external_id", "AUTO-SYNC-B")
    .single();

  if (propB2?.status !== "active" || !propB2?.missing_from_feed_at) {
    console.error("❌ Regra violada: Na 1ª ausência, o imóvel DEVE permanecer 'active' e receber 'missing_from_feed_at':", propB2);
    process.exitCode = 1;
    return;
  }
  console.log("✅ Ciclo 2: Imóvel B permaneceu 'active' e recebeu timestamp 'missing_from_feed_at' (1ª ausência tolerada).");

  // Execução 3: Segunda ausência consecutiva do Imóvel B -> CONFIRMAÇÃO DE AUSÊNCIA
  console.log("\n▶️ Executando Ciclo 3 (2ª ausência consecutiva do Imóvel B)...");
  const rep3 = await manager.syncFeed(testFeed.id, { customXmlPayload: xmlPayloadOnlyA });
  console.log(`   - Criados: ${rep3.itemsCreated} | Atualizados: ${rep3.itemsUpdated} | Desativados: ${rep3.itemsDeactivated}`);

  const { data: propB3 } = await adminClient
    .from("properties")
    .select("id, status, missing_from_feed_at")
    .eq("agency_id", testAgency.id)
    .eq("external_id", "AUTO-SYNC-B")
    .single();

  if (propB3?.status !== "inactive") {
    console.error("❌ Regra violada: Na 2ª ausência confirmada, o imóvel DEVE mudar para 'inactive':", propB3);
    process.exitCode = 1;
    return;
  }
  console.log("✅ Ciclo 3: Imóvel B foi desativado com segurança ('inactive').");

  // Verificar histórico de status gerado
  const { data: statusHistory } = await adminClient
    .from("property_status_history")
    .select("from_status, to_status, reason")
    .eq("property_id", propB3.id)
    .eq("to_status", "inactive");

  if (!statusHistory || statusHistory.length === 0) {
    console.error("❌ Falha: Histórico de status não registrou a desativação por ausência.");
    process.exitCode = 1;
    return;
  }
  console.log(`✅ Registro de histórico gravado com auditoria: "${statusHistory[0].reason}"`);

  // Execução 4: Imóvel B REAPARECE no feed -> Reativação automática
  console.log("\n▶️ Executando Ciclo 4 (Imóvel B reaparece no feed)...");
  const rep4 = await manager.syncFeed(testFeed.id, { customXmlPayload: xmlPayloadBoth });
  console.log(`   - Criados: ${rep4.itemsCreated} | Atualizados: ${rep4.itemsUpdated} | Desativados: ${rep4.itemsDeactivated}`);

  const { data: propB4 } = await adminClient
    .from("properties")
    .select("status, missing_from_feed_at")
    .eq("agency_id", testAgency.id)
    .eq("external_id", "AUTO-SYNC-B")
    .single();

  if (propB4?.status !== "active" || propB4?.missing_from_feed_at !== null) {
    console.error("❌ Falha: Imóvel reaparecido deveria voltar para 'active' e limpar missing_from_feed_at:", propB4);
    process.exitCode = 1;
    return;
  }
  console.log("✅ Ciclo 4: Imóvel B reativado com sucesso (status = 'active', missing_from_feed_at = null).");

  // =========================================================================
  // LIMPEZA DOS REGISTROS DE TESTE
  // =========================================================================
  console.log("\n3️⃣ Limpando registros de teste...");
  await adminClient.from("properties").delete().eq("agency_id", testAgency.id).in("external_id", ["AUTO-SYNC-A", "AUTO-SYNC-B"]);
  await adminClient.from("feeds").delete().eq("id", testFeed.id);
  if (createdAgencyId) {
    await adminClient.from("agencies").delete().eq("id", createdAgencyId);
  }
  console.log("✅ Limpeza concluída.");

  console.log("\n🎉 Todas as verificações do Prompt 10 (Sincronização Automática & Desativação Segura) foram concluídas com sucesso!");
}

runAutoSyncVerification().catch((err) => {
  console.error("Erro inesperado no teste:", err);
  process.exitCode = 1;
});
