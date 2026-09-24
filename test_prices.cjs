const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

const matches = html.matchAll(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/gi);
let count = 0;
for (const m of matches) {
  console.log(`MATCH ${++count}: ${m[0]} (captured: ${m[1]})`);
  if (count > 10) break;
}
