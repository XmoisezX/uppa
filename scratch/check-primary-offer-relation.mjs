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

async function main() {
  const { data: sampleProps, count } = await sb
    .from('properties')
    .select('id, title, primary_offer_id, active_offers_count', { count: 'exact' })
    .eq('status', 'active')
    .limit(10);

  console.log('Sample properties primary_offer_id:', sampleProps);

  const { count: nullCount } = await sb
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('primary_offer_id', null);

  console.log('Active properties where primary_offer_id is null:', nullCount);

  // Check if primary_offer can be joined directly
  const { data: joinedProp, error: joinErr } = await sb
    .from('properties')
    .select(`
      id,
      primary_offer_id,
      primary_offer:property_offers!primary_offer_id(
        id,
        sale_price,
        rent_price,
        agency_id,
        agency:agencies(id, name, logo_url)
      )
    `)
    .eq('status', 'active')
    .limit(2);

  console.log('Join primary_offer test:', JSON.stringify(joinedProp, null, 2), joinErr);
}

main().catch(console.error);
