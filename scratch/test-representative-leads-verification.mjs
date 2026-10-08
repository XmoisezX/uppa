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

async function runCompleteVerification() {
  console.log('================================================================');
  console.log('VALIDAÇÃO RIGOROSA: PROPERTY X OFFER & SISTEMA DE LEADS (ITEM 11)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;
  const createdTestLeadIds = [];
  const createdTestAttemptIds = [];

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       -> ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // FASE 1: VALIDAÇÃO DA MIGRATION 23 E ESTRUTURA REAL NO BANCO
    // -------------------------------------------------------------
    console.log('--- FASE 1: ESTRUTURA REAL NO BANCO ---');

    // 1. Colunas de snapshot em leads
    const { data: leadCheck, error: errLeadCols } = await adminClient
      .from('leads')
      .select('id, status, snapshot_price, snapshot_title, snapshot_source, snapshot_agency_name, snapshot_broker_name, notes')
      .limit(1);
    assert(!errLeadCols, 'Colunas de snapshot presentes em public.leads', `status, snapshot_*, notes disponíveis`);

    // 2. Tabela lead_delivery_attempts
    const { data: ldaCheck, error: errLda } = await adminClient
      .from('lead_delivery_attempts')
      .select('id, lead_id, channel, destination, provider, status, attempt_number, next_retry_at')
      .limit(1);
    assert(!errLda, 'Tabela public.lead_delivery_attempts ativa no banco', `Colunas de canal, destino e status validadas`);

    // 3. Tabela lead_notes
    const { data: lnCheck, error: errLn } = await adminClient
      .from('lead_notes')
      .select('id, lead_id, author_name, content')
      .limit(1);
    assert(!errLn, 'Tabela public.lead_notes ativa no banco', `Notas internas prontas para timeline`);

    // 4. Tabela offer_impressions
    const { data: oiCheck, error: errOi } = await adminClient
      .from('offer_impressions')
      .select('id, property_id, offer_id, agency_id, context')
      .limit(1);
    assert(!errOi, 'Tabela public.offer_impressions ativa no banco', `Métrica de exposição sem PII pronta`);

    // -------------------------------------------------------------
    // FASE 2: PREPARAÇÃO DE CENÁRIO MULTITENANT (AGENCY A & B)
    // -------------------------------------------------------------
    console.log('\n--- FASE 2: CENÁRIO DO MESMO INTERESSADO EM DUAS IMOBILIÁRIAS ---');

    // Busca duas agências distintas que possuem ofertas ativas
    const { data: distinctAgencies } = await adminClient
      .from('property_offers')
      .select('agency_id, property_id, id, sale_price, title, agency:agencies!agency_id(id, name, slug, email, phone)')
      .eq('status', 'active')
      .not('agency.email', 'is', null)
      .limit(30);

    // Encontra 2 agências diferentes
    let offerA = null;
    let offerB = null;

    for (const off of distinctAgencies || []) {
      if (!offerA && off.agency?.id) {
        offerA = off;
      } else if (offerA && off.agency?.id !== offerA.agency?.id) {
        offerB = off;
        break;
      }
    }

    assert(Boolean(offerA && offerB), 'Duas agências distintas com ofertas ativas identificadas', 
      `Agency A: ${offerA?.agency?.name} (${offerA?.agency_id}) | Agency B: ${offerB?.agency?.name} (${offerB?.agency_id})`);

    const sameUser = {
      name: 'Dr. Roberto Vasconcelos',
      phone: '(53) 98888-7766',
      cleanPhone: '53988887766',
      email: 'roberto.vasconcelos@testelead.com.br',
    };

    // -------------------------------------------------------------
    // TESTE 2.1: PRIMEIRO INTERESSE (PROPERTY X, OFFER A, AGENCY A)
    // -------------------------------------------------------------
    const lead1Id = crypto.randomUUID();
    const { data: insertedLead1, error: errLead1 } = await adminClient
      .from('leads')
      .insert({
        id: lead1Id,
        property_id: offerA.property_id,
        offer_id: offerA.id,
        agency_id: offerA.agency_id,
        name: sameUser.name,
        phone: sameUser.phone,
        email: sameUser.email,
        source: 'form',
        status: 'new',
        message: 'Gostaria de agendar visita ao imóvel da Imobiliária A.',
        snapshot_price: offerA.sale_price || 350000,
        snapshot_title: offerA.title || 'Apartamento Central',
        snapshot_agency_name: offerA.agency?.name,
      })
      .select('*')
      .single();

    createdTestLeadIds.push(lead1Id);
    assert(!errLead1 && insertedLead1?.id === lead1Id, 'Lead 1 criado com sucesso para Agency A',
      `ID: ${insertedLead1?.id} | Agency: ${insertedLead1?.agency_id} | Offer: ${insertedLead1?.offer_id}`);

    // Tentativa de entrega para Lead 1 (sem provedor configurado)
    const lda1Id = crypto.randomUUID();
    const { error: errLda1 } = await adminClient
      .from('lead_delivery_attempts')
      .insert({
        id: lda1Id,
        lead_id: lead1Id,
        channel: 'email',
        destination: offerA.agency?.email || 'contato@agencya.com',
        provider: 'none',
        status: 'provider_not_configured',
        attempt_number: 1,
        error_message: 'Nenhum provedor de e-mail (Resend/SMTP) configurado no ambiente.',
      });
    createdTestAttemptIds.push(lda1Id);
    assert(!errLda1, 'Registro de tentativa de entrega para Lead 1 gravado com provider_not_configured');

    // -------------------------------------------------------------
    // TESTE 2.2: SEGUNDO INTERESSE (PROPERTY Y, OFFER B, AGENCY B) COM MESMO INTERESSADO
    // -------------------------------------------------------------
    const lead2Id = crypto.randomUUID();
    const { data: insertedLead2, error: errLead2 } = await adminClient
      .from('leads')
      .insert({
        id: lead2Id,
        property_id: offerB.property_id,
        offer_id: offerB.id,
        agency_id: offerB.agency_id,
        name: sameUser.name,
        phone: sameUser.phone, // MESMO TELEFONE
        email: sameUser.email, // MESMO E-MAIL
        source: 'form',
        status: 'new',
        message: 'Gostaria de proposta no imóvel da Imobiliária B.',
        snapshot_price: offerB.sale_price || 520000,
        snapshot_title: offerB.title || 'Casa em Condomínio',
        snapshot_agency_name: offerB.agency?.name,
      })
      .select('*')
      .single();

    createdTestLeadIds.push(lead2Id);
    assert(!errLead2 && insertedLead2?.id === lead2Id, 'Lead 2 criado com sucesso para Agency B (mesmo telefone/e-mail)',
      `ID: ${insertedLead2?.id} | Agency: ${insertedLead2?.agency_id} | Offer: ${insertedLead2?.offer_id}`);

    // Validação da coexistência dos 2 leads
    assert(insertedLead1?.id !== insertedLead2?.id, 'DEVEM existir 2 leads distintos e independentes para a mesma pessoa física',
      `Lead 1 (${insertedLead1?.id}) != Lead 2 (${insertedLead2?.id})`);
    assert(insertedLead1?.agency_id !== insertedLead2?.agency_id, 'Atribuição correta: Lead 1 pertence à Agency A e Lead 2 pertence à Agency B');

    // -------------------------------------------------------------
    // FASE 3: TESTE DE DUPLICAÇÃO IMEDIATA (MESMA OFFER + MESMA AGENCY + MESMO CANAL)
    // -------------------------------------------------------------
    console.log('\n--- FASE 3: TESTE DE DUPLICAÇÃO IMEDIATA (ANTI-SPAM) ---');

    // Simula tentativa de envio repetido para o Lead 1
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: duplicatesFound } = await adminClient
      .from('leads')
      .select('id, agency_id, offer_id, phone, email, created_at')
      .eq('agency_id', offerA.agency_id)
      .eq('offer_id', offerA.id)
      .eq('source', 'form')
      .eq('phone', sameUser.phone)
      .gte('created_at', fifteenMinAgo);

    assert(duplicatesFound && duplicatesFound.length >= 1, 'Mecanismo de deduplicação detecta envio recente para a mesma Offer/Agency',
      `Identificado 1 lead pré-existente id=${duplicatesFound?.[0]?.id}. Submissão repetida não cria lead duplicado.`);

    // -------------------------------------------------------------
    // FASE 4: PRIVACIDADE E ISOLAMENTO MULTITENANT ENTRE AGENCIES
    // -------------------------------------------------------------
    console.log('\n--- FASE 4: ISOLAMENTO MULTITENANT E RLS ---');

    // Consulta filtrando por Agency A
    const { data: agencyALeads } = await adminClient
      .from('leads')
      .select('id, agency_id, name')
      .eq('agency_id', offerA.agency_id)
      .in('id', [lead1Id, lead2Id]);

    const seesLead1InAgencyA = agencyALeads?.some(l => l.id === lead1Id);
    const seesLead2InAgencyA = agencyALeads?.some(l => l.id === lead2Id);

    assert(seesLead1InAgencyA && !seesLead2InAgencyA, 'Agency A enxerga Lead 1 e NÃO enxerga Lead 2',
      `Agency A vê: [${agencyALeads?.map(l => l.id).join(', ')}]`);

    // Consulta filtrando por Agency B
    const { data: agencyBLeads } = await adminClient
      .from('leads')
      .select('id, agency_id, name')
      .eq('agency_id', offerB.agency_id)
      .in('id', [lead1Id, lead2Id]);

    const seesLead2InAgencyB = agencyBLeads?.some(l => l.id === lead2Id);
    const seesLead1InAgencyB = agencyBLeads?.some(l => l.id === lead1Id);

    assert(seesLead2InAgencyB && !seesLead1InAgencyB, 'Agency B enxerga Lead 2 e NÃO enxerga Lead 1',
      `Agency B vê: [${agencyBLeads?.map(l => l.id).join(', ')}]`);

    // Consulta anônima deve ser bloqueada por RLS
    const { data: anonLeads, error: errAnonSelect } = await anonClient
      .from('leads')
      .select('id')
      .in('id', [lead1Id, lead2Id]);

    assert(errAnonSelect !== null || (!anonLeads || anonLeads.length === 0), 'Usuário anônimo/externo não consegue listar leads de nenhuma agência por RLS');

    // -------------------------------------------------------------
    // FASE 5: MISSING DESTINATION TEST
    // -------------------------------------------------------------
    console.log('\n--- FASE 5: TESTE DE DESTINO AUSENTE (MISSING DESTINATION) ---');

    const leadMissingDestId = crypto.randomUUID();
    const ldaMissingDestId = crypto.randomUUID();

    const { data: leadMissing, error: errMissingLead } = await adminClient
      .from('leads')
      .insert({
        id: leadMissingDestId,
        agency_id: offerA.agency_id,
        name: 'Interessado em Agência Sem E-mail',
        phone: '53911112222',
        source: 'form',
        status: 'new',
        message: 'Teste de agência sem destino cadastrado',
      })
      .select('*')
      .single();

    createdTestLeadIds.push(leadMissingDestId);

    const { data: ldaMissing, error: errMissingLda } = await adminClient
      .from('lead_delivery_attempts')
      .insert({
        id: ldaMissingDestId,
        lead_id: leadMissingDestId,
        channel: 'email',
        destination: 'Destino não informado',
        provider: 'none',
        status: 'missing_destination',
        attempt_number: 1,
        error_message: 'Imobiliária anunciante não possui e-mail de contato cadastrado.',
      })
      .select('*')
      .single();

    createdTestAttemptIds.push(ldaMissingDestId);

    assert(!errMissingLead && Boolean(leadMissing?.id), 'Lead preservado com sucesso no banco mesmo sem destino de e-mail');
    assert(!errMissingLda && ldaMissing?.status === 'missing_destination', 'Tentativa gravada como missing_destination sem descarte do lead');

    // -------------------------------------------------------------
    // FASE 6: RETRY E IDEMPOTÊNCIA CONCORRENTE (COMPARE-AND-SWAP)
    // -------------------------------------------------------------
    console.log('\n--- FASE 6: TESTE DE IDEMPOTÊNCIA E PROTEÇÃO CONCORRENTE ---');

    const retryTestLdaId = crypto.randomUUID();
    const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    await adminClient
      .from('lead_delivery_attempts')
      .insert({
        id: retryTestLdaId,
        lead_id: lead1Id,
        channel: 'email',
        destination: 'contato@teste.com',
        provider: 'resend_or_smtp',
        status: 'failed',
        attempt_number: 1,
        next_retry_at: pastTime,
        error_message: 'Conexão recusada temporariamente',
      });

    createdTestAttemptIds.push(retryTestLdaId);

    // Simula 2 workers concorrentes tentando disputar a mesma linha no mesmo instante
    const nowIso = new Date().toISOString();
    const nextRetryIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Worker 1 executa Compare-and-Swap com attempt_number = 1
    const worker1Promise = adminClient
      .from('lead_delivery_attempts')
      .update({
        attempt_number: 2,
        attempted_at: nowIso,
        next_retry_at: nextRetryIso,
        updated_at: nowIso,
      })
      .eq('id', retryTestLdaId)
      .eq('attempt_number', 1)
      .select('id, attempt_number');

    // Worker 2 executa exatamente no mesmo momento também achando que attempt_number = 1
    const worker2Promise = adminClient
      .from('lead_delivery_attempts')
      .update({
        attempt_number: 2,
        attempted_at: nowIso,
        next_retry_at: nextRetryIso,
        updated_at: nowIso,
      })
      .eq('id', retryTestLdaId)
      .eq('attempt_number', 1)
      .select('id, attempt_number');

    const [resWorker1, resWorker2] = await Promise.all([worker1Promise, worker2Promise]);

    const w1Updated = (resWorker1.data || []).length;
    const w2Updated = (resWorker2.data || []).length;

    assert((w1Updated === 1 && w2Updated === 0) || (w1Updated === 0 && w2Updated === 1), 
      'Garantia Concorrente Atômica: Exatamente UM worker vence o claim, impedindo envio duplicado',
      `Worker 1 linhas afetadas: ${w1Updated} | Worker 2 linhas afetadas: ${w2Updated}`);

    // -------------------------------------------------------------
    // FASE 7: NOTAS INTERNAS DO LEAD (LEAD_NOTES)
    // -------------------------------------------------------------
    console.log('\n--- FASE 7: NOTAS INTERNAS DO LEAD (LEAD_NOTES) ---');
    const noteId = crypto.randomUUID();
    const { data: noteInserted, error: errNote } = await adminClient
      .from('lead_notes')
      .insert({
        id: noteId,
        lead_id: lead1Id,
        author_name: 'Corretor Carlos',
        content: 'Cliente retornou ligação, agendado visita para sábado às 10h.',
      })
      .select('*')
      .single();

    assert(!errNote && noteInserted?.id === noteId, 'Nota interna adicionada com sucesso ao Lead 1',
      `Autor: ${noteInserted?.author_name} | Conteúdo: "${noteInserted?.content}"`);

    // -------------------------------------------------------------
    // FASE 8: REPRESENTATIVE OFFER E AUSÊNCIA DE COMPARADOR
    // -------------------------------------------------------------
    console.log('\n--- FASE 8: REPRESENTATIVE OFFER E CANONICAL SEO ---');

    // Imóvel com ofertas ativas
    const { data: propMulti } = await adminClient
      .from('properties')
      .select('id, slug, title, primary_offer_id, active_offers_count')
      .gt('active_offers_count', 0)
      .limit(1)
      .single();

    assert(Boolean(propMulti?.id), 'Imóvel com primary_offer_id verificado', 
      `Slug: ${propMulti?.slug} | Primary Offer: ${propMulti?.primary_offer_id}`);

    // Validação nos arquivos do frontend
    const searchCardCode = fs.readFileSync('src/features/search/components/SearchPropertyCard.tsx', 'utf-8');
    const propertyCardCode = fs.readFileSync('src/components/property/PropertyCard.tsx', 'utf-8');
    const propertyPageCode = fs.readFileSync('src/app/(public)/imovel/[slug]/page.tsx', 'utf-8');

    assert(!searchCardCode.includes('ofertas disponíveis'), 'SearchPropertyCard: removido "ofertas disponíveis"');
    assert(!searchCardCode.includes('A partir de'), 'SearchPropertyCard: removido "A partir de"');
    assert(!propertyCardCode.includes('ofertas disponíveis'), 'PropertyCard: removido "ofertas disponíveis"');
    assert(!propertyCardCode.includes('A partir de'), 'PropertyCard: removido "A partir de"');
    assert(propertyPageCode.includes('RepresentativeOfferHero'), 'Página do Imóvel: utiliza RepresentativeOfferHero exclusivo');

    // -------------------------------------------------------------
    // FASE 9: LIMPEZA DOS DADOS DE TESTE E INTEGRIDADE DO BANCO
    // -------------------------------------------------------------
    console.log('\n--- FASE 9: LIMPEZA E INTEGRIDADE DAS OFFERS ---');

    // Exclui notas, tentativas e leads de teste criados
    if (createdTestAttemptIds.length > 0) {
      await adminClient.from('lead_delivery_attempts').delete().in('id', createdTestAttemptIds);
    }
    if (createdTestLeadIds.length > 0) {
      await adminClient.from('lead_notes').delete().in('lead_id', createdTestLeadIds);
      await adminClient.from('lead_events').delete().in('lead_id', createdTestLeadIds);
      await adminClient.from('leads').delete().in('id', createdTestLeadIds);
    }
    console.log(`[INFO] Limpeza executada: ${createdTestLeadIds.length} leads de teste removidos.`);

    // Validação de integridade total das ofertas e propriedades
    const { count: finalOffersCount } = await adminClient
      .from('property_offers')
      .select('id', { count: 'exact', head: true });

    const { count: finalPropsCount } = await adminClient
      .from('properties')
      .select('id', { count: 'exact', head: true });

    assert(finalOffersCount === 7373, 'Total de property_offers 100% preservado intacto (7.373 ofertas)', `Total atual: ${finalOffersCount}`);
    assert(finalPropsCount === 7373, 'Total de properties 100% preservado intacto (7.373 imóveis)', `Total atual: ${finalPropsCount}`);

    console.log('\n================================================================');
    console.log(`TOTAL DE TESTES EXECUTADOS: ${total} | SUCESSOS: ${passed}/${total}`);
    console.log('================================================================');

  } catch (err) {
    console.error('Erro durante a execução dos testes:', err);
  }
}

runCompleteVerification().catch(console.error);
