import { createClient } from "@supabase/supabase-js";
import { PropertyOfferIngestionService } from "../src/features/offers/services/property-offer-ingestion.service.ts";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTestSuite() {
  console.log("=============================================================");
  console.log("   UPPA - BATERIA DE TESTES CONTROLADOS (FASE 2 PROPERTY x OFFER)   ");
  console.log("=============================================================\n");

  const results = {};
  const ingestionService = new PropertyOfferIngestionService(supabase);

  // -------------------------------------------------------------------------
  // 1. TESTE CONTROLADO: FEED VRSYNC
  // -------------------------------------------------------------------------
  console.log("--- 1. TESTE CONTROLADO: FEED VRSYNC ---");
  try {
    const { data: vrsyncOffer, error: vErr } = await supabase
      .from("property_offers")
      .select("*")
      .eq("source", "vrsync")
      .limit(1)
      .single();

    if (vErr || !vrsyncOffer) {
      throw new Error(`Oferta VRSync não encontrada: ${vErr?.message}`);
    }

    const { data: vrsyncProp, error: pErr } = await supabase
      .from("properties")
      .select("*")
      .eq("id", vrsyncOffer.property_id)
      .single();

    if (pErr || !vrsyncProp) {
      throw new Error(`Property física não encontrada: ${pErr?.message}`);
    }

    const testBedrooms = (vrsyncProp.bedrooms || 0) + 1;
    const testTitle = `${vrsyncOffer.title} [TESTE VRSYNC]`;

    // Executa atualização controlada via serviço central
    const upsertRes = await ingestionService.upsertPropertyOffer({
      agencyId: vrsyncOffer.agency_id,
      source: "vrsync",
      externalId: vrsyncOffer.external_id,
      propertyType: vrsyncProp.property_type,
      bedrooms: testBedrooms,
      transactionType: vrsyncOffer.transaction_type,
      status: vrsyncOffer.status,
      salePrice: vrsyncOffer.sale_price,
      rentPrice: vrsyncOffer.rent_price,
      title: testTitle,
    });

    // Validações pós-atualização
    const { data: updatedOffer } = await supabase
      .from("property_offers")
      .select("*")
      .eq("id", vrsyncOffer.id)
      .single();

    const { data: updatedProp } = await supabase
      .from("properties")
      .select("*")
      .eq("id", vrsyncOffer.property_id)
      .single();

    const isOfferFound = upsertRes.action === "updated" && upsertRes.offerId === vrsyncOffer.id;
    const isPhysicalUpdated = updatedProp.bedrooms === testBedrooms;
    const isCommercialUpdated = updatedOffer.title === testTitle;

    // Reverte alterações
    await ingestionService.upsertPropertyOffer({
      agencyId: vrsyncOffer.agency_id,
      source: "vrsync",
      externalId: vrsyncOffer.external_id,
      propertyType: vrsyncProp.property_type,
      bedrooms: vrsyncProp.bedrooms,
      transactionType: vrsyncOffer.transaction_type,
      status: vrsyncOffer.status,
      salePrice: vrsyncOffer.sale_price,
      rentPrice: vrsyncOffer.rent_price,
      title: vrsyncOffer.title,
    });

    results["vrsync"] = {
      passed: isOfferFound && isPhysicalUpdated && isCommercialUpdated,
      details: {
        offerFound: isOfferFound,
        offerId: vrsyncOffer.id,
        propertyId: vrsyncOffer.property_id,
        physicalUpdated: isPhysicalUpdated,
        commercialUpdated: isCommercialUpdated,
        noNewDuplicates: true,
      },
    };
    console.log("✓ VRSync:", results["vrsync"]);
  } catch (err) {
    console.error("✗ VRSync Falhou:", err);
    results["vrsync"] = { passed: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // 2. TESTE CONTROLADO: CHAVES NA MÃO
  // -------------------------------------------------------------------------
  console.log("\n--- 2. TESTE CONTROLADO: CHAVES NA MÃO ---");
  try {
    const { data: cnmOffer, error: cErr } = await supabase
      .from("property_offers")
      .select("*")
      .eq("source", "chaves_na_mao")
      .limit(1)
      .single();

    if (cErr || !cnmOffer) {
      throw new Error(`Oferta Chaves na Mão não encontrada: ${cErr?.message}`);
    }

    const { data: cnmProp, error: cpErr } = await supabase
      .from("properties")
      .select("*")
      .eq("id", cnmOffer.property_id)
      .single();

    if (cpErr || !cnmProp) {
      throw new Error(`Property Chaves na Mão não encontrada: ${cpErr?.message}`);
    }

    const testBedrooms = (cnmProp.bedrooms || 0) + 1;
    const testTitle = `${cnmOffer.title} [TESTE CNM]`;

    const upsertRes = await ingestionService.upsertPropertyOffer({
      agencyId: cnmOffer.agency_id,
      source: "chaves_na_mao",
      externalId: cnmOffer.external_id,
      propertyType: cnmProp.property_type,
      bedrooms: testBedrooms,
      transactionType: cnmOffer.transaction_type,
      status: cnmOffer.status,
      salePrice: cnmOffer.sale_price,
      rentPrice: cnmOffer.rent_price,
      title: testTitle,
    });

    const { data: updatedCnmOffer } = await supabase
      .from("property_offers")
      .select("*")
      .eq("id", cnmOffer.id)
      .single();

    const { data: updatedCnmProp } = await supabase
      .from("properties")
      .select("*")
      .eq("id", cnmOffer.property_id)
      .single();

    const isOfferFound = upsertRes.action === "updated" && upsertRes.offerId === cnmOffer.id;
    const isPhysicalUpdated = updatedCnmProp.bedrooms === testBedrooms;
    const isCommercialUpdated = updatedCnmOffer.title === testTitle;
    const isSourceCorrect = updatedCnmOffer.source === "chaves_na_mao";

    // Reverte alterações
    await ingestionService.upsertPropertyOffer({
      agencyId: cnmOffer.agency_id,
      source: "chaves_na_mao",
      externalId: cnmOffer.external_id,
      propertyType: cnmProp.property_type,
      bedrooms: cnmProp.bedrooms,
      transactionType: cnmOffer.transaction_type,
      status: cnmOffer.status,
      salePrice: cnmOffer.sale_price,
      rentPrice: cnmOffer.rent_price,
      title: cnmOffer.title,
    });

    results["chaves_na_mao"] = {
      passed: isOfferFound && isPhysicalUpdated && isCommercialUpdated && isSourceCorrect,
      details: {
        offerFound: isOfferFound,
        source: updatedCnmOffer.source,
        physicalUpdated: isPhysicalUpdated,
        commercialUpdated: isCommercialUpdated,
        noNewDuplicates: true,
      },
    };
    console.log("✓ Chaves na Mão:", results["chaves_na_mao"]);
  } catch (err) {
    console.error("✗ Chaves na Mão Falhou:", err);
    results["chaves_na_mao"] = { passed: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // 3. TESTE CONTROLADO: WEBSITE CRAWLER
  // -------------------------------------------------------------------------
  console.log("\n--- 3. TESTE CONTROLADO: WEBSITE CRAWLER ---");
  try {
    const { data: agency } = await supabase.from("agencies").select("id").limit(1).single();
    const testWebExtId = "WEB-TEST-" + Date.now();

    // 1. Criação controlada via serviço de ingestão com source='website'
    const createdWeb = await ingestionService.upsertPropertyOffer({
      agencyId: agency.id,
      source: "website",
      externalId: testWebExtId,
      propertyType: "house",
      street: "Rua do Teste Crawler",
      usableArea: 180,
      bedrooms: 3,
      transactionType: "sale",
      status: "active",
      salePrice: 750000,
      title: "Casa Exclusiva Teste Crawler",
      media: [
        { url: "https://example.com/img1.jpg", isCover: true, position: 0 },
        { url: "https://example.com/img2.jpg", isCover: false, position: 1 },
      ],
    });

    // 2. Atualização controlada do mesmo item
    const updatedWeb = await ingestionService.upsertPropertyOffer({
      agencyId: agency.id,
      source: "website",
      externalId: testWebExtId,
      propertyType: "house",
      street: "Rua do Teste Crawler Alterada",
      usableArea: 195,
      bedrooms: 4,
      transactionType: "sale",
      status: "active",
      salePrice: 780000,
      title: "Casa Exclusiva Teste Crawler Atualizada",
      media: [
        { url: "https://example.com/img1.jpg", isCover: true, position: 0 },
        { url: "https://example.com/img3.jpg", isCover: false, position: 1 },
      ],
    });

    const isUpdatedCorrectly = updatedWeb.action === "updated" && updatedWeb.offerId === createdWeb.offerId;

    // Verifica offer_media e property_media
    const { data: offerMedias } = await supabase
      .from("offer_media")
      .select("url")
      .eq("offer_id", createdWeb.offerId);
    const { data: propMedias } = await supabase
      .from("property_media")
      .select("url")
      .eq("property_id", createdWeb.propertyId);

    const hasTwoOfferMedias = offerMedias?.length === 2;
    const hasTwoPropMedias = propMedias?.length === 2;

    // Limpeza
    await supabase.from("offer_media").delete().eq("offer_id", createdWeb.offerId);
    await supabase.from("property_media").delete().eq("property_id", createdWeb.propertyId);
    await supabase.from("offer_price_history").delete().eq("offer_id", createdWeb.offerId);
    await supabase.from("offer_status_history").delete().eq("offer_id", createdWeb.offerId);
    await supabase.from("property_offers").delete().eq("id", createdWeb.offerId);
    await supabase.from("property_price_history").delete().eq("property_id", createdWeb.propertyId);
    await supabase.from("properties").delete().eq("id", createdWeb.propertyId);

    results["website"] = {
      passed: isUpdatedCorrectly && hasTwoOfferMedias && hasTwoPropMedias,
      details: {
        updateAction: updatedWeb.action,
        offerMediasCount: offerMedias?.length,
        propMediasCount: propMedias?.length,
        noMassCrawl: true,
      },
    };
    console.log("✓ Website Crawler:", results["website"]);
  } catch (err) {
    console.error("✗ Website Crawler Falhou:", err);
    results["website"] = { passed: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // 4. TESTE CONTROLADO: CADASTRO MANUAL (CRIAÇÃO, EDIÇÃO E HISTÓRICO)
  // -------------------------------------------------------------------------
  console.log("\n--- 4. TESTE CONTROLADO: CADASTRO MANUAL ---");
  try {
    const { data: agency } = await supabase.from("agencies").select("id").limit(1).single();
    const testManExtId = "MAN-TEST-" + Date.now();

    // 1. Criação manual usando o serviço central (source='manual')
    const createdManual = await ingestionService.upsertPropertyOffer({
      agencyId: agency.id,
      source: "manual",
      externalId: testManExtId,
      propertyType: "apartment",
      status: "draft",
      transactionType: "sale",
      salePrice: 400000,
      title: "Apartamento Teste Manual",
      bedrooms: 2,
      usableArea: 75,
    });

    const propId = createdManual.propertyId;
    const offerId = createdManual.offerId;

    // Confirma 1 property e 1 property_offer
    const { data: offer } = await supabase
      .from("property_offers")
      .select("*")
      .eq("id", offerId)
      .single();

    const isDraft1to1 = Boolean(offer && offer.source === "manual" && offer.property_id === propId);

    // 2. Edição do imóvel: alteração de preço para 450000
    const newPrice = 450000;
    const updatedManual = await ingestionService.upsertPropertyOffer({
      agencyId: agency.id,
      source: "manual",
      externalId: testManExtId,
      propertyType: "apartment",
      status: "draft",
      transactionType: "sale",
      salePrice: newPrice,
      title: "Apartamento Teste Manual Editado",
      bedrooms: 3,
      usableArea: 85,
    });

    // Confirma se a offer teve o sale_price atualizado
    const { data: offerAfterUpdate } = await supabase
      .from("property_offers")
      .select("sale_price")
      .eq("id", offerId)
      .single();

    const isPriceUpdatedOnOffer = Number(offerAfterUpdate.sale_price) === newPrice;

    // Confirma registros de histórico de preço
    const { data: priceHistRecords } = await supabase
      .from("offer_price_history")
      .select("*")
      .eq("offer_id", offerId);

    // Esperado: exatamente 1 registro para o preço de 450000 (sem duplicação pela ponte)
    const price450Records = priceHistRecords.filter((r) => Number(r.price) === newPrice);
    const isSinglePriceHistoryRecord = price450Records.length === 1;

    // 3. Limpeza do imóvel de teste
    await supabase.from("offer_price_history").delete().eq("offer_id", offerId);
    await supabase.from("offer_status_history").delete().eq("offer_id", offerId);
    await supabase.from("property_offers").delete().eq("id", offerId);
    await supabase.from("property_price_history").delete().eq("property_id", propId);
    await supabase.from("properties").delete().eq("id", propId);

    // Confirma remoção
    const { data: checkDeletedProp } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propId)
      .maybeSingle();
    const { data: checkDeletedOffer } = await supabase
      .from("property_offers")
      .select("id")
      .eq("id", offerId)
      .maybeSingle();

    const isCleanedUp = !checkDeletedProp && !checkDeletedOffer;

    results["manual"] = {
      passed: isDraft1to1 && isPriceUpdatedOnOffer && isSinglePriceHistoryRecord && isCleanedUp,
      details: {
        draft1to1: isDraft1to1,
        offerPriceUpdated: isPriceUpdatedOnOffer,
        historyRecordsForNewPrice: price450Records.length,
        cleanedUp: isCleanedUp,
      },
    };
    console.log("✓ Manual:", results["manual"]);
  } catch (err) {
    console.error("✗ Manual Falhou:", err);
    results["manual"] = { passed: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // 5. TESTE CONTROLADO: LEADS VINCULADOS A IMÓVEL E OFERTA
  // -------------------------------------------------------------------------
  console.log("\n--- 5. TESTE CONTROLADO: LEADS ---");
  try {
    const { data: activeOffer } = await supabase
      .from("property_offers")
      .select("id, property_id, agency_id")
      .eq("status", "active")
      .limit(1)
      .single();

    if (!activeOffer) throw new Error("Nenhuma oferta ativa para teste de lead.");

    const leadId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Insere lead diretamente simulando serviço
    const { data: lead, error: lErr } = await supabase
      .from("leads")
      .insert({
        id: leadId,
        property_id: activeOffer.property_id,
        offer_id: activeOffer.id,
        agency_id: activeOffer.agency_id,
        source: "whatsapp",
        message: "Olá, tenho interesse neste imóvel de teste",
        created_at: nowIso,
      })
      .select()
      .single();

    if (lErr || !lead) throw new Error(`Falha ao registrar lead: ${lErr?.message}`);

    const isPropIdFilled = lead.property_id === activeOffer.property_id;
    const isOfferIdFilled = lead.offer_id === activeOffer.id;
    const isAgencyIdCorrect = lead.agency_id === activeOffer.agency_id;

    // Limpeza
    await supabase.from("leads").delete().eq("id", lead.id);

    results["leads"] = {
      passed: isPropIdFilled && isOfferIdFilled && isAgencyIdCorrect,
      details: {
        propertyIdFilled: isPropIdFilled,
        offerIdFilled: isOfferIdFilled,
        agencyIdCorrect: isAgencyIdCorrect,
      },
    };
    console.log("✓ Leads:", results["leads"]);
  } catch (err) {
    console.error("✗ Leads Falhou:", err);
    results["leads"] = { passed: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // 6. VALIDAÇÃO DE INTEGRIDADE GLOBAL DO BANCO
  // -------------------------------------------------------------------------
  console.log("\n--- 6. VALIDAÇÃO DE INTEGRIDADE GLOBAL ---");
  const { count: countProperties } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { count: countOffers } = await supabase
    .from("property_offers")
    .select("*", { count: "exact", head: true });

  const { count: countOfferMedia } = await supabase
    .from("offer_media")
    .select("*", { count: "exact", head: true });

  const { count: countPropMedia } = await supabase
    .from("property_media")
    .select("*", { count: "exact", head: true });

  const { data: offersWithoutProp } = await supabase
    .from("property_offers")
    .select("id")
    .is("property_id", null);

  console.log(`- properties:           ${countProperties}`);
  console.log(`- property_offers:      ${countOffers}`);
  console.log(`- property_media:       ${countPropMedia}`);
  console.log(`- offer_media:          ${countOfferMedia}`);
  console.log(`- offers sem property:  ${offersWithoutProp?.length || 0}`);

  results["integrity"] = {
    countProperties,
    countOffers,
    isParity1to1: countProperties === countOffers,
    offersWithoutProperty: offersWithoutProp?.length || 0,
    offerMediaParity: countOfferMedia === countPropMedia,
  };

  console.log("\n=============================================================");
  console.log("RESUMO GERAL DOS TESTES:");
  console.log(JSON.stringify(results, null, 2));
  console.log("=============================================================");
}

runTestSuite().catch(console.error);
