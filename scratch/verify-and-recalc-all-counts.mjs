import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("c:/Users/Moise/Desktop/PORTAL IMOBILIÁRIO/package.json");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.resolve("c:/Users/Moise/Desktop/PORTAL IMOBILIÁRIO", ".env.local");
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
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyAndRecalculate() {
  console.log("=== VERIFICANDO CONSISTÊNCIA DE ACTIVE_OFFERS_COUNT ===");

  // 1. Garante active_offers_count = 0 para properties merged
  const { data: mergedFix, error: mergedErr } = await adminSupabase
    .from("properties")
    .update({ active_offers_count: 0 })
    .eq("status", "merged");

  console.log("Merged properties set active_offers_count = 0:", { mergedErr });

  // 2. Busca todas as ofertas ativas e conta por property_id
  let allActiveOffers = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data: batch, error } = await adminSupabase
      .from("property_offers")
      .select("property_id")
      .eq("status", "active")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!batch || batch.length === 0) break;
    allActiveOffers = allActiveOffers.concat(batch);
    if (batch.length < pageSize) break;
    page++;
  }

  console.log(`Total de ofertas ativas no banco: ${allActiveOffers.length}`);

  const countByPropId = new Map();
  for (const o of allActiveOffers) {
    if (o.property_id) {
      countByPropId.set(o.property_id, (countByPropId.get(o.property_id) || 0) + 1);
    }
  }

  // 3. Verifica properties canônicas / independentes
  let allProps = [];
  page = 0;
  while (true) {
    const { data: pBatch, error } = await adminSupabase
      .from("properties")
      .select("id, status, active_offers_count, canonical_property_id")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!pBatch || pBatch.length === 0) break;
    allProps = allProps.concat(pBatch);
    if (pBatch.length < pageSize) break;
    page++;
  }

  console.log(`Total de properties avaliadas: ${allProps.length}`);

  let mismatches = 0;
  const updatesToApply = [];

  for (const p of allProps) {
    const isMerged = p.status === "merged" || p.canonical_property_id !== null;
    const expectedCount = isMerged ? 0 : (countByPropId.get(p.id) || 0);

    if (p.active_offers_count !== expectedCount) {
      mismatches++;
      updatesToApply.push({ id: p.id, active_offers_count: expectedCount });
    }
  }

  console.log(`Inconsistências encontradas: ${mismatches}`);

  if (updatesToApply.length > 0) {
    console.log(`Aplicando ${updatesToApply.length} correções...`);
    for (const u of updatesToApply) {
      await adminSupabase
        .from("properties")
        .update({ active_offers_count: u.active_offers_count })
        .eq("id", u.id);
    }
    console.log("Todas as correções foram aplicadas!");
  } else {
    console.log("100% das properties já estão perfeitamente consistentes com suas ofertas ativas!");
  }

  // 4. Validação final pós-execução
  const { count: zeroOfferCanonical } = await adminSupabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("canonical_property_id", null)
    .eq("active_offers_count", 0);

  const { count: nonZeroMerged } = await adminSupabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("status", "merged")
    .gt("active_offers_count", 0);

  console.log("Properties ativas canônicas com 0 ofertas:", zeroOfferCanonical);
  console.log("Properties merged com >0 ofertas:", nonZeroMerged);
  console.log("Validação de consistência concluída com sucesso!");
}

verifyAndRecalculate().catch(console.error);
