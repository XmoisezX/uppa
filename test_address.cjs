const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Test address extraction
const pageUrl = 'https://imobiliariabage.com.br/imovel/casa-tres-vendas-pelotas-rs-3-quartos-215m2-4959';

// 1. Coordenadas
let latitude, longitude;
const latMatch = html.match(/(?:\\?"latitude\\?"|\\?"lat\\?"):\s*(-?\d+\.\d+)/i);
const lngMatch = html.match(/(?:\\?"longitude\\?"|\\?"lng\\?"):\s*(-?\d+\.\d+)/i);
if (latMatch && lngMatch) {
  latitude = parseFloat(latMatch[1]);
  longitude = parseFloat(lngMatch[1]);
}
console.log('LAT/LNG from regex:', latitude, longitude);

// What was that regex matching?
// Look at find_fields.cjs earlier:
// Key Latitude found at 84446:
// brokerAddressLatitude: -31.76901, brokerAddressLongitude: -52.338410000001, brokerAddressDistrict: Centro, brokerAddressCity: Pelotas, brokerAddressNumber: 660
console.log('\nLOOK AT POS 84446 IN HTML:');
console.log(html.substring(84300, 84700));
