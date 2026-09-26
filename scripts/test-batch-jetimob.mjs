async function testBatch() {
  const sites = [
    { name: "Lang Imóveis", sitemap: "https://www.langimoveis.imb.br/sitemap-imoveis.xml" },
    { name: "Proper Imóveis", sitemap: "https://www.proper.imb.br/sitemap-imoveis.xml" }
  ];

  for (const site of sites) {
    console.log(`\n======================================================`);
    console.log(`TESTING BATCH FOR: ${site.name}`);
    console.log(`======================================================`);

    const smRes = await fetch(site.sitemap);
    const smText = await smRes.text();
    const urls = (smText.match(/<loc>(.*?)<\/loc>/g) || []).map(u => u.replace(/<\/?loc>/g, ""));
    console.log(`Total URLs in sitemap: ${urls.length}`);

    // Pick 5 varied URLs (first, middle, last)
    const samples = [
      urls[0],
      urls[1],
      urls[2],
      urls[Math.floor(urls.length / 2)],
      urls[urls.length - 2]
    ];

    for (const url of samples) {
      if (!url) continue;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const html = await res.text();

      // Extract Flight chunks
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

      // Map flight entities
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

      // Code & Title
      let code = "";
      let title = "";
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

      // Address
      let neighborhood = null;
      let city = null;
      let state = null;
      for (const content of map.values()) {
        if (content.includes('"neighborhood"') && content.includes('"city"') && content.includes('"state"')) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.neighborhood || parsed.city) {
              neighborhood = parsed.neighborhood || null;
              city = parsed.city || null;
              state = parsed.state || null;
              break;
            }
          } catch {}
        }
      }

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

      if (!neighborhood || !city) {
        const urlNeighMatch = url.match(/-bairro-([^-/]+(?:-[^-/]+)*)-em-([^-/]+(?:-[^-/]+)*)\/?(?:\d+)?$/i);
        if (urlNeighMatch) {
          neighborhood = urlNeighMatch[1].replace(/-/g, " ");
          city = urlNeighMatch[2].replace(/-/g, " ");
        }
      }

      // Price
      let price = 0;
      let rentPrice = 0;
      for (const [id, content] of map.entries()) {
        if (content.includes('"currency"') && content.includes('"value"') && !content.includes('"priceRange"')) {
          try {
            const valObj = JSON.parse(content);
            if (valObj.value && typeof valObj.value === "number") {
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

      if (!price && !rentPrice) {
        const titlePriceMatch = title.match(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/i);
        if (titlePriceMatch) {
          const cleanVal = parseFloat(titlePriceMatch[1].replace(/\./g, "").replace(",", "."));
          if (cleanVal >= 10000) price = cleanVal;
          else rentPrice = cleanVal;
        }
      }

      console.log(`\nURL: ${url}`);
      console.log(`  -> Cód: ${code} | Título: ${title.substring(0, 45)}`);
      console.log(`  -> Preço: R$ ${price?.toLocaleString("pt-BR") || 0} | Aluguel: R$ ${rentPrice?.toLocaleString("pt-BR") || 0}`);
      console.log(`  -> Localização: ${neighborhood || "Sem bairro"}, ${city || "Sem cidade"} - ${state || "RS"}`);
    }
  }
}

testBatch().catch(console.error);
