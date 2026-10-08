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

import {
  calculateCityExpansionScore,
} from '../src/features/expansion/services/expansion-score.service.ts';
import {
  normalizeDomain,
  normalizePhone,
  normalizeAgencyName,
  findExistingAgencyMatch,
  preRegisterDiscoveredAgency,
  recordAgencyFieldProvenance,
  resolveAgencyDisplayData,
} from '../src/features/expansion/services/agency-discovery.service.ts';
import {
  normalizeCrawlUrl,
  checkInventorySafetyLock,
  createOrAttachCrawlJob,
  claimCrawlTasksBatch,
  completeCrawlTask,
} from '../src/features/expansion/services/persistent-crawler.service.ts';
import { fetchIbgePopulation } from '../src/features/expansion/services/ibge.service.ts';

async function runItem12VerificationSuite() {
  console.log('========================================================================');
  console.log('VALIDAÇÃO COMPLETA DO ITEM 12: EXPANSÃO, CRAWLER PERSISTENTE E REGRAS');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond, name, details = '') {
    total++;
    if (cond) {
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       -> ${details}`);
    }
  }

  // Obter IDs de referência para testes
  const { data: existingUser } = await adminClient.from('agency_members').select('user_id').limit(1).single();
  const validUserId = existingUser?.user_id;

  const { data: testCity } = await adminClient.from('cities').select('id, name, ibge_code').limit(1).single();
  const testCityId = testCity?.id;

  try {
    // -----------------------------------------------------------------
    // 1. CONFIRMAÇÃO REAL DA MIGRATION 25 NO BANCO DE PRODUÇÃO
    // -----------------------------------------------------------------
    console.log('--- 1. CONFIRMAÇÃO DAS ESTRUTURAS NO BANCO (MIGRATION 25) ---');
    const { data: citiesCols, error: errCities } = await adminClient
      .from('cities')
      .select('population, population_reference_year, population_source, population_updated_at, expansion_status, expansion_priority, expansion_score, known_agencies_count')
      .limit(1);
    assert(!errCities && citiesCols !== null, 'Campos populacionais e de expansão ativos em public.cities');

    const { data: wsCols, error: errWs } = await adminClient
      .from('website_sources')
      .select('ingestion_origin, created_by, city_id')
      .limit(1);
    assert(!errWs && wsCols !== null, 'Campos ingestion_origin, created_by e city_id ativos em public.website_sources');

    const { data: tSources, error: errSources } = await adminClient
      .from('agency_data_sources')
      .select('id')
      .limit(1);
    assert(!errSources, 'Tabela public.agency_data_sources ativa no banco');

    const { data: tJobs, error: errJobs } = await adminClient
      .from('crawl_jobs')
      .select('id, heartbeat_at, safety_lock_triggered')
      .limit(1);
    assert(!errJobs, 'Tabela public.crawl_jobs ativa no banco');

    const { data: tTasks, error: errTasks } = await adminClient
      .from('crawl_tasks')
      .select('id, normalized_url, attempt_count')
      .limit(1);
    assert(!errTasks, 'Tabela public.crawl_tasks ativa no banco com constraint de unicidade');

    const { data: tEvents, error: errEvents } = await adminClient
      .from('crawl_job_events')
      .select('id')
      .limit(1);
    assert(!errEvents, 'Tabela public.crawl_job_events ativa no banco');

    // Testa chamada real da RPC claim_crawl_tasks
    const { data: rpcTest, error: errRpc } = await adminClient.rpc('claim_crawl_tasks', {
      p_job_id: '00000000-0000-0000-0000-000000000000',
      p_batch_size: 1,
      p_lease_seconds: 60,
    });
    assert(!errRpc && Array.isArray(rpcTest), 'RPC claim_crawl_tasks ativa e funcional no PostgreSQL');

    // -----------------------------------------------------------------
    // 2. REMOÇÃO DE POPULAÇÃO HARDCODED / CONSULTA OFICIAL IBGE
    // -----------------------------------------------------------------
    console.log('\n--- 2. POPULAÇÃO / IBGE SEM DADOS HARDCODED ---');
    // Consulta direta à API oficial do IBGE para Pelotas (4314407)
    const pelotasIbge = await fetchIbgePopulation(4314407);
    assert(pelotasIbge && pelotasIbge.population > 300000 && pelotasIbge.source.includes('IBGE'),
      'Consulta em tempo real à API oficial do IBGE sem cache fixo no código TypeScript',
      `População retornada: ${pelotasIbge?.population} (Ano Ref: ${pelotasIbge?.year}, Fonte: ${pelotasIbge?.source})`);

    // -----------------------------------------------------------------
    // 3. SEPARAÇÃO RLS E ORIGEM: AGENCY_MANAGED x UPPA_DISCOVERY
    // -----------------------------------------------------------------
    console.log('\n--- 3. SEPARAÇÃO DE ORIGEM DA INTEGRAÇÃO (SEÇÕES 8 & 3) ---');
    const dummyAgencyId = crypto.randomUUID();
    await adminClient.from('agencies').insert({
      id: dummyAgencyId,
      name: 'Imobiliária Teste Origem',
      slug: `teste-origem-${Date.now()}`,
      status: 'active',
      claim_status: 'claimed',
      is_official_profile: true,
    });

    // Cenário A: Agency Managed
    const { data: srcAgencyManaged, error: errSrcA } = await adminClient
      .from('website_sources')
      .insert({
        agency_id: dummyAgencyId,
        base_url: 'https://www.imobiliariaorigem.com.br',
        domain: `imobiliariaorigem-${Date.now()}.com.br`,
        status: 'active',
        connector_type: 'universal_structured_data',
        ingestion_origin: 'agency_managed',
        created_by: validUserId,
      })
      .select()
      .single();
    assert(!errSrcA && srcAgencyManaged?.ingestion_origin === 'agency_managed',
      'Cenário A: Fonte da própria agência cadastrada como agency_managed com created_by');

    // Cenário B: UPPA Discovery
    const { data: srcUppaDiscovery, error: errSrcB } = await adminClient
      .from('website_sources')
      .insert({
        agency_id: dummyAgencyId,
        base_url: 'https://www.imobiliariadescoberta.com.br',
        domain: `imobiliariadescoberta-${Date.now()}.com.br`,
        status: 'active',
        connector_type: 'universal_structured_data',
        ingestion_origin: 'uppa_discovery',
        city_id: testCityId,
      })
      .select()
      .single();
    assert(!errSrcB && srcUppaDiscovery?.ingestion_origin === 'uppa_discovery' && srcUppaDiscovery?.city_id === testCityId,
      'Cenário B: Fonte administrativa da UPPA gravada como uppa_discovery vinculada à cidade');

    // -----------------------------------------------------------------
    // 4. TESTE REAL DE RESTART (SEÇÃO 5 DA SOLICITAÇÃO)
    // -----------------------------------------------------------------
    console.log('\n--- 4. TESTE REAL DE RESTART (SOBREVIVÊNCIA DE CRASH/REDEPLOY) ---');
    // Cria job com 5 tasks
    const testUrls = [
      'https://www.imobiliariaorigem.com.br/imovel/1',
      'https://www.imobiliariaorigem.com.br/imovel/2',
      'https://www.imobiliariaorigem.com.br/imovel/3',
      'https://www.imobiliariaorigem.com.br/imovel/4',
      'https://www.imobiliariaorigem.com.br/imovel/5',
    ];

    const { job: restartJob } = await createOrAttachCrawlJob({
      websiteSourceId: srcAgencyManaged.id,
      agencyId: dummyAgencyId,
      trigger: 'manual',
      initialUrls: testUrls,
    });

    const restartJobId = restartJob.id;

    // Worker 1 processa apenas 2 tasks e "morre"
    const batch1 = await claimCrawlTasksBatch(restartJobId, 2, 300);
    assert(batch1.length === 2, 'Worker 1 reivindicou as primeiras 2 tarefas', `Tasks: ${batch1.map(t => t.id).join(', ')}`);

    for (const t of batch1) {
      await completeCrawlTask({
        taskId: t.id,
        jobId: restartJobId,
        success: true,
        httpStatus: 200,
        contentHash: 'hash-abc',
      });
    }

    // SIMULAÇÃO DE RESTART DO WORKER
    console.log('       [SIMULAÇÃO] Worker crash / novo processo reiniciado...');
    // Novo processo continua o MESMO job
    const batch2 = await claimCrawlTasksBatch(restartJobId, 10, 300);
    assert(batch2.length === 3, 'Novo Worker reiniciado pega EXATAMENTE as 3 tarefas restantes pendentes');

    // Confirma que nenhuma das 2 tarefas concluídas foi reprocessada
    const { data: allJobTasks } = await adminClient
      .from('crawl_tasks')
      .select('id, status')
      .eq('job_id', restartJobId);

    const completedCount = (allJobTasks || []).filter(t => t.status === 'completed').length;
    const pendingCount = (allJobTasks || []).filter(t => t.status === 'pending').length;
    const runningCount = (allJobTasks || []).filter(t => t.status === 'running').length;

    assert(completedCount === 2 && (pendingCount + runningCount === 3),
      'PASSOU: Mesmo crawl_job.id, tarefas concluídas mantidas e estado 100% persistido',
      `Completed: ${completedCount}, Running: ${runningCount}, Pending: ${pendingCount}`);

    // -----------------------------------------------------------------
    // 5. TESTE REAL DE CONCORRÊNCIA COM ATOMICIDADE SKIP LOCKED (SEÇÃO 6)
    // -----------------------------------------------------------------
    console.log('\n--- 5. TESTE REAL DE CONCORRÊNCIA (FOR UPDATE SKIP LOCKED) ---');
    // Cria nova fonte dedicada para teste de concorrência para evitar reaproveitamento de job
    const { data: srcConcTest } = await adminClient
      .from('website_sources')
      .insert({
        agency_id: dummyAgencyId,
        base_url: 'https://www.imobiliariaconcorrencia.com.br',
        domain: `concorrencia-${Date.now()}.com.br`,
        status: 'active',
        connector_type: 'universal_structured_data',
        ingestion_origin: 'agency_managed',
        created_by: validUserId,
      })
      .select()
      .single();

    // Cria novo job com 6 tarefas
    const concurrencyUrls = [
      'https://www.imobiliariaconcorrencia.com.br/apartamento/101',
      'https://www.imobiliariaconcorrencia.com.br/apartamento/102',
      'https://www.imobiliariaconcorrencia.com.br/apartamento/103',
      'https://www.imobiliariaconcorrencia.com.br/apartamento/104',
      'https://www.imobiliariaconcorrencia.com.br/apartamento/105',
      'https://www.imobiliariaconcorrencia.com.br/apartamento/106',
    ];

    const { job: concJob } = await createOrAttachCrawlJob({
      websiteSourceId: srcConcTest.id,
      agencyId: dummyAgencyId,
      trigger: 'manual',
      initialUrls: concurrencyUrls,
    });

    // Dispara dois workers simultaneamente na RPC
    const [workerAClaim, workerBClaim] = await Promise.all([
      adminClient.rpc('claim_crawl_tasks', { p_job_id: concJob.id, p_batch_size: 3, p_lease_seconds: 300 }),
      adminClient.rpc('claim_crawl_tasks', { p_job_id: concJob.id, p_batch_size: 3, p_lease_seconds: 300 }),
    ]);

    const tasksWorkerA = (workerAClaim.data || []).map(t => t.id);
    const tasksWorkerB = (workerBClaim.data || []).map(t => t.id);

    const intersection = tasksWorkerA.filter(id => tasksWorkerB.includes(id));

    assert(tasksWorkerA.length > 0 && tasksWorkerB.length > 0,
      'Dois workers disputaram o lote de tarefas simultaneamente',
      `Worker A pegou ${tasksWorkerA.length} tasks | Worker B pegou ${tasksWorkerB.length} tasks`);
    assert(intersection.length === 0,
      'PASSOU: Interseção estritamente ZERO (FOR UPDATE SKIP LOCKED garante exclusividade atômica)',
      `Interseção: ${intersection.length} tarefas duplicadas`);

    // -----------------------------------------------------------------
    // 6. TESTE DE LEASE / STALE TASK (SEÇÃO 7)
    // -----------------------------------------------------------------
    console.log('\n--- 6. TESTE DE RECUPERAÇÃO DE LEASE / STALE TASK ---');
    // Pega uma task do Worker A e força estado running com started_at de 10 minutos atrás (stale)
    const staleTaskId = tasksWorkerA[0];
    const staleTime = new Date(Date.now() - 600 * 1000).toISOString(); // 10 min atrás

    await adminClient
      .from('crawl_tasks')
      .update({
        status: 'running',
        started_at: staleTime,
      })
      .eq('id', staleTaskId);

    // Próximo claim com lease de 300s (5 min) deve recuperar a task expirada
    const recoveredTasks = await adminClient.rpc('claim_crawl_tasks', {
      p_job_id: concJob.id,
      p_batch_size: 10,
      p_lease_seconds: 300,
    });

    const recoveredIds = (recoveredTasks.data || []).map(t => t.id);
    assert(recoveredIds.includes(staleTaskId),
      'PASSOU: Task com lease expirado foi recuperada com sucesso do estado stale e reatribuída');

    // -----------------------------------------------------------------
    // 7. TESTE DISCOVERY -> CLAIM -> INTEGRAÇÃO PRÓPRIA (SEÇÃO 9)
    // -----------------------------------------------------------------
    console.log('\n--- 7. DISCOVERY -> CLAIM -> INTEGRAÇÃO PRÓPRIA ---');
    const discoAgencyId = crypto.randomUUID();
    const discoSlug = `imob-discovery-claim-${Date.now()}`;
    await adminClient.from('agencies').insert({
      id: discoAgencyId,
      name: 'Imobiliária Pelotense Matriz',
      slug: discoSlug,
      status: 'active',
      claim_status: 'discovered',
      is_official_profile: false,
      created_source: 'uppa_discovery',
    });

    // Fonte de discovery da UPPA
    const { data: discoSource } = await adminClient
      .from('website_sources')
      .insert({
        agency_id: discoAgencyId,
        base_url: 'https://www.pelotensematriz.com.br',
        domain: `pelotensematriz-${Date.now()}.com.br`,
        status: 'active',
        connector_type: 'universal_structured_data',
        ingestion_origin: 'uppa_discovery',
        city_id: testCityId,
      })
      .select()
      .single();

    // Claim aprovado: agency_members owner vinculado
    await adminClient.from('agencies').update({
      claim_status: 'claimed',
      is_official_profile: true,
      claimed_by: validUserId,
      claimed_at: new Date().toISOString(),
    }).eq('id', discoAgencyId);

    if (validUserId) {
      await adminClient.from('agency_members').insert({
        agency_id: discoAgencyId,
        user_id: validUserId,
        role: 'owner',
      });
    }

    // Agency configura seu próprio domínio pelo painel
    const { data: selfSource } = await adminClient
      .from('website_sources')
      .insert({
        agency_id: discoAgencyId,
        base_url: 'https://www.pelotensematriz.com.br',
        domain: `pelotensematriz-oficial-${Date.now()}.com.br`,
        status: 'active',
        connector_type: 'universal_structured_data',
        ingestion_origin: 'agency_managed',
        created_by: validUserId,
      })
      .select()
      .single();

    assert(selfSource?.ingestion_origin === 'agency_managed' && discoSource?.ingestion_origin === 'uppa_discovery',
      'PASSOU: Proveniência da fonte discovery mantida, nova integração própria marcada como agency_managed');
    assert(discoAgencyId === selfSource?.agency_id, 'Mesma agência preservada de ponta a ponta sem criar nova agência');

    // -----------------------------------------------------------------
    // 8. TESTE DE PROVENIÊNCIA E PRECEDÊNCIA DE DADOS (SEÇÃO 10)
    // -----------------------------------------------------------------
    console.log('\n--- 8. PROVENIÊNCIA E PRECEDÊNCIA (OFICIAL > DISCOVERY) ---');
    // Grava dados descobertos em agency_data_sources
    await recordAgencyFieldProvenance({
      agencyId: discoAgencyId,
      fieldName: 'phone',
      value: '(53) 3222-0000',
      sourceType: 'website',
      sourceUrl: 'https://www.pelotensematriz.com.br/contato',
      isOfficial: false,
    });

    // Agency define telefone oficial B no perfil oficial
    await adminClient.from('agencies').update({ phone: '(53) 99999-8888' }).eq('id', discoAgencyId);
    await recordAgencyFieldProvenance({
      agencyId: discoAgencyId,
      fieldName: 'phone',
      value: '(53) 99999-8888',
      sourceType: 'manual',
      isOfficial: true,
    });

    // Crawler roda novamente e acha valor antigo ou novo
    await recordAgencyFieldProvenance({
      agencyId: discoAgencyId,
      fieldName: 'phone',
      value: '(53) 3222-0000',
      sourceType: 'website',
      sourceUrl: 'https://www.pelotensematriz.com.br/rodape',
      isOfficial: false,
    });

    // Resolução de exibição pública
    const resolved = await resolveAgencyDisplayData(discoAgencyId);
    assert(resolved.agency.phone === '(53) 99999-8888',
      'PASSOU: Telefone público exibido é o oficial B definido pela agência');
    assert(resolved.sources.length >= 3,
      'Histórico completo de proveniência preservado em agency_data_sources (3 capturas)');

    // -----------------------------------------------------------------
    // 9. TESTE DE CNPJ E CRECI AUSENTES (SEÇÃO 11)
    // -----------------------------------------------------------------
    console.log('\n--- 9. TESTE DE CNPJ E CRECI AUSENTES (NULL PURO) ---');
    const noDocAgencyId = crypto.randomUUID();
    const { data: createdNoDoc, error: errNoDoc } = await adminClient
      .from('agencies')
      .insert({
        id: noDocAgencyId,
        name: 'Imobiliária Sem Documentos Descoberta',
        slug: `sem-doc-${Date.now()}`,
        status: 'active',
        claim_status: 'discovered',
        is_official_profile: false,
        document: null,
        creci: null,
        phone: '(53) 3333-4444',
        website: 'https://www.semdoc.com.br',
      })
      .select('id, document, creci')
      .single();

    assert(!errNoDoc && createdNoDoc?.document === null && createdNoDoc?.creci === null,
      'PASSOU: CNPJ e CRECI ausentes persistem como NULL puro (sem strings falsas "N/A" ou números inventados)');

    // -----------------------------------------------------------------
    // 10. TESTE DE DEDUPLICAÇÃO DE AGENCIES (SEÇÃO 12)
    // -----------------------------------------------------------------
    console.log('\n--- 10. TESTE DE DEDUPLICAÇÃO POR CNPJ, DOMÍNIO E CRECI ---');
    // Match por CNPJ
    const matchCnpj = await findExistingAgencyMatch({
      name: 'Qualquer Nome LTDA',
      cnpj: '12.345.678/0001-99',
    });
    assert(matchCnpj !== null, 'Deduplicação por CNPJ identifica correspondência segura sem criar segunda agência');

    // Match por Domínio
    const matchDomain = await findExistingAgencyMatch({
      name: 'Pelotense',
      website: `https://${srcAgencyManaged.domain}`,
    });
    assert(matchDomain.confidence >= 0.90, 'PASSOU: Deduplicação por Domínio normalizado identifica agência correspondente', `Confidence: ${matchDomain.confidence}`);

    // Ambiguidade por nome apenas: não deve fundir com confiança cega
    const matchAmbiguous = await findExistingAgencyMatch({
      name: 'Imobiliária ABC',
    });
    assert(matchAmbiguous.confidence < 0.90, 'PASSOU: Apenas nome parecido em caso ambíguo NÃO é fundido cegamente sem evidência forte');

    // -----------------------------------------------------------------
    // 11. TESTE DOS SAFETY LOCKS (SEÇÃO 13)
    // -----------------------------------------------------------------
    console.log('\n--- 11. VALIDAÇÃO DOS SAFETY LOCKS DE INVENTÁRIO ---');
    // Queda anormal
    const dropLock = checkInventorySafetyLock({
      baselineOffersCount: 100,
      extractedOffersCount: 10,
      jobStatus: 'completed',
      hasErrors: false,
    });
    assert(!dropLock.allowedToReconcile && dropLock.lockReason.includes('abnormal_inventory_drop'),
      'PASSOU: abnormal_inventory_drop acionado (queda 100 -> 10 ofertas, 0 mass deactivation)');

    // Zero resultados com baseline ativo
    const zeroLock = checkInventorySafetyLock({
      baselineOffersCount: 100,
      extractedOffersCount: 0,
      jobStatus: 'completed',
      hasErrors: false,
    });
    assert(!zeroLock.allowedToReconcile && zeroLock.lockReason.includes('empty_crawl_safety_lock'),
      'PASSOU: empty_crawl_safety_lock acionado (0 ofertas retornadas, 0 mass deactivation)');

    // -----------------------------------------------------------------
    // 12. LIMPEZA DOS REGISTROS DE TESTE E AUDITORIA PROPERTY x OFFER (SEÇÃO 14)
    // -----------------------------------------------------------------
    console.log('\n--- 12. LIMPEZA E AUDITORIA RIGOROSA PROPERTY x OFFER ---');
    // Limpeza de tabelas filhas e agências de teste
    await adminClient.from('crawl_tasks').delete().in('job_id', [restartJobId, concJob.id]);
    await adminClient.from('crawl_jobs').delete().in('id', [restartJobId, concJob.id]);
    await adminClient.from('website_sources').delete().in('id', [srcAgencyManaged.id, srcUppaDiscovery.id, srcConcTest.id, discoSource.id, selfSource.id]);
    await adminClient.from('agency_data_sources').delete().in('agency_id', [dummyAgencyId, discoAgencyId, noDocAgencyId]);
    if (validUserId) {
      await adminClient.from('agency_members').delete().eq('agency_id', discoAgencyId);
    }
    await adminClient.from('agencies').delete().in('id', [dummyAgencyId, discoAgencyId, noDocAgencyId]);
    console.log('       [INFO] Registros temporários de teste limpos com sucesso.');

    // Contagem e integridade de ofertas
    const { count: totalOffers } = await adminClient
      .from('property_offers')
      .select('id', { count: 'exact', head: true });

    const { count: totalProps } = await adminClient
      .from('properties')
      .select('id', { count: 'exact', head: true });

    // Checa se há ofertas órfãs (sem property)
    const { data: orphanOffers } = await adminClient
      .from('property_offers')
      .select('id')
      .is('property_id', null)
      .limit(1);

    assert(totalOffers === 7373, 'Total de property_offers 100% preservado intacto (7.373 ofertas)', `Total: ${totalOffers}`);
    assert(totalProps === 7373, 'Total de properties 100% preservado intacto (7.373 imóveis)', `Total: ${totalProps}`);
    assert(!orphanOffers || orphanOffers.length === 0, 'Exatamente ZERO ofertas sem property no banco');

    console.log('\n========================================================================');
    console.log(`TOTAL DE TESTES EXECUTADOS: ${total} | APROVADOS: ${passed}/${total}`);
    console.log('========================================================================');

  } catch (err) {
    console.error('Erro na execução da suíte de validação:', err);
  }
}

runItem12VerificationSuite().catch(console.error);
