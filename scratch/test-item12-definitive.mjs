import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.trim().split('='))
);

for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(supabaseUrl, serviceKey);

async function runDefinitiveItem12Suite() {
  console.log('=== INICIANDO SUITE DE TESTES DEFINITIVA DO ITEM 12 ===\n');
  const results = {};
  const cleanupQueue = [];

  const runId = Date.now();
  const domainA = `imob-teste-${runId}.com.br`;
  const domainDifferent = `imob-novo-${runId}.com.br`;
  const domainOtherAgency = `outra-imob-${runId}.com.br`;

  // 0. Snapshot de integridade inicial
  const { count: initialProps } = await admin.from('properties').select('id', { count: 'exact', head: true });
  const { count: initialOffers } = await admin.from('property_offers').select('id', { count: 'exact', head: true });
  console.log(`[0. Integridade Inicial] Properties: ${initialProps} | Offers: ${initialOffers}`);

  let testUserId = null;
  let testUserToken = null;
  let agencyAId = null;
  let agencyBId = null;
  let sourceAId = null;
  let oldJobId = null;
  let newJobId = null;

  try {
    // -------------------------------------------------------------
    // ETAPA A: Criar Agency #123 (discovered) + website_source (uppa_discovery) + job antigo
    // -------------------------------------------------------------
    console.log('\n--- ETAPA A: Criar Agency Discovered e Fonte UPPA Discovery ---');
    agencyAId = crypto.randomUUID();
    cleanupQueue.push(async () => {
      await admin.from('agencies').delete().eq('id', agencyAId);
    });

    const { error: agErr } = await admin.from('agencies').insert({
      id: agencyAId,
      name: `Imobiliária Teste ${runId}`,
      slug: `imob-teste-${runId}`,
      claim_status: 'discovered',
      is_official_profile: false,
      created_source: 'uppa_discovery',
      website: `https://${domainA}`,
      status: 'active',
    });
    if (agErr) throw new Error(`Falha ao criar Agency A: ${agErr.message}`);

    sourceAId = crypto.randomUUID();
    cleanupQueue.push(async () => {
      await admin.from('website_sources').delete().eq('id', sourceAId);
    });

    const { error: wsErr } = await admin.from('website_sources').insert({
      id: sourceAId,
      agency_id: agencyAId,
      base_url: `https://${domainA}`,
      domain: domainA,
      status: 'active',
      connector_type: 'universal_structured_data',
      ingestion_origin: 'uppa_discovery',
      created_by: null,
      metadata: {
        detectedCms: 'wordpress',
        sitemaps: [`https://${domainA}/sitemap.xml`],
        provenance: {
          originalIngestionOrigin: 'uppa_discovery',
          discoveredAt: new Date().toISOString(),
          discoveredBy: 'crawler-worker',
        },
      },
    });
    if (wsErr) throw new Error(`Falha ao criar Source A: ${wsErr.message}`);

    // Criar job histórico (admin_expansion)
    oldJobId = crypto.randomUUID();
    cleanupQueue.push(async () => {
      await admin.from('crawl_tasks').delete().eq('job_id', oldJobId);
      await admin.from('crawl_job_events').delete().eq('job_id', oldJobId);
      await admin.from('crawl_jobs').delete().eq('id', oldJobId);
    });

    await admin.from('crawl_jobs').insert({
      id: oldJobId,
      website_source_id: sourceAId,
      agency_id: agencyAId,
      trigger: 'admin_expansion',
      status: 'completed',
      total_tasks: 1,
      completed_tasks: 1,
    });

    await admin.from('crawl_tasks').insert({
      job_id: oldJobId,
      url: `https://${domainA}/imovel/1`,
      normalized_url: `https://${domainA}/imovel/1`,
      status: 'completed',
    });

    await admin.from('crawl_job_events').insert({
      job_id: oldJobId,
      event: 'job_completed',
      payload: { items: 1 },
    });

    console.log(`✓ Etapa A Concluída: Agency ${agencyAId}, Source ${sourceAId}, Old Job ${oldJobId}`);
    results.etapaA = true;

    // -------------------------------------------------------------
    // ETAPA B: Criar usuário e aprovar claim para a Agency A
    // -------------------------------------------------------------
    console.log('\n--- ETAPA B: Reivindicação (Claim) e Aprovação ---');
    const userEmail = `owner_${runId}@testeuppa.com`;
    const userPassword = 'SafePassword#1234!';
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
    });
    if (userErr) throw new Error(`Falha ao criar usuário: ${userErr.message}`);
    testUserId = userData.user.id;
    cleanupQueue.push(async () => {
      await admin.auth.admin.deleteUser(testUserId);
    });

    // Simula aprovação de claim: status = claimed, is_official_profile = true, member owner
    await admin.from('agencies').update({
      claim_status: 'claimed',
      is_official_profile: true,
      claimed_at: new Date().toISOString(),
      claimed_by: testUserId,
    }).eq('id', agencyAId);

    await admin.from('agency_members').insert({
      agency_id: agencyAId,
      user_id: testUserId,
      role: 'owner',
      status: 'active',
    });
    cleanupQueue.push(async () => {
      await admin.from('agency_members').delete().eq('user_id', testUserId);
    });

    // Login com o usuário owner
    const anon = createClient(supabaseUrl, anonKey);
    const { data: authSession, error: loginErr } = await anon.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });
    if (loginErr) throw new Error(`Falha ao logar como owner: ${loginErr.message}`);
    testUserToken = authSession.session.access_token;

    console.log(`✓ Etapa B Concluída: Usuário ${testUserId} é owner da Agency ${agencyAId} (claimed)`);
    results.etapaB = true;

    // -------------------------------------------------------------
    // ETAPA C & D: Transição segura do mesmo domínio (teste.com.br)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA C & D: Transição do Mesmo Domínio e Preservação de Proveniência ---');
    // Carrega o serviço createOrUpdateWebsiteSource
    const { createOrUpdateWebsiteSource } = await import('../src/features/website-import/services.ts');

    // Executa transição com o mesmo domínio
    const transitionedSource = await createOrUpdateWebsiteSource(
      agencyAId,
      `https://${domainA}`,
      'universal_structured_data'
    );

    // Verificações essenciais:
    // 1. Mesmo ID da source original mantido
    const sameIdKept = transitionedSource.id === sourceAId;
    console.log(`- Mesmo ID preservado: ${sameIdKept} (${transitionedSource.id})`);

    // 2. Apenas 1 source ativa para agencyA + domainA
    const { data: allSourcesForDomain } = await admin
      .from('website_sources')
      .select('id, ingestion_origin, status')
      .eq('agency_id', agencyAId)
      .eq('domain', domainA);
    const onlyOneActiveSource = allSourcesForDomain.length === 1 && allSourcesForDomain[0].status === 'active';
    console.log(`- Total de fontes ativas para ${domainA}: ${allSourcesForDomain.length} (esperado 1)`);

    // 3. Proveniência preservada
    const prov = transitionedSource.provenance || transitionedSource.metadata?.provenance;
    const originNowManaged = transitionedSource.ingestionOrigin === 'agency_managed';
    const originalOriginSaved = prov?.originalIngestionOrigin === 'uppa_discovery';
    const confirmedAtSaved = Boolean(prov?.agencyConfirmedAt);
    const transitionHistorySaved = prov?.transitionHistory?.length > 0;

    console.log(`- ingestion_origin atual: ${transitionedSource.ingestionOrigin}`);
    console.log(`- original_ingestion_origin preservado: ${prov?.originalIngestionOrigin}`);
    console.log(`- agency_confirmed_at registrado: ${prov?.agencyConfirmedAt}`);
    console.log(`- Histórico de transição registrado: ${transitionHistorySaved}`);

    // 4. Auditoria registrada em admin_audit_logs
    const { data: auditLog } = await admin
      .from('admin_audit_logs')
      .select('*')
      .eq('record_id', sourceAId)
      .eq('action', 'WEBSITE_SOURCE_TRANSITIONED')
      .maybeSingle();
    const auditSaved = Boolean(auditLog);
    console.log(`- Registro em admin_audit_logs gravado: ${auditSaved}`);

    results.etapaC = sameIdKept && onlyOneActiveSource && originNowManaged;
    results.etapaD = originalOriginSaved && confirmedAtSaved && transitionHistorySaved && auditSaved;

    // -------------------------------------------------------------
    // ETAPA E: Jobs antigos restritos ao admin
    // -------------------------------------------------------------
    console.log('\n--- ETAPA E: Restrição de Jobs Antigos para a Imobiliária ---');
    const agencyClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${testUserToken}` } },
    });

    // Agency member tenta buscar o job antigo (trigger = admin_expansion)
    const { data: agencyVisibleOldJob } = await agencyClient
      .from('crawl_jobs')
      .select('id, trigger')
      .eq('id', oldJobId)
      .maybeSingle();

    const oldJobHiddenFromAgency = !agencyVisibleOldJob;
    console.log(`- Job histórico (admin_expansion) oculto da imobiliária: ${oldJobHiddenFromAgency}`);

    // Admin consegue ver normalmente
    const { data: adminVisibleOldJob } = await admin
      .from('crawl_jobs')
      .select('id, trigger')
      .eq('id', oldJobId)
      .maybeSingle();
    const oldJobVisibleToAdmin = Boolean(adminVisibleOldJob);
    console.log(`- Job histórico visível para o Admin UPPA: ${oldJobVisibleToAdmin}`);

    results.etapaE = oldJobHiddenFromAgency && oldJobVisibleToAdmin;

    // -------------------------------------------------------------
    // ETAPA F: Novo job após transição pertence à agency
    // -------------------------------------------------------------
    console.log('\n--- ETAPA F: Novo Job Criado Após Transição ---');
    newJobId = crypto.randomUUID();
    cleanupQueue.push(async () => {
      await admin.from('crawl_tasks').delete().eq('job_id', newJobId);
      await admin.from('crawl_job_events').delete().eq('job_id', newJobId);
      await admin.from('crawl_jobs').delete().eq('id', newJobId);
    });

    // Cria novo job da agency com trigger != 'admin_expansion'
    await admin.from('crawl_jobs').insert({
      id: newJobId,
      website_source_id: sourceAId,
      agency_id: agencyAId,
      trigger: 'manual',
      status: 'pending',
      total_tasks: 2,
    });

    // Agency member consulta seus jobs agora
    const { data: agencyVisibleNewJob } = await agencyClient
      .from('crawl_jobs')
      .select('id, trigger, status')
      .eq('id', newJobId)
      .maybeSingle();

    const newJobVisibleToAgency = Boolean(agencyVisibleNewJob);
    console.log(`- Novo job (manual / agency_managed) visível para a imobiliária: ${newJobVisibleToAgency}`);
    results.etapaF = newJobVisibleToAgency;

    // -------------------------------------------------------------
    // ETAPA G: Domínios diferentes podem coexistir
    // -------------------------------------------------------------
    console.log('\n--- ETAPA G: Domínios Diferentes na Mesma Imobiliária ---');
    const sourceDifferent = await createOrUpdateWebsiteSource(
      agencyAId,
      `https://${domainDifferent}`,
      'universal_structured_data'
    );
    cleanupQueue.push(async () => {
      await admin.from('website_sources').delete().eq('id', sourceDifferent.id);
    });

    const { data: agencySourcesBoth } = await admin
      .from('website_sources')
      .select('id, domain')
      .eq('agency_id', agencyAId)
      .in('domain', [domainA, domainDifferent]);

    const bothCoexist = agencySourcesBoth.length === 2 && sourceDifferent.id !== sourceAId;
    console.log(`- Domínios diferentes coexistindo sem fusão indevida: ${bothCoexist} (Fontes: ${agencySourcesBoth.length})`);
    results.etapaG = bothCoexist;

    // -------------------------------------------------------------
    // ETAPA H: Domínio pertencente a outra imobiliária (Bloqueio)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA H: Bloqueio de Domínio Vinculado a Outra Imobiliária ---');
    agencyBId = crypto.randomUUID();
    cleanupQueue.push(async () => {
      await admin.from('agencies').delete().eq('id', agencyBId);
    });

    await admin.from('agencies').insert({
      id: agencyBId,
      name: `Outra Imobiliária ${runId}`,
      slug: `outra-imob-${runId}`,
      claim_status: 'claimed',
      is_official_profile: true,
      website: `https://${domainOtherAgency}`,
      status: 'active',
    });

    // Tentar cadastrar domainOtherAgency na Agency A
    let blockedOtherDomain = false;
    try {
      await createOrUpdateWebsiteSource(agencyAId, `https://${domainOtherAgency}`);
    } catch (err) {
      blockedOtherDomain = true;
      console.log(`- Bloqueio bem sucedido com mensagem: "${err.message}"`);
    }
    results.etapaH = blockedOtherDomain;

    // -------------------------------------------------------------
    // ETAPA I: RLS - Isolamento entre Agency A e Agency B
    // -------------------------------------------------------------
    console.log('\n--- ETAPA I: Validação Rigorosa de RLS Multi-Tenant ---');
    // Criar uma fonte para a Agency B
    const sourceBId = crypto.randomUUID();
    cleanupQueue.push(async () => {
      await admin.from('website_sources').delete().eq('id', sourceBId);
    });
    await admin.from('website_sources').insert({
      id: sourceBId,
      agency_id: agencyBId,
      base_url: `https://${domainOtherAgency}`,
      domain: domainOtherAgency,
      status: 'active',
      connector_type: 'universal_structured_data',
      ingestion_origin: 'agency_managed',
    });

    // Agency A member tenta consultar source da Agency B
    const { data: bSourceQuery } = await agencyClient
      .from('website_sources')
      .select('id')
      .eq('id', sourceBId);
    const sourceBHidden = (!bSourceQuery || bSourceQuery.length === 0);
    console.log(`- Fonte da Agency B invisível para Agency A: ${sourceBHidden}`);

    // Agency A member tenta consultar sua própria fonte
    const { data: aSourceQuery } = await agencyClient
      .from('website_sources')
      .select('id, ingestion_origin')
      .eq('id', sourceAId);
    const sourceAVisible = (aSourceQuery && aSourceQuery.length === 1 && aSourceQuery[0].ingestion_origin === 'agency_managed');
    console.log(`- Própria fonte (agency_managed) visível para Agency A: ${sourceAVisible}`);

    results.etapaRLS = sourceBHidden && sourceAVisible;

    // -------------------------------------------------------------
    // ETAPA J: Integridade Property x Offer
    // -------------------------------------------------------------
    console.log('\n--- ETAPA J: Verificação de Integridade Property x Offer ---');
    const { count: finalProps } = await admin.from('properties').select('id', { count: 'exact', head: true });
    const { count: finalOffers } = await admin.from('property_offers').select('id', { count: 'exact', head: true });
    
    // Ofertas órfãs
    const { data: orphanOffers } = await admin
      .from('property_offers')
      .select('id')
      .is('property_id', null)
      .limit(5);
    const zeroOrphans = !orphanOffers || orphanOffers.length === 0;

    const propsUntouched = finalProps === initialProps;
    const offersUntouched = finalOffers === initialOffers;

    console.log(`- Total de propriedades: ${finalProps} (inicial: ${initialProps}) -> Intacto: ${propsUntouched}`);
    console.log(`- Total de ofertas: ${finalOffers} (inicial: ${initialOffers}) -> Intacto: ${offersUntouched}`);
    console.log(`- Ofertas órfãs: ${orphanOffers?.length || 0} -> Zero órfãs: ${zeroOrphans}`);

    results.integridade = propsUntouched && offersUntouched && zeroOrphans;

  } finally {
    // Cleanup das entidades criadas no teste
    console.log('\n--- EXECUTANDO LIMPEZA DE DADOS DE TESTE ---');
    for (const cleanFn of cleanupQueue.reverse()) {
      try {
        await cleanFn();
      } catch (err) {
        console.warn('Aviso no cleanup:', err.message);
      }
    }
    console.log('✓ Cleanup finalizado com sucesso.');
  }

  console.log('\n=== RESUMO FINAL DOS TESTES DO ITEM 12 ===');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every(v => v === true);
  if (!allPassed) {
    throw new Error('Algum teste do Item 12 falhou!');
  }
  console.log('\n>>> TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! <<<');
}

runDefinitiveItem12Suite().catch(err => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
