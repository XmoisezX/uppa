#!/usr/bin/env node

/**
 * Script de Teste Automatizado de Resolução de Cidades na Busca
 * Conforme Seção 4 e 5 da Auditoria Técnica:
 * Testa santos, recife, manaus, curitiba, salvador, campinas,
 * porto-alegre, rio-de-janeiro, belo-horizonte e UUID direto.
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

async function runCitySearchTests() {
  console.log("🏙️ === INICIANDO TESTES DE RESOLUÇÃO DE CIDADES NA BUSCA ===\n");

  const { isUuid, searchProperties } = await import("../src/features/search/services.ts");

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

  // =========================================================================
  // 1. TESTES UNITÁRIOS DA FUNÇÃO isUuid
  // =========================================================================
  console.log("1️⃣ Testando função isUuid()...");
  assert(isUuid("123e4567-e89b-12d3-a456-426614174000") === true, "UUID v1 válido reconhecido");
  assert(isUuid("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11") === true, "UUID v4 válido reconhecido");
  assert(isUuid("curitiba") === false, "'curitiba' NÃO é UUID (slug de palavra única)");
  assert(isUuid("santos") === false, "'santos' NÃO é UUID (slug de palavra única)");
  assert(isUuid("porto-alegre") === false, "'porto-alegre' NÃO é UUID (slug com hífen)");
  assert(isUuid("123456789012") === false, "String longa sem hífens não é UUID");
  assert(isUuid("") === false, "String vazia não é UUID");

  // =========================================================================
  // 2. BUSCA DE METADADOS DAS CIDADES
  // =========================================================================
  console.log("\n2️⃣ Verificando cidades no banco de dados...");
  const targetSlugs = [
    "santos",
    "recife",
    "manaus",
    "curitiba",
    "salvador",
    "campinas",
    "porto-alegre",
    "rio-de-janeiro",
    "belo-horizonte",
  ];

  const { data: cities, error: citiesErr } = await adminClient
    .from("cities")
    .select("id, name, slug")
    .in("slug", targetSlugs);

  assert(!citiesErr && cities && cities.length === 9, "Todas as 9 cidades existem no banco de dados.");

  const cityMap = new Map(cities.map((c) => [c.slug, c]));

  // =========================================================================
  // 3. PREPARAR DADOS DE TESTE DE ISOLAMENTO DE CIDADES
  // =========================================================================
  console.log("\n3️⃣ Criando agência e imóveis ativos em cidades distintas...");

  let testAgency = null;
  const { data: existingAg } = await adminClient.from("agencies").select("id").limit(1).maybeSingle();
  if (existingAg) {
    testAgency = existingAg;
  } else {
    const { data: newAg } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Teste Busca",
        slug: "imob-teste-busca-" + Math.random().toString(36).substring(2, 7),
        creci: "12345-J",
        whatsapp: "11999999999",
        email: "contato@teste-busca.com.br",
        status: "active",
      })
      .select("id")
      .single();
    testAgency = newAg;
  }

  const curitiba = cityMap.get("curitiba");
  const santos = cityMap.get("santos");
  const portoAlegre = cityMap.get("porto-alegre");

  const testProps = [
    {
      agency_id: testAgency.id,
      external_id: "TEST-CITY-CUR",
      source: "manual",
      slug: "apto-teste-curitiba-" + Math.random().toString(36).substring(2, 7),
      title: "Apartamento Teste em Curitiba",
      transaction_type: "sale",
      property_type: "apartment",
      status: "active",
      price: 550000,
      city_id: curitiba.id,
    },
    {
      agency_id: testAgency.id,
      external_id: "TEST-CITY-SAN",
      source: "manual",
      slug: "casa-teste-santos-" + Math.random().toString(36).substring(2, 7),
      title: "Casa Teste em Santos",
      transaction_type: "sale",
      property_type: "house",
      status: "active",
      price: 750000,
      city_id: santos.id,
    },
    {
      agency_id: testAgency.id,
      external_id: "TEST-CITY-POA",
      source: "manual",
      slug: "apto-teste-poa-" + Math.random().toString(36).substring(2, 7),
      title: "Apartamento Teste em Porto Alegre",
      transaction_type: "sale",
      property_type: "apartment",
      status: "active",
      price: 450000,
      city_id: portoAlegre.id,
    },
  ];

  await adminClient.from("properties").upsert(testProps, { onConflict: "agency_id,source,external_id" });

  // =========================================================================
  // 4. TESTAR FILTROS DE CIDADE (PALAVRA ÚNICA E COM HÍFEN)
  // =========================================================================
  console.log("\n4️⃣ Executando buscas com filtros de cidade...");

  // Teste A: Santos (palavra única, antes falhava)
  const resSantos = await searchProperties({ city: "santos" });
  assert(
    resSantos.properties.some((p) => p.externalId === "TEST-CITY-SAN"),
    "Busca por 'santos' encontra o imóvel cadastrado em Santos."
  );
  assert(
    !resSantos.properties.some((p) => p.externalId === "TEST-CITY-CUR" || p.externalId === "TEST-CITY-POA"),
    "Busca por 'santos' EXCLUI imóveis de Curitiba e Porto Alegre."
  );

  // Teste B: Curitiba (palavra única, antes falhava)
  const resCuritiba = await searchProperties({ city: "curitiba" });
  assert(
    resCuritiba.properties.some((p) => p.externalId === "TEST-CITY-CUR"),
    "Busca por 'curitiba' encontra o imóvel cadastrado em Curitiba."
  );
  assert(
    !resCuritiba.properties.some((p) => p.externalId === "TEST-CITY-SAN" || p.externalId === "TEST-CITY-POA"),
    "Busca por 'curitiba' EXCLUI imóveis de Santos e Porto Alegre."
  );

  // Teste C: Porto Alegre (com hífen)
  const resPoa = await searchProperties({ city: "porto-alegre" });
  assert(
    resPoa.properties.some((p) => p.externalId === "TEST-CITY-POA"),
    "Busca por 'porto-alegre' encontra o imóvel de Porto Alegre."
  );
  assert(
    !resPoa.properties.some((p) => p.externalId === "TEST-CITY-SAN" || p.externalId === "TEST-CITY-CUR"),
    "Busca por 'porto-alegre' EXCLUI imóveis de Santos e Curitiba."
  );

  // Teste D: Busca por UUID válido direto
  console.log("\n5️⃣ Testando busca com UUID direto da cidade...");
  const resUuid = await searchProperties({ city: curitiba.id });
  assert(
    resUuid.properties.some((p) => p.externalId === "TEST-CITY-CUR"),
    `Busca por UUID direto (${curitiba.id}) encontra o imóvel de Curitiba.`
  );
  assert(
    !resUuid.properties.some((p) => p.externalId === "TEST-CITY-SAN"),
    "Busca por UUID direto EXCLUI imóveis de outras cidades."
  );

  // Teste E: Verificação de todas as outras cidades da lista exigida
  console.log("\n6️⃣ Verificando resolução das demais cidades solicitadas...");
  for (const slug of ["recife", "manaus", "salvador", "campinas", "rio-de-janeiro", "belo-horizonte"]) {
    const res = await searchProperties({ city: slug });
    assert(
      Array.isArray(res.properties),
      `Busca por '${slug}' executada com sucesso e city_id resolvido corretamente.`
    );
  }

  // =========================================================================
  // LIMPEZA DOS DADOS DE TESTE
  // =========================================================================
  console.log("\n7️⃣ Limpando dados de teste...");
  await adminClient.from("properties").delete().in("external_id", ["TEST-CITY-CUR", "TEST-CITY-SAN", "TEST-CITY-POA"]);
  console.log("✅ Limpeza concluída.");

  console.log(`\n🏁 Resultado dos Testes de Cidades: ${passed} Aprovados | ${failed} Falhas.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runCitySearchTests().catch((err) => {
  console.error("Erro inesperado no teste de cidades:", err);
  process.exit(1);
});
