const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

let pos = 0;
while ((pos = html.indexOf('Codigo', pos)) !== -1) {
  const start = Math.max(0, pos - 100);
  const end = Math.min(html.length, pos + 500);
  console.log('--- CODIGO MATCH AT', pos, '---');
  console.log(html.substring(start, end));
  pos += 10;
}
