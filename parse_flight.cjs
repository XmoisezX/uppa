const fs = require('fs');
const text = fs.readFileSync('snippet_130k.txt', 'utf8');

// Unescape Next.js flight data strings
const unescaped = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
console.log('Unescaped length:', unescaped.length);

// Let's find property data
const idx = unescaped.indexOf('"property":');
console.log('Index of "property":', idx);
if (idx !== -1) {
  console.log(unescaped.substring(idx - 50, idx + 2500));
} else {
  // Print first 1500 chars
  console.log(unescaped.slice(0, 1500));
}
