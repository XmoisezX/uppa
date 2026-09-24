const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Search for JSON object with property fields
const propMatch = html.match(/"property"\s*:\s*(\{[\s\S]*?\})\s*,\s*"/);
if (propMatch) {
  console.log('--- FOUND "property": JSON ---');
  console.log(propMatch[1].slice(0, 1000));
}

// Search for any other structured object in __next_f
console.log('\n--- SEARCHING FOR PROPERTY OBJECTS ---');
const regex = /"Codigo"\s*:\s*"([^"]+)"/g;
let m;
while ((m = regex.exec(html)) !== null) {
  const start = Math.max(0, m.index - 100);
  const end = Math.min(html.length, m.index + 800);
  console.log('--- MATCH ---');
  console.log(html.substring(start, end).replace(/\\"/g, '"'));
}
