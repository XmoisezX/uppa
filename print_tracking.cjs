const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

const pos = html.indexOf('id="property-details-tracking"');
if (pos !== -1) {
  const start = pos;
  const end = html.indexOf('>', pos) + 1;
  console.log('=== TRACKING DIV ===');
  console.log(html.substring(start, end));
}

// Let's also look for address / location in HTML
const addrPos = html.indexOf('Três Vendas');
console.log('\n=== ADDRESS IN HTML ===');
if (addrPos !== -1) {
  console.log(html.substring(addrPos - 200, addrPos + 300));
}
