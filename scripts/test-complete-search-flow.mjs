import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function simulateSearch(page = 1, limit = 12) {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618"; // Três Vendas
  const offset = (page - 1) * limit;

  // 1. Base query ordered by ranking_score DESC
  let query = supabase
    .from("properties")
    .select("id, title, ranking_score, agency_id, agency:agencies!agency_id(id, name), published_at, updated_at", { count: "exact" })
    .eq("neighborhood_id", neighId)
    .eq("status", "active")
    .order("ranking_score", { ascending: false, nullsFirst: false });

  // Candidate pool size
  const candidateLimit = Math.min(741, Math.max(250, (offset + limit) * 4));
  const { data: rawCandidates, count } = await query.range(0, candidateLimit - 1);

  // Group candidates by agency
  const agencyGroups = new Map();
  for (const item of rawCandidates || []) {
    const agId = item.agency?.id || "independent";
    if (!agencyGroups.has(agId)) {
      agencyGroups.set(agId, []);
    }
    agencyGroups.get(agId).push(item);
  }

  // Ensure smaller agencies with active listings in this filter are not cut off by bulk score clustering
  // If an agency has fewer than 12 candidates in the pool, check if it has more in this filter
  const candidateIds = new Set((rawCandidates || []).map(r => r.id));
  
  // Find all agencies that have active listings in this neighborhood
  const { data: filterAgencies } = await supabase
    .from("properties")
    .select("agency_id")
    .eq("neighborhood_id", neighId)
    .eq("status", "active");
    
  const uniqueAgencyIds = Array.from(new Set((filterAgencies || []).map(r => r.agency_id).filter(Boolean)));
  
  for (const agId of uniqueAgencyIds) {
    const existing = agencyGroups.get(agId) || [];
    if (existing.length < 12) {
      // Top up to 12 properties for this agency in this filter
      const { data: topUp } = await supabase
        .from("properties")
        .select("id, title, ranking_score, agency_id, agency:agencies!agency_id(id, name), published_at, updated_at")
        .eq("neighborhood_id", neighId)
        .eq("status", "active")
        .eq("agency_id", agId)
        .order("ranking_score", { ascending: false })
        .limit(12);

      for (const prop of topUp || []) {
        if (!candidateIds.has(prop.id)) {
          candidateIds.add(prop.id);
          if (!agencyGroups.has(agId)) agencyGroups.set(agId, []);
          agencyGroups.get(agId).push(prop);
        }
      }
    }
  }

  // Sort within each agency: ranking_score DESC, updated_at DESC, id ASC
  for (const [_, list] of agencyGroups.entries()) {
    list.sort((a, b) => {
      const scoreDiff = (b.ranking_score || 0) - (a.ranking_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return a.id.localeCompare(b.id);
    });
  }

  // Interleave round-robin across agencies
  const sortedAgencyIds = Array.from(agencyGroups.keys()).sort();
  const interleaved = [];
  let round = 0;
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    // Within each round, order the round's picks by ranking_score DESC so highest score takes priority
    const roundPicks = [];
    for (const agId of sortedAgencyIds) {
      const list = agencyGroups.get(agId);
      if (round < list.length) {
        roundPicks.push(list[round]);
        if (round + 1 < list.length) {
          hasMore = true;
        }
      }
    }
    // Sort picks in this round by score DESC
    roundPicks.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));
    for (const item of roundPicks) {
      interleaved.push(item);
    }
    round++;
  }

  const pageItems = interleaved.slice(offset, offset + limit);
  return { pageItems, total: count, page, offset };
}

async function run() {
  console.log("Simulando Busca na Página 1 (Três Vendas):");
  const p1 = await simulateSearch(1, 12);
  p1.pageItems.forEach((p, i) => {
    console.log(`P1-${i+1}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`);
  });

  console.log("\nSimulando Busca na Página 2 (Três Vendas):");
  const p2 = await simulateSearch(2, 12);
  p2.pageItems.forEach((p, i) => {
    console.log(`P2-${i+13}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`);
  });

  // Verificar se há duplicatas entre P1 e P2
  const p1Ids = new Set(p1.pageItems.map(p => p.id));
  const duplicates = p2.pageItems.filter(p => p1Ids.has(p.id));
  console.log("\nDuplicatas entre P1 e P2:", duplicates.length === 0 ? "NENHUMA (Perfeito!)" : `${duplicates.length} duplicatas!`);
}

run().catch(console.error);
