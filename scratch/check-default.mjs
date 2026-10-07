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

async function checkDefault() {
  // Testa insert de property sem active_offers_count para ver o default
  const { data: agencies } = await adminSupabase.from("agencies").select("id").limit(1);
  const agencyId = agencies[0].id;
  const testId = crypto.randomUUID();

  const { data, error } = await adminSupabase.from("properties").insert({
    id: testId,
    agency_id: agencyId,
    external_id: "TEST-DEFAULT-CHECK",
    title: "Test Default Check",
    slug: `test-default-${Date.now()}`,
    property_type: "apartment",
    transaction_type: "sale",
    status: "draft",
  }).select("id, active_offers_count").single();

  console.log("Insert result:", { data, error });

  if (data) {
    await adminSupabase.from("properties").delete().eq("id", testId);
  }
}

checkDefault().catch(console.error);
