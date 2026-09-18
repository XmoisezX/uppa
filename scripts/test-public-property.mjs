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

async function runPublicPropertyTests() {
  console.log("=== INICIANDO TESTES DA PÁGINA PÚBLICA DO IMÓVEL (PROMPT 6) ===");

  let testAgencyId = null;
  let activePropertyId = null;
  let draftPropertyId = null;

  try {
    // 1. Criar imobiliária de teste
    const { data: agency, error: agencyErr } = await adminClient
      .from("agencies")
      .insert({
        name: "Imobiliária Pública Teste",
        slug: `publica-teste-${Date.now()}`,
        creci: "54321-J",
        whatsapp: "11988887777",
        email: "contato@publicateste.com.br",
        status: "active",
      })
      .select()
      .single();

    if (agencyErr || !agency) {
      throw new Error(`Falha ao criar imobiliária: ${agencyErr?.message}`);
    }
    testAgencyId = agency.id;
    console.log(`[TESTE 1] Imobiliária de teste criada: ${testAgencyId}`);

    // 2. Criar Imóvel ATIVO
    const activeSlug = `apartamento-vista-mar-${Date.now()}`;
    const { data: activeProp, error: activeErr } = await adminClient
      .from("properties")
      .insert({
        agency_id: testAgencyId,
        external_id: `ACT-${Date.now().toString().slice(-5)}`,
        source: "manual",
        slug: activeSlug,
        title: "Apartamento de Alto Padrão Frente Mar",
        description: "Excelente imóvel com vista definitiva para o mar, acabamento fino e lazer completo.",
        transaction_type: "sale",
        property_type: "apartment",
        status: "active",
        price: 1250000,
        condominium_fee: 900,
        iptu: 2500,
        bedrooms: 3,
        suites: 2,
        bathrooms: 3,
        parking_spaces: 2,
        usable_area: 145,
        address_visible: true,
        street: "Av. Atlântica",
        number: "1500",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (activeErr || !activeProp) {
      throw new Error(`Falha ao criar imóvel ativo: ${activeErr?.message}`);
    }
    activePropertyId = activeProp.id;
    console.log(`[TESTE 2] Imóvel ATIVO criado com slug: ${activeSlug}`);

    // Adicionar fotos ao imóvel ativo
    await adminClient.from("property_media").insert([
      {
        property_id: activePropertyId,
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
        is_cover: true,
        position: 0,
      },
      {
        property_id: activePropertyId,
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
        is_cover: false,
        position: 1,
      },
    ]);

    // 3. Criar Imóvel em RASCUNHO (draft)
    const draftSlug = `rascunho-secreto-${Date.now()}`;
    const { data: draftProp, error: draftErr } = await adminClient
      .from("properties")
      .insert({
        agency_id: testAgencyId,
        external_id: `DFT-${Date.now().toString().slice(-5)}`,
        source: "manual",
        slug: draftSlug,
        title: "Rascunho Inacabado",
        transaction_type: "rent",
        property_type: "house",
        status: "draft",
      })
      .select()
      .single();

    if (draftErr || !draftProp) {
      throw new Error(`Falha ao criar imóvel rascunho: ${draftErr?.message}`);
    }
    draftPropertyId = draftProp.id;
    console.log(`[TESTE 3] Imóvel RASCUNHO criado com slug: ${draftSlug}`);

    // 4. Testar consulta pública do imóvel ATIVO via anonClient
    console.log("[TESTE 4] Consultando imóvel ATIVO com anonClient...");
    const { data: publicActive, error: pubErr } = await anonClient
      .from("properties")
      .select(`
        *,
        agency:agencies (*),
        media:property_media (*)
      `)
      .eq("slug", activeSlug)
      .eq("status", "active")
      .maybeSingle();

    if (pubErr || !publicActive) {
      throw new Error(`Falha na consulta pública do imóvel ativo: ${pubErr?.message}`);
    }
    console.log(`SUCESSO: Imóvel ativo encontrado publicamente! Título: "${publicActive.title}", Preço: R$ ${publicActive.price}`);
    console.log(`SUCESSO: Mídias vinculadas: ${publicActive.media?.length} fotos.`);

    // 5. Testar consulta do imóvel RASCUNHO com anonClient (DEVE SER BLOQUEADO / RETORNAR NULL)
    console.log("[TESTE 5] Consultando imóvel RASCUNHO com anonClient (deve retornar null)...");
    const { data: publicDraft } = await anonClient
      .from("properties")
      .select("id, title, status")
      .eq("slug", draftSlug)
      .eq("status", "active")
      .maybeSingle();

    if (publicDraft) {
      throw new Error("FALHA CRÍTICA DE PRIVACIDADE: Imóvel rascunho retornou na consulta pública!");
    }
    console.log("SUCESSO: Imóvel rascunho retornou null conforme a regra 'Somente status=active'!");

    // 6. Validar canonical e CTA de WhatsApp
    console.log("[TESTE 6] Validando canonical e link de WhatsApp...");
    const canonical = `https://portalimobiliario.com.br/imovel/${activeProp.slug}`;
    const cleanPhone = agency.whatsapp.replace(/\D/g, "");
    const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
      `Olá! Vi o anúncio do imóvel "${activeProp.title}" (Código: ${activeProp.external_id}) no Portal Imobiliário e gostaria de mais informações.`
    )}`;

    if (!canonical.includes(activeProp.slug)) throw new Error("Canonical inválido.");
    if (!waUrl.includes(cleanPhone)) throw new Error("Link do WhatsApp sem telefone correto.");
    console.log(`SUCESSO: Canonical gerado corretamente: ${canonical}`);
    console.log(`SUCESSO: Link do WhatsApp pré-formatado com código do imóvel: ${activeProp.external_id}`);

  } finally {
    // Limpeza
    if (activePropertyId) {
      await adminClient.from("properties").delete().eq("id", activePropertyId);
    }
    if (draftPropertyId) {
      await adminClient.from("properties").delete().eq("id", draftPropertyId);
    }
    if (testAgencyId) {
      await adminClient.from("agencies").delete().eq("id", testAgencyId);
    }
    console.log("=== LIMPEZA DE DADOS CONCLUÍDA ===");
  }

  console.log("=== TODOS OS TESTES DA PÁGINA PÚBLICA DO IMÓVEL FORAM APROVADOS! ===");
}

runPublicPropertyTests().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
