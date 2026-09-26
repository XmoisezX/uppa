async function parseJetimobFlight(url) {
  console.log(`\n======================================================`);
  console.log(`PARSING: ${url}`);
  console.log(`======================================================`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html = await res.text();

  // 1. Extract Flight payload chunks
  const flightChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    flightChunks.push(match[1]);
  }

  const fullFlight = flightChunks.map(c => {
    try {
      return JSON.parse(`"${c}"`);
    } catch {
      return c;
    }
  }).join("");

  console.log(`Flight payload length: ${fullFlight.length}`);

  // In Next.js flight, lines are id:data
  const map = new Map();
  const lines = fullFlight.split("\n");
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 10) {
      const id = line.substring(0, colonIdx);
      const content = line.substring(colonIdx + 1);
      map.set(id, content);
    }
  }

  console.log(`Mapped ${map.size} flight entities`);

  // Let's find the entity with propertyCode or address or code
  for (const [id, content] of map.entries()) {
    if (content.includes('"neighborhood"') && content.includes('"city"')) {
      console.log(`Found address in entity #${id}:`, content);
    }
    if (content.includes('"propertyId"') && content.includes('"code"')) {
      console.log(`Found property summary in entity #${id}:`, content);
    }
    if (content.includes('"currency"') && content.includes('"value"') && !content.includes('"priceRange"')) {
      console.log(`Found currency value in entity #${id}:`, content);
    }
    if (content.includes('"bedrooms"') && content.includes('"suites"') && content.includes('"bathrooms"')) {
      console.log(`Found detailed property specs in entity #${id}:\n`, content.substring(0, 400));
    }
  }
}

async function run() {
  await parseJetimobFlight("https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-4-vagas-bairro-areal-em-pelotas/18");
  await parseJetimobFlight("https://www.proper.imb.br/imovel/terreno--lote-a-venda-bairro-centro-em-pelotas/001244");
  await parseJetimobFlight("https://www.langimoveis.imb.br/imovel/casa-com-1-quarto-a-venda-e-2-vagas-bairro-laranjal-em-pelotas/19");
}

run().catch(console.error);
