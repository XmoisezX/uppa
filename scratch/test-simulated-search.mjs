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

// We simulate what searchProperties will do
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

async function testSimulatedSearch() {
  console.log('Testing simulated search with Pelotas filter...');
  const t0 = performance.now();
  
  // Resolve Pelotas city id
  const { data: cityRow } = await sb.from('cities').select('id').eq('slug', 'pelotas').single();
  console.log('Pelotas city id:', cityRow?.id);

  let query = sb
    .from('properties')
    .select(SEARCH_PROPERTIES_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .eq('city_id', cityRow.id)
    .eq('cover.is_cover', true)
    .order('ranking_score', { ascending: false })
    .order('id', { ascending: true })
    .range(0, 19);

  const { data, count, error } = await query;
  const elapsed = performance.now() - t0;
  if (error) {
    console.error('Query error:', error);
    return;
  }

  console.log(`Initial batch: ${data?.length} properties in ${elapsed.toFixed(1)}ms. Total count: ${count}`);
  const first = data[0];
  const last = data[data.length - 1];

  console.log('\nTesting Keyset Batch 2 (Next 20 properties)...');
  const t1 = performance.now();
  const q2 = sb
    .from('properties')
    .select(SEARCH_PROPERTIES_SELECT)
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .eq('city_id', cityRow.id)
    .eq('cover.is_cover', true)
    .or(`ranking_score.lt.${last.ranking_score},and(ranking_score.eq.${last.ranking_score},id.gt.${last.id})`)
    .order('ranking_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(20);

  const { data: b2, error: e2 } = await q2;
  const d2 = performance.now() - t1;
  console.log(`Keyset Batch 2: ${b2?.length} properties in ${d2.toFixed(1)}ms!`);
}

testSimulatedSearch().catch(console.error);
