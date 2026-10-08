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

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const med = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
  return { min, med, p95, max };
}

async function testImovel() {
  const { data: prop } = await sb.from('properties').select('slug').eq('status', 'active').limit(1).single();
  const slug = prop.slug;

  console.log(`Testando /imovel/${slug}...`);
  const times = [];
  let sampleData = null;

  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const { data } = await sb
      .from('properties')
      .select(`
        *,
        agency:agencies (*),
        state:states (*),
        city:cities (*),
        neighborhood:neighborhoods (*),
        media:property_media (*),
        features:property_features (
          feature:features (*)
        )
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    const elapsed = performance.now() - t0;
    times.push(elapsed);
    sampleData = data;
  }

  const s = stats(times);
  console.log(`/imovel/[slug] DB Query: Min: ${s.min.toFixed(1)}ms | Mediana: ${s.med.toFixed(1)}ms | P95: ${s.p95.toFixed(1)}ms`);
  const payloadSize = Buffer.byteLength(JSON.stringify(sampleData), 'utf8');
  console.log(`Payload do imóvel: ${(payloadSize / 1024).toFixed(1)} KB`);
}

testImovel().catch(console.error);
