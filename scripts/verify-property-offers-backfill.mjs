import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyBackfill() {
  console.log("=== VERIFICAÇÃO DE INTEGRIDADE E CONTAGEM (PROPERTY x OFFER) ===");

  // 1. CONTAGENS REAIS
  const { count: countProperties } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { count: countOffers, error: errOffers } = await supabase
    .from("property_offers")
    .select("*", { count: "exact", head: true });

  const { count: countPropMedia } = await supabase
    .from("property_media")
    .select("*", { count: "exact", head: true });

  const { count: countOfferMedia, error: errOfferMedia } = await supabase
    .from("offer_media")
    .select("*", { count: "exact", head: true });

  const { count: countPropPriceHist } = await supabase
    .from("property_price_history")
    .select("*", { count: "exact", head: true });

  const { count: countOfferPriceHist, error: errOfferPriceHist } = await supabase
    .from("offer_price_history")
    .select("*", { count: "exact", head: true });

  const { count: countPropStatusHist } = await supabase
    .from("property_status_history")
    .select("*", { count: "exact", head: true });

  const { count: countOfferStatusHist, error: errOfferStatusHist } = await supabase
    .from("offer_status_history")
    .select("*", { count: "exact", head: true });

  const { count: countLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  const { count: countLeadsWithOffer } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .not("offer_id", "is", null);

  console.log("\n[1. TABELA COMPARATIVA DE CONTAGENS EXATAS]");
  console.log(`- properties:               ${countProperties}`);
  console.log(`- property_offers:          ${errOffers ? `[Tabela não criada ainda: ${errOffers.message}]` : countOffers}`);
  console.log(`- property_media:           ${countPropMedia}`);
  console.log(`- offer_media:              ${errOfferMedia ? `[Tabela não criada ainda]` : countOfferMedia}`);
  console.log(`- property_price_history:   ${countPropPriceHist}`);
  console.log(`- offer_price_history:      ${errOfferPriceHist ? `[Tabela não criada ainda]` : countOfferPriceHist}`);
  console.log(`- property_status_history:  ${countPropStatusHist}`);
  console.log(`- offer_status_history:     ${errOfferStatusHist ? `[Tabela não criada ainda]` : countOfferStatusHist}`);
  console.log(`- leads totais:             ${countLeads}`);
  console.log(`- leads com offer_id:       ${countLeadsWithOffer ?? 0}`);

  if (countOffers !== undefined && countOffers !== null && countOffers > 0) {
    console.log("\n[2. VALIDAÇÃO DE INTEGRIDADE 1:1]");
    console.log(`Taxa de correspondência (properties -> offers): ${countOffers} / ${countProperties} (${((countOffers/countProperties)*100).toFixed(2)}%)`);
    console.log(`Taxa de correspondência de mídias: ${countOfferMedia} / ${countPropMedia} (${((countOfferMedia/countPropMedia)*100).toFixed(2)}%)`);
  }
}

verifyBackfill().catch(console.error);
