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
  const { count: pmCount } = await sb.from('property_media').select('*', { count: 'exact', head: true });
  console.log('property_media total count:', pmCount);

  // Check if offer_media exists
  const { data: om, error: omErr } = await sb.from('offer_media').select('id').limit(1);
  console.log('offer_media check:', om ? 'exists' : 'does not exist', omErr?.message);

  // Check properties with property_media filtered by is_cover
  const { data: testProps, error: tpErr } = await sb
    .from('properties')
    .select(`
      id,
      title,
      cover:property_media(url, is_cover)
    `)
    .eq('status', 'active')
    .eq('cover.is_cover', true)
    .limit(3);

  console.log('testProps result:', JSON.stringify(testProps, null, 2), tpErr);

  // Check primary_offer / representative offer relations
  const { data: testOfferProp } = await sb
    .from('properties')
    .select(`
      id,
      title,
      primary_offer_id,
      offers:property_offers!property_offers_property_id_fkey(
        id,
        status,
        sale_price,
        rent_price,
        agency_id,
        agency:agencies(id, name, logo_url)
      )
    `)
    .eq('status', 'active')
    .limit(2);
  console.log('testOfferProp:', JSON.stringify(testOfferProp, null, 2));
  const { data: noCover } = await sb
    .from('properties')
    .select('id, media:property_media(id, is_cover)')
    .eq('status', 'active')
    .limit(200);

  let withoutCover = 0;
  for (const p of noCover || []) {
    const hasCover = p.media?.some((m) => m.is_cover);
    if (!hasCover && p.media?.length > 0) withoutCover++;
  }
  console.log('Sample of 200 properties: properties with media but without is_cover:', withoutCover);

  const qWithout = await sb.from('properties').select('id, cover:property_media(url, is_cover)', { count: 'exact', head: true }).eq('status', 'active');
  const qWith = await sb.from('properties').select('id, cover:property_media(url, is_cover)', { count: 'exact', head: true }).eq('status', 'active').eq('cover.is_cover', true);
  
  console.log('Without cover filter count:', qWithout.count);
  console.log('With cover filter count:', qWith.count);
}

main().catch(console.error);
