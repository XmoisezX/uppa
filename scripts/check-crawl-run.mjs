import { createAdminClient } from '../src/lib/supabase/admin.ts';

async function check() {
  const sb = createAdminClient();
  const { data: errors, error } = await sb
    .from('crawl_errors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Crawl errors count:', errors?.length);
  if (errors && errors.length > 0) {
    console.log('Sample error:', errors[0]);
  }
}
check();
