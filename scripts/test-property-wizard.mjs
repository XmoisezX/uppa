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

async function runWizardTests() {
  console.log("=== INICIANDO TESTES DO WIZARD DE CADASTRO DE IMÓVEL (PROMPT 5) ===");

  let testAgencyId = null;
  let testPropertyId = null;
  let testMediaId1 = null;
  let testMediaId2 = null;

  try {
    // 1. Obter ou criar uma imobiliária de teste
    const { data: agency, error: agencyErr } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Wizard Teste",
        slug: `wizard-teste-${Date.now()}`,
        creci: "12345-J",
        whatsapp: "11999998888",
        email: "teste@wizard.com.br",
        status: "active",
      })
      .select()
      .single();

    if (agencyErr || !agency) {
      throw new Error(`Falha ao criar imobiliária de teste: ${agencyErr?.message}`);
    }
    testAgencyId = agency.id;
    console.log(`[TESTE 1] Imobiliária de teste criada: ${testAgencyId}`);

    // 2. Inicializar rascunho de imóvel (Draft)
    const externalId = `WIZ-${Date.now().toString().slice(-6)}`;
    const { data: prop, error: propErr } = await adminClient
      .from("properties")
      .insert({
        agency_id: testAgencyId,
        external_id: externalId,
        source: "manual",
        slug: `rascunho-${externalId.toLowerCase()}`,
        title: "Novo Imóvel (Rascunho)",
        transaction_type: "sale",
        property_type: "apartment",
        status: "draft",
      })
      .select()
      .single();

    if (propErr || !prop) {
      throw new Error(`Falha ao criar rascunho de imóvel: ${propErr?.message}`);
    }
    testPropertyId = prop.id;
    console.log(`[TESTE 2] Rascunho inicial criado com sucesso: ${testPropertyId} (Status: ${prop.status})`);

    // 3. Simular Autosave (Etapas 1, 2, 3, 6)
    console.log("[TESTE 3] Simulando Autosave de dados parciais...");
    const { data: updatedProp, error: updateErr } = await adminClient
      .from("properties")
      .update({
        title: "Apartamento Luxo 3 Suítes Vista Mar",
        price: 850000,
        condominium_fee: 650,
        bedrooms: 3,
        suites: 3,
        bathrooms: 4,
        parking_spaces: 2,
        usable_area: 120,
        street: "Av. Beira Mar",
        number: "500",
        latitude: -27.5954,
        longitude: -48.5480,
      })
      .eq("id", testPropertyId)
      .select()
      .single();

    if (updateErr || !updatedProp) {
      throw new Error(`Falha no autosave: ${updateErr?.message}`);
    }
    console.log(`SUCESSO: Imóvel atualizado via autosave! Preço: R$ ${updatedProp.price}, Quartos: ${updatedProp.bedrooms}`);

    // 4. Testar Etapa 4: Vínculo de Features
    console.log("[TESTE 4] Vinculando comodidades (features)...");
    const { data: features } = await adminClient.from("features").select("id").limit(3);
    if (features && features.length > 0) {
      const featureRows = features.map((f) => ({
        property_id: testPropertyId,
        feature_id: f.id,
      }));
      const { error: featErr } = await adminClient.from("property_features").insert(featureRows);
      if (featErr) throw new Error(`Falha ao vincular features: ${featErr.message}`);
      console.log(`SUCESSO: ${features.length} comodidades vinculadas ao imóvel.`);
    }

    // 5. Testar Etapa 5: Adição de Mídias e Capa
    console.log("[TESTE 5] Adicionando fotos e definindo capa...");
    const { data: m1, error: m1Err } = await adminClient
      .from("property_media")
      .insert({
        property_id: testPropertyId,
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
        is_cover: true,
        position: 0,
      })
      .select()
      .single();
    if (m1Err) throw new Error(`Falha ao adicionar mídia 1: ${m1Err.message}`);
    testMediaId1 = m1.id;

    const { data: m2, error: m2Err } = await adminClient
      .from("property_media")
      .insert({
        property_id: testPropertyId,
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
        is_cover: false,
        position: 1,
      })
      .select()
      .single();
    if (m2Err) throw new Error(`Falha ao adicionar mídia 2: ${m2Err.message}`);
    testMediaId2 = m2.id;

    console.log(`SUCESSO: 2 mídias adicionadas com capa principal definida (ID: ${testMediaId1})`);

    // 6. Testar RLS: Usuário anônimo NÃO pode ver o rascunho
    console.log("[TESTE 6] Verificando isolamento: Anônimo não pode ler imóvel em status 'draft'...");
    const { data: anonView } = await anonClient
      .from("properties")
      .select("id")
      .eq("id", testPropertyId);

    if (anonView && anonView.length > 0) {
      throw new Error("FALHA DE SEGURANÇA: Usuário anônimo conseguiu visualizar imóvel com status draft!");
    }
    console.log("SUCESSO: Imóvel rascunho permanece invisível publicamente!");

    // 7. Testar Etapa 7: Publicação (transição draft -> active)
    console.log("[TESTE 7] Publicando imóvel (status -> 'active')...");
    const { data: published, error: pubErr } = await adminClient
      .from("properties")
      .update({
        status: "active",
        published_at: new Date().toISOString(),
      })
      .eq("id", testPropertyId)
      .select()
      .single();

    if (pubErr || !published || published.status !== "active") {
      throw new Error(`Falha na publicação: ${pubErr?.message}`);
    }
    console.log(`SUCESSO: Imóvel publicado com sucesso! Data de publicação: ${published.published_at}`);

    // 8. Agora, como está ativo, público DEVE conseguir ler
    console.log("[TESTE 8] Verificando visibilidade pública pós-publicação...");
    const { data: publicRead, error: pubReadErr } = await anonClient
      .from("properties")
      .select("id, title, status, price")
      .eq("id", testPropertyId)
      .single();

    if (pubReadErr || !publicRead) {
      throw new Error(`FALHA: Imóvel ativo não foi retornado na consulta pública: ${pubReadErr?.message}`);
    }
    console.log(`SUCESSO: Consulta pública confirmada para imóvel ativo: "${publicRead.title}"`);

  } finally {
    // Limpeza dos dados de teste
    if (testPropertyId) {
      await adminClient.from("properties").delete().eq("id", testPropertyId);
    }
    if (testAgencyId) {
      await adminClient.from("agencies").delete().eq("id", testAgencyId);
    }
    console.log("=== LIMPEZA DE DADOS DE TESTE CONCLUÍDA ===");
  }

  console.log("=== TODOS OS TESTES DO WIZARD FORAM EXECUTADOS COM SUCESSO! ===");
}

runWizardTests().catch((err) => {
  console.error("ERRO NOS TESTES:", err);
  process.exit(1);
});
