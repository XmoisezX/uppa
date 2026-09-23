import { defaultConnectorRegistry } from '../src/features/website-import/connectors/connector-registry.ts';
import { WebsiteSourceDetector } from '../src/features/website-import/detector/website-source-detector.ts';

async function check560() {
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
  console.log('Refs 560 to 570:');
  for (let i = 560; i < Math.min(571, refs.length); i++) {
    console.log(`[${i}]`, refs[i]);
  }
}
check560();
