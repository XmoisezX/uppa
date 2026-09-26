async function inspect() {
  const sites = [
    "https://www.langimoveis.imb.br",
    "https://www.proper.imb.br"
  ];

  for (const baseUrl of sites) {
    console.log(`\n======================================================`);
    console.log(`INSPECTING ${baseUrl}`);
    console.log(`======================================================`);

    try {
      // 1. Check robots.txt and sitemap
      const robotsRes = await fetch(`${baseUrl}/robots.txt`);
      const robotsTxt = await robotsRes.text();
      console.log(`--- robots.txt (${robotsRes.status}) ---`);
      console.log(robotsTxt.substring(0, 300));

      // 2. Check home page HTML
      const homeRes = await fetch(baseUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const homeHtml = await homeRes.text();
      console.log(`--- Home page length: ${homeHtml.length} ---`);
      
      // Look for jetimob indicators
      const isJetimob = /jetimob/i.test(homeHtml);
      console.log(`Contains 'jetimob':`, isJetimob);
      
      // Extract sitemaps or links to properties
      const sitemapMatches = robotsTxt.match(/Sitemap:\s*(.*)/gi) || [];
      console.log(`Sitemaps found:`, sitemapMatches);

      // Check sitemap content
      if (sitemapMatches.length > 0) {
        const sitemapUrl = sitemapMatches[0].replace(/Sitemap:\s*/i, "").trim();
        const smRes = await fetch(sitemapUrl);
        const smText = await smRes.text();
        console.log(`Sitemap length: ${smText.length}, sample:`);
        const urls = (smText.match(/<loc>(.*?)<\/loc>/g) || []).map(u => u.replace(/<\/?loc>/g, ""));
        console.log(`Total URLs in sitemap: ${urls.length}`);
        console.log(`First 5 URLs:`, urls.slice(0, 5));

        // Find a property URL
        const propUrl = urls.find(u => /\/(imovel|imoveis|comprar|alugar)\//i.test(u)) || urls[1];
        if (propUrl) {
          console.log(`\n--- Inspecting property page: ${propUrl} ---`);
          const propRes = await fetch(propUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
          });
          const propHtml = await propRes.text();
          console.log(`Property page length: ${propHtml.length}`);

          // Check for JSON-LD, OpenGraph, or Jetimob scripts
          const jsonLdMatches = propHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
          console.log(`JSON-LD scripts found: ${jsonLdMatches.length}`);
          jsonLdMatches.forEach((m, idx) => {
            console.log(`JSON-LD #${idx+1}:`, m.substring(0, 200));
          });

          // Check OpenGraph tags
          const ogTags = propHtml.match(/<meta property="og:[^>]+>/gi) || [];
          console.log(`OG tags found:`, ogTags);

          // Check price matches in HTML
          const priceMatches = propHtml.match(/R\$\s*[\d\.,]+/gi) || [];
          console.log(`Prices found in page:`, priceMatches.slice(0, 10));

          // Check address / location matches
          const cityMatches = propHtml.match(/Pelotas|Porto Alegre|Santa Maria|Caxias/gi) || [];
          console.log(`City occurrences:`, cityMatches.length);
        }
      }
    } catch (e) {
      console.error(`Error inspecting ${baseUrl}:`, e);
    }
  }
}

inspect();
