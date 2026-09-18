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
  console.log("=== INICIANDO TESTES DE AUTORIZAÇÃO E RLS (IMOBILIÁRIAS & MEMBROS) ===");

  // 1. Verificar se a tabela agencies existe
  console.log("\n[TESTE 1] Leitura pública de imobiliárias ativas...");
  const { data: agencies, error: readError } = await anonClient
    .from("agencies")
    .select("id, name, slug, status")
    .eq("status", "active")
    .limit(5);

  if (readError) {
    if (readError.message.includes("Could not find the table") || readError.message.includes("does not exist")) {
      console.warn("AVISO: A tabela 'agencies' ainda não foi aplicada no banco de dados.");
      console.warn("Execute a migration 'supabase/migrations/20260918000003_create_agencies_and_members.sql' no SQL Editor do Supabase.");
      return;
    }
    console.error("FALHA: Leitura pública bloqueada indevidamente:", readError.message);
  } else {
    console.log(`SUCESSO: Leitura pública permitida! Retornou ${agencies.length} imobiliárias ativas.`);
  }

  // 2. Tentativa de inserção anônima em agencies (deve ser BLOQUEADA)
  console.log("\n[TESTE 2] Tentativa de inserção por anônimo em 'agencies' (deve falhar)...");
  const { data: hackData, error: hackError } = await anonClient
    .from("agencies")
    .insert({
      name: "Imobiliária Invasora",
      slug: "imobiliaria-invasora",
      creci: "00000-J",
      whatsapp: "53999999999",
      email: "hacker@invasao.com",
    });

  if (hackError) {
    console.log("SUCESSO: Inserção anônima bloqueada por RLS! Mensagem:", hackError.message);
  } else {
    console.error("FALHA GRAVE: Anônimo conseguiu inserir imobiliária sem login:", hackData);
  }

  // 3. Tentativa de inserção anônima em agency_members (deve ser BLOQUEADA)
  console.log("\n[TESTE 3] Tentativa de inserção por anônimo em 'agency_members' (deve falhar)...");
  const { data: memberHack, error: memberHackError } = await anonClient
    .from("agency_members")
    .insert({
      agency_id: "00000000-0000-0000-0000-000000000000",
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "owner",
    });

  if (memberHackError) {
    console.log("SUCESSO: Inserção anônima em agency_members bloqueada por RLS! Mensagem:", memberHackError.message);
  } else {
    console.error("FALHA GRAVE: Anônimo conseguiu inserir membro sem autorização:", memberHack);
  }

  // 4. Teste de inserção e consulta administrativa via Service Role
  console.log("\n[TESTE 4] Verificação de integridade via Service Role...");
  const testSlug = `teste-imob-${Date.now()}`;
  const { data: createdAgency, error: createError } = await adminClient
    .from("agencies")
    .insert({
      name: "Imobiliária Teste Admin",
      slug: testSlug,
      creci: "99999-J",
      whatsapp: "53988887777",
      email: "admin@testeimob.com.br",
      status: "active",
    })
    .select()
    .single();

  if (createError) {
    console.error("FALHA Admin ao criar imobiliária de teste:", createError.message);
  } else {
    console.log("SUCESSO Admin: Imobiliária criada com ID:", createdAgency.id);

    // Limpeza do registro de teste
    await adminClient.from("agencies").delete().eq("id", createdAgency.id);
    console.log("SUCESSO: Registro de teste removido com segurança.");
  }

  console.log("\n=== FIM DOS TESTES DE IMOBILIÁRIAS ===");
}

runTests().catch(console.error);
