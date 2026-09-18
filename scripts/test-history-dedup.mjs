#!/usr/bin/env node

/**
 * Script de Teste Automatizado de Deduplicação de Histórico de Preço e Status
 * Conforme Seções 8, 9, 10 e 11 da Auditoria Técnica:
 * Valida que o PostgreSQL trigger é a ÚNICA fonte de verdade,
 * e que não ocorrem inserções manuais duplicadas.
 */

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Credenciais ausentes em .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runHistoryDedupTests() {
  console.log("📊 === INICIANDO TESTES DE HISTÓRICO DE PREÇO E STATUS (TRIGGER ÚNICA) ===\n");

  const { PropertyImporter } = await import("../src/features/feeds/importer/property-importer.ts");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Criar agência e feed de teste
  console.log("1️⃣ Criando agência e feed de teste...");
  let testAgency = null;
  const { data: existingAg } = await adminClient.from("agencies").select("id").limit(1).maybeSingle();
  if (existingAg) {
    testAgency = existingAg;
  } else {
    const { data: newAg } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Teste Histórico",
        slug: "imob-teste-hist-" + Math.random().toString(36).substring(2, 7),
        creci: "12345-J",
        whatsapp: "11999999999",
        email: "contato@teste-hist.com.br",
        status: "active",
      })
      .select("id")
      .single();
    testAgency = newAg;
  }

  const { data: testFeed } = await adminClient
    .from("feeds")
    .insert({
      agency_id: testAgency.id,
      url: "https://example.com/feed-hist.xml",
      type: "vrsync",
    })
    .select("id")
    .single();

  const { data: feedRun } = await adminClient
    .from("feed_runs")
    .insert({
      feed_id: testFeed.id,
      agency_id: testAgency.id,
      status: "running",
    })
    .select("id")
    .single();

  const importer = new PropertyImporter(adminClient, {
    agencyId: testAgency.id,
    feedId: testFeed.id,
    feedRunId: feedRun.id,
  });

  const testExternalId = "HIST-TEST-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // =========================================================================
  // CENÁRIO 1: IMPORTAÇÃO INICIAL COM PREÇO R$ 500.000
  // Esperado: Exatamente 1 registro em property_price_history (criado pela trigger)
  // Esperado: Exatamente 1 registro em property_status_history (criado pela trigger)
  // =========================================================================
  console.log("\n2️⃣ [Cenário 1] Importação inicial (preço = R$ 500.000)...");
  const propInitial = {
    externalId: testExternalId,
    title: "Imóvel Teste Histórico",
    description: "Descrição inicial do imóvel",
    transactionType: "sale",
    propertyType: "apartment",
    price: 500000,
    address: {
      state: "SP",
      city: "São Paulo",
      neighborhood: "Centro",
    },
    images: [{ url: "https://example.com/foto1.jpg", isCover: true }],
    features: ["Piscina"],
  };

  const resInitial = await importer.importProperties([propInitial]);
  assert(resInitial.itemsCreated === 1, "Imóvel inserido com sucesso.");

  const { data: createdProp } = await adminClient
    .from("properties")
    .select("id, price, status")
    .eq("agency_id", testAgency.id)
    .eq("external_id", testExternalId)
    .single();

  const { data: priceHist1 } = await adminClient
    .from("property_price_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    priceHist1 && priceHist1.length === 1,
    `Inserção inicial criou EXATAMENTE 1 registro de preço (encontrados: ${priceHist1?.length}).`
  );
  assert(
    Number(priceHist1?.[0]?.price) === 500000,
    "Valor registrado no histórico de preço confere com R$ 500.000."
  );

  const { data: statusHist1 } = await adminClient
    .from("property_status_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    statusHist1 && statusHist1.length === 1,
    `Inserção inicial criou EXATAMENTE 1 registro de status (encontrados: ${statusHist1?.length}).`
  );
  assert(statusHist1?.[0]?.to_status === "active", "Status inicial registrado como 'active'.");

  // =========================================================================
  // CENÁRIO 2: SINCRONIZAÇÃO DE XML IDÊNTICO (SEM MUDANÇA DE PREÇO OU STATUS)
  // Esperado: 0 novos históricos de preço e 0 novos históricos de status
  // =========================================================================
  console.log("\n3️⃣ [Cenário 2] Sincronização de XML idêntico...");
  await importer.importProperties([propInitial]);

  const { data: priceHist2 } = await adminClient
    .from("property_price_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    priceHist2 && priceHist2.length === 1,
    `Sincronização sem mudança de valor manteve EXATAMENTE 1 registro de preço (0 novos criados).`
  );

  const { data: statusHist2 } = await adminClient
    .from("property_status_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    statusHist2 && statusHist2.length === 1,
    `Sincronização idêntica manteve EXATAMENTE 1 registro de status (0 novos criados).`
  );

  // =========================================================================
  // CENÁRIO 3: ALTERAÇÃO REAL DE PREÇO (500000 -> 480000)
  // Esperado: EXATAMENTE 1 novo registro em property_price_history (total = 2)
  // Esperado: 0 novos registros em status history
  // =========================================================================
  console.log("\n4️⃣ [Cenário 3] Alteração real de preço (R$ 500.000 -> R$ 480.000)...");
  const propPriceChanged = {
    ...propInitial,
    price: 480000,
  };

  await importer.importProperties([propPriceChanged]);

  const { data: priceHist3 } = await adminClient
    .from("property_price_history")
    .select("*")
    .eq("property_id", createdProp.id)
    .order("recorded_at", { ascending: true });

  assert(
    priceHist3 && priceHist3.length === 2,
    `Mudança real de preço gerou EXATAMENTE 1 novo registro (total esperado: 2, encontrados: ${priceHist3?.length}).`
  );
  assert(
    Number(priceHist3?.[1]?.price) === 480000,
    "Novo registro de histórico reflete o novo valor de R$ 480.000."
  );

  const { data: statusHist3 } = await adminClient
    .from("property_status_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    statusHist3 && statusHist3.length === 1,
    `Alteração de preço NÃO gerou novos históricos falsos de status (total continua 1).`
  );

  // =========================================================================
  // CENÁRIO 4: ALTERAÇÃO SOMENTE DA DESCRIÇÃO (PREÇO INALTERADO)
  // Esperado: 0 novos históricos de preço
  // =========================================================================
  console.log("\n5️⃣ [Cenário 4] Alteração apenas da descrição...");
  const propDescChanged = {
    ...propPriceChanged,
    description: "Descrição completamente atualizada com novos detalhes e comodidades.",
  };

  await importer.importProperties([propDescChanged]);

  const { data: priceHist4 } = await adminClient
    .from("property_price_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    priceHist4 && priceHist4.length === 2,
    `Atualização de descrição NÃO gerou novo histórico de preço falso (total permaneceu 2).`
  );

  // =========================================================================
  // CENÁRIO 5: ALTERAÇÃO APENAS DAS FOTOS
  // Esperado: 0 novos históricos de preço
  // =========================================================================
  console.log("\n6️⃣ [Cenário 5] Alteração apenas das fotos...");
  const propPhotosChanged = {
    ...propDescChanged,
    images: [
      { url: "https://example.com/foto1.jpg", isCover: false },
      { url: "https://example.com/foto2_nova.jpg", isCover: true },
    ],
  };

  await importer.importProperties([propPhotosChanged]);

  const { data: priceHist5 } = await adminClient
    .from("property_price_history")
    .select("*")
    .eq("property_id", createdProp.id);

  assert(
    priceHist5 && priceHist5.length === 2,
    `Atualização de fotos NÃO gerou novo histórico de preço falso (total permaneceu 2).`
  );

  // =========================================================================
  // CENÁRIO 6: ALTERAÇÃO DE STATUS (active -> inactive)
  // Esperado: EXATAMENTE 1 novo registro em property_status_history (total = 2)
  // =========================================================================
  console.log("\n7️⃣ [Cenário 6] Alteração de status (active -> inactive)...");
  await adminClient
    .from("properties")
    .update({ status: "inactive" })
    .eq("id", createdProp.id);

  const { data: statusHist6 } = await adminClient
    .from("property_status_history")
    .select("*")
    .eq("property_id", createdProp.id)
    .order("recorded_at", { ascending: true });

  assert(
    statusHist6 && statusHist6.length === 2,
    `Alteração de status gerou EXATAMENTE 1 novo registro (total esperado: 2, encontrados: ${statusHist6?.length}).`
  );
  assert(
    statusHist6?.[1]?.from_status === "active" && statusHist6?.[1]?.to_status === "inactive",
    "Transição registrada corretamente: from 'active' to 'inactive'."
  );

  // =========================================================================
  // LIMPEZA DOS REGISTROS DE TESTE
  // =========================================================================
  console.log("\n8️⃣ Limpando dados de teste...");
  await adminClient.from("properties").delete().eq("id", createdProp.id);
  await adminClient.from("feeds").delete().eq("id", testFeed.id);
  console.log("✅ Limpeza concluída.");

  console.log(`\n🏁 Resultado dos Testes de Histórico: ${passed} Aprovados | ${failed} Falhas.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runHistoryDedupTests().catch((err) => {
  console.error("Erro inesperado no teste de histórico:", err);
  process.exit(1);
});
