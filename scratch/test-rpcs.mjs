import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listRpcs() {
  const rpcs = [
    "acquire_feed_sync_lock",
    "release_feed_sync_lock",
    "calculate_property_ranking_score",
    "search_properties_bbox",
    "exec_sql",
    "run_sql",
    "execute_sql",
    "pgmq_send",
    "query"
  ];

  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc, {});
    console.log(`RPC ${rpc}:`, error ? error.message : "Found!");
  }
}

listRpcs().catch(console.error);
