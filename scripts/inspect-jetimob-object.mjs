async function inspectObject() {
  const propUrl = "https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-4-vagas-bairro-areal-em-pelotas/18";
  const pRes = await fetch(propUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html = await pRes.text();

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

  const idx = fullFlight.indexOf('"code":"18"');
  console.log("Snippet around 'code:18':");
  console.log(fullFlight.substring(Math.max(0, idx - 400), Math.min(fullFlight.length, idx + 1200)));

  // Look for contracts $47 and address $45
  console.log("\nSearching for 45: and 47:");
  const lines = fullFlight.split("\n");
  lines.forEach(l => {
    if (/^(45|46|47|48|49|4a|4b|4c|4d|4e|4f|50):/i.test(l)) {
      console.log("Line:", l.substring(0, 300));
    }
  });

  // Let's also check proper.imb.br!
  console.log("\n=======================================================");
  console.log("INSPECTING PROPER.IMB.BR");
  console.log("=======================================================");
  const properSmRes = await fetch("https://www.proper.imb.br/sitemap-imoveis.xml");
  const properSmText = await properSmRes.text();
  const properUrls = (properSmText.match(/<loc>(.*?)<\/loc>/g) || []).map(u => u.replace(/<\/?loc>/g, ""));
  console.log("Sample proper.imb.br URLs:", properUrls.slice(0, 3));

  if (properUrls[0]) {
    const prRes = await fetch(properUrls[0], {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const prHtml = await prRes.text();
    console.log("Proper page length:", prHtml.length);
    const prIdx = prHtml.indexOf("propertyCode");
    console.log("Contains propertyCode:", prIdx !== -1);
    const prFlight = [];
    let prM;
    while ((prM = regex.exec(prHtml)) !== null) {
      prFlight.push(prM[1]);
    }
    console.log("Proper flight chunks:", prFlight.length);
  }
}

inspectObject().catch(console.error);
