#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// 1. Carregar variáveis de .env.local
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
  console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios em .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateSlug(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function importStateCities(uf) {
  const normalizedUf = uf.toUpperCase().trim();
  console.log(`\nConsultando estado ${normalizedUf} no banco de dados...`);

  const { data: stateData, error: stateError } = await supabase
    .from("states")
    .select("id, name, code")
    .eq("code", normalizedUf)
    .single();

  if (stateError || !stateData) {
    console.error(`Estado ${normalizedUf} não encontrado. Execute a migration de seed de estados primeiro.`);
    return false;
  }

  console.log(`Buscando municípios de ${stateData.name} (${normalizedUf}) na API do IBGE...`);
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedUf}/municipios`);
  
  if (!res.ok) {
    console.error(`Erro na API do IBGE: HTTP ${res.status}`);
    return false;
  }

  const cities = await res.json();
  console.log(`Encontrados ${cities.length} municípios no IBGE.`);

  const batchSize = 100;
  let totalImported = 0;

  for (let i = 0; i < cities.length; i += batchSize) {
    const chunk = cities.slice(i, i + batchSize);
    const records = chunk.map((c) => ({
      state_id: stateData.id,
      name: c.nome.trim(),
      ibge_code: c.id,
      slug: generateSlug(c.nome),
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("cities")
      .upsert(records, { onConflict: "state_id,slug" });

    if (insertError) {
      console.error(`Erro ao inserir lote ${i} - ${i + chunk.length}:`, insertError.message);
    } else {
      totalImported += records.length;
    }
  }

  console.log(`Sucesso: ${totalImported} municípios importados/atualizados para ${normalizedUf}!`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const ufIndex = args.indexOf("--uf");
  const isAll = args.includes("--all");

  if (ufIndex !== -1 && args[ufIndex + 1]) {
    await importStateCities(args[ufIndex + 1]);
  } else if (isAll) {
    console.log("Importando todos os municípios do Brasil...");
    const { data: allStates, error } = await supabase.from("states").select("code").order("code");
    if (error || !allStates) {
      console.error("Erro ao listar estados:", error?.message);
      process.exit(1);
    }
    for (const s of allStates) {
      await importStateCities(s.code);
    }
  } else {
    console.log("Uso:");
    console.log("  node scripts/import-ibge-cities.mjs --uf RS    (Importa municípios de um estado específico)");
    console.log("  node scripts/import-ibge-cities.mjs --all      (Importa todos os municípios do Brasil)");
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
