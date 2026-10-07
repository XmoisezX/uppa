import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getCounts() {
  console.log("=== CONTAGENS REAIS ANTES DA MIGRAÇÃO (COUNT * EXATO) ===");

  const tables = [
    "properties",
    "property_media",
    "property_price_history",
    "property_status_history",
    "leads",
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(`Erro ao contar ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count}`);
    }
  }
}

getCounts().catch(console.error);
