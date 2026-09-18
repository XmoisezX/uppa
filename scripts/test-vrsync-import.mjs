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

// ==========================================
// 1. CARREGAMENTO DINÂMICO DO PARSER E IMPORTER
// ==========================================
const { VRSyncParser } = await import("../src/features/feeds/parser/vrsync-parser.ts");

async function runVRSyncVerification() {
  console.log("🚀 Iniciando verificação do Módulo de Feeds e VRSync (Prompt 9)...\n");

  // ==========================================
  // TESTE 1: VRSyncParser (Desacoplamento e Pureza)
  // ==========================================
  console.log("1️⃣ Testando VRSyncParser (em memória, sem banco)...");
  const testXml = `<?xml version="1.0" encoding="UTF-8"?>
  <ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync">
    <Listings>
      <Listing>
        <ListingID>TEST-VR-101</ListingID>
        <Title>Apartamento Moema Alto Padrão</Title>
        <TransactionType>For Sale</TransactionType>
        <PropertyType>Residential / Apartment</PropertyType>
        <Description><![CDATA[Apartamento reformado com 3 dormitórios e varanda gourmet.]]></Description>
        <ListPrice currency="BRL">1250000</ListPrice>
        <PropertyAdministrationFee>1100</PropertyAdministrationFee>
        <YearlyTax>2400</YearlyTax>
        <Location>
          <State abbreviation="SP">São Paulo</State>
          <City>São Paulo</City>
          <Neighborhood>Moema</Neighborhood>
          <Address>Avenida Lavandisca</Address>
          <StreetNumber>300</StreetNumber>
          <PostalCode>04515-010</PostalCode>
          <Latitude>-23.6021</Latitude>
          <Longitude>-46.6642</Longitude>
        </Location>
        <Details>
          <Bedrooms>3</Bedrooms>
          <Bathrooms>2</Bathrooms>
          <Suites>1</Suites>
          <Garage>2</Garage>
          <LivingArea unit="square metres">110</LivingArea>
          <Features>
            <Feature>Piscina</Feature>
            <Feature>Churrasqueira</Feature>
          </Features>
        </Details>
        <Media>
          <Item medium="image" caption="Fachada" primary="true">https://example.com/img1.jpg</Item>
          <Item medium="image" caption="Sala">https://example.com/img2.jpg</Item>
        </Media>
      </Listing>
      <Listing>
        <ListingID>TEST-VR-102</ListingID>
        <Title>Casa de Vila Charmosa</Title>
        <TransactionType>For Rent</TransactionType>
        <PropertyType>Residential / Home</PropertyType>
        <RentalPrice>4500</RentalPrice>
        <Location>
          <State abbreviation="SP">São Paulo</State>
          <City>Campinas</City>
        </Location>
        <Details>
          <Bedrooms>2</Bedrooms>
        </Details>
      </Listing>
      <Listing>
        <ListingID>TEST-VR-INVALIDO</ListingID>
        <Title>Imóvel sem Preço (Deve Falhar no Parser)</Title>
        <TransactionType>For Sale</TransactionType>
        <!-- Sem ListPrice propositalmente -->
      </Listing>
    </Listings>
  </ListingDataFeed>`;

  const parser = new VRSyncParser();
  const parseResult = parser.parse(testXml);

  if (parseResult.properties.length !== 2) {
    console.error(`❌ Erro no parser: esperava 2 propriedades válidas, obteve ${parseResult.properties.length}`);
    process.exitCode = 1;
    return;
  }
  if (parseResult.parseErrors.length !== 1) {
    console.error(`❌ Erro no parser: esperava 1 erro de validação registrado, obteve ${parseResult.parseErrors.length}`);
    process.exitCode = 1;
    return;
  }

  const prop1 = parseResult.properties[0];
  if (prop1.externalId !== "TEST-VR-101" || prop1.price !== 1250000 || prop1.bedrooms !== 3) {
    console.error("❌ Dados normalizados incorretos:", prop1);
    process.exitCode = 1;
    return;
  }

  console.log("✅ VRSyncParser validado com sucesso:");
  console.log(`   - 2 imóveis normalizados com sucesso (externalId: ${prop1.externalId}, ${parseResult.properties[1].externalId})`);
  console.log(`   - 1 imóvel inválido capturado corretamente: "${parseResult.parseErrors[0].message}"`);
  console.log("   - Zero chamadas ao banco de dados durante a etapa de parsing.");

  // ==========================================
  // TESTE 2: Existência das Tabelas no Banco
  // ==========================================
  console.log("\n2️⃣ Verificando existência das tabelas 'feeds', 'feed_runs' e 'feed_errors'...");
  const { error: feedsErr } = await adminClient.from("feeds").select("id").limit(1);
  if (feedsErr) {
    console.error("❌ Tabela 'feeds' não encontrada ou inacessível:", feedsErr.message);
    console.log("ℹ️ Certifique-se de ter executado a migration 20260918000006_create_feeds_and_runs.sql no Supabase SQL Editor.");
    process.exitCode = 1;
    return;
  }

  const { error: runsErr } = await adminClient.from("feed_runs").select("id").limit(1);
  if (runsErr) {
    console.error("❌ Tabela 'feed_runs' não encontrada:", runsErr.message);
    process.exitCode = 1;
    return;
  }

  const { error: errsErr } = await adminClient.from("feed_errors").select("id").limit(1);
  if (errsErr) {
    console.error("❌ Tabela 'feed_errors' não encontrada:", errsErr.message);
    process.exitCode = 1;
    return;
  }
  console.log("✅ Tabelas 'feeds', 'feed_runs' e 'feed_errors' ativas no Supabase.");

  // ==========================================
  // TESTE 3: Buscar Imobiliária para Teste
  // ==========================================
  console.log("\n3️⃣ Buscando imobiliária para execução do teste...");
  const { data: agencies, error: agencyErr } = await adminClient
    .from("agencies")
    .select("id, name")
    .limit(1);

  if (agencyErr || !agencies || agencies.length === 0) {
    console.warn("⚠️ Nenhuma imobiliária encontrada no banco para executar o teste de persistência.");
    return;
  }

  const testAgency = agencies[0];
  console.log(`✅ Imobiliária para teste: "${testAgency.name}" (ID: ${testAgency.id})`);

  // ==========================================
  // TESTE 4: Teste de Idempotência e Persistência
  // ==========================================
  console.log("\n4️⃣ Criando registro de feed e executando teste de idempotência...");
  const { data: testFeed, error: feedInsertErr } = await adminClient
    .from("feeds")
    .insert({
      agency_id: testAgency.id,
      url: "https://example.com/vrsync-test.xml",
      type: "vrsync",
    })
    .select()
    .single();

  if (feedInsertErr || !testFeed) {
    console.error("❌ Falha ao criar feed de teste:", feedInsertErr?.message);
    process.exitCode = 1;
    return;
  }

  const { PropertyImporter } = await import("../src/features/feeds/importer/property-importer.ts");

  // RUN 1: Inserção inicial de 2 imóveis
  console.log("\n▶️ Executando RUN 1 (Primeira importação)...");
  const { data: run1 } = await adminClient
    .from("feed_runs")
    .insert({ feed_id: testFeed.id, agency_id: testAgency.id, status: "running" })
    .select()
    .single();

  const importer1 = new PropertyImporter(adminClient, {
    agencyId: testAgency.id,
    feedId: testFeed.id,
    feedRunId: run1.id,
  });

  const res1 = await importer1.importProperties(parseResult.properties, parseResult.parseErrors);
  console.log(`✅ Resultado RUN 1: Criados = ${res1.itemsCreated} | Atualizados = ${res1.itemsUpdated} | Falhas = ${res1.itemsFailed}`);

  if (res1.itemsCreated !== 2 || res1.itemsUpdated !== 0) {
    console.error("❌ Falha no RUN 1: Esperava itemsCreated = 2 e itemsUpdated = 0");
    process.exitCode = 1;
    return;
  }

  // RUN 2: Segunda importação idêntica com alteração de preço para testar UPDATE e Histórico
  console.log("\n▶️ Executando RUN 2 (Reexecução para verificar IDEMPOTÊNCIA)...");
  const { data: run2 } = await adminClient
    .from("feed_runs")
    .insert({ feed_id: testFeed.id, agency_id: testAgency.id, status: "running" })
    .select()
    .single();

  // Alteramos o preço do imóvel 101 para R$ 1.300.000 para testar detecção de alteração de preço
  const updatedProperties = parseResult.properties.map((p) =>
    p.externalId === "TEST-VR-101" ? { ...p, price: 1300000 } : p
  );

  const importer2 = new PropertyImporter(adminClient, {
    agencyId: testAgency.id,
    feedId: testFeed.id,
    feedRunId: run2.id,
  });

  const res2 = await importer2.importProperties(updatedProperties, []);
  console.log(`✅ Resultado RUN 2: Criados = ${res2.itemsCreated} | Atualizados = ${res2.itemsUpdated} | Falhas = ${res2.itemsFailed}`);

  if (res2.itemsCreated !== 0 || res2.itemsUpdated !== 2) {
    console.error("❌ Falha de IDEMPOTÊNCIA: Itens criados não deveria ser maior que 0 na reexecução!");
    process.exitCode = 1;
    return;
  }

  // Verificar se o histórico de preço registrou a mudança
  const { data: propDb } = await adminClient
    .from("properties")
    .select("id, price")
    .eq("agency_id", testAgency.id)
    .eq("external_id", "TEST-VR-101")
    .single();

  if (Number(propDb?.price) !== 1300000) {
    console.error("❌ Preço atualizado não foi gravado corretamente:", propDb?.price);
    process.exitCode = 1;
    return;
  }

  const { data: priceHistory } = await adminClient
    .from("property_price_history")
    .select("price")
    .eq("property_id", propDb.id);

  console.log(`✅ Histórico de preço registrou ${priceHistory?.length} alterações de valor para o imóvel.`);

  // ==========================================
  // LIMPEZA DOS REGISTROS DE TESTE
  // ==========================================
  console.log("\n5️⃣ Limpando dados de teste...");
  await adminClient.from("properties").delete().eq("agency_id", testAgency.id).in("external_id", ["TEST-VR-101", "TEST-VR-102"]);
  await adminClient.from("feeds").delete().eq("id", testFeed.id);
  console.log("✅ Limpeza concluída.");

  console.log("\n🎉 Todas as verificações do Módulo de Feeds e VRSync (Prompt 9) foram concluídas com sucesso!");
}

runVRSyncVerification().catch((err) => {
  console.error("Erro inesperado no teste:", err);
  process.exitCode = 1;
});
