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

async function inspectComplements() {
  const { data: mergedProps } = await adminSupabase
    .from("properties")
    .select("id, title, complement, number, street, usable_area, canonical_property_id")
    .eq("status", "merged")
    .not("canonical_property_id", "is", null);

  const canonicalIds = Array.from(new Set(mergedProps.map((m) => m.canonical_property_id)));
  const { data: canonicalProps } = await adminSupabase
    .from("properties")
    .select("id, title, complement, number, street, usable_area")
    .in("id", canonicalIds);

  const cMap = new Map(canonicalProps.map((c) => [c.id, c]));

  console.log("=== INSPEÇÃO REAL DE COMPLEMENTO E UNIDADE ===");
  for (const m of mergedProps) {
    const c = cMap.get(m.canonical_property_id);
    if (m.complement || c.complement) {
      console.log(`\nMerged: ${m.id}`);
      console.log(`  Merged Comp: '${m.complement}' | Title: '${m.title}' | Num: '${m.number}'`);
      console.log(`  Canonical Comp: '${c.complement}' | Title: '${c.title}' | Num: '${c.number}'`);
    }
  }

  // Verificar transitivity: propriedades canônicas que têm mais de 1 merged property
  const canonicalCount = {};
  for (const m of mergedProps) {
    canonicalCount[m.canonical_property_id] = (canonicalCount[m.canonical_property_id] || []).concat(m);
  }

  console.log("\n=== INSPEÇÃO DE TRANSITIVIDADE (Properties canônicas com 2+ merged properties) ===");
  for (const [cid, mList] of Object.entries(canonicalCount)) {
    if (mList.length > 1) {
      const c = cMap.get(cid);
      console.log(`\nCanonical ID: ${cid} (${c.title?.slice(0, 40)})`);
      console.log(`  Endereço: ${c.street} ${c.number} | Área: ${c.usable_area}m² | Comp: '${c.complement || ''}'`);
      console.log(`  Total de merged incorporadas: ${mList.length}`);
      for (const m of mList) {
        console.log(`    - Merged ID: ${m.id} | Titulo: '${m.title?.slice(0, 40)}' | Num: '${m.number}' | Área: ${m.usable_area}m² | Comp: '${m.complement || ''}'`);
      }
    }
  }
}

inspectComplements().catch(console.error);
