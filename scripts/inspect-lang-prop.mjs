async function test() {
  const smRes = await fetch("https://www.langimoveis.imb.br/sitemap-imoveis.xml");
  const smText = await smRes.text();
  const urls = (smText.match(/<loc>(.*?)<\/loc>/g) || []).map(u => u.replace(/<\/?loc>/g, ""));
  console.log("Total property URLs in sitemap-imoveis.xml:", urls.length);
  console.log("Sample property URLs:");
  urls.slice(0, 5).forEach((u, i) => console.log(`${i+1}. ${u}`));

  const propUrl = urls[0];
  console.log("\nFetching first property URL:", propUrl);
  const pRes = await fetch(propUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html = await pRes.text();
  console.log("Page length:", html.length);

  // Check JSON-LD
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
  console.log("JSON-LD scripts count:", jsonLd.length);
  jsonLd.forEach((j, i) => console.log(`JSON-LD #${i+1}:\n`, j));

  // Check title, h1, price, address in HTML
  const title = html.match(/<title>([^<]*)<\/title>/i);
  console.log("\nTitle:", title ? title[1] : null);

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  console.log("H1:", h1 ? h1[1].replace(/<[^>]+>/g, "").trim() : null);

  // Check meta tags
  console.log("\nRelevant Meta Tags:");
  const metas = html.match(/<meta [^>]+>/gi) || [];
  metas.filter(m => /title|price|description|og:|locality|region|address/i.test(m)).forEach(m => console.log("Meta:", m));

  // Check where R$ appears in the page
  console.log("\nPrices in HTML (all occurrences of R$):");
  const priceMatches = html.match(/.{0,30}R\$\s*[\d\.,]+.{0,30}/gi) || [];
  priceMatches.slice(0, 10).forEach((p, i) => console.log(`Price #${i+1}: ${p.trim()}`));

  // Check breadcrumbs or location in HTML
  console.log("\nLocation / Breadcrumbs:");
  const breadcrumbs = html.match(/<nav[^>]*breadcrumb[^>]*>([\s\S]*?)<\/nav>/i) ||
                      html.match(/<ol[^>]*breadcrumb[^>]*>([\s\S]*?)<\/ol>/i) ||
                      html.match(/<ul[^>]*breadcrumb[^>]*>([\s\S]*?)<\/ul>/i);
  if (breadcrumbs) {
    console.log("Breadcrumb HTML:", breadcrumbs[0].replace(/<[^>]+>/g, " > ").replace(/\s+/g, " "));
  } else {
    console.log("No breadcrumb tag found, searching for Pelotas or RS in context:");
    const pelotasContext = html.match(/.{0,40}(Pelotas|RS|Rio Grande do Sul).{0,40}/gi) || [];
    pelotasContext.slice(0, 10).forEach((c, i) => console.log(`Location match #${i+1}: ${c.replace(/\s+/g, " ").trim()}`));
  }
}

test().catch(console.error);
