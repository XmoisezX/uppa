const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Candidate 2
const jsonDescMatch =
  html.match(/\\"[dD]escri(?:cao|ção|ption)\\"\s*:\s*\\"([^\"]{60,})\\"/i) ||
  html.match(/"[dD]escri(?:cao|ção|ption)"\s*:\s*"([^"]{60,})"/i);
if (jsonDescMatch) {
  console.log('jsonDescMatch found:', jsonDescMatch[1].slice(0, 300));
} else {
  console.log('No jsonDescMatch');
}

// Candidate 3
const proseRegex =
  /<(?:div|section|article|p)[^>]*class=["'][^"']*(?:whitespace-pre-wrap|prose|leading-relaxed|texto-descricao|descricao|description|property-description|property-details|imovel-detalhes)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|p)>/gi;
let proseMatch;
while ((proseMatch = proseRegex.exec(html)) !== null) {
  console.log('proseMatch found:', proseMatch[1].slice(0, 300));
}
