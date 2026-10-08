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

async function testKeyset() {
  const cursorR = 75;
  const cursorId = '00000000-0000-0000-0000-000000000000';
  const filterStr = `ranking_score.lt.${cursorR},and(ranking_score.eq.${cursorR},id.gt.${cursorId})`;
  const q = await admin
    .from('properties')
    .select('id, ranking_score')
    .eq('status', 'active')
    .or(filterStr)
    .order('ranking_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(5);

  console.log('Keyset status:', q.status, 'Error:', q.error?.message, 'Items:', q.data?.length);
  console.log('Returned items:', q.data);
}

testKeyset().catch(console.error);
