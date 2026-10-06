import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExtensions() {
  const { data: feeds, error: feedsErr } = await supabase.from("feeds").select("id").limit(1);
  console.log("Feeds query:", feedsErr ? feedsErr.message : "OK, " + feeds.length + " feeds");

  // Query cron.job directly
  const { data: cronJobs, error: cronError } = await supabase
    .from("cron.job")
    .select("*");
  console.log("cron.job error:", cronError?.message);

  // Try raw rpc or query to check pg_extension
  // Through postgrest we can only query exposed schemas
}

checkExtensions().catch(console.error);
