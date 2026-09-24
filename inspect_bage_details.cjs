const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Find all matches for "R$" or currency
console.log('--- CURRENCY OCCURRENCES ---');
const rIndex = [];
let pos = 0;
while ((pos = html.indexOf('R$', pos)) !== -1) {
  const snippet = html.substring(Math.max(0, pos - 100), Math.min(html.length, pos + 150));
  console.log('--- AT POS', pos, '---');
  console.log(snippet.replace(/\s+/g, ' '));
  pos += 2;
  if (rIndex.length++ > 10) break;
}

// Find images
console.log('\n--- IMAGES OCCURRENCES ---');
const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
let imgCount = 0;
while ((m = imgRegex.exec(html)) !== null) {
  imgCount++;
  if (imgCount <= 15) {
    console.log(`IMG ${imgCount}: ${m[1]} | ALT: ${m[0].slice(0, 100)}`);
  }
}
console.log('Total images found:', imgCount);

// Find elements with class or id containing price, address, bairro, etc.
console.log('\n--- VISTA / DATA ATTRIBUTES / SCRIPTS ---');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let sMatch;
while ((sMatch = scriptRegex.exec(html)) !== null) {
  const scriptContent = sMatch[1];
  if (scriptContent.includes('valor') || scriptContent.includes('preco') || scriptContent.includes('bairro') || scriptContent.includes('imovel') || scriptContent.includes('latitude')) {
    console.log('--- RELEVANT SCRIPT SNIPPET ---');
    console.log(scriptContent.slice(0, 500));
  }
}
