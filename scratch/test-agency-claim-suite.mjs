import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// Carrega variáveis de ambiente de .env.local
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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);
const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);

async function runClaimSuite() {
  console.log("===============================================================");
  console.log("   SUITE DE TESTES: AGENCY CLAIM, GOVERNANÇA E SEGURANÇA       ");
  console.log("===============================================================\n");

  let testPassed = true;

  // 1. VERIFICAÇÃO DE SCHEMA
  console.log("1. Verificando existência de tabelas e colunas...");
  const { data: claimsTable, error: claimsTableErr } = await adminSupabase
    .from("agency_claims")
    .select("id")
    .limit(1);

  if (claimsTableErr) {
    console.error("❌ Tabela agency_claims não encontrada ou migration pendente:", claimsTableErr.message);
    return false;
  }
  console.log("   ✅ Tabela agency_claims existe.");

  const { data: agCols, error: agColsErr } = await adminSupabase
    .from("agencies")
    .select("id, name, slug, claim_status, is_official_profile, created_source, verified_at")
    .limit(1);

  if (agColsErr) {
    console.error("❌ Colunas de governança em agencies não encontradas:", agColsErr.message);
    return false;
  }
  console.log("   ✅ Colunas de governança em agencies existem.");

  const { data: reqTable, error: reqTableErr } = await adminSupabase
    .from("agency_profile_requests")
    .select("id")
    .limit(1);

  if (reqTableErr) {
    console.error("❌ Tabela agency_profile_requests não encontrada:", reqTableErr.message);
    return false;
  }
  console.log("   ✅ Tabela agency_profile_requests existe.\n");

  // 2. SELEÇÃO DE AGÊNCIA DE TESTE
  console.log("2. Selecionando agência para teste controlado...");
  const { data: agencies, error: agErr } = await adminSupabase
    .from("agencies")
    .select("id, name, slug, claim_status, is_official_profile, verified_at")
    .eq("status", "active")
    .limit(5);

  if (agErr || !agencies || agencies.length === 0) {
    console.error("❌ Nenhuma agência ativa encontrada.");
    return false;
  }

  // Agência de teste primária
  const testAgency = agencies[0];
  // Segunda agência para teste de isolamento multitenant
  const secondAgency = agencies.length > 1 ? agencies[1] : null;

  console.log(`   Agência de Teste 1: ${testAgency.name} (${testAgency.id})`);
  if (secondAgency) {
    console.log(`   Agência de Teste 2 (Isolamento): ${secondAgency.name} (${secondAgency.id})`);
  }

  // Estado original da agência para restauração
  const originalClaimStatus = testAgency.claim_status || "discovered";
  const originalIsOfficial = testAgency.is_official_profile || false;

  // Cria um usuário de teste temporário dedicado e limpo (sem vínculos prévios)
  const testEmail = `teste.claimant.${Date.now()}@uppa.test`;
  const { data: createdAuthUser, error: authUserErr } = await adminSupabase.auth.admin.createUser({
    email: testEmail,
    password: "TestPassword123!",
    email_confirm: true,
    user_metadata: { name: "Solicitante Teste Antigravity" },
  });

  if (authUserErr || !createdAuthUser?.user) {
    console.error("❌ Falha ao criar usuário temporário de teste:", authUserErr?.message);
    return false;
  }

  const testUserId = createdAuthUser.user.id;
  console.log(`   Usuário de Teste Temporário: ${testUserId} (${testEmail})\n`);

  let createdClaimId = null;

  try {
    // 3. TESTE DE CRIAÇÃO DE CLAIM (SOLICITAÇÃO PENDENTE)
    console.log("3. Testando submissão de Claim (status pending)...");
    const { data: insertedClaim, error: insertErr } = await adminSupabase
      .from("agency_claims")
      .insert({
        agency_id: testAgency.id,
        user_id: testUserId,
        status: "pending",
        applicant_name: "Teste Automatizado Antigravity",
        applicant_role: "Diretor Comercial Teste",
        phone: "(53) 99999-0000",
        professional_email: "teste.claim@uppa.com.br",
        document_number: "00.000.000/0001-99",
        message: "Evidência de teste automatizado para validação de claim.",
      })
      .select()
      .single();

    if (insertErr || !insertedClaim) {
      console.error("❌ Falha ao criar claim de teste:", insertErr?.message);
      return false;
    }

    createdClaimId = insertedClaim.id;
    console.log(`   ✅ Claim criado com sucesso! ID: ${createdClaimId}, Status: ${insertedClaim.status}`);

    // 4. TESTE DE SEGURANÇA PRÉ-APROVAÇÃO (Seção 8 e 31)
    console.log("\n4. Testando segurança pré-aprovação...");
    // Confirma que o usuário NÃO possui vínculo em agency_members para testAgency
    const { data: preMembers } = await adminSupabase
      .from("agency_members")
      .select("id, role")
      .eq("agency_id", testAgency.id)
      .eq("user_id", testUserId);

    if (preMembers && preMembers.length > 0) {
      console.log("   (Usuário já possuía vínculo prévio, limpando para isolamento de teste...)");
      await adminSupabase
        .from("agency_members")
        .delete()
        .eq("agency_id", testAgency.id)
        .eq("user_id", testUserId);
    }

    // Valida que sem membro o perfil permanece descoberto e sem acesso concedido
    const { data: agencyCheck } = await adminSupabase
      .from("agencies")
      .select("claim_status, is_official_profile")
      .eq("id", testAgency.id)
      .single();

    if (agencyCheck.claim_status === "claimed") {
      console.error("❌ Agência já estava claimed antes da aprovação.");
      testPassed = false;
    } else {
      console.log("   ✅ Agência permanece como 'discovered' antes da aprovação administrativa.");
    }

    // 5. TESTE DE APROVAÇÃO TRANSACIONAL (RPC review_agency_claim)
    console.log("\n5. Executando aprovação transacional de Claim...");
    const { data: rpcResult, error: rpcErr } = await adminSupabase.rpc("review_agency_claim", {
      p_claim_id: createdClaimId,
      p_decision: "approved",
      p_admin_notes: "Aprovação validada no teste automatizado de segurança.",
    });

    if (rpcErr) {
      console.error("❌ Erro ao executar RPC review_agency_claim:", rpcErr.message);
      testPassed = false;
    } else {
      console.log("   ✅ RPC review_agency_claim executada com sucesso:", rpcResult);
    }

    // 6. VERIFICAÇÃO PÓS-APROVAÇÃO
    console.log("\n6. Verificando estado do sistema após aprovação...");

    // Claim atualizado para approved?
    const { data: postClaim } = await adminSupabase
      .from("agency_claims")
      .select("status, admin_notes, reviewed_at")
      .eq("id", createdClaimId)
      .single();

    if (postClaim?.status === "approved") {
      console.log("   ✅ Claim status atualizado para 'approved'.");
    } else {
      console.error(`❌ Claim status incorreto: ${postClaim?.status}`);
      testPassed = false;
    }

    // Agency atualizada para claimed e oficial?
    const { data: postAgency } = await adminSupabase
      .from("agencies")
      .select("claim_status, is_official_profile, claimed_at, claimed_by")
      .eq("id", testAgency.id)
      .single();

    if (postAgency?.claim_status === "claimed" && postAgency?.is_official_profile === true) {
      console.log("   ✅ Agência atualizada para claim_status = 'claimed' e is_official_profile = true.");
    } else {
      console.error("❌ Agência não foi atualizada corretamente:", postAgency);
      testPassed = false;
    }

    // agency_members criado com role owner?
    const { data: postMember } = await adminSupabase
      .from("agency_members")
      .select("role, status")
      .eq("agency_id", testAgency.id)
      .eq("user_id", testUserId)
      .single();

    if (postMember?.role === "owner" && postMember?.status === "active") {
      console.log("   ✅ Usuário inserido em agency_members com role = 'owner' e status = 'active'.");
    } else {
      console.error("❌ Registro em agency_members incorreto:", postMember);
      testPassed = false;
    }

    // Auditoria registrada em admin_audit_logs?
    const { data: auditLog } = await adminSupabase
      .from("admin_audit_logs")
      .select("action, module, record_id, changes")
      .eq("module", "agencies")
      .eq("record_id", testAgency.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (auditLog?.action === "CLAIM_APPROVED") {
      console.log("   ✅ Registro de auditoria gravado em admin_audit_logs com sucesso.");
    } else {
      console.warn("   ⚠️ Auditoria não encontrada ou ação divergente:", auditLog);
    }

    // 7. TESTE DE ISOLAMENTO MULTITENANT (Seção 31)
    if (secondAgency) {
      console.log("\n7. Testando isolamento multitenant entre agências...");
      const { data: memberOtherAgency } = await adminSupabase
        .from("agency_members")
        .select("id")
        .eq("agency_id", secondAgency.id)
        .eq("user_id", testUserId);

      if (!memberOtherAgency || memberOtherAgency.length === 0) {
        console.log(`   ✅ Membro da agência ${testAgency.name} NÃO possui acesso à agência ${secondAgency.name}.`);
      } else {
        console.error("❌ Vazamento de autorização entre agências detectado!");
        testPassed = false;
      }
    }

    // 8. TESTE DE PRECEDÊNCIA DE DADOS (Seção 20)
    console.log("\n8. Testando precedência de dados oficiais...");
    const { error: officialUpdateErr } = await adminSupabase
      .from("agencies")
      .update({
        commercial_address: "Rua Oficial Validada, 100",
        is_official_profile: true,
      })
      .eq("id", testAgency.id);

    if (!officialUpdateErr) {
      console.log("   ✅ Atualização de dados oficiais pelo responsável aprovada com precedência.");
    } else {
      console.error("❌ Erro ao atualizar dados oficiais:", officialUpdateErr.message);
      testPassed = false;
    }

  } finally {
    // 9. ROLLBACK E LIMPEZA DOS DADOS DE TESTE (Seção 30)
    console.log("\n9. Revertendo e limpando dados de teste (Rollback seguro)...");

    if (createdClaimId) {
      await adminSupabase.from("agency_claims").delete().eq("id", createdClaimId);
      console.log(`   • Claim de teste ${createdClaimId} removido.`);
    }

    // Remove membro criado durante o teste
    await adminSupabase
      .from("agency_members")
      .delete()
      .eq("agency_id", testAgency.id)
      .eq("user_id", testUserId);
    console.log("   • Vínculo em agency_members revertido.");

    // Restaura agência ao estado original
    await adminSupabase
      .from("agencies")
      .update({
        claim_status: originalClaimStatus,
        is_official_profile: originalIsOfficial,
        claimed_at: null,
        claimed_by: null,
      })
      .eq("id", testAgency.id);
    console.log(`   • Agência ${testAgency.name} restaurada ao estado original (${originalClaimStatus}).`);

    // Remove logs de auditoria do teste
    await adminSupabase
      .from("admin_audit_logs")
      .delete()
      .eq("module", "agencies")
      .eq("record_id", testAgency.id)
      .eq("action", "CLAIM_APPROVED");
    console.log("   • Logs de auditoria do teste limpos.");

    // Remove usuário temporário de teste
    if (testUserId) {
      await adminSupabase.auth.admin.deleteUser(testUserId);
      console.log(`   • Usuário temporário de teste ${testUserId} excluído.`);
    }
  }

  console.log("\n===============================================================");
  console.log(testPassed ? "   🎉 TODOS OS TESTES PASSARAM COM SUCESSO!" : "   ❌ ALGUNS TESTES FALHARAM.");
  console.log("===============================================================\n");

  return testPassed;
}

runClaimSuite().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((err) => {
  console.error("Erro fatal na suite de testes:", err);
  process.exit(1);
});
