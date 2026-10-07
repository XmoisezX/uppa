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

function cleanUnit(str) {
  if (!str) return "";
  const match = str.match(/(?:apto|apartamento|unidade|bloco|cj|conjunto|box|sala)\s*[:#-]?\s*([a-z0-9]+)/i);
  return match ? match[1].toLowerCase() : "";
}

function cleanNumber(str) {
  if (!str) return "";
  const digits = str.replace(/\D/g, "");
  return digits;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function inspect41Groups() {
  console.log("=== INSPECIONANDO OS 41 AGRUPAMENTOS AUTOMÁTICOS EXISTENTES ===\n");

  const { data: mergedProps, error: mErr } = await adminSupabase
    .from("properties")
    .select(`
      id, title, slug, status, external_id, property_type,
      street, number, complement, usable_area, total_area,
      bedrooms, suites, bathrooms, parking_spaces,
      latitude, longitude, canonical_property_id
    `)
    .eq("status", "merged")
    .not("canonical_property_id", "is", null);

  if (mErr) {
    console.error("Erro ao buscar properties mescladas:", mErr);
    return;
  }

  const canonicalIds = Array.from(new Set(mergedProps.map((m) => m.canonical_property_id).filter(Boolean)));
  console.log(`Merged props: ${mergedProps.length}, Unique canonical IDs: ${canonicalIds.length}`);

  const { data: canonicalProps, error: cErr } = await adminSupabase
    .from("properties")
    .select(`
      id, title, slug, status, external_id, property_type,
      street, number, complement, usable_area, total_area,
      bedrooms, suites, bathrooms, parking_spaces,
      latitude, longitude, active_offers_count
    `)
    .in("id", canonicalIds);

  if (cErr) {
    console.error("Erro ao buscar canonical props:", cErr);
    return;
  }

  const canonicalMap = new Map(canonicalProps.map((c) => [c.id, c]));

  const violations = [];
  const approved = [];

  for (let i = 0; i < mergedProps.length; i++) {
    const m = mergedProps[i];
    const c = canonicalMap.get(m.canonical_property_id);

    if (!c) {
      violations.push({
        index: i + 1,
        mergedId: m.id,
        canonicalId: m.canonical_property_id,
        issues: ["Canonical property não encontrada no banco!"],
      });
      continue;
    }

    const issues = [];

    // 1. Incompatibilidade de tipo
    if (m.property_type !== c.property_type) {
      issues.push(`Tipo incompatível: ${m.property_type} vs ${c.property_type}`);
    }

    // 2. Número predial divergente (ambos têm números diferentes e não nulos)
    const numM = cleanNumber(m.number);
    const numC = cleanNumber(c.number);
    if (numM && numC && numM !== numC) {
      issues.push(`Número predial divergente: ${m.number} (${numM}) vs ${c.number} (${numC})`);
    }

    // 3. Complemento / unidade explicitamente divergente (ex: apto 201 vs 302)
    const unitM = cleanUnit(m.complement || m.title || "");
    const unitC = cleanUnit(c.complement || c.title || "");
    if (unitM && unitC && unitM !== unitC) {
      issues.push(`Unidade/Complemento explicitamente divergente: '${unitM}' vs '${unitC}'`);
    }

    // 4. Distância geográfica incompatível (> 150m)
    const dist = calculateDistanceMeters(m.latitude, m.longitude, c.latitude, c.longitude);
    if (dist !== null && dist > 150) {
      issues.push(`Distância geográfica excessiva: ${dist} metros`);
    }

    // 5. Divergência física forte (área > 20% ou quartos !=)
    const areaM = m.usable_area || m.total_area || 0;
    const areaC = c.usable_area || c.total_area || 0;
    if (areaM > 0 && areaC > 0) {
      const diffArea = Math.abs(areaM - areaC) / Math.max(areaM, areaC);
      if (diffArea > 0.20) {
        issues.push(`Divergência de área excessiva: ${areaM}m² vs ${areaC}m² (${Math.round(diffArea * 100)}%)`);
      }
    }

    if (m.bedrooms !== null && c.bedrooms !== null && Math.abs(m.bedrooms - c.bedrooms) >= 2) {
      issues.push(`Divergência severa de quartos: ${m.bedrooms} vs ${c.bedrooms}`);
    }

    const groupInfo = {
      index: i + 1,
      mergedId: m.id,
      canonicalId: c.id,
      mergedTitle: m.title?.slice(0, 45),
      canonicalTitle: c.title?.slice(0, 45),
      mergedAddress: `${m.street || 'S/Rua'} ${m.number || ''} ${m.complement || ''}`.trim(),
      canonicalAddress: `${c.street || 'S/Rua'} ${c.number || ''} ${c.complement || ''}`.trim(),
      mergedArea: `${m.usable_area || m.total_area}m²`,
      canonicalArea: `${c.usable_area || c.total_area}m²`,
      mergedBedrooms: m.bedrooms,
      canonicalBedrooms: c.bedrooms,
      distance: dist !== null ? `${dist}m` : "sem coords",
      issues,
    };

    if (issues.length > 0) {
      violations.push(groupInfo);
    } else {
      approved.push(groupInfo);
    }
  }

  console.log(`\n--- RESULTADO DA ANÁLISE DETALHADA ---`);
  console.log(`Agrupamentos 100% VÁLIDOS (sem qualquer violação): ${approved.length}`);
  console.log(`Agrupamentos com potenciais violações: ${violations.length}`);

  if (violations.length > 0) {
    console.log("\nVIOLAÇÕES DETECTADAS:");
    for (const v of violations) {
      console.log(`\nGrupo #${v.index}:`);
      console.log(`  Merged: [${v.mergedId}] ${v.mergedTitle} | Endereço: ${v.mergedAddress} | Área: ${v.mergedArea} | Quartos: ${v.mergedBedrooms}`);
      console.log(`  Canonical: [${v.canonicalId}] ${v.canonicalTitle} | Endereço: ${v.canonicalAddress} | Área: ${v.canonicalArea} | Quartos: ${v.canonicalBedrooms}`);
      console.log(`  Distância: ${v.distance}`);
      console.log(`  Problemas encontrados:`);
      for (const iss of v.issues) {
        console.log(`    - ${iss}`);
      }
    }
  } else {
    console.log("\nTODOS OS 41 AGRUPAMENTOS SÃO 100% COMPATÍVEIS!");
  }

  fs.writeFileSync(
    path.resolve("c:/Users/Moise/Desktop/PORTAL IMOBILIÁRIO/scratch/41-groups-audit.json"),
    JSON.stringify({ approved, violations }, null, 2)
  );
  console.log("\nRelatório salvo em scratch/41-groups-audit.json");
}

inspect41Groups().catch(console.error);
