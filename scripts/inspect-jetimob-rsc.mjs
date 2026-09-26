async function inspectRSC() {
  const propUrl = "https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-4-vagas-bairro-areal-em-pelotas/18";
  const pRes = await fetch(propUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html = await pRes.text();

  // Find all self.__next_f.push or Flight data chunks
  const flightChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    flightChunks.push(match[1]);
  }
  console.log(`Found ${flightChunks.length} flight chunks`);

  // Unescape and concatenate
  const fullFlight = flightChunks.map(c => {
    try {
      return JSON.parse(`"${c}"`);
    } catch {
      return c;
    }
  }).join("");

  console.log(`Full flight payload length: ${fullFlight.length}`);

  // Let's search for keywords in fullFlight
  const keywords = ["preco", "price", "valor", "Areal", "Pelotas", "IPTU", "condominio", "dormitorio", "quartos", "banheiro", "suites", "area", "venda"];
  for (const kw of keywords) {
    const idx = fullFlight.indexOf(kw);
    console.log(`Keyword '${kw}' index: ${idx}`);
    if (idx !== -1) {
      console.log(`  Snippet around '${kw}':\n  ${fullFlight.substring(Math.max(0, idx - 80), Math.min(fullFlight.length, idx + 150)).replace(/\n/g, " ")}`);
    }
  }

  // Also check if there's any embedded JSON or state
  const jsonBlocks = html.match(/\{"[^"]+":(?:\{|\[|"[^"]*"|\d+)[\s\S]*?\}/g) || [];
  console.log(`Total potential JSON blocks in HTML: ${jsonBlocks.length}`);

  // Let's search the HTML body for price elements
  console.log("\n--- Searching for price elements in HTML body ---");
  const priceElements = html.match(/<[^>]*>(?:R\$|\$)\s*[\d\.,]+<\/[^>]*>/gi) || [];
  console.log("Price elements found:", priceElements);

  // Let's search for any number with R$ in the whole HTML
  const allPrices = html.match(/R\$\s*[\d\.,]+/gi) || [];
  console.log("All R$ mentions:", allPrices);
}

inspectRSC().catch(console.error);
