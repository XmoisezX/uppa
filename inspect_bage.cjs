const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// 1. JSON-LD blocks
const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
let m;
const jsonLds = [];
while ((m = jsonLdRegex.exec(html)) !== null) {
  try {
    jsonLds.push(JSON.parse(m[1].trim()));
  } catch (e) {
    console.log('JSON parse error:', e.message);
  }
}
console.log('=== JSON-LD BLOCKS FOUND:', jsonLds.length, '===');
jsonLds.forEach((j, i) => {
  console.log(`\n--- BLOCK ${i} (${j['@type'] || j.type}) ---`);
  console.log(JSON.stringify(j, null, 2));
});

// 2. OpenGraph / Meta tags
console.log('\n=== META TAGS ===');
const metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
while ((m = metaRegex.exec(html)) !== null) {
  if (m[1].includes('price') || m[1].includes('title') || m[1].includes('image') || m[1].includes('geo') || m[1].includes('address')) {
    console.log(`${m[1]} = ${m[2]}`);
  }
}

// 3. Search for price text and transaction type in HTML
console.log('\n=== PRICE & TRANSACTION IN HTML ===');
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.toLowerCase().includes('venda') || l.toLowerCase().includes('aluguel') || l.includes('R$')) {
    if (l.length < 300) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
  }
});
