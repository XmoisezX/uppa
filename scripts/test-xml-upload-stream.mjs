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
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { FeedSyncManager } = await import("../src/features/feeds/sync/feed-sync-manager.ts");

async function runXmlUploadStreamVerification() {
  console.log("🚀 Iniciando verificação de Upload de Arquivo XML e Progresso em Tempo Real...\n");

  // 1. Obter imobiliária de teste
  const { data: agencies } = await adminClient.from("agencies").select("id, name").limit(1);
  if (!agencies || agencies.length === 0) {
    throw new Error("Nenhuma imobiliária encontrada no banco.");
  }
  const testAgency = agencies[0];
  console.log(`🏢 Imobiliária de teste: ${testAgency.name} (${testAgency.id})`);

  // 2. Criar ou obter feed de upload local
  const uploadFilename = "imoveis_teste_upload.xml";
  const uploadUrl = `upload://${uploadFilename}`;

  let feedId;
  const { data: existingFeed } = await adminClient
    .from("feeds")
    .select("id")
    .eq("agency_id", testAgency.id)
    .eq("url", uploadUrl)
    .maybeSingle();

  if (existingFeed) {
    feedId = existingFeed.id;
  } else {
    const { data: newFeed, error: fErr } = await adminClient
      .from("feeds")
      .insert({
        agency_id: testAgency.id,
        url: uploadUrl,
        type: "vrsync",
        status: "active",
        sync_interval_minutes: 360,
      })
      .select("id")
      .single();

    if (fErr || !newFeed) {
      throw new Error(`Falha ao criar feed de upload: ${fErr?.message}`);
    }
    feedId = newFeed.id;
  }
  console.log(`✅ Feed de upload configurado: ${feedId} (${uploadUrl})`);

  // 3. XML Simulado representando o arquivo do usuário
  const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync">
  <Header>
    <Provider>${testAgency.name}</Provider>
    <Email>teste@upload.com.br</Email>
  </Header>
  <Listings>
    <Listing>
      <ListingID>UPLOAD-STREAM-01</ListingID>
      <Title>Apartamento Streaming Teste 1</Title>
      <TransactionType>For Sale</TransactionType>
      <PropertyType>Residential / Apartment</PropertyType>
      <ListPrice currency="BRL">650000</ListPrice>
      <Location>
        <State abbreviation="SP">São Paulo</State>
        <City>São Paulo</City>
        <Neighborhood>Moema</Neighborhood>
      </Location>
      <Details>
        <Bedrooms>2</Bedrooms>
        <Bathrooms>2</Bathrooms>
        <LivingArea unit="square metres">78</LivingArea>
      </Details>
    </Listing>
    <Listing>
      <ListingID>UPLOAD-STREAM-02</ListingID>
      <Title>Cobertura Streaming Teste 2</Title>
      <TransactionType>For Sale</TransactionType>
      <PropertyType>Residential / Apartment</PropertyType>
      <ListPrice currency="BRL">1850000</ListPrice>
      <Location>
        <State abbreviation="SP">São Paulo</State>
        <City>São Paulo</City>
        <Neighborhood>Jardins</Neighborhood>
      </Location>
      <Details>
        <Bedrooms>4</Bedrooms>
        <Bathrooms>5</Bathrooms>
        <LivingArea unit="square metres">240</LivingArea>
      </Details>
    </Listing>
  </Listings>
</ListingDataFeed>`;

  // 4. Executar importação capturando eventos de progresso em tempo real
  console.log("\n📡 Executando FeedSyncManager com callback onProgress em tempo real...");

  const progressEvents = [];
  const manager = new FeedSyncManager(adminClient);

  const report = await manager.syncFeed(feedId, {
    customXmlPayload: testXml,
    onProgress: (data) => {
      console.log(
        `   ⚡ [PROGRESS EVENT] ${data.current}/${data.total} | Criados: ${data.created} | Atualizados: ${data.updated} | Imóvel: [${data.currentProperty?.externalId}] ${data.currentProperty?.title}`
      );
      progressEvents.push({ ...data });
    },
  });

  console.log("\n📊 Relatório final recebido:", report);

  // 5. Validações dos eventos em tempo real
  if (progressEvents.length !== 2) {
    throw new Error(`Esperado 2 eventos de progresso, recebido: ${progressEvents.length}`);
  }

  const event1 = progressEvents[0];
  const event2 = progressEvents[1];

  if (event1.current !== 1 || event1.total !== 2 || event1.currentProperty?.externalId !== "UPLOAD-STREAM-01") {
    throw new Error(`Evento 1 inconsistente: ${JSON.stringify(event1)}`);
  }

  if (event2.current !== 2 || event2.total !== 2 || event2.currentProperty?.externalId !== "UPLOAD-STREAM-02") {
    throw new Error(`Evento 2 inconsistente: ${JSON.stringify(event2)}`);
  }

  console.log("✅ Eventos de progresso granular emitidos com sucesso!");

  // 6. Validar persistência dos imóveis importados
  const { data: props, error: pErr } = await adminClient
    .from("properties")
    .select("id, external_id, title, price, status")
    .eq("agency_id", testAgency.id)
    .in("external_id", ["UPLOAD-STREAM-01", "UPLOAD-STREAM-02"]);

  if (pErr || !props || props.length !== 2) {
    throw new Error(`Falha ao persistir imóveis: ${pErr?.message || "Imóveis não encontrados"}`);
  }

  console.log("✅ Imóveis persistidos corretamente no banco:", props.map(p => `${p.externalId || p.external_id}: ${p.title}`));

  // 7. Limpeza de dados de teste
  await adminClient.from("properties").delete().in("external_id", ["UPLOAD-STREAM-01", "UPLOAD-STREAM-02"]);
  await adminClient.from("feed_runs").delete().eq("feed_id", feedId);
  await adminClient.from("feeds").delete().eq("id", feedId);

  console.log("🧹 Dados de teste limpos com sucesso.");
  console.log("\n🎉 TODAS AS VERIFICAÇÕES DE UPLOAD XML E STREAMING EM TEMPO REAL PASSARAM!");
}

runXmlUploadStreamVerification().catch((err) => {
  console.error("❌ Teste falhou:", err);
  process.exit(1);
});
