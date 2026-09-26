import { URL } from "url";

async function testJetimobExtraction(url) {
  console.log(`\n--------------------------------------------------`);
  console.log(`FETCHING: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();

  // 1. Meta tags
  const meta = {};
  const metaRegex = /<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi;
  let m;
  while ((m = metaRegex.exec(html)) !== null) {
    meta[m[1].toLowerCase()] = m[2];
  }

  // 2. Flight chunks
  const flightChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
  while ((m = regex.exec(html)) !== null) {
    flightChunks.push(m[1]);
  }
  const fullFlight = flightChunks.map(c => {
    try {
      return JSON.parse(`"${c}"`);
    } catch {
      return c;
    }
  }).join("");

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

  function resolveRef(val) {
    if (typeof val === "string" && val.startsWith("$")) {
      const refId = val.substring(1);
      const raw = map.get(refId);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return val;
  }

  // Find property entity
  let propEntity = null;
  for (const content of map.values()) {
    if (content.startsWith("{") && content.includes('"bedrooms"') && content.includes('"bathrooms"') && content.includes('"contracts"')) {
      try {
        propEntity = JSON.parse(content);
        break;
      } catch {}
    }
  }

  // Basic specs
  const code = propEntity?.code || url.split("/").pop() || "";
  const title = propEntity?.title || meta["og:title"] || "";
  const bedrooms = propEntity?.bedrooms ?? 0;
  const bathrooms = propEntity?.bathrooms ?? 0;
  const suites = propEntity?.suites ?? 0;
  const garage = propEntity?.garage ?? 0;
  const propType = propEntity?.type || "Imóvel";

  // Address
  let neighborhood = null;
  let city = null;
  let state = null;
  let street = null;
  let latitude = null;
  let longitude = null;

  if (propEntity?.address) {
    const addr = resolveRef(propEntity.address);
    if (addr && typeof addr === "object") {
      neighborhood = addr.neighborhood || null;
      city = addr.city || null;
      state = addr.state || null;
      street = addr.street || null;
      if (addr.coordinate) {
        const coord = resolveRef(addr.coordinate);
        if (coord && typeof coord === "object") {
          latitude = coord.latitude || null;
          longitude = coord.longitude || null;
        }
      }
    }
  }

  // Fallback address from URL
  if (!neighborhood || !city) {
    const slugMatch = url.match(/-bairro-([^-/]+(?:-[^-/]+)*)-em-([^-/]+(?:-[^-/]+)*)/i);
    if (slugMatch) {
      neighborhood = neighborhood || slugMatch[1].replace(/-/g, " ");
      city = city || slugMatch[2].replace(/-/g, " ");
      state = state || "RS";
    }
  }

  // Price & Contracts
  let price = 0;
  let rentPrice = 0;
  if (propEntity?.contracts) {
    const contracts = resolveRef(propEntity.contracts);
    if (Array.isArray(contracts)) {
      for (const cRef of contracts) {
        const contract = resolveRef(cRef);
        if (contract && contract.price) {
          const priceObj = resolveRef(contract.price);
          if (priceObj && typeof priceObj.value === "number") {
            const val = priceObj.value > 100000 ? priceObj.value / 100 : priceObj.value;
            if (val >= 10000 && !price) price = val;
            else if (val < 10000 && !rentPrice) rentPrice = val;
          }
        }
      }
    }
  }

  // Area
  let usableArea = null;
  if (propEntity?.totalArea) {
    const a = resolveRef(propEntity.totalArea);
    if (a?.value) usableArea = a.value;
  }
  if (!usableArea && propEntity?.usefulArea) {
    const a = resolveRef(propEntity.usefulArea);
    if (a?.value) usableArea = a.value;
  }

  // Features
  const features = [];
  if (propEntity?.facilities) {
    const facs = resolveRef(propEntity.facilities);
    if (Array.isArray(facs)) {
      for (const fRef of facs) {
        const item = resolveRef(fRef);
        if (item?.label) features.push(item.label);
      }
    }
  }
  if (propEntity?.condominiumInfrastructure) {
    const infra = resolveRef(propEntity.condominiumInfrastructure);
    if (Array.isArray(infra)) {
      for (const fRef of infra) {
        const item = resolveRef(fRef);
        if (item?.label) features.push(item.label);
      }
    }
  }

  // Images
  const images = [];
  if (propEntity?.images) {
    const imgs = resolveRef(propEntity.images);
    if (Array.isArray(imgs)) {
      for (const imgRef of imgs) {
        const imgObj = resolveRef(imgRef);
        if (imgObj?.src && !imgObj.src.includes("favicon") && !imgObj.src.includes("logo")) {
          images.push(imgObj.src);
        }
      }
    }
  }

  const description = meta["description"] || meta["og:description"] || "";

  console.log({
    code,
    title,
    type: propType,
    price: `R$ ${price?.toLocaleString("pt-BR")}`,
    rentPrice: `R$ ${rentPrice?.toLocaleString("pt-BR")}`,
    bedrooms,
    bathrooms,
    suites,
    garage,
    usableArea: `${usableArea} m²`,
    location: `${neighborhood || "Sem bairro"}, ${city || "Sem cidade"} - ${state || "RS"}`,
    coordinates: latitude && longitude ? `${latitude}, ${longitude}` : "None",
    featuresCount: features.length,
    featuresSample: features.slice(0, 5),
    imagesCount: images.length,
    imageSample: images[0],
    descriptionLength: description.length,
    descriptionPreview: description.substring(0, 80)
  });
}

async function inspectProperImages() {
  const url = "https://www.proper.imb.br/imovel/apartamento-com-2-quartos-a-venda-e-2-vagas-bairro-centro-em-pelotas/001529";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const flightChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    flightChunks.push(m[1]);
  }
  const fullFlight = flightChunks.map(c => {
    try {
      return JSON.parse(`"${c}"`);
    } catch {
      return c;
    }
  }).join("");

  const map = new Map();
  for (const line of fullFlight.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 10) {
      map.set(line.substring(0, colonIdx), line.substring(colonIdx + 1));
    }
  }

  for (const [id, content] of map.entries()) {
    if (content.startsWith("{") && content.includes('"bedrooms"') && content.includes('"bathrooms"')) {
      const parsed = JSON.parse(content);
      console.log("Proper propEntity keys:", Object.keys(parsed));
      console.log("Proper propEntity.images:", parsed.images);
      if (parsed.images) {
        const imgRef = String(parsed.images).replace("$", "");
        const idx7f = fullFlight.indexOf("7f:");
        console.log("Index of '7f:':", idx7f);
        if (idx7f !== -1) {
          console.log("Around 7f:", fullFlight.substring(idx7f, idx7f + 200));
        } else {
          console.log("7f: not found verbatim. Looking for 7f around images...");
          const match7f = fullFlight.match(/"?7f"?\s*:\s*([^,\n]+)/);
          console.log("match7f:", match7f);
        }
      }
    }
  }
}

async function run() {
  await inspectProperImages();
  await testJetimobExtraction("https://www.langimoveis.imb.br/imovel/sobrado-com-3-quartos-a-venda-e-2-vagas-bairro-areal-em-pelotas/18");
  await testJetimobExtraction("https://www.langimoveis.imb.br/imovel/casa-com-1-quarto-a-venda-e-2-vagas-bairro-laranjal-em-pelotas/19");
  await testJetimobExtraction("https://www.proper.imb.br/imovel/terreno--lote-a-venda-bairro-centro-em-pelotas/001244");
  await testJetimobExtraction("https://www.proper.imb.br/imovel/apartamento-com-2-quartos-a-venda-e-2-vagas-bairro-centro-em-pelotas/001529");
}

run().catch(console.error);
