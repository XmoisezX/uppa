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

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectSchema() {
  console.log('--- INSPECTING SCHEMA & OFFERS ---');

  // 1. Total offers
  const { count: totalOffers, error: errOffers } = await supabase
    .from('property_offers')
    .select('id', { count: 'exact', head: true });
  console.log('Total property_offers in DB:', totalOffers, 'error:', errOffers);

  // 2. Total properties
  const { count: totalProps, error: errProps } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true });
  console.log('Total properties in DB:', totalProps, 'error:', errProps);

  // 3. Properties with primary_offer_id
  const { count: propsWithPrimary, error: errPrimary } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .not('primary_offer_id', 'is', null);
  console.log('Properties with primary_offer_id:', propsWithPrimary, 'error:', errPrimary);

  // 4. Check if migration 23 tables exist
  const { data: attempts, error: errAttempts } = await supabase
    .from('lead_delivery_attempts')
    .select('id')
    .limit(1);
  console.log('lead_delivery_attempts table test:', errAttempts ? `Error: ${errAttempts.message}` : 'EXISTS');

  const { data: notes, error: errNotes } = await supabase
    .from('lead_notes')
    .select('id')
    .limit(1);
  console.log('lead_notes table test:', errNotes ? `Error: ${errNotes.message}` : 'EXISTS');

  const { data: impressions, error: errImpressions } = await supabase
    .from('offer_impressions')
    .select('id')
    .limit(1);
  console.log('offer_impressions table test:', errImpressions ? `Error: ${errImpressions.message}` : 'EXISTS');

  // 5. Check if new columns on leads exist
  const { data: leadCols, error: errLeadCols } = await supabase
    .from('leads')
    .select('id, status, snapshot_price, snapshot_title, snapshot_source, snapshot_agency_name')
    .limit(1);
  console.log('leads new columns test:', errLeadCols ? `Error: ${errLeadCols.message}` : 'EXISTS');
}

inspectSchema().catch(console.error);
