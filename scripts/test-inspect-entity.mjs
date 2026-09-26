async function inspectRef() {
  const url = "https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-4-vagas-bairro-areal-em-pelotas/18";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
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

  console.log("Entity 44 (Description):", map.get("44"));
  console.log("Entity 45 (Address):", map.get("45"));
  console.log("Entity 47 (Contracts):", map.get("47"));
  console.log("Entity 4f (TotalArea):", map.get("4f"));
  console.log("Entity 50 (PrivateArea):", map.get("50"));
  console.log("Entity 51 (UsefulArea):", map.get("51"));

  // Check how images and features are stored in entity 43
  const e43 = JSON.parse(map.get("43"));
  console.log("Keys of 43:", Object.keys(e43));
  // Check description in HTML
  const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                    html.match(/<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
                    html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  console.log("HTML Description match:", descMatch ? descMatch[1].substring(0, 200) : "not found via class");
  
  // Look for any string with 'sobrado' or 'terreno' or 'casa' that is longer than 50 chars in map
  if (e43.facilities) {
    const facId = String(e43.facilities).replace("$", "");
    console.log("Facilities (" + facId + "):", map.get(facId));
    console.log("Sample facility 58:", map.get("58"));
  }
  if (e43.condominiumInfrastructure) {
    const infId = String(e43.condominiumInfrastructure).replace("$", "");
    console.log("Condo Infra (" + infId + "):", map.get(infId));
  }
}

inspectRef().catch(console.error);
