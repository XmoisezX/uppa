const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Search for key words like "Bairro", "Cidade", "ValorVenda", "ValorLocacao"
const keys = ['ValorVenda', 'ValorLocacao', 'Bairro', 'Cidade', 'Latitude', 'Longitude', 'Endereco', 'Numero'];
keys.forEach(k => {
  let pos = 0;
  let count = 0;
  while ((pos = html.indexOf(k, pos)) !== -1) {
    if (count++ < 3) {
      console.log(`Key ${k} found at ${pos}:`);
      console.log(html.substring(Math.max(0, pos - 50), Math.min(html.length, pos + 250)));
    }
    pos += k.length;
  }
});
