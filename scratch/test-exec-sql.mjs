import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSql() {
  const { data, error } = await supabase.rpc("exec_sql", { query: "SELECT 1" });
  console.log("exec_sql:", error ? error.message : data);
}

testSql().catch(console.error);
