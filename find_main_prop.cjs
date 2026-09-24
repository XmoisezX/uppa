const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

['4959', '9000', '1.250.000', 'Parque Tenis'].forEach(term => {
  let pos = 0;
  while ((pos = html.indexOf(term, pos)) !== -1) {
    console.log(`TERM "${term}" found at ${pos}:`);
    console.log(html.substring(Math.max(0, pos - 100), Math.min(html.length, pos + 300)));
    pos += term.length + 10;
  }
});
