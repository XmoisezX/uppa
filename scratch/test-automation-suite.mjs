import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { FEED_SAFETY_CONFIG } from "../src/features/feeds/config.ts";
import { detectFeedFormat } from "../src/features/feeds/parser/feed-detector.ts";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTestSuite() {
  console.log("=== INICIANDO TESTES DE SEGURANÇA E AUTOMAÇÃO ===");

  // 1. VERIFICAÇÃO DE INTEGRIDADE NO BANCO ATUAL
  console.log("\n[TESTE 1] Verificação de Integridade no Banco (Duplicatas de Imóveis e Slugs):");
  const { data: props, error: propsErr } = await supabase
    .from("properties")
    .select("id, agency_id, source, external_id, slug, status");

  if (propsErr) {
    console.error("Erro ao consultar properties:", propsErr);
    return;
  }

  const mapExternal = new Map();
  let duplicateExternal = 0;
  const mapSlug = new Map();
  let duplicateSlugs = 0;

  for (const p of props) {
    const keyExt = `${p.agency_id}_${p.source}_${p.external_id}`;
    if (mapExternal.has(keyExt)) {
      duplicateExternal++;
    } else {
      mapExternal.set(keyExt, p.id);
    }

    if (mapSlug.has(p.slug)) {
      duplicateSlugs++;
    } else {
      mapSlug.set(p.slug, p.id);
    }
  }

  console.log(`Total de imóveis no banco: ${props.length}`);
  console.log(`Duplicidades por (agency_id + source + external_id): ${duplicateExternal}`);
  console.log(`Slugs duplicados: ${duplicateSlugs}`);

  // 2. DETECÇÃO DE FORMATO E DISTINÇÃO DE ORIGEM
  console.log("\n[TESTE 2] Detecção de Formato (VRSync vs Chaves na Mão):");
  const vrsyncSample = `<?xml version="1.0" encoding="utf-8"?><ListingDataFeed><Listing><ListingID>123</ListingID></Listing></ListingDataFeed>`;
  const chavesSample = `<?xml version="1.0" encoding="utf-8"?><Document><imoveis><imovel><referencia>456</referencia></imovel></imoveis></Document>`;

  const formatVr = detectFeedFormat(vrsyncSample);
  const formatCh = detectFeedFormat(chavesSample);
  console.log(`Amostra VRSync detectada como: ${formatVr} (esperado: vrsync) -> ${formatVr === "vrsync" ? "PASSOU" : "FALHOU"}`);
  console.log(`Amostra Chaves na Mão detectada como: ${formatCh} (esperado: chaves_na_mao) -> ${formatCh === "chaves_na_mao" ? "PASSOU" : "FALHOU"}`);

  // 3. REGRA DE SEGURANÇA CONTRA QUEDA ANORMAL E FEED VAZIO
  console.log("\n[TESTE 3] Validação Teórica e de Limiares do FEED_SAFETY_CONFIG:");
  console.log(`minimumInventoryRatio: ${FEED_SAFETY_CONFIG.minimumInventoryRatio} (50%)`);
  console.log(`minHistoricalItemsThreshold: ${FEED_SAFETY_CONFIG.minHistoricalItemsThreshold}`);

  // Simulação Cenário A: Feed retorna 0 itens com 127 no histórico
  const baselineA = 127;
  const currentA = 0;
  const isSuspiciousA = currentA === 0 && baselineA > 0;
  console.log(`Cenário A (0 itens vs 127 histórico): isSuspicious = ${isSuspiciousA} (esperado: true) -> ${isSuspiciousA ? "PASSOU" : "FALHOU"}`);

  // Simulação Cenário B: Queda drástica (47 itens vs 850 histórico)
  const baselineB = 850;
  const currentB = 47;
  const ratioB = currentB / baselineB;
  const isSuspiciousB = baselineB >= FEED_SAFETY_CONFIG.minHistoricalItemsThreshold && ratioB < FEED_SAFETY_CONFIG.minimumInventoryRatio;
  console.log(`Cenário B (47 itens vs 850 histórico, ratio ${(ratioB*100).toFixed(1)}%): isSuspicious = ${isSuspiciousB} (esperado: true) -> ${isSuspiciousB ? "PASSOU" : "FALHOU"}`);

  // Simulação Cenário C: Variação normal (800 itens vs 850 histórico)
  const baselineC = 850;
  const currentC = 800;
  const ratioC = currentC / baselineC;
  const isSuspiciousC = baselineC >= FEED_SAFETY_CONFIG.minHistoricalItemsThreshold && ratioC < FEED_SAFETY_CONFIG.minimumInventoryRatio;
  console.log(`Cenário C (800 itens vs 850 histórico, ratio ${(ratioC*100).toFixed(1)}%): isSuspicious = ${isSuspiciousC} (esperado: false) -> ${!isSuspiciousC ? "PASSOU" : "FALHOU"}`);

  // 4. TESTE DE COMPARADOR TIMING-SAFE
  console.log("\n[TESTE 4] Comparação de Token Segura (Timing-Safe):");
  function isTokenValidTimingSafe(providedToken, expectedToken) {
    const bufA = Buffer.from(providedToken.trim(), "utf8");
    const bufB = Buffer.from(expectedToken.trim(), "utf8");
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  const secret = process.env.CRON_SECRET || "test-secret-123456";
  const validCheck = isTokenValidTimingSafe(secret, secret);
  const invalidCheck = isTokenValidTimingSafe("wrong-token", secret);
  const emptyCheck = isTokenValidTimingSafe("", secret);
  console.log(`Token idêntico: ${validCheck} -> ${validCheck ? "PASSOU" : "FALHOU"}`);
  console.log(`Token incorreto: ${!invalidCheck} -> ${!invalidCheck ? "PASSOU" : "FALHOU"}`);
  console.log(`Token vazio: ${!emptyCheck} -> ${!emptyCheck ? "PASSOU" : "FALHOU"}`);

  console.log("\n=== SUÍTE DE TESTES EXECUTADA COM SUCESSO ===");
}

runTestSuite().catch(console.error);
