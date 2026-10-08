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

// New optimized query projection
const OPTIMIZED_SELECT = `
  id,
  slug,
  title,
  transaction_type,
  property_type,
  usable_area,
  total_area,
  bedrooms,
  bathrooms,
  parking_spaces,
  ranking_score,
  lowest_sale_price,
  lowest_rent_price,
  primary_offer_id,
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
  primary_offer:property_offers!primary_offer_id (
    id,
    sale_price,
    rent_price,
    agency_id,
    agency:agencies!agency_id (
      id,
      name,
      slug,
      logo_url
    )
  ),
  cover:property_media (
    url,
    is_cover
  )
`;

async function testCursorPagination() {
  console.log('--- TEST BATCH 1 (Initial with count) ---');
  const t0 = performance.now();
  const q1 = sb
    .from('properties')
    .select(OPTIMIZED_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .eq('cover.is_cover', true)
    .order('ranking_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(20);

  const { data: b1, count: total, error: e1 } = await q1;
  const d1 = performance.now() - t0;
  if (e1) console.error('b1 error:', e1);
  console.log(`Batch 1: ${b1?.length} items in ${d1.toFixed(1)}ms. Total count: ${total}`);

  const last1 = b1[b1.length - 1];
  console.log(`Last item b1: id=${last1.id}, ranking=${last1.ranking_score}`);

  console.log('\n--- TEST BATCH 2 (Keyset cursor without count) ---');
  const t1 = performance.now();
  const q2 = sb
    .from('properties')
    .select(OPTIMIZED_SELECT)
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .eq('cover.is_cover', true)
    .or(`ranking_score.lt.${last1.ranking_score},and(ranking_score.eq.${last1.ranking_score},id.gt.${last1.id})`)
    .order('ranking_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(20);

  const { data: b2, error: e2 } = await q2;
  const d2 = performance.now() - t1;
  if (e2) console.error('b2 error:', e2);
  console.log(`Batch 2: ${b2?.length} items in ${d2.toFixed(1)}ms.`);

  const last2 = b2[b2.length - 1];
  console.log(`Last item b2: id=${last2.id}, ranking=${last2.ranking_score}`);

  console.log('\n--- TEST BATCH 3 (Keyset cursor without count) ---');
  const t2 = performance.now();
  const q3 = sb
    .from('properties')
    .select(OPTIMIZED_SELECT)
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .eq('cover.is_cover', true)
    .or(`ranking_score.lt.${last2.ranking_score},and(ranking_score.eq.${last2.ranking_score},id.gt.${last2.id})`)
    .order('ranking_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(20);

  const { data: b3, error: e3 } = await q3;
  const d3 = performance.now() - t2;
  if (e3) console.error('b3 error:', e3);
  console.log(`Batch 3: ${b3?.length} items in ${d3.toFixed(1)}ms.`);

  // Check duplicates between b1, b2, b3
  const set = new Set();
  let duplicates = 0;
  for (const item of [...(b1 || []), ...(b2 || []), ...(b3 || [])]) {
    if (set.has(item.id)) {
      duplicates++;
      console.error('Duplicate found:', item.id);
    }
    set.add(item.id);
  }
  console.log(`Total unique items: ${set.size}, duplicates: ${duplicates}`);

  // Measure payload size
  const b1Size = Buffer.byteLength(JSON.stringify(b1), 'utf8');
  console.log(`Batch 1 payload size: ${(b1Size / 1024).toFixed(1)} KB for 20 items (was ~90KB for 12 items!)`);
}

testCursorPagination().catch(console.error);
