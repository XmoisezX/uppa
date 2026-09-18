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
  console.log("=== INICIANDO TESTES DE AUTORIZAÇÃO E RLS (BASE GEOGRÁFICA) ===");

  // 1. Leitura com cliente anônimo (deve ser permitida)
  console.log("\n[TESTE 1] Leitura anônima em 'states'...");
  const { data: states, error: readError } = await anonClient
    .from("states")
    .select("id, code, name, slug")
    .limit(5);

  if (readError) {
    if (readError.message.includes("Could not find the table")) {
      console.warn("AVISO: A tabela 'states' ainda não foi aplicada no banco de dados.");
      console.warn("Execute as migrations 'supabase/migrations/20260918000001_create_geographic_base.sql' e '20260918000002_seed_brazilian_states.sql' no SQL Editor do Supabase.");
      return;
    }
    console.error("FALHA: Leitura pública bloqueada indevidamente:", readError.message);
  } else {
    console.log(`SUCESSO: Leitura anônima permitida! Retornou ${states.length} registros.`);
  }

  // 2. Tentativa de inserção com cliente anônimo (deve ser BLOQUEADA por RLS)
  console.log("\n[TESTE 2] Tentativa de inserção com cliente anônimo (deve falhar)...");
  const { data: hackData, error: hackError } = await anonClient
    .from("states")
    .insert({
      name: "Estado Invasor",
      code: "XX",
      ibge_code: 9999,
      slug: "estado-invasor",
    });

  if (hackError) {
    console.log("SUCESSO: Inserção anônima bloqueada por RLS! Mensagem:", hackError.message);
  } else {
    console.error("FALHA GRAVE: Cliente anônimo conseguiu inserir dados! RLS desprotegido:", hackData);
  }

  // 3. Consulta com Admin Client (Service Role)
  console.log("\n[TESTE 3] Verificação administrativa via Service Role...");
  const { count, error: adminCountError } = await adminClient
    .from("states")
    .select("*", { count: "exact", head: true });

  if (adminCountError) {
    console.error("FALHA Admin:", adminCountError.message);
  } else {
    console.log(`SUCESSO Admin: Total de estados cadastrados no banco: ${count}`);
  }

  console.log("\n=== FIM DOS TESTES ===");
}

runTests().catch(console.error);
