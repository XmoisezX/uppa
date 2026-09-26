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

function testCohortSort(itemsWithRanking) {
  if (itemsWithRanking.length <= 1) {
    return itemsWithRanking.map(e => e.item);
  }

  const maxScore = itemsWithRanking.reduce((max, e) => Math.max(max, e.ranking.score), 0);
  const topTierThreshold = Math.max(maxScore - 12, 50);

  const cohort1 = [];
  const cohort2 = [];

  for (const entry of itemsWithRanking) {
    if (entry.ranking.score >= topTierThreshold) {
      cohort1.push(entry);
    } else {
      cohort2.push(entry);
    }
  }

  function interleaveCohort(cohort) {
    if (cohort.length === 0) return [];
    if (cohort.length === 1) return [cohort[0].item];

    const agencyGroups = new Map();
    for (const entry of cohort) {
      const agId =
        entry.item.agency?.id ||
        entry.item.agency_id ||
        entry.item.agencyId ||
        "independent";
      if (!agencyGroups.has(agId)) {
        agencyGroups.set(agId, []);
      }
      agencyGroups.get(agId).push(entry);
    }

    // Sort items within each agency
    for (const [_, list] of agencyGroups.entries()) {
      list.sort((a, b) => {
        if (b.ranking.score !== a.ranking.score) {
          return b.ranking.score - a.ranking.score;
        }
        if (b.ranking.breakdown.relevance !== a.ranking.breakdown.relevance) {
          return b.ranking.breakdown.relevance - a.ranking.breakdown.relevance;
        }
        if (b.ranking.breakdown.quality !== a.ranking.breakdown.quality) {
          return b.ranking.breakdown.quality - a.ranking.breakdown.quality;
        }
        if (b.ranking.breakdown.featured !== a.ranking.breakdown.featured) {
          return b.ranking.breakdown.featured - a.ranking.breakdown.featured;
        }
        const dateA = a.item.updatedAt ? new Date(a.item.updatedAt).getTime() : 0;
        const dateB = b.item.updatedAt ? new Date(b.item.updatedAt).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return a.item.id.localeCompare(b.item.id);
      });
    }

    const sortedAgencyIds = Array.from(agencyGroups.keys()).sort();
    const result = [];
    let round = 0;
    let hasMore = true;

    while (hasMore) {
      hasMore = false;
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

      // Sort picks in this round by score DESC, so highest score property gets top position
      roundPicks.sort((a, b) => {
        if (b.ranking.score !== a.ranking.score) {
          return b.ranking.score - a.ranking.score;
        }
        return a.item.id.localeCompare(b.item.id);
      });

      for (const entry of roundPicks) {
        result.push(entry.item);
      }
      round++;
    }

    return result;
  }

  return [...interleaveCohort(cohort1), ...interleaveCohort(cohort2)];
}

async function run() {
  const neighId = "eab04945-d9fc-4e89-b5d3-9986744b6618"; // Três Vendas

  // Fetch top 30 from Aliança, 30 from Taurus, 8 from Imperial Paris
  const { data: propsA } = await supabase
    .from("properties")
    .select("id, title, ranking_score, agency:agencies!agency_id(id, name), updated_at")
    .eq("neighborhood_id", neighId)
    .eq("status", "active")
    .eq("agency_id", "e4632a9d-03dd-4ef4-9954-c1b390b3c93f") // Aliança
    .order("ranking_score", { ascending: false })
    .limit(30);

  const { data: propsT } = await supabase
    .from("properties")
    .select("id, title, ranking_score, agency:agencies!agency_id(id, name), updated_at")
    .eq("neighborhood_id", neighId)
    .eq("status", "active")
    .eq("agency_id", "6dcd90ea-3371-4d84-88db-9b189ae96224") // Taurus
    .order("ranking_score", { ascending: false })
    .limit(30);

  const { data: propsI } = await supabase
    .from("properties")
    .select("id, title, ranking_score, agency:agencies!agency_id(id, name), updated_at")
    .eq("neighborhood_id", neighId)
    .eq("status", "active")
    .eq("agency_id", "d572b380-0c86-4aba-93bb-a14f1c4259a3") // Imperial Paris
    .order("ranking_score", { ascending: false })
    .limit(30);

  const all = [...propsA, ...propsT, ...propsI].map(p => ({
    item: p,
    ranking: {
      score: p.ranking_score || 0,
      breakdown: {
        relevance: 25,
        quality: 15,
        featured: 0,
        verified_brokerage: 10,
        freshness: 10,
        completeness: 5,
        media: 5,
        price: 5,
        engagement: 0,
      }
    }
  }));

  const sorted = testCohortSort(all);

  console.log("=== PÁGINA 1 (PRIMEIROS 12 RESULTADOS) ===");
  sorted.slice(0, 12).forEach((p, i) => {
    console.log(`${i+1}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`);
  });

  console.log("\n=== PÁGINA 2 (RESULTADOS 13 A 24) ===");
  sorted.slice(12, 24).forEach((p, i) => {
    console.log(`${i+13}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`);
  });

  console.log("\n=== PÁGINA 3 (RESULTADOS 25 A 36) ===");
  sorted.slice(24, 36).forEach((p, i) => {
    console.log(`${i+25}. [Score: ${p.ranking_score}] ${p.agency?.name} - ${p.title?.substring(0, 45)}`);
  });
}

run().catch(console.error);
