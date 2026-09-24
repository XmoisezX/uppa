const fs = require('fs');

// We have scratch_bage_page.html locally!
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Let's inspect GenericWebsiteConnector methods
function stripHtmlTags(str) {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrencyBrl(val) {
  if (!val) return undefined;
  const clean = String(val).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? undefined : num;
}

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

// Meta tags
const meta = {};
const metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
let m;
while ((m = metaRegex.exec(html)) !== null) {
  meta[m[1]] = m[2];
}

const title = meta["og:title"] || "";
const desc = meta["og:description"] || "";
const txType = inferTransactionType(`${title} ${desc}`);
console.log('inferTransactionType:', txType);

// Let's check extractPricesFromHtml
function extractPricesFromHtml(html, title, transactionType) {
  let price;
  let rentPrice;

  const lower = `${title} ${transactionType || ""}`.toLowerCase();
  const isExplicitRent = lower.includes("aluguel") || lower.includes("loca") || lower.includes("rent");
  const isExplicitSale = lower.includes("venda") || lower.includes("compra") || lower.includes("sale");

  const priceMatches = html.matchAll(/R\$\s*([\d.]+,\d{2}|\d+[\d.]*)/gi);
  for (const match of priceMatches) {
    const val = parseCurrencyBrl(match[1]);
    if (!val || val < 100) continue;

    if (isExplicitRent && !isExplicitSale) {
      if (!rentPrice) rentPrice = val;
    } else if (isExplicitSale && !isExplicitRent) {
      if (!price && val >= 1000) price = val;
    } else {
      if (val >= 25000 && !price) {
        price = val;
      } else if (val < 25000 && !rentPrice) {
        rentPrice = val;
      }
    }

    if (price && rentPrice) break;
  }

  return { price, rentPrice };
}

const prices = extractPricesFromHtml(html, title, txType);
console.log('PRICES:', prices);
