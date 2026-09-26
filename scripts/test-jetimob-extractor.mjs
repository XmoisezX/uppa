async function extractJetimobProperty(url) {
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

  // In Next.js flight, map id -> content
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

  // 1. Extract code & title
  let code = "";
  let title = "";
  let shortTitle = "";

  const summaryMatch = fullFlight.match(/"code":"([^"]+)".*?"title":"([^"]+)"/);
  if (summaryMatch) {
    code = summaryMatch[1];
    title = summaryMatch[2];
  } else {
    const mCode = fullFlight.match(/"code":"([^"]+)"/);
    if (mCode) code = mCode[1];
    const mTitle = html.match(/<title>([^<]*)<\/title>/i);
    if (mTitle) title = mTitle[1].replace(/\s*\|\s*.*$/, "").trim();
  }

  // 2. Extract address
  let street = null;
  let neighborhood = null;
  let city = null;
  let state = null;

  for (const content of map.values()) {
    if (content.includes('"neighborhood"') && content.includes('"city"') && content.includes('"state"')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.neighborhood || parsed.city) {
          street = parsed.street || null;
          neighborhood = parsed.neighborhood || null;
          city = parsed.city || null;
          state = parsed.state || null;
          break;
        }
      } catch {}
    }
  }

  // If not found in entity, parse address from summary: "Areal -\n Pelotas - \n RS" or URL
  if (!neighborhood || !city) {
    const addrMatch = fullFlight.match(/"address":"([^"]+)"/);
    if (addrMatch) {
      const parts = addrMatch[1].split(/[\n\-–]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        neighborhood = parts[0];
        city = parts[1];
        state = parts[2];
      } else if (parts.length === 2) {
        city = parts[0];
        state = parts[1];
      }
    }
  }

  // Fallback to URL: "-bairro-areal-em-pelotas/18"
  if (!neighborhood || !city) {
    const urlNeighMatch = url.match(/-bairro-([^-/]+(?:-[^-/]+)*)-em-([^-/]+(?:-[^-/]+)*)\/?(?:\d+)?$/i);
    if (urlNeighMatch) {
      neighborhood = urlNeighMatch[1].replace(/-/g, " ");
      city = urlNeighMatch[2].replace(/-/g, " ");
    }
  }

  // 3. Extract Price
  // In Jetimob, contracts: [{"id":1,"price":"$49","totalPrice":"$4a"}]
  // and line 49: {"currency":"R$","value":240000000} (in cents!)
  let price = 0;
  let rentPrice = 0;

  // Let's find contract objects and price references
  for (const [id, content] of map.entries()) {
    // Check if line defines currency and value: {"currency":"R$","value":240000000}
    if (content.includes('"currency"') && content.includes('"value"') && !content.includes('"priceRange"')) {
      try {
        const valObj = JSON.parse(content);
        if (valObj.value && typeof valObj.value === "number") {
          // In Jetimob, values are in cents (e.g. 240000000 = R$ 2.400.000,00, 45000000 = R$ 450.000,00)
          const realValue = valObj.value > 100000 ? valObj.value / 100 : valObj.value;
          if (realValue >= 10000 && !price) {
            price = realValue;
          } else if (realValue < 10000 && !rentPrice) {
            rentPrice = realValue;
          }
        }
      } catch {}
    }
  }

  // Also check if title contains price: "por R$ 450.000,00"
  if (!price && !rentPrice) {
    const titlePriceMatch = title.match(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/i);
    if (titlePriceMatch) {
      const cleanVal = parseFloat(titlePriceMatch[1].replace(/\./g, "").replace(",", "."));
      if (cleanVal >= 10000) price = cleanVal;
      else rentPrice = cleanVal;
    }
  }

  // 4. Extract Specs (bedrooms, bathrooms, suites, garage, area)
  let bedrooms = 0;
  let bathrooms = 0;
  let suites = 0;
  let parkingSpaces = 0;
  let usableArea = null;

  for (const content of map.values()) {
    if (content.includes('"bedrooms"') && content.includes('"bathrooms"')) {
      const bM = content.match(/"bedrooms":(\d+)/);
      if (bM) bedrooms = parseInt(bM[1], 10);
      const baM = content.match(/"bathrooms":(\d+)/);
      if (baM) bathrooms = parseInt(baM[1], 10);
      const sM = content.match(/"suites":(\d+)/);
      if (sM) suites = parseInt(sM[1], 10);
      const gM = content.match(/"garage":(\d+)/);
      if (gM) parkingSpaces = parseInt(gM[1], 10);
    }
    if (content.includes('"measurementUnit":"m²"') && content.includes('"value"')) {
      try {
        const aObj = JSON.parse(content);
        if (aObj.value && typeof aObj.value === "number") {
          usableArea = aObj.value;
        }
      } catch {}
    }
  }

  // 5. Extract Images
  const images = [];
  const imgRegex = /https:\/\/s01\.jetimgs\.com\/[^\s"'\\]+/g;
  let iMatch;
  while ((iMatch = imgRegex.exec(fullFlight)) !== null) {
    const imgUrl = iMatch[0];
    if (!images.includes(imgUrl) && !imgUrl.includes("logo") && !imgUrl.includes("favicon")) {
      images.push(imgUrl);
    }
  }

  return {
    url,
    code,
    title,
    price,
    rentPrice,
    address: { street, neighborhood, city, state },
    specs: { bedrooms, bathrooms, suites, parkingSpaces, usableArea },
    imagesCount: images.length,
    firstImage: images[0]
  };
}

async function run() {
  const testUrls = [
    "https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-4-vagas-bairro-areal-em-pelotas/18",
    "https://www.langimoveis.imb.br/imovel/casa-com-1-quarto-a-venda-e-2-vagas-bairro-laranjal-em-pelotas/19",
    "https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-1-vaga-bairro-laranjal-em-pelotas/37",
    "https://www.proper.imb.br/imovel/terreno--lote-a-venda-bairro-centro-em-pelotas/001244",
    "https://www.proper.imb.br/imovel/apartamento-a-venda-e-1-vaga-bairro-areal-em-pelotas/000316"
  ];

  for (const u of testUrls) {
    const res = await extractJetimobProperty(u);
    console.log(JSON.stringify(res, null, 2));
  }
}

run().catch(console.error);
