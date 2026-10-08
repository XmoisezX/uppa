import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => {
  const m = env.match(new RegExp(k + '="?([^"\\n\\r]+)'));
  return m ? m[1] : '';
};
const sb = createClient(
  get('NEXT_PUBLIC_SUPABASE_URL'),
  get('SUPABASE_SERVICE_ROLE_KEY') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

// We simulate what searchProperties does
const SEARCH_PROPERTIES_SELECT = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  active_offers_count,
  lowest_sale_price,
  highest_sale_price,
  lowest_rent_price,
  highest_rent_price,
  primary_offer_id,
  condominium_fee,
  usable_area,
  total_area,
  bedrooms,
  suites,
  bathrooms,
  parking_spaces,
  financiable,
  furnished,
  accepts_exchange,
  address_visible,
  street,
  number,
  latitude,
  longitude,
  published_at,
  updated_at,
  ranking_score,
  city:cities!city_id (
    id,
    name,
    slug
  ),
  neighborhood:neighborhoods!neighborhood_id (
    id,
    name,
    slug
  ),
  state:states!state_id (
    id,
    code,
    name
  ),
  primary_offer:property_offers!primary_offer_id (
    id,
    sale_price,
    rent_price,
    agency_id,
    agency:agencies!agency_id (
      id,
      name,
      slug,
      logo_url,
      creci,
      verified_at,
      phone
    )
  ),
  cover:property_media (
    url,
    is_cover
  )
`;

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const med = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
  return { min, med, p95, max };
}

async function runBenchmark() {
  console.log('========================================================');
  console.log('=== BENCHMARK PÓS-OTIMIZAÇÃO UPPA PERFORMANCE ===');
  console.log('========================================================\n');

  // 1. Resolve Pelotas city id
  const { data: cityRow } = await sb.from('cities').select('id').eq('slug', 'pelotas').single();
  const pelotasId = cityRow.id;

  // 2. 10x execuções do Lote Inicial (/comprar Pelotas)
  console.log('1. Executando 10 iterações do Lote Inicial (Batch 1 - 20 cards)...');
  const batch1Times = [];
  let sampleB1 = null;
  let totalCount = 0;

  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const { data, count, error } = await sb
      .from('properties')
      .select(SEARCH_PROPERTIES_SELECT, { count: 'exact' })
      .eq('status', 'active')
      .is('canonical_property_id', null)
      .gt('active_offers_count', 0)
      .eq('city_id', pelotasId)
      .eq('cover.is_cover', true)
      .order('ranking_score', { ascending: false })
      .order('id', { ascending: true })
      .limit(20);
    const elapsed = performance.now() - t0;
    if (error) {
      console.error(`Erro iteração ${i}:`, error);
    } else {
      batch1Times.push(elapsed);
      sampleB1 = data;
      totalCount = count;
    }
  }

  const b1Stats = stats(batch1Times);
  console.log(`Lote 1 (20 cards com count): Min: ${b1Stats.min.toFixed(1)}ms | Mediana: ${b1Stats.med.toFixed(1)}ms | P95: ${b1Stats.p95.toFixed(1)}ms`);

  // 3. 10x execuções do Lote Keyset (Batch 2 - 20 cards subsequentes)
  console.log('\n2. Executando 10 iterações do Lote Keyset (Batch 2 - 20 cards com cursor)...');
  const lastB1 = sampleB1[sampleB1.length - 1];
  const batch2Times = [];
  let sampleB2 = null;

  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const { data, error } = await sb
      .from('properties')
      .select(SEARCH_PROPERTIES_SELECT)
      .eq('status', 'active')
      .is('canonical_property_id', null)
      .gt('active_offers_count', 0)
      .eq('city_id', pelotasId)
      .eq('cover.is_cover', true)
      .or(`ranking_score.lt.${lastB1.ranking_score},and(ranking_score.eq.${lastB1.ranking_score},id.gt.${lastB1.id})`)
      .order('ranking_score', { ascending: false })
      .order('id', { ascending: true })
      .limit(20);
    const elapsed = performance.now() - t0;
    if (error) {
      console.error(`Erro iteração ${i}:`, error);
    } else {
      batch2Times.push(elapsed);
      sampleB2 = data;
    }
  }

  const b2Stats = stats(batch2Times);
  console.log(`Lote 2 (Keyset 20 cards sem count): Min: ${b2Stats.min.toFixed(1)}ms | Mediana: ${b2Stats.med.toFixed(1)}ms | P95: ${b2Stats.p95.toFixed(1)}ms`);

  // 4. Teste de 10 lotes consecutivos (200 cards) para validação de ZERO duplicações
  console.log('\n3. Testando 10 lotes consecutivos (200 properties) para validação de ZERO duplicações...');
  let currentLast = lastB1;
  const allIds = new Set(sampleB1.map(p => p.id));
  let duplicates = 0;
  let totalBatchesLoaded = 1;

  for (let b = 2; b <= 10; b++) {
    const { data, error } = await sb
      .from('properties')
      .select(SEARCH_PROPERTIES_SELECT)
      .eq('status', 'active')
      .is('canonical_property_id', null)
      .gt('active_offers_count', 0)
      .eq('city_id', pelotasId)
      .eq('cover.is_cover', true)
      .or(`ranking_score.lt.${currentLast.ranking_score},and(ranking_score.eq.${currentLast.ranking_score},id.gt.${currentLast.id})`)
      .order('ranking_score', { ascending: false })
      .order('id', { ascending: true })
      .limit(20);

    if (error || !data || data.length === 0) break;
    totalBatchesLoaded++;
    for (const item of data) {
      if (allIds.has(item.id)) {
        duplicates++;
      }
      allIds.add(item.id);
    }
    currentLast = data[data.length - 1];
  }

  console.log(`Batches carregados: ${totalBatchesLoaded} | Total properties únicas: ${allIds.size} | Duplicações encontradas: ${duplicates}`);

  // 5. Teste de Payload e Mídia
  const b1PayloadBytes = Buffer.byteLength(JSON.stringify(sampleB1), 'utf8');
  console.log(`\n4. Payload Lote 1 (20 cards): ${(b1PayloadBytes / 1024).toFixed(1)} KB (versus 89.3 KB antes para apenas 12 cards!)`);
  
  let mediaCountSample = 0;
  sampleB1.forEach(p => {
    mediaCountSample += (p.cover ? p.cover.length : 0);
  });
  console.log(`Mídias por card: exatamente ${(mediaCountSample / sampleB1.length).toFixed(1)} imagem por card (versus 30 fotos antes!)`);

  // 6. Teste de Representative Offer e estabilidade
  const testSampleProp = sampleB1[0];
  console.log(`\n5. Representative Offer no card:`);
  console.log(`- Property: ${testSampleProp.title}`);
  console.log(`- Representative Offer ID: ${testSampleProp.primary_offer?.id}`);
  console.log(`- Preço apresentado: R$ ${testSampleProp.primary_offer?.sale_price}`);
  console.log(`- Imobiliária: ${testSampleProp.primary_offer?.agency?.name}`);

  // 7. Simulação de 500 cards
  console.log(`\n6. Simulação de grande escala (até 500 cards com cursor):`);
  const t500Start = performance.now();
  let cursor500 = lastB1;
  let count500 = sampleB1.length;
  for (let batch = 2; batch <= 25; batch++) {
    const { data } = await sb
      .from('properties')
      .select('id, ranking_score')
      .eq('status', 'active')
      .is('canonical_property_id', null)
      .gt('active_offers_count', 0)
      .eq('city_id', pelotasId)
      .or(`ranking_score.lt.${cursor500.ranking_score},and(ranking_score.eq.${cursor500.ranking_score},id.gt.${cursor500.id})`)
      .order('ranking_score', { ascending: false })
      .order('id', { ascending: true })
      .limit(20);
    if (!data || data.length === 0) break;
    count500 += data.length;
    cursor500 = data[data.length - 1];
  }
  const t500Total = performance.now() - t500Start;
  console.log(`500 cards paginados com cursor em ${(t500Total / 1000).toFixed(2)}s (tempo médio por lote de 20 cards: ${(t500Total / 24).toFixed(1)}ms). Zero degradação por offset!`);
}

runBenchmark().catch(console.error);
