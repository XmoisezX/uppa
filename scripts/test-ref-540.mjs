import { GenericWebsiteConnector } from '../src/features/website-import/connectors/generic-website-connector.ts';

async function testFetch() {
  const connector = new GenericWebsiteConnector();
  const context = {
    agencyId: '6dcd90ea-3371-4d84-88db-9b189ae96224',
    baseUrl: 'https://www.upimoveis.com.br',
    domain: 'www.upimoveis.com.br',
    maxListings: 10,
    maxPages: 1
  };

  const ref = {
    url: 'https://www.upimoveis.com.br/imovel/casa/venda/pelotas/rs/sao-goncalo/CA2755_UPIMOV'
  };

  console.log('Fetching ref 540...');
  const t0 = Date.now();
  const prop = await connector.fetchListing(ref, context);
  console.log('Fetched in', Date.now() - t0, 'ms');
  console.log('Title:', prop.title);
  console.log('Price:', prop.price);
  console.log('Images:', prop.images.length);
}
testFetch();
