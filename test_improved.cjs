const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');
const pageUrl = 'https://imobiliariabage.com.br/imovel/casa-tres-vendas-pelotas-rs-3-quartos-215m2-4959';

// 1. Test tracking div extraction
function extractTrackingData(html) {
  const match = html.match(/<div[^>]*id=["']property-details-tracking["'][^>]*>/i);
  if (!match) return null;
  const tag = match[0];
  const getAttr = (name) => {
    const m = tag.match(new RegExp(`data-${name}=["']([^"']*)["']`, 'i'));
    return m ? m[1] : undefined;
  };
  return {
    id: getAttr('id'),
    title: getAttr('title'),
    type: getAttr('type'),
    transaction: getAttr('transaction'),
    hasVenda: getAttr('has-venda') === '1',
    hasAluguel: getAttr('has-aluguel') === '1',
    priceVenda: parseFloat(getAttr('price-venda') || '0') || undefined,
    priceAluguel: parseFloat(getAttr('price-aluguel') || '0') || undefined,
    condo: parseFloat(getAttr('condo') || '0') || undefined,
    area: parseFloat(getAttr('area') || '0') || undefined,
    bedrooms: parseInt(getAttr('bedrooms') || '0', 10) || undefined,
    bathrooms: parseInt(getAttr('bathrooms') || '0', 10) || undefined,
    neighborhood: getAttr('neighborhood'),
    city: getAttr('city'),
    state: getAttr('state'),
    image: getAttr('image'),
  };
}

console.log('--- TRACKING DATA ---');
const tracking = extractTrackingData(html);
console.log(tracking);

// 2. Test address extraction from URL
function extractAddressFromSlug(url) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split('/').filter(Boolean).pop() || '';
    
    // Look for state (-rs-, -sc-, -sp-, etc.)
    const stateMatch = slug.match(/-([a-z]{2})(?:-\d+.*|$)/i);
    if (stateMatch) {
      const state = stateMatch[1].toUpperCase();
      const beforeState = slug.substring(0, stateMatch.index);
      const parts = beforeState.split('-').filter(Boolean);
      
      // Usually parts are [tipo, bairro..., cidade...]
      // If Pelotas is the city:
      const cityCandidate = parts[parts.length - 1];
      const neighborhoodCandidate = parts.slice(1, parts.length - 1).join(' ');
      
      const format = (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : undefined;
      return {
        state,
        city: format(cityCandidate),
        neighborhood: format(neighborhoodCandidate),
      };
    }
  } catch (e) {}
  return {};
}

console.log('--- ADDRESS FROM SLUG ---');
console.log(extractAddressFromSlug(pageUrl));

// 3. Test image extraction filtering out logos
function extractCleanImages(html, baseUrl) {
  const imgRegex = /<img\s+([^>]*?)>/gi;
  const urls = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const attrs = m[1];
    const srcMatch = attrs.match(/(?:src|data-src|data-original)=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (!src || src.startsWith('data:')) continue;

    // Check alt, class, id
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const classMatch = attrs.match(/class=["']([^"']*)["']/i);
    const alt = (altMatch ? altMatch[1] : '').toLowerCase();
    const cls = (classMatch ? classMatch[1] : '').toLowerCase();
    const srcLower = src.toLowerCase();

    // Ignore logos, icons, banners
    if (
      alt.includes('logo') ||
      alt.includes('marca') ||
      alt.includes('icone') ||
      alt.includes('icon') ||
      alt.includes('tecnologia') ||
      alt.includes('banner') ||
      cls.includes('logo') ||
      srcLower.includes('loftsites.com.br/images') || // LoftSites logo uploads
      srcLower.includes('loftsites.com.br/shared') ||
      srcLower.includes('logo') ||
      srcLower.includes('favicon')
    ) {
      continue;
    }

    try {
      const resolved = baseUrl ? new URL(src, baseUrl).toString() : src;
      urls.push(resolved);
    } catch {}
  }
  return urls;
}

console.log('--- CLEAN IMAGES (first 5) ---');
const cleanImages = extractCleanImages(html, pageUrl);
console.log('Total clean images:', cleanImages.length);
console.log(cleanImages.slice(0, 5));
