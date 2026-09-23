import { defaultConnectorRegistry } from '../src/features/website-import/connectors/connector-registry.ts';
import { WebsiteSourceDetector } from '../src/features/website-import/detector/website-source-detector.ts';
import { createAdminClient } from '../src/lib/supabase/admin.ts';
import { WebsitePropertyImporter } from '../src/features/website-import/importer/website-property-importer.ts';

async function testBatch540() {
  const sb = createAdminClient();
  const detector = new WebsiteSourceDetector();
  const detection = await detector.detect('https://www.upimoveis.com.br');

  const context = {
    agencyId: '6dcd90ea-3371-4d84-88db-9b189ae96224',
    baseUrl: 'https://www.upimoveis.com.br',
    domain: 'www.upimoveis.com.br',
    sitemaps: detection.sitemaps,
    listingPatterns: detection.listingPatterns,
    maxListings: 2000,
    maxPages: 50
  };

  const connector = await defaultConnectorRegistry.resolveConnector(
    context,
    detection.recommendedConnector
  );

  const refs = await connector.discoverListings(context);
  console.log('Testing refs 538 to 552...');

  const importer = new WebsitePropertyImporter(sb, {
    agencyId: context.agencyId,
    websiteSourceId: '137830dc-3b11-4928-92e8-c18011ce364f',
    crawlRunId: 'test-run'
  });
  await importer.init();

  for (let i = 538; i < 552; i++) {
    const ref = refs[i];
    console.log(`\nTesting [${i}] ${ref.url}`);
    try {
      const t0 = Date.now();
      const prop = await connector.fetchListing(ref, context);
      console.log(`  Fetched in ${Date.now() - t0}ms: code=${prop.code} title=${prop.title?.slice(0, 40)}`);
      
      const t1 = Date.now();
      const res = await importer.persistSingleProperty(prop);
      console.log(`  Persisted in ${Date.now() - t1}ms: result=${res}`);
    } catch (err) {
      console.error(`  ERROR at [${i}]:`, err);
    }
  }
}

testBatch540();
