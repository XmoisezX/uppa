const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Test image extraction
const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
const images = [];
for (const m of imgMatches) {
  images.push(m[1]);
}
console.log('Total img tags in HTML:', images.length);
console.log('First 10 images:');
images.slice(0, 10).forEach((img, i) => console.log(i, img));
