const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

const meta = {};
const metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
let m;
while ((m = metaRegex.exec(html)) !== null) {
  meta[m[1]] = m[2];
}

const proseRegex =
  /<(?:div|section|article|p)[^>]*class=["'][^"']*(?:whitespace-pre-wrap|prose|leading-relaxed|texto-descricao|descricao|description|property-description|property-details|imovel-detalhes)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|p)>/gi;
let proseMatch;
while ((proseMatch = proseRegex.exec(html)) !== null) {
  const raw = proseMatch[1];
  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+\n/g, "\n\n")
    .trim();
  console.log('Prose matched (length ' + text.length + '):', text.slice(0, 200));
}
