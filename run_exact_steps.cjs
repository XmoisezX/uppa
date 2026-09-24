const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Import or copy all methods from generic-website-connector.ts
const meta = {};
const metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
let m;
while ((m = metaRegex.exec(html)) !== null) {
  meta[m[1]] = m[2];
}

const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
const cleanH1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, " ").trim() : "";
const title = cleanH1 || meta["og:title"] || meta["page_title"] || "Imóvel Anunciado";

console.log('1. TITLE:', title);

// Description
const proseRegex =
  /<(?:div|section|article|p)[^>]*class=["'][^"']*(?:whitespace-pre-wrap|prose|leading-relaxed|texto-descricao|descricao|description|property-description|property-details|imovel-detalhes)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|p)>/gi;
let proseMatch;
const candidates = [];
while ((proseMatch = proseRegex.exec(html)) !== null) {
  candidates.push(proseMatch[1]);
}
if (meta["og:description"]) candidates.push(meta["og:description"]);
if (meta["description"]) candidates.push(meta["description"]);
candidates.sort((a, b) => b.length - a.length);
const description = candidates[0] || "";

console.log('2. DESC LENGTH:', description.length);

function inferTransactionType(text) {
  const lower = text.toLowerCase();
  const isSale =
    lower.includes("venda") ||
    lower.includes("comprar") ||
    lower.includes("sale") ||
    lower.includes("buy");
  const isRent =
    lower.includes("locacao") ||
    lower.includes("locação") ||
    lower.includes("aluguel") ||
    lower.includes("rent");

  if (isSale && isRent) return "sale_or_rent";
  if (isRent) return "rent";
  return "sale";
}

const transactionType = inferTransactionType(`${title} ${description}`);
console.log('3. TRANSACTION TYPE:', transactionType);

// Address
const fromUrl = {};
const addrParts = 'https://imobiliariabage.com.br/imovel/casa-tres-vendas-pelotas-rs-3-quartos-215m2-4959'.split('/');
console.log('4. URL PARTS:', addrParts);

// Images
const imgMatches = html.matchAll(/<img\s+[^>]*?(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi);
const rawImageUrls = [];
for (const match of imgMatches) {
  rawImageUrls.push(match[1]);
}
console.log('5. RAW IMAGES COUNT:', rawImageUrls.length);
console.log('   First 3 raw images:', rawImageUrls.slice(0, 3));
