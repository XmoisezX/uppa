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
const admin = createClient(supabaseUrl, serviceKey);

const SEARCH_PROPERTIES_SELECT = `
  id,
  slug,
  external_id,
  title,
  transaction_type,
  property_type,
  price,
  rent_price,
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
  description,
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
  agency:agencies!agency_id (
    id,
    name,
    slug,
    logo_url,
    creci,
    verified_at,
    phone
  ),
  media:property_media (
    id,
    url,
    is_cover,
    position
  )
`;

async function testQueryPerformance() {
  const { data: city } = await admin.from('cities').select('id').ilike('name', 'Pelotas').single();
  console.log('City ID:', city?.id);

  console.log('\n--- Teste A: Query com SELECT atual (pesado: description + all media + joins + count exact) ---');
  const t0 = performance.now();
  const qA = await admin
    .from('properties')
    .select(SEARCH_PROPERTIES_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .in('transaction_type', ['sale', 'sale_or_rent'])
    .eq('city_id', city.id)
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .range(0, 11);
  const durA = performance.now() - t0;
  console.log(`Status: ${qA.status} | Erro: ${qA.error?.message} | Tempo: ${durA.toFixed(1)}ms`);
  console.log(`Itens retornados: ${qA.data?.length} | Total Count: ${qA.count}`);
  if (qA.data?.length > 0) {
    const rawBytes = Buffer.byteLength(JSON.stringify(qA.data), 'utf-8');
    console.log(`Payload dos 12 cards: ${(rawBytes / 1024).toFixed(1)} KB`);
    console.log(`Mídias no primeiro card: ${qA.data[0].media?.length}`);
    console.log(`Tamanho da descrição no 1º card: ${qA.data[0].description?.length} caracteres`);
  }

  console.log('\n--- Teste B: Query OTIMIZADA para Listagem (DTO Leve: sem description, apenas 1 cover, sem count exact) ---');
  const LIGHT_SELECT = `
    id,
    slug,
    title,
    transaction_type,
    property_type,
    price,
    rent_price,
    lowest_sale_price,
    lowest_rent_price,
    active_offers_count,
    usable_area,
    bedrooms,
    bathrooms,
    parking_spaces,
    primary_offer_id,
    ranking_score,
    updated_at,
    city:cities!city_id (id, name, slug),
    neighborhood:neighborhoods!neighborhood_id (id, name, slug),
    agency:agencies!agency_id (id, name, slug, logo_url),
    cover:property_media!inner (id, url)
  `;
  const t1 = performance.now();
  const qB = await admin
    .from('properties')
    .select(LIGHT_SELECT)
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .in('transaction_type', ['sale', 'sale_or_rent'])
    .eq('city_id', city.id)
    .eq('cover.is_cover', true)
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(12);
  const durB = performance.now() - t1;
  console.log(`Status: ${qB.status} | Erro: ${qB.error?.message} | Tempo: ${durB.toFixed(1)}ms`);
  console.log(`Itens retornados: ${qB.data?.length}`);
  if (qB.data?.length > 0) {
    const rawBytesB = Buffer.byteLength(JSON.stringify(qB.data), 'utf-8');
    console.log(`Payload DTO leve: ${(rawBytesB / 1024).toFixed(1)} KB (${rawBytesB} bytes)`);
  }
}

testQueryPerformance().catch(console.error);
