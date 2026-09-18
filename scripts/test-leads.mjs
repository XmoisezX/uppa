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

async function runLeadsVerification() {
  console.log("🚀 Iniciando verificação do Sistema de Leads (Prompt 8)...\n");

  // 1. Verificar se as tabelas existem
  console.log("1️⃣ Verificando existência das tabelas 'leads' e 'lead_events'...");
  const { error: leadsTableErr } = await adminClient.from("leads").select("id").limit(1);
  const { error: eventsTableErr } = await adminClient.from("lead_events").select("id").limit(1);

  if (leadsTableErr || eventsTableErr) {
    console.error("❌ Tabelas de leads não encontradas no banco de dados.");
    process.exit(1);
  }
  console.log("✅ Tabelas 'leads' e 'lead_events' ativas no banco de dados.");

  // 2. Buscar ou criar uma imobiliária e um imóvel ativo para o teste
  console.log("\n2️⃣ Buscando imobiliária e imóvel existente para teste...");
  let testAgency = null;
  const { data: agencies } = await adminClient.from("agencies").select("id").limit(1);
  if (agencies && agencies.length > 0) {
    testAgency = agencies[0];
  } else {
    const { data: newAg } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Teste Leads",
        slug: "imob-leads-" + Math.random().toString(36).substring(2, 7),
        creci: "12345-J",
        whatsapp: "11999999999",
        email: "contato@test-leads.com.br",
        status: "active",
      })
      .select("id")
      .single();
    testAgency = newAg;
  }

  // Criar imóvel ativo temporário para vincular o lead
  const { data: targetProperty, error: propErr } = await adminClient
    .from("properties")
    .insert({
      agency_id: testAgency.id,
      external_id: "TEST-LEAD-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      source: "manual",
      slug: "imovel-teste-leads-" + Math.random().toString(36).substring(2, 7),
      title: "Imóvel Teste Leads WhatsApp",
      transaction_type: "sale",
      property_type: "apartment",
      status: "active",
      price: 600000,
    })
    .select("id, agency_id, title, slug")
    .single();

  if (propErr || !targetProperty) {
    console.error("❌ Falha ao criar imóvel para teste de leads:", propErr?.message);
    process.exit(1);
  }

  console.log(`✅ Imóvel alvo: "${targetProperty.title}" (ID: ${targetProperty.id}) | Imobiliária: ${targetProperty.agency_id}`);

  // 3. Testar inserção pública (anon) de lead via WhatsApp com parâmetros UTM
  // Importante: RLS permite INSERT para public, mas bloqueia SELECT (leads não são públicos!)
  console.log("\n3️⃣ Testando inserção pública (anon / visitante) de Lead com UTMs...");
  const testLeadId = crypto.randomUUID();
  const testLeadData = {
    id: testLeadId,
    property_id: targetProperty.id,
    agency_id: targetProperty.agency_id,
    source: "whatsapp",
    message: "Olá! Gostaria de agendar uma visita para este imóvel.",
    utm_source: "google_ads",
    utm_medium: "cpc",
    utm_campaign: "campanha_promocional_2026",
    utm_content: "anuncio_banner_topo",
    session_id: "test_sess_" + Math.random().toString(36).substring(2, 8),
  };

  const { error: insertLeadErr } = await anonClient
    .from("leads")
    .insert(testLeadData);

  if (insertLeadErr) {
    console.error("❌ Falha na inserção pública de lead:", insertLeadErr?.message);
    process.exit(1);
  }

  console.log(`✅ Lead inserido com sucesso via cliente anônimo (ID: ${testLeadId})`);

  // 4. Testar inserção pública do evento de lead (lead_events)
  console.log("\n4️⃣ Testando inserção de evento de tracking em lead_events...");
  const testEventId = crypto.randomUUID();
  const { error: insertEventErr } = await anonClient
    .from("lead_events")
    .insert({
      id: testEventId,
      lead_id: testLeadId,
      event: "created",
      metadata: {
        device: "desktop",
        browser: "automated-test",
        source: "whatsapp",
      },
    });

  if (insertEventErr) {
    console.error("❌ Falha ao inserir evento em lead_events:", insertEventErr?.message);
    process.exit(1);
  }
  console.log(`✅ Evento registrado com sucesso em lead_events (ID: ${testEventId})`);

  // 5. Teste de segurança RLS: usuário anônimo NÃO deve conseguir ler leads da imobiliária
  console.log("\n5️⃣ Testando RLS: leitor anônimo NÃO pode listar leads...");
  const { data: anonReadLeads } = await anonClient
    .from("leads")
    .select("id, message")
    .eq("id", testLeadId);

  if (anonReadLeads && anonReadLeads.length > 0) {
    console.error("❌ Falha de segurança RLS: Usuário anônimo conseguiu ler os dados do lead!", anonReadLeads);
    process.exit(1);
  } else {
    console.log("✅ RLS bloqueou leitura pública de leads com sucesso (0 registros retornados).");
  }

  // 6. Teste de isolamento: usuário anônimo NÃO pode alterar ou deletar leads
  console.log("\n6️⃣ Testando RLS: leitor anônimo NÃO pode alterar status ou mensagem de leads...");
  await anonClient
    .from("leads")
    .update({ message: "Mensagem hackeada" })
    .eq("id", testLeadId);

  const { data: checkLead } = await adminClient
    .from("leads")
    .select("message")
    .eq("id", testLeadId)
    .single();

  if (checkLead?.message === "Mensagem hackeada") {
    console.error("❌ Falha de segurança RLS: Anônimo conseguiu alterar o lead!");
    process.exit(1);
  } else {
    console.log("✅ RLS impediu com sucesso a alteração do lead por visitante.");
  }

  // 7. Teste de persistência via admin
  console.log("\n7️⃣ Confirmando persistência completa com dados UTM no banco...");
  const { data: persistedLead, error: fetchErr } = await adminClient
    .from("leads")
    .select("*, events:lead_events (*)")
    .eq("id", testLeadId)
    .single();

  if (fetchErr || !persistedLead) {
    console.error("❌ Falha ao consultar lead via adminClient:", fetchErr?.message);
    process.exit(1);
  }

  console.log("✅ Lead recuperado via admin com integridade:");
  console.log(`   - ID: ${persistedLead.id}`);
  console.log(`   - Source: ${persistedLead.source}`);
  console.log(`   - UTM Campaign: ${persistedLead.utm_campaign}`);
  console.log(`   - Total de Eventos vinculados: ${persistedLead.events?.length}`);

  // 8. Limpeza de dados de teste
  console.log("\n8️⃣ Limpando dados de teste...");
  await adminClient.from("leads").delete().eq("id", testLeadId);
  await adminClient.from("properties").delete().eq("id", targetProperty.id);
  console.log("✅ Limpeza concluída.");

  console.log("\n🎉 Todas as verificações do Sistema de Leads (Prompt 8) foram concluídas com sucesso!");
}

runLeadsVerification().catch((err) => {
  console.error("Erro inesperado no teste de leads:", err);
  process.exit(1);
});
