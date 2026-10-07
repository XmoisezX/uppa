import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCols() {
  const { data, error } = await supabase.from("properties").select("id, content_hash, last_seen_at").limit(1);
  if (error) {
    console.log("Error querying content_hash / last_seen_at:", error.message);
  } else {
    console.log("Cols exist on properties:", data);
  }
}

checkCols().catch(console.error);
