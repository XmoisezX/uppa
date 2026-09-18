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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error("ERRO: Credenciais ausentes em .env.local");
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTests() {
  console.log("=== INICIANDO TESTES DE AUTORIZAÇÃO E RLS (MODELO PROPERTIES) ===");

  // 1. Verificar catálogo de features
  console.log("\n[TESTE 1] Leitura pública do catálogo de features...");
  const { data: features, error: featuresError } = await anonClient
    .from("features")
    .select("id, name, slug, category");

  if (featuresError) {
    if (featuresError.message.includes("Could not find the table") || featuresError.message.includes("does not exist")) {
      console.warn("AVISO: A tabela 'properties' / 'features' ainda não foi aplicada no banco de dados.");
      console.warn("Execute a migration 'supabase/migrations/20260918000004_create_properties_model.sql' no SQL Editor do Supabase.");
      return;
    }
    console.error("FALHA ao ler catálogo de features:", featuresError.message);
  } else {
    console.log(`SUCESSO: Catálogo lido com ${features.length} características cadastradas.`);
  }

  // 2. Leitura anônima de properties (deve retornar apenas active)
  console.log("\n[TESTE 2] Consulta pública de imóveis...");
  const { data: properties, error: propsError } = await anonClient
    .from("properties")
    .select("id, title, status")
    .limit(5);

  if (propsError) {
    console.error("FALHA na consulta pública de imóveis:", propsError.message);
  } else {
    console.log(`SUCESSO: Consulta pública permitida! Retornou ${properties.length} imóveis.`);
  }

  // 3. Tentativa de inserção anônima em properties (deve FALHAR por RLS)
  console.log("\n[TESTE 3] Tentativa de inserção anônima em 'properties' (deve ser bloqueada)...");
  const { data: hackProp, error: hackError } = await anonClient
    .from("properties")
    .insert({
      agency_id: "00000000-0000-0000-0000-000000000000",
      external_id: "hack-ext-01",
      slug: "hack-slug",
      title: "Tentativa Invasão",
      transaction_type: "sale",
      property_type: "house",
    });

  if (hackError) {
    console.log("SUCESSO: Inserção anônima em properties bloqueada por RLS! Mensagem:", hackError.message);
  } else {
    console.error("FALHA GRAVE: Anônimo conseguiu inserir imóvel sem permissão:", hackProp);
  }

  // 4. Teste de ciclo de vida com Admin Client (Service Role)
  console.log("\n[TESTE 4] Verificação de integridade PostGIS e Triggers de Histórico via Service Role...");
  
  // Criar imobiliária temporária para o teste
  const testAgencySlug = `agency-test-${Date.now()}`;
  const { data: tempAgency, error: agencyErr } = await adminClient
    .from("agencies")
    .insert({
      name: "Agência Teste Imóvel",
      slug: testAgencySlug,
      creci: "00000-J",
      whatsapp: "53999991111",
      email: "temp@agencia.com",
    })
    .select()
    .single();

  if (agencyErr || !tempAgency) {
    console.error("FALHA ao criar agência de teste:", agencyErr?.message);
    return;
  }

  // Inserir imóvel com coordenadas e preço
  const testPropSlug = `apartamento-teste-${Date.now()}`;
  const { data: createdProp, error: propCreateErr } = await adminClient
    .from("properties")
    .insert({
      agency_id: tempAgency.id,
      external_id: `ext-${Date.now()}`,
      slug: testPropSlug,
      title: "Apartamento Teste PostGIS e Histórico",
      transaction_type: "sale",
      property_type: "apartment",
      status: "active",
      price: 500000,
      latitude: -31.7654,
      longitude: -52.3376,
    })
    .select()
    .single();

  if (propCreateErr || !createdProp) {
    console.error("FALHA ao criar imóvel de teste:", propCreateErr?.message);
  } else {
    console.log("SUCESSO: Imóvel criado com ID:", createdProp.id);

    // Verificar se histórico de preço foi gravado pelo trigger
    const { data: priceHist, error: histErr } = await adminClient
      .from("property_price_history")
      .select("*")
      .eq("property_id", createdProp.id);

    if (histErr || !priceHist || priceHist.length === 0) {
      console.warn("AVISO: Trigger de histórico de preço não gravou registro inicial:", histErr?.message);
    } else {
      console.log(`SUCESSO: Trigger de histórico gravou preço inicial de R$ ${priceHist[0].price}.`);
    }

    // Atualizar preço para R$ 475.000 (queda de preço)
    await adminClient
      .from("properties")
      .update({ price: 475000 })
      .eq("id", createdProp.id);

    const { data: updatedPriceHist } = await adminClient
      .from("property_price_history")
      .select("*")
      .eq("property_id", createdProp.id)
      .order("recorded_at", { ascending: false });

    if (updatedPriceHist && updatedPriceHist.length >= 2) {
      console.log(`SUCESSO: Segundo histórico gravado automaticamente! Novo preço: R$ ${updatedPriceHist[0].price}.`);
    }

    // Limpeza dos dados de teste
    await adminClient.from("properties").delete().eq("id", createdProp.id);
    await adminClient.from("agencies").delete().eq("id", tempAgency.id);
    console.log("SUCESSO: Dados de teste removidos com sucesso.");
  }

  console.log("\n=== FIM DOS TESTES DE PROPERTIES ===");
}

runTests().catch(console.error);
