const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

const snippet = html.substring(125000, 140000);
fs.writeFileSync('snippet_130k.txt', snippet);
console.log('Saved snippet, size:', snippet.length);
