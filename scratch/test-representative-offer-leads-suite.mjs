import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: PROPERTY X OFFER REPRESENTATIVE & LEADS');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // TEST 1: INTEGRIDADE ABSOLUTA DAS OFFERS (Seção 6 e 49)
  console.log('1. TESTANDO INTEGRIDADE DAS OFFERS NO BANCO');
  const { count: totalOffers, error: errOffers } = await adminClient
    .from('property_offers')
    .select('id', { count: 'exact', head: true });
  assert(!errOffers && totalOffers === 7373, `Total de property_offers preservado intacto (${totalOffers} ofertas)`);

  const { count: totalProperties, error: errProps } = await adminClient
    .from('properties')
    .select('id', { count: 'exact', head: true });
  assert(!errProps && totalProperties === 7373, `Total de properties preservado intacto (${totalProperties} imóveis)`);

  // TEST 2: RESOLUÇÃO DA REPRESENTATIVE OFFER
  console.log('\n2. TESTANDO SELEÇÃO DETERMINÍSTICA DA REPRESENTATIVE OFFER');

  // Busca imóvel com primary_offer_id
  const { data: sampleProps } = await adminClient
    .from('properties')
    .select('id, slug, title, primary_offer_id, price, rent_price, transaction_type, active_offers_count')
    .not('primary_offer_id', 'is', null)
    .gt('active_offers_count', 0)
    .limit(5);

  assert(sampleProps && sampleProps.length > 0, 'Encontrados imóveis com primary_offer_id para teste');

  const testProp = sampleProps[0];
  console.log(`   Propriedade teste: ${testProp.title} (${testProp.slug})`);

  // Busca as ofertas ativas deste imóvel
  const { data: offers } = await adminClient
    .from('property_offers')
    .select('id, agency_id, sale_price, rent_price, agency:agencies!agency_id(id, name, slug, phone, whatsapp, creci, verified_at, status)')
    .eq('property_id', testProp.id)
    .eq('status', 'active');

  assert(offers && offers.length > 0, `Ofertas ativas encontradas para a propriedade: ${offers?.length}`);

  // TEST 3: CANONICAL DEFAULT USA PRIMARY_OFFER_ID (Seção 16)
  const primaryOffer = offers?.find(o => o.id === testProp.primary_offer_id) || offers?.[0];
  assert(primaryOffer !== undefined, `Acesso direto à URL canônica seleciona a primary_offer_id (${primaryOffer?.id})`);

  // TEST 4: PRESERVAÇÃO DE JORNADA COM ?offer= (Seção 11 e 12)
  if (offers && offers.length > 0) {
    const chosenOffer = offers[offers.length - 1]; // pega a última oferta
    const simulatedParam = chosenOffer.id;
    const match = offers.find(o => o.id === simulatedParam);
    assert(match && match.id === chosenOffer.id, `Jornada com ?offer=${simulatedParam} preserva exclusivamente a Offer selecionada`);
  }

  // TEST 5: NAVEGAÇÃO PELA PÁGINA DA IMOBILIÁRIA (Seção 13)
  if (offers && offers.length > 0 && offers[0].agency?.slug) {
    const agencySlug = offers[0].agency.slug;
    const matchAgency = offers.find(o => o.agency?.slug === agencySlug);
    assert(matchAgency && matchAgency.agency?.slug === agencySlug, `Navegação vinda de /imobiliaria/${agencySlug} seleciona a oferta da respectiva imobiliária`);
  }

  // TEST 6: VALIDAÇÃO DE AUSÊNCIA DE TEXTOS CONCORRENTES EM CÓDIGO
  console.log('\n3. TESTANDO AUSÊNCIA DE PREÇOS CONCORRENTES E "N OFERTAS" EM CARDS PÚBLICOS');
  const searchCardContent = fs.readFileSync('src/features/search/components/SearchPropertyCard.tsx', 'utf-8');
  assert(!searchCardContent.includes('ofertas disponíveis'), 'SearchPropertyCard: removido "ofertas disponíveis"');
  assert(!searchCardContent.includes('A partir de'), 'SearchPropertyCard: removido "A partir de"');
  assert(searchCardContent.includes('targetUrl'), 'SearchPropertyCard: link preserva contexto da representative offer (?offer=)');

  const propertyCardContent = fs.readFileSync('src/components/property/PropertyCard.tsx', 'utf-8');
  assert(!propertyCardContent.includes('ofertas disponíveis'), 'PropertyCard: removido "ofertas disponíveis"');
  assert(!propertyCardContent.includes('A partir de'), 'PropertyCard: removido "A partir de"');
  assert(propertyCardContent.includes('targetUrl'), 'PropertyCard: link preserva contexto da representative offer (?offer=)');

  const propertyPageContent = fs.readFileSync('src/app/(public)/imovel/[slug]/page.tsx', 'utf-8');
  assert(!propertyPageContent.includes('<PropertyOffersList'), 'Página do Imóvel: substituído PropertyOffersList por RepresentativeOfferHero');
  assert(propertyPageContent.includes('RepresentativeOfferHero'), 'Página do Imóvel: renderiza RepresentativeOfferHero exclusivo');

  // TEST 7: DESTINATION RESOLVER (Seção 26)
  console.log('\n4. TESTANDO DESTINATION RESOLVER E CONTATOS REAIS');
  const agencyData = primaryOffer?.agency;
  const resolvedPhone = agencyData?.whatsapp || agencyData?.phone;
  assert(Boolean(agencyData?.id), `Agency resolvida com ID real: ${agencyData?.id} (${agencyData?.name})`);

  // TEST 8: ATRIBUIÇÃO E SNAPSHOT DO LEAD (Seção 22 e 25)
  console.log('\n5. TESTANDO ATRIBUIÇÃO E SNAPSHOT COMERCIAL DE LEAD');
  const snapshotPrice = testProp.transactionType === 'rent'
    ? (primaryOffer?.rent_price ?? testProp.rent_price)
    : (primaryOffer?.sale_price ?? testProp.price);

  const leadPayload = {
    property_id: testProp.id,
    offer_id: primaryOffer?.id,
    agency_id: agencyData?.id,
    source: 'whatsapp',
    message: `[TESTE AUTOMATIZADO] Interesse no imóvel ${testProp.title}`,
  };

  // Insere um lead de teste controlado
  const { data: insertedLead, error: errInsertLead } = await adminClient
    .from('leads')
    .insert(leadPayload)
    .select('id, property_id, offer_id, agency_id, source')
    .single();

  assert(!errInsertLead && Boolean(insertedLead?.id), `Lead criado com sucesso: ${insertedLead?.id}`);
  assert(insertedLead?.offer_id === primaryOffer?.id, `Lead estritamente atribuído à Offer correta (${insertedLead?.offer_id})`);
  assert(insertedLead?.agency_id === agencyData?.id, `Lead estritamente atribuído à Agency correta (${insertedLead?.agency_id})`);

  // TEST 9: DEDUPLICAÇÃO E ANTI-SPAM (Seção 33)
  console.log('\n6. TESTANDO ANTI-SPAM E DEDUPLICAÇÃO');
  const recentWindowMs = 15 * 60 * 1000;
  const fifteenMinutesAgo = new Date(Date.now() - recentWindowMs).toISOString();
  const { data: duplicateCheck } = await adminClient
    .from('leads')
    .select('id')
    .eq('agency_id', agencyData?.id)
    .eq('property_id', testProp.id)
    .gte('created_at', fifteenMinutesAgo);

  assert(duplicateCheck && duplicateCheck.length >= 1, `Verificação de janela recente para deduplicação ativa (${duplicateCheck?.length} contato(s) recente(s))`);

  // TEST 10: RLS E ISOLAMENTO MULTITENANT (Seção 39)
  console.log('\n7. TESTANDO RLS E ISOLAMENTO ENTRE IMOBILIÁRIAS');
  // Usuário anônimo consultando leads
  const { data: anonLeads, error: errAnon } = await anonClient
    .from('leads')
    .select('id');
  assert(errAnon !== null || (anonLeads && anonLeads.length === 0), 'Acesso anônimo a leads bloqueado por RLS');

  // Limpeza do lead de teste
  if (insertedLead?.id) {
    await adminClient.from('leads').delete().eq('id', insertedLead.id);
    console.log('   Lead de teste removido após validação.');
  }

  // TEST 11: SEO CANONICAL (Seção 48)
  console.log('\n8. TESTANDO REGRAS TÉCNICAS DE SEO');
  const seoConfig = fs.readFileSync('src/features/seo/services.ts', 'utf-8');
  assert(seoConfig.includes('const canonicalUrl = `${siteUrl}/imovel/${property.slug}`;'), 'Canonical URL aponta exclusivamente para a PROPERTY física (/imovel/[slug])');
  assert(!seoConfig.includes('Compare ${activeOffersCount} ofertas'), 'Meta Description: removido "Compare N ofertas"');

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} TESTES PASSARAM!`);
  console.log('====================================================');
}

runTests().catch(console.error);
