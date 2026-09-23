import { DomainRateLimiter } from '../src/features/website-import/utils/rate-limiter.ts';
import { defaultConnectorRegistry } from '../src/features/website-import/connectors/connector-registry.ts';
import { WebsiteSourceDetector } from '../src/features/website-import/detector/website-source-detector.ts';

async function benchmark() {
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
  const sample = refs.slice(0, 30);

  const limiter = new DomainRateLimiter({ maxConcurrency: 8, delayBetweenRequestsMs: 40 });

  const t0 = Date.now();
  let done = 0;
  await Promise.all(
    sample.map(async (ref) => {
      await limiter.execute(() => connector.fetchListing(ref, context));
      done++;
    })
  );

  const duration = (Date.now() - t0) / 1000;
  console.log(`Fetched ${done} properties in ${duration.toFixed(2)}s (${(done / duration).toFixed(1)} props/sec)`);
}
benchmark();
