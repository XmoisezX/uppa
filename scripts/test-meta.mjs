async function test() {
  const pRes = await fetch("https://www.langimoveis.imb.br/imovel/casa-com-2-quartos-a-venda-e-4-vagas-bairro-areal-em-pelotas/18");
  const html = await pRes.text();
  const metas = html.match(/<meta[^>]+>/gi) || [];
  metas.forEach(tag => {
    if (/api/i.test(tag)) console.log("Meta API:", tag);
  });
}
test().catch(console.error);
