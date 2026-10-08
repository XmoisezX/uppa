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
  const { data, error } = await sb.rpc('exec_sql', {
    sql_string: `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('properties', 'property_media') 
        AND indexname LIKE '%search%' OR indexname LIKE '%cover%';
    `
  });
  console.log('Indexes check:', data, error);
}

main().catch(console.error);
