const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Simulate current generic-website-connector logic
const meta = {};
const metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
let m;
while ((m = metaRegex.exec(html)) !== null) {
  meta[m[1]] = m[2];
}

const title = meta["og:title"] || "";
console.log('TITLE:', title);

// Description
// let's see how extractFullPropertyDescription works
const desc = meta["og:description"] || meta["description"] || "";
console.log('META DESC:', desc);

// Infer transaction type
const lowerDesc = `${title} ${desc}`.toLowerCase();
console.log('Includes venda?', lowerDesc.includes('venda'));
console.log('Includes aluguel?', lowerDesc.includes('aluguel'));
console.log('Includes locacao?', lowerDesc.includes('locacao') || lowerDesc.includes('locação'));

// Check what words exist in HTML
const trackingDiv = html.match(/<div[^>]*id=["']property-details-tracking["'][^>]*>/i);
console.log('\nTRACKING DIV FOUND?', Boolean(trackingDiv));
if (trackingDiv) {
  console.log(trackingDiv[0]);
}
