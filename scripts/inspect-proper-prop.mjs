async function testProper() {
  const url = "https://www.proper.imb.br/imovel/terreno--lote-a-venda-bairro-centro-em-pelotas/001244";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html = await res.text();

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

  console.log("Proper Flight length:", fullFlight.length);

  // Search for address and price in fullFlight
  const lines = fullFlight.split("\n");
  lines.forEach(l => {
    if (/neighborhood|city|price|totalPrice|propertyCode|propertyId/i.test(l)) {
      console.log("Matching line:", l.substring(0, 300));
    }
  });
}

testProper().catch(console.error);
