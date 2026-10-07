import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from("property_offers").select("id").limit(1);
  console.log("property_offers:", error ? error.message : "Exists!");
}

check().catch(console.error);
