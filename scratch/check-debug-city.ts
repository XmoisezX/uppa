import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getCityTerritorialData, getNeighborhoodTerritorialData } from "@/features/seo/services";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [k, ...v] = trimmed.split("=");
      process.env[k.trim()] = v.join("=").trim();
    }
  }
}

async function run() {
  console.log("Calling getCityTerritorialData('pelotas-rs')...");
  try {
    const data = await getCityTerritorialData("pelotas-rs");
    console.log("Pelotas data:", data ? {
      city: data.city,
      totalCount: data.totalCount,
      isIndexable: data.isIndexable,
      neighCount: data.neighborhoods?.length
    } : null);
  } catch (e) {
    console.error("Error in getCityTerritorialData:", e);
  }

  console.log("Calling getCityTerritorialData('cerrito-rs')...");
  try {
    const data2 = await getCityTerritorialData("cerrito-rs");
    console.log("Cerrito data:", data2 ? {
      city: data2.city,
      totalCount: data2.totalCount,
      isIndexable: data2.isIndexable,
    } : null);
  } catch (e) {
    console.error("Error in Cerrito:", e);
  }

  console.log("Calling getNeighborhoodTerritorialData('pelotas-rs', 'centro')...");
  try {
    const data3 = await getNeighborhoodTerritorialData("pelotas-rs", "centro");
    console.log("Centro data:", data3 ? {
      neighborhood: data3.neighborhood,
      totalCount: data3.totalCount,
      isIndexable: data3.isIndexable,
    } : null);
  } catch (e) {
    console.error("Error in Centro:", e);
  }
}

run();
