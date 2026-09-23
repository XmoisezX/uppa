import { defaultConnectorRegistry } from '../src/features/website-import/connectors/connector-registry.ts';
import { WebsiteSourceDetector } from '../src/features/website-import/detector/website-source-detector.ts';

async function testBatch560() {
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
  console.log('Testing each ref from 560 to 570 individually:');

  for (let i = 560; i <= 570; i++) {
    const ref = refs[i];
    console.log(`[${i}] Fetching: ${ref.url}`);
    const t0 = Date.now();
    try {
      const prop = await connector.fetchListing(ref, context);
      console.log(`  OK in ${Date.now() - t0}ms: ${prop.title.slice(0, 50)}`);
    } catch (e) {
      console.log(`  FAIL in ${Date.now() - t0}ms: ${e.message}`);
    }
  }
}
testBatch560();
