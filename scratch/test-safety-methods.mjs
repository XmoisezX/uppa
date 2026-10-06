import { createClient } from "@supabase/supabase-js";
import { FeedSyncManager } from "../src/features/feeds/sync/feed-sync-manager.ts";
import { FEED_SAFETY_CONFIG } from "../src/features/feeds/config.ts";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSafetyMethod() {
  console.log("=== TESTANDO evaluateInventoryDropSafety DIRETAMENTE CONTRA BANCO ===");

  const manager = new FeedSyncManager(supabase);

  // Imperial Paris feed
  const feedId = "c7e159ef-e6e0-47be-94cb-b5463ef394cf";
  const agencyId = "15f16428-2621-4ebc-8c17-15d2a933fc1a";
  const source = "chaves_na_mao";

  // 1. Teste com 0 itens encontrados (Feed Vazio)
  // Usamos acesso reflexivo para invocar o método privado para validação
  const resEmpty = await manager["evaluateInventoryDropSafety"](
    feedId,
    agencyId,
    source,
    0
  );
  console.log("Resultado com 0 itens encontrados:", resEmpty);
  console.log("Trava de feed vazio ativada?", resEmpty.isSuspicious === true ? "SIM (CORRETO)" : "NÃO (ERRO)");

  // 2. Teste com 20 itens encontrados (Queda drástica: 20 vs 127 = 15.7% < 50%)
  const resDrop = await manager["evaluateInventoryDropSafety"](
    feedId,
    agencyId,
    source,
    20
  );
  console.log("\nResultado com 20 itens encontrados:", resDrop);
  console.log("Trava de queda anormal ativada?", resDrop.isSuspicious === true ? "SIM (CORRETO)" : "NÃO (ERRO)");

  // 3. Teste com 125 itens encontrados (Normal: 125 vs 127 = 98.4% >= 50%)
  const resNormal = await manager["evaluateInventoryDropSafety"](
    feedId,
    agencyId,
    source,
    125
  );
  console.log("\nResultado com 125 itens encontrados:", resNormal);
  console.log("Execução liberada sem trava?", resNormal.isSuspicious === false ? "SIM (CORRETO)" : "NÃO (ERRO)");
}

testSafetyMethod().catch(console.error);
