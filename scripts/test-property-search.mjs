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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error("ERRO: Variáveis de ambiente Supabase ausentes.");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Projeção explícita de colunas (estritamente sem SELECT *)
const EXPLICIT_PROJECTION = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  price,
  rent_price,
  usable_area,
  bedrooms,
  bathrooms,
  parking_spaces,
  financiable,
  furnished,
  accepts_exchange,
  latitude,
  longitude,
  city:cities!city_id (id, name, slug),
  state:states!state_id (id, code, name),
  agency:agencies!agency_id (id, name, slug, logo_url, creci),
  media:property_media (id, url, is_cover, position)
`;

async function runSearchTests() {
  console.log("=== INICIANDO TESTES DO MÓDULO DE BUSCA (PROMPT 7) ===");

  let testAgencyId = null;
  const createdPropertyIds = [];

  try {
    // 1. Criar imobiliária de teste
    const { data: agency, error: agencyErr } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Busca Teste",
        slug: `busca-teste-${Date.now()}`,
        creci: "99887-J",
        whatsapp: "11977776666",
        email: "busca@teste.com.br",
        status: "active",
      })
      .select()
      .single();

    if (agencyErr || !agency) {
      throw new Error(`Falha ao criar imobiliária: ${agencyErr?.message}`);
    }
    testAgencyId = agency.id;
    console.log(`[TESTE 1] Imobiliária de teste criada: ${testAgencyId}`);

    // 2. Criar 3 imóveis com perfis distintos
    // Imóvel A: Venda, Apartamento, R$ 550.000, 2 Quartos, Financiável
    const { data: propA } = await adminClient
      .from("properties")
      .insert({
        agency_id: testAgencyId,
        external_id: `SRCH-A-${Date.now()}`,
        source: "manual",
        slug: `apto-teste-a-${Date.now()}`,
        title: "Apartamento Teste A - 2 Quartos",
        transaction_type: "sale",
        property_type: "apartment",
        status: "active",
        price: 550000,
        bedrooms: 2,
        bathrooms: 2,
        parking_spaces: 1,
        usable_area: 75,
        financiable: true,
        furnished: false,
        accepts_exchange: false,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    createdPropertyIds.push(propA.id);

    // Imóvel B: Venda, Casa, R$ 1.200.000, 4 Quartos, Aceita Permuta
    const { data: propB } = await adminClient
      .from("properties")
      .insert({
        agency_id: testAgencyId,
        external_id: `SRCH-B-${Date.now()}`,
        source: "manual",
        slug: `casa-teste-b-${Date.now()}`,
        title: "Casa Teste B - 4 Quartos Luxo",
        transaction_type: "sale",
        property_type: "house",
        status: "active",
        price: 1200000,
        bedrooms: 4,
        bathrooms: 4,
        parking_spaces: 3,
        usable_area: 250,
        financiable: true,
        furnished: true,
        accepts_exchange: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    createdPropertyIds.push(propB.id);

    // Imóvel C: Locação, Studio, R$ 3.200/mês, 1 Quarto, Mobiliado
    const { data: propC } = await adminClient
      .from("properties")
      .insert({
        agency_id: testAgencyId,
        external_id: `SRCH-C-${Date.now()}`,
        source: "manual",
        slug: `studio-teste-c-${Date.now()}`,
        title: "Studio Teste C - Mobiliado",
        transaction_type: "rent",
        property_type: "studio",
        status: "active",
        rent_price: 3200,
        bedrooms: 1,
        bathrooms: 1,
        parking_spaces: 1,
        usable_area: 38,
        financiable: false,
        furnished: true,
        accepts_exchange: false,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    createdPropertyIds.push(propC.id);

    console.log(`[TESTE 2] 3 Imóveis de teste cadastrados para a imobiliária.`);

    // 3. Teste do filtro: Finalidade (transaction_type = 'sale')
    console.log("[TESTE 3] Testando filtro transaction_type = 'sale'...");
    const { data: saleResults } = await anonClient
      .from("properties")
      .select(EXPLICIT_PROJECTION)
      .eq("status", "active")
      .eq("agency_id", testAgencyId)
      .in("transaction_type", ["sale", "sale_or_rent"]);

    if (!saleResults || saleResults.length !== 2) {
      throw new Error(`Esperado 2 imóveis de venda, retornou ${saleResults?.length}`);
    }
    console.log(`SUCESSO: Filtro de venda retornou exatamente ${saleResults.length} imóveis (A e B).`);

    // 4. Teste do filtro: Finalidade (transaction_type = 'rent')
    console.log("[TESTE 4] Testando filtro transaction_type = 'rent'...");
    const { data: rentResults } = await anonClient
      .from("properties")
      .select(EXPLICIT_PROJECTION)
      .eq("status", "active")
      .eq("agency_id", testAgencyId)
      .in("transaction_type", ["rent", "sale_or_rent"]);

    if (!rentResults || rentResults.length !== 1) {
      throw new Error(`Esperado 1 imóvel de locação, retornou ${rentResults?.length}`);
    }
    console.log(`SUCESSO: Filtro de locação retornou exatamente ${rentResults.length} imóvel (C).`);

    // 5. Teste do filtro: Quartos (bedrooms >= 3)
    console.log("[TESTE 5] Testando filtro bedrooms >= 3...");
    const { data: bedroomsResults } = await anonClient
      .from("properties")
      .select(EXPLICIT_PROJECTION)
      .eq("status", "active")
      .eq("agency_id", testAgencyId)
      .gte("bedrooms", 3);

    if (!bedroomsResults || bedroomsResults.length !== 1 || bedroomsResults[0].id !== propB.id) {
      throw new Error(`Esperado apenas o imóvel B (4 quartos), retornou ${bedroomsResults?.length}`);
    }
    console.log(`SUCESSO: Filtro de dormitórios >= 3 retornou apenas a Casa B (${bedroomsResults[0].bedrooms} qtos).`);

    // 6. Teste do filtro: Faixa de Preço (price <= 700.000)
    console.log("[TESTE 6] Testando filtro price <= 700.000...");
    const { data: priceResults } = await anonClient
      .from("properties")
      .select(EXPLICIT_PROJECTION)
      .eq("status", "active")
      .eq("agency_id", testAgencyId)
      .lte("price", 700000);

    if (!priceResults || priceResults.length !== 1 || priceResults[0].id !== propA.id) {
      throw new Error(`Esperado apenas o imóvel A (R$ 550k), retornou ${priceResults?.length}`);
    }
    console.log(`SUCESSO: Filtro de preço <= 700k retornou apenas o Imóvel A (R$ ${priceResults[0].price}).`);

    // 7. Teste do filtro booleano: Aceita Permuta (accepts_exchange = true)
    console.log("[TESTE 7] Testando filtro accepts_exchange = true...");
    const { data: exchangeResults } = await anonClient
      .from("properties")
      .select(EXPLICIT_PROJECTION)
      .eq("status", "active")
      .eq("agency_id", testAgencyId)
      .eq("accepts_exchange", true);

    if (!exchangeResults || exchangeResults.length !== 1 || exchangeResults[0].id !== propB.id) {
      throw new Error(`Esperado apenas o imóvel B, retornou ${exchangeResults?.length}`);
    }
    console.log(`SUCESSO: Filtro de permuta retornou apenas o Imóvel B.`);

    // 8. Teste de Paginação com range
    console.log("[TESTE 8] Testando paginação com limite 1...");
    const { data: pageResults, count } = await anonClient
      .from("properties")
      .select(EXPLICIT_PROJECTION, { count: "exact" })
      .eq("status", "active")
      .eq("agency_id", testAgencyId)
      .range(0, 0); // apenas o primeiro registro

    if (!pageResults || pageResults.length !== 1 || count !== 3) {
      throw new Error(`Falha na paginação: total esperado 3, página esperada 1 item. Retornou count=${count}, length=${pageResults?.length}`);
    }
    console.log(`SUCESSO: Paginação confirmada! Total no banco: ${count}, itens retornados: ${pageResults.length}.`);

  } finally {
    // Limpeza
    for (const pid of createdPropertyIds) {
      await adminClient.from("properties").delete().eq("id", pid);
    }
    if (testAgencyId) {
      await adminClient.from("agencies").delete().eq("id", testAgencyId);
    }
    console.log("=== LIMPEZA DE DADOS CONCLUÍDA ===");
  }

  console.log("=== TODOS OS TESTES DO MÓDULO DE BUSCA FORAM APROVADOS! ===");
}

runSearchTests().catch((err) => {
  console.error("ERRO NOS TESTES DE BUSCA:", err);
  process.exit(1);
});
