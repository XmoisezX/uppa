const testUrls = [
  'https://imobiliariabage.com.br/imovel/casa-tres-vendas-pelotas-rs-3-quartos-215m2-4959',
  'https://imobiliariabage.com.br/imovel/apartamento-centro-pelotas-rs-2-quartos-52.93m2-15719',
  'https://imobiliariabage.com.br/imovel/casa-areal-pelotas-rs-3-quartos-318.45m2-15718',
  'https://imobiliariabage.com.br/imovel/casa-laranjal-pelotas-1-quartos-105m2-15699',
  'https://imobiliariabage.com.br/imovel/terreno-loteamento-novo-leao-capao-do-leao-15520',
  'https://imobiliariabage.com.br/imovel/apartamento/venda/pelotas/rs/centro/AP5986_UPIMOV'
];

const UF_LIST = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

function extractAddressFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);

    // 1. Formato em múltiplos segmentos por barras
    if (segments.length >= 6 && segments[0] === "imovel") {
      const stateCandidate = segments.find(
        (s) => s.length === 2 && UF_LIST.has(s.toUpperCase())
      );
      if (stateCandidate) {
        const stateIdx = segments.indexOf(stateCandidate);
        const cityCandidate = stateIdx > 0 ? segments[stateIdx - 1] : undefined;
        const neighborhoodCandidate =
          stateIdx + 1 < segments.length - 1 ? segments[stateIdx + 1] : undefined;

        const formatName = (str) =>
          str
            ? str
                .replace(/[-_]+/g, " ")
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ")
            : undefined;

        return {
          country: "Brasil",
          state: stateCandidate.toUpperCase(),
          city: formatName(cityCandidate),
          neighborhood: formatName(neighborhoodCandidate),
        };
      }
    }

    // 2. Formato com slug único hifenizado (ex: /imovel/casa-tres-vendas-pelotas-rs-3-quartos-215m2-4959)
    const slug = segments[segments.length - 1] || "";
    const parts = slug.split("-");

    // Procura por UF válida entre os tokens (ex: rs, sc, sp)
    let ufIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length === 2 && UF_LIST.has(parts[i].toUpperCase())) {
        ufIdx = i;
        break;
      }
    }

    const formatName = (words) =>
      words.length > 0
        ? words
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")
        : undefined;

    if (ufIdx !== -1) {
      const state = parts[ufIdx].toUpperCase();
      // O que vem imediatamente antes da UF é a cidade (geralmente 1 ou 2 tokens, ex: pelotas ou capao do leao)
      const beforeUf = parts.slice(1, ufIdx); // pula o tipo (casa, apartamento, etc)
      if (beforeUf.length > 0) {
        // Cidades conhecidas comuns
        const cityIndex = beforeUf.findIndex(p => ['pelotas', 'bage', 'porto', 'caxias', 'canoas', 'rio'].includes(p.toLowerCase()));
        if (cityIndex !== -1) {
          const neighborhoodParts = beforeUf.slice(0, cityIndex);
          const cityParts = beforeUf.slice(cityIndex);
          return {
            country: "Brasil",
            state,
            city: formatName(cityParts),
            neighborhood: formatName(neighborhoodParts),
          };
        } else {
          // Último token é a cidade, os anteriores são o bairro
          const cityParts = [beforeUf[beforeUf.length - 1]];
          const neighborhoodParts = beforeUf.slice(0, beforeUf.length - 1);
          return {
            country: "Brasil",
            state,
            city: formatName(cityParts),
            neighborhood: formatName(neighborhoodParts),
          };
        }
      }
    }
  } catch (e) {}
  return {};
}

testUrls.forEach(u => console.log(u.split('/').pop(), '=>', extractAddressFromUrl(u)));
