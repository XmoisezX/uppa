#!/usr/bin/env node

/**
 * Script de Teste Automatizado de Segurança do Cron de Feeds (/api/feeds/sync)
 * Verifica os Cenários A, B, C, D e E conforme especificado na auditoria.
 */

import fs from "node:fs";
import path from "node:path";

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

async function runCronSecurityTests() {
  console.log("🔒 === INICIANDO TESTES DE SEGURANÇA DO CRON DE FEEDS (/api/feeds/sync) ===\n");

  const { GET } = await import("../src/app/api/feeds/sync/route.ts");

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
  // CENÁRIO A: CRON_SECRET ausente no ambiente (FAIL CLOSED)
  // Esperado: Endpoint não executa sincronização e retorna erro 500
  // =========================================================================
  console.log("▶️ Testando Cenário A: CRON_SECRET ausente no ambiente...");
  const originalSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;

  const reqA = new Request("http://localhost:3000/api/feeds/sync", {
    method: "GET",
    headers: {
      authorization: "Bearer some-token",
    },
  });

  const resA = await GET(reqA);
  const bodyA = await resA.json();

  assert(
    resA.status === 500,
    `Cenário A: Status esperado 500 (Fail Closed), recebido: ${resA.status}`
  );
  assert(
    !JSON.stringify(bodyA).includes("Bearer") && !JSON.stringify(bodyA).includes("CRON_SECRET"),
    "Cenário A: Mensagem de erro não vaza secrets ou dados sensíveis."
  );

  // =========================================================================
  // CENÁRIO B: CRON_SECRET configurado e Authorization ausente
  // Esperado: HTTP 401 Unauthorized
  // =========================================================================
  console.log("\n▶️ Testando Cenário B: CRON_SECRET configurado e Authorization ausente...");
  process.env.CRON_SECRET = "test-secret-key-12345";

  const reqB = new Request("http://localhost:3000/api/feeds/sync", {
    method: "GET",
  });

  const resB = await GET(reqB);
  assert(resB.status === 401, `Cenário B: Status esperado 401, recebido: ${resB.status}`);

  // =========================================================================
  // CENÁRIO C: Authorization incorreto / inválido
  // Esperado: HTTP 401 Unauthorized
  // =========================================================================
  console.log("\n▶️ Testando Cenário C: Authorization errado...");
  const reqC = new Request("http://localhost:3000/api/feeds/sync", {
    method: "GET",
    headers: {
      authorization: "Bearer token-completamente-invalido",
    },
  });

  const resC = await GET(reqC);
  assert(resC.status === 401, `Cenário C: Status esperado 401, recebido: ${resC.status}`);

  // =========================================================================
  // CENÁRIO E: Request público arbitrário com query param ?secret=... (não aceito)
  // Esperado: HTTP 401 Unauthorized (bloqueado, parâmetro de URL não é aceito)
  // =========================================================================
  console.log("\n▶️ Testando Cenário E: Request público arbitrário sem Bearer no Header...");
  const reqE = new Request("http://localhost:3000/api/feeds/sync?secret=test-secret-key-12345", {
    method: "GET",
  });

  const resE = await GET(reqE);
  assert(resE.status === 401, `Cenário E: Status esperado 401, recebido: ${resE.status}`);

  // =========================================================================
  // CENÁRIO D: Authorization correto (Bearer token válido)
  // Esperado: HTTP 200 OK
  // =========================================================================
  console.log("\n▶️ Testando Cenário D: Authorization correto...");
  const reqD = new Request("http://localhost:3000/api/feeds/sync", {
    method: "GET",
    headers: {
      authorization: "Bearer test-secret-key-12345",
    },
  });

  const resD = await GET(reqD);
  const bodyD = await resD.json();
  assert(resD.status === 200, `Cenário D: Status esperado 200, recebido: ${resD.status}`);
  assert(
    bodyD.message === "Sincronização periódica de feeds executada.",
    "Cenário D: Resposta confirma execução autorizada do job."
  );

  // Restaurar ambiente original
  if (originalSecret !== undefined) {
    process.env.CRON_SECRET = originalSecret;
  } else {
    delete process.env.CRON_SECRET;
  }

  console.log(`\n🏁 Resultado dos Testes de Segurança: ${passed} Aprovados | ${failed} Falhas.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runCronSecurityTests().catch((err) => {
  console.error("Erro inesperado no teste de segurança:", err);
  process.exit(1);
});
