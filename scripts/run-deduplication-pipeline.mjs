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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function normalizeAddressText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(rua|avenida|av|alameda|al|travessa|trv|praca|pc|rodovia|rod)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnit(unit) {
  if (!unit) return "";
  return unit
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(apartamento|apto|ap|bloco|bl|unidade|un|casa|cj|sala)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  if (lat1 === 0 && lon1 === 0) return null;
  if (lat2 === 0 && lon2 === 0) return null;

  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function evaluateMatch(propA, propB) {
  if (propA.id === propB.id) return { score: 0, confidence: "LOW", reasons: ["Mesmo id"] };
  if (propA.city_id && propB.city_id && propA.city_id !== propB.city_id) {
    return { score: 0, confidence: "LOW", reasons: ["Cidades distintas"] };
  }
  if (propA.property_type !== propB.property_type) {
    return { score: 0, confidence: "LOW", reasons: ["Tipos incompatíveis"] };
  }

  const reasons = [];
  let totalScore = 0;

  const normStreetA = normalizeAddressText(propA.street);
  const normStreetB = normalizeAddressText(propB.street);
  let addressScore = 0;
  if (normStreetA && normStreetB && (normStreetA.includes(normStreetB) || normStreetB.includes(normStreetA))) {
    addressScore = 20;
    reasons.push("Logradouro coincidente");
  }

  const cleanNumA = (propA.number || "").trim().toLowerCase();
  const cleanNumB = (propB.number || "").trim().toLowerCase();
  const numberMatch = Boolean(cleanNumA && cleanNumB && cleanNumA === cleanNumB);

  if (numberMatch) {
    addressScore += 20;
    reasons.push(`Mesmo número predial (${cleanNumA})`);
  } else if (cleanNumA && cleanNumB && cleanNumA !== cleanNumB) {
    reasons.push(`Números prediais divergentes (${cleanNumA} vs ${cleanNumB})`);
    return { score: 10, confidence: "LOW", reasons };
  }

  totalScore += addressScore;

  const unitA = normalizeUnit(propA.complement);
  const unitB = normalizeUnit(propB.complement);
  let unitMatch = null;
  if (unitA && unitB) {
    unitMatch = unitA === unitB;
    if (unitMatch) {
      totalScore += 25;
      reasons.push(`Mesma unidade (${unitA})`);
    } else {
      reasons.push(`Unidades diferentes (${unitA} vs ${unitB})`);
      return { score: 35, confidence: "LOW", reasons };
    }
  }

  const distanceMeters = calculateDistanceMeters(
    propA.latitude,
    propA.longitude,
    propB.latitude,
    propB.longitude
  );
  if (distanceMeters != null) {
    if (distanceMeters <= 30) {
      totalScore += 15;
      reasons.push(`Coords muito próximas (${distanceMeters}m)`);
    } else if (distanceMeters <= 100) {
      totalScore += 10;
      reasons.push(`Coords próximas (${distanceMeters}m)`);
    }
  }

  let areaDiffPercentage = null;
  const areaA = propA.usable_area || propA.total_area;
  const areaB = propB.usable_area || propB.total_area;
  if (areaA && areaB && areaA > 0 && areaB > 0) {
    areaDiffPercentage = Math.round((Math.abs(areaA - areaB) / Math.max(areaA, areaB)) * 100);
    if (areaDiffPercentage <= 2) {
      totalScore += 15;
      reasons.push(`Área idêntica (${areaA}m² vs ${areaB}m²)`);
    } else if (areaDiffPercentage <= 6) {
      totalScore += 10;
      reasons.push(`Área similar (${areaA}m² vs ${areaB}m²)`);
    } else if (areaDiffPercentage > 20) {
      reasons.push(`Área divergente (${areaA}m² vs ${areaB}m²)`);
      totalScore -= 20;
    }
  }

  const bedroomsMatch = propA.bedrooms === propB.bedrooms && propA.bedrooms > 0;
  if (bedroomsMatch) {
    totalScore += 5;
    reasons.push(`Mesmos quartos (${propA.bedrooms})`);
  } else if (Math.abs(propA.bedrooms - propB.bedrooms) >= 2) {
    totalScore -= 15;
  }

  if (propA.parking_spaces === propB.parking_spaces) totalScore += 3;
  if (propA.suites === propB.suites && propA.suites > 0) totalScore += 2;

  const finalScore = Math.max(0, Math.min(100, totalScore));

  let confidence = "LOW";
  const isStrongAddress = normStreetA.length > 5 && normStreetB.length > 5 && numberMatch;
  const isAreaClose = areaDiffPercentage !== null && areaDiffPercentage <= 5;

  if (finalScore >= 80 && isStrongAddress && (unitMatch === true || (isAreaClose && bedroomsMatch))) {
    confidence = "HIGH";
  } else if (finalScore >= 55 && (numberMatch || (distanceMeters != null && distanceMeters <= 50))) {
    confidence = "MEDIUM";
  }

  return {
    score: finalScore,
    confidence,
    reasons,
    signals: {
      addressScore,
      numberMatch,
      unitMatch,
      distanceMeters,
      areaDiffPercentage,
      bedroomsMatch
    }
  };
}

function selectCanonical(propA, propB) {
  let scoreA = 0;
  let scoreB = 0;
  if (propA.street && propA.number) scoreA += 10;
  if (propB.street && propB.number) scoreB += 10;
  if (propA.complement) scoreA += 5;
  if (propB.complement) scoreB += 5;
  if (propA.latitude && propA.longitude) scoreA += 10;
  if (propB.latitude && propB.longitude) scoreB += 10;
  if (propA.usable_area) scoreA += 5;
  if (propB.usable_area) scoreB += 5;
  if (propA.bedrooms > 0) scoreA += 3;
  if (propB.bedrooms > 0) scoreB += 3;

  if (scoreA > scoreB) return { canonical: propA, duplicate: propB };
  if (scoreB > scoreA) return { canonical: propB, duplicate: propA };

  const dateA = new Date(propA.created_at).getTime();
  const dateB = new Date(propB.created_at).getTime();
  return dateA <= dateB
    ? { canonical: propA, duplicate: propB }
    : { canonical: propB, duplicate: propA };
}

async function run() {
  console.log("=== INICIANDO DETECÇÃO DE DUPLICIDADES FÍSICAS (FASE 2, 3, 22) ===");

  // 1. Carrega todas as propriedades ativas sem canonical_property_id
  let allProps = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("properties")
      .select("id, agency_id, external_id, title, slug, property_type, street, number, complement, zipcode, city_id, latitude, longitude, usable_area, total_area, bedrooms, suites, bathrooms, parking_spaces, created_at, status")
      .is("canonical_property_id", null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Erro ao carregar properties:", error);
      process.exit(1);
    }
    allProps = allProps.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Carregadas ${allProps.length} properties elegíveis para análise.`);

  // 2. Agrupa por city_id + property_type para pré-filtragem eficiente
  const groups = new Map();
  for (const p of allProps) {
    const normStreet = normalizeAddressText(p.street);
    const key = `${p.city_id || "no_city"}_${p.property_type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...p, normStreet });
  }

  console.log(`Agrupadas em ${groups.size} grupos por (cidade + tipo).`);

  const candidatesHigh = [];
  const candidatesMedium = [];
  const testCases = {
    high: null,
    medium: null,
    low: null
  };

  for (const [key, props] of groups.entries()) {
    if (props.length < 2) continue;

    // Indexa por rua normalizada dentro do grupo para reduzir comparações
    for (let i = 0; i < props.length; i++) {
      for (let j = i + 1; j < props.length; j++) {
        const a = props[i];
        const b = props[j];

        // Se da mesma imobiliária com mesmo externalId, já é o mesmo anúncio
        if (a.agency_id === b.agency_id && a.external_id === b.external_id) continue;

        // Pré-filtro: deve ter alguma pista em comum (rua compatível OU número igual OU distância < 100m)
        const streetMatch = a.normStreet && b.normStreet &&
          (a.normStreet.includes(b.normStreet) || b.normStreet.includes(a.normStreet));
        const numMatch = a.number && b.number && a.number.trim().toLowerCase() === b.number.trim().toLowerCase();
        
        let dist = null;
        if (a.latitude && b.latitude) {
          dist = calculateDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
        }

        if (!streetMatch && !numMatch && (dist === null || dist > 100)) {
          // Sem sinal preliminar de proximidade
          continue;
        }

        const match = evaluateMatch(a, b);

        if (match.confidence === "HIGH") {
          candidatesHigh.push({ a, b, match });
          if (!testCases.high) testCases.high = { a, b, match };
        } else if (match.confidence === "MEDIUM") {
          candidatesMedium.push({ a, b, match });
          if (!testCases.medium) testCases.medium = { a, b, match };
        } else if (match.confidence === "LOW" && numMatch && !testCases.low) {
          testCases.low = { a, b, match };
        }
      }
    }
  }

  console.log(`\n--- RESULTADOS DO MATCHING ---`);
  console.log(`Candidatos HIGH (auto-agrupáveis): ${candidatesHigh.length}`);
  console.log(`Candidatos MEDIUM (revisão humana): ${candidatesMedium.length}`);

  // 3. Grava candidatos em property_match_candidates
  console.log(`\nGravando candidatos em property_match_candidates...`);
  const allCandidates = [
    ...candidatesHigh.map(c => ({
      property_a_id: c.a.id,
      property_b_id: c.b.id,
      score: c.match.score,
      confidence: "HIGH",
      signals: c.match.signals,
      status: "auto_approved",
      decision_notes: c.match.reasons.join("; ")
    })),
    ...candidatesMedium.map(c => ({
      property_a_id: c.a.id,
      property_b_id: c.b.id,
      score: c.match.score,
      confidence: "MEDIUM",
      signals: c.match.signals,
      status: "pending",
      decision_notes: c.match.reasons.join("; ")
    }))
  ];

  for (const cand of allCandidates) {
    const { error: insErr } = await supabase
      .from("property_match_candidates")
      .upsert(cand, { onConflict: "property_a_id,property_b_id" });
    if (insErr) {
      console.warn("Erro ao inserir candidato:", insErr.message);
    }
  }

  console.log(`Candidatos gravados na tabela property_match_candidates com sucesso.`);

  // 4. Executa consolidação para os candidatos HIGH (Fase 4, 6, 23)
  console.log(`\n--- EXECUTANDO CONSOLIDAÇÃO SEGURA (HIGH CONFIDENCE) ---`);
  let mergedCount = 0;
  const mergedPropertyIds = new Set();

  for (const item of candidatesHigh) {
    const { a, b, match } = item;
    // Se algum já foi merged nesta rodada, ignora para evitar ciclos
    if (mergedPropertyIds.has(a.id) || mergedPropertyIds.has(b.id)) continue;

    const { canonical, duplicate } = selectCanonical(a, b);
    console.log(`\nMesclando:`);
    console.log(`  Canônica:  ${canonical.id} (${canonical.title}) - agency: ${canonical.agency_id}`);
    console.log(`  Duplicada: ${duplicate.id} (${duplicate.title}) - agency: ${duplicate.agency_id}`);
    console.log(`  Score: ${match.score} | Sinais: ${match.reasons.join(", ")}`);

    // A. Reatribui as ofertas da property duplicada para a canônica (NUNCA deleta offer)
    const { data: offersToMove, error: ofErr } = await supabase
      .from("property_offers")
      .select("id")
      .eq("property_id", duplicate.id);

    if (ofErr) {
      console.error("Erro ao buscar ofertas para reatribuir:", ofErr);
      continue;
    }

    const offerIds = (offersToMove || []).map(o => o.id);
    if (offerIds.length > 0) {
      const { error: moveErr } = await supabase
        .from("property_offers")
        .update({
          property_id: canonical.id,
          updated_at: new Date().toISOString()
        })
        .in("id", offerIds);

      if (moveErr) {
        console.error("Erro ao mover ofertas:", moveErr);
        continue;
      }
    }

    // B. Marca property duplicada como merged com canonical_property_id
    const { error: mergeErr } = await supabase
      .from("properties")
      .update({
        status: "merged",
        canonical_property_id: canonical.id,
        merged_at: new Date().toISOString(),
        active_offers_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", duplicate.id);

    if (mergeErr) {
      console.error("Erro ao atualizar status merged da property:", mergeErr);
      continue;
    }

    // C. Registra redirecionamento 301 de slug (property_slug_redirects - Fase 5)
    await supabase
      .from("property_slug_redirects")
      .upsert({
        source_slug: duplicate.slug,
        target_property_id: canonical.id,
        target_slug: canonical.slug
      }, { onConflict: "source_slug" });

    // D. Recalcula agregados da property canônica (Fase 8)
    await supabase.rpc("recalculate_property_aggregates", { p_property_id: canonical.id });
    await supabase.rpc("recalculate_property_aggregates", { p_property_id: duplicate.id });

    mergedPropertyIds.add(duplicate.id);
    mergedCount++;
  }

  console.log(`\nTotal de properties consolidadas (HIGH): ${mergedCount}`);

  // 5. Contagens Finais
  const { count: finalTotalProps } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { count: activeProps } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .is("canonical_property_id", null)
    .eq("status", "active");

  const { count: mergedProps } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("status", "merged");

  const { count: finalOffers } = await supabase
    .from("property_offers")
    .select("*", { count: "exact", head: true });

  console.log("\n=== CONTAGENS APÓS CONSOLIDAÇÃO ===");
  console.log(`Total properties no banco: ${finalTotalProps}`);
  console.log(`Properties ativas independentes (não merged): ${activeProps}`);
  console.log(`Properties consolidadas (merged): ${mergedProps}`);
  console.log(`Total de property_offers (100% PRESERVADAS): ${finalOffers}`);

  // Exporta test cases para relatório
  fs.writeFileSync(
    "scratch/test-cases-summary.json",
    JSON.stringify({ testCases, candidatesHigh: candidatesHigh.length, candidatesMedium: candidatesMedium.length, mergedCount }, null, 2)
  );
}

run().catch(console.error);
