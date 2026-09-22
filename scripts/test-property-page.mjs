import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testProperty(slug) {
  console.log("=== TEST PROPERTY:", slug, "===");
  const { data: prop, error } = await supabase
    .from("properties")
    .select(`
      id, title, slug, status, transaction_type, property_type, price, rent_price,
      address_visible, street, number, latitude, longitude,
      agency:agencies(id, name, slug, logo_url, creci, verified_at, phone, whatsapp),
      city:cities(id, name, slug),
      state:states(id, name, code)
    `)
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching property:", error);
    return;
  }

  console.log("Title:", prop.title);
  console.log("Type:", prop.property_type, "| Transaction:", prop.transaction_type);
  console.log("Price:", prop.price, "| Rent Price:", prop.rent_price);
  console.log("Address visible:", prop.address_visible, "| Street in DB:", prop.street);
  console.log("Agency name:", prop.agency?.name, "| CRECI:", prop.agency?.creci, "| Logo:", prop.agency?.logo_url);
  console.log("City:", prop.city?.name, "| State:", prop.state?.code);

  // Test Similar
  const { data: similar } = await supabase
    .from("properties")
    .select("id, title, property_type, transaction_type, price, rent_price")
    .eq("status", "active")
    .eq("city_id", prop.city.id)
    .eq("transaction_type", prop.transaction_type)
    .neq("id", prop.id)
    .limit(4);

  console.log("Similar in same city count:", similar?.length);
  if (similar?.length) {
    similar.forEach((s) =>
      console.log("  - Similar:", s.title.substring(0, 45) + "...", "| Type:", s.property_type)
    );
  }
}

async function run() {
  await testProperty("sobado-central-com-2-dormitorios-lareira-e-piscina-a-1-quadra-da-universidade-catolica-71309");
  console.log("\n");
  await testProperty("apto-novo-disponivel-para-locacao-adap20521");
}

run();
