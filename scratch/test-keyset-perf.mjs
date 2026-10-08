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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testKeysetPerformance() {
  const { data: city } = await admin.from('cities').select('id').ilike('name', 'Pelotas').single();
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
    cover:property_media (url, is_cover)
  `;

  // Batch 1
  const t0 = performance.now();
  const q1 = await admin
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
    .limit(20);
  const dur1 = performance.now() - t0;
  console.log(`Batch 1: ${dur1.toFixed(1)}ms | Items: ${q1.data?.length}`);

  const lastItem = q1.data[q1.data.length - 1];
  const lastScore = lastItem.ranking_score;
  const lastId = lastItem.id;

  // Batch 2 via Keyset
  const t1 = performance.now();
  const q2 = await admin
    .from('properties')
    .select(LIGHT_SELECT)
    .eq('status', 'active')
    .is('canonical_property_id', null)
    .gt('active_offers_count', 0)
    .in('transaction_type', ['sale', 'sale_or_rent'])
    .eq('city_id', city.id)
    .eq('cover.is_cover', true)
    .or(`ranking_score.lt.${lastScore},and(ranking_score.eq.${lastScore},id.gt.${lastId})`)
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(20);
  const dur2 = performance.now() - t1;
  console.log(`Batch 2 (Keyset): ${dur2.toFixed(1)}ms | Items: ${q2.data?.length}`);

  // Verifica duplicação entre Batch 1 e Batch 2
  const ids1 = new Set(q1.data.map(i => i.id));
  const duplicates = q2.data.filter(i => ids1.has(i.id));
  console.log(`Duplicações entre Batch 1 e 2: ${duplicates.length}`);
}

testKeysetPerformance().catch(console.error);
