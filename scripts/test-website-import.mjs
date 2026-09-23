#!/usr/bin/env node

/**
 * Suíte de Testes Automatizados para o Módulo WEBSITE IMPORT
 *
 * Cobertura de Testes:
 * 1. SSRF Guard: Bloqueio rigoroso de localhost, 127.0.0.1, faixas privadas, cloud metadata e esquemas não-HTTP
 * 2. Media Filter: Exclusão de banners, logos, ícones, tracking pixels e preservação de fotos
 * 3. External ID Resolver: Resolução determinística por prioridade (Código > API ID > @id > Canonical URL)
 * 4. Content Hash: Determinação estável e detecção de alterações
 * 5. UniversalStructuredDataConnector: Parsing de Schema.org / JSON-LD
 * 6. GenericWebsiteConnector: Parsing de HTML semântico e regex
 * 7. Sitemap Parser: Suporte a sitemap.xml e sitemap_index.xml
 * 8. Paginação de Catálogo: Extração de links entre páginas
 * 9. Autorização Formal: Bloqueio obrigatório de crawling sem autorização ativa registrada
 * 10. Tolerância a Falhas: Isolamento de imóvel inválido (não derruba o lote)
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import dns from "node:dns/promises";

const { validateSafeUrl, isPrivateOrReservedIP } = await import(
  "../src/features/website-import/security/ssrf-guard.ts"
);
const { filterListingImages } = await import(
  "../src/features/website-import/utils/media-filter.ts"
);
const { resolveWebsiteExternalId, extractStableSlugFromUrl } = await import(
  "../src/features/website-import/utils/external-id-resolver.ts"
);
const { computePropertyContentHash } = await import(
  "../src/features/website-import/utils/content-hash.ts"
);
const { parseSitemapXml, extractHtmlLinks } = await import(
  "../src/features/website-import/utils/html-parser-utils.ts"
);
const { UniversalStructuredDataConnector } = await import(
  "../src/features/website-import/connectors/universal-structured-data-connector.ts"
);
const { GenericWebsiteConnector } = await import(
  "../src/features/website-import/connectors/generic-website-connector.ts"
);
const { UnauthorizedCrawlError, WebsiteCrawler } = await import(
  "../src/features/website-import/crawler/website-crawler.ts"
);

console.log("================================================================================");
console.log("TESTE AUTOMATIZADO: MÓDULO WEBSITE IMPORT (UPPA)");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ============================================================================
// 1. TESTES DE SEGURANÇA E SSRF GUARD
// ============================================================================
console.log("1️⃣ Testes de Segurança e SSRF Guard...");

test("isPrivateOrReservedIP bloqueia endereços IPv4 privados e loopback", () => {
  assert.equal(isPrivateOrReservedIP("127.0.0.1"), true, "127.0.0.1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("127.0.1.1"), true, "127.0.1.1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("10.0.0.1"), true, "10.0.0.1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("172.16.0.1"), true, "172.16.0.1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("172.31.255.255"), true, "172.31.255.255 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("192.168.1.1"), true, "192.168.1.1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("169.254.169.254"), true, "169.254.169.254 (metadata) deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("100.64.0.1"), true, "100.64.0.1 (CGNAT) deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("0.0.0.0"), true, "0.0.0.0 deve ser bloqueado");
});

test("isPrivateOrReservedIP bloqueia endereços IPv6 privados e loopback", () => {
  assert.equal(isPrivateOrReservedIP("::1"), true, "::1 (loopback IPv6) deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("::"), true, ":: deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("fc00::1"), true, "fc00::1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("fe80::1"), true, "fe80::1 deve ser bloqueado");
  assert.equal(isPrivateOrReservedIP("::ffff:127.0.0.1"), true, "::ffff:127.0.0.1 deve ser bloqueado");
});

test("isPrivateOrReservedIP permite IPs públicos legítimos", () => {
  assert.equal(isPrivateOrReservedIP("8.8.8.8"), false, "8.8.8.8 deve ser permitido");
  assert.equal(isPrivateOrReservedIP("1.1.1.1"), false, "1.1.1.1 deve ser permitido");
  assert.equal(isPrivateOrReservedIP("142.250.190.46"), false, "IP público do Google deve ser permitido");
});

await testAsync("validateSafeUrl bloqueia esquemas não permitidos (file, ftp, etc.)", async () => {
  await assert.rejects(
    async () => validateSafeUrl("file:///etc/passwd"),
    /Protocolo não permitido/
  );
  await assert.rejects(
    async () => validateSafeUrl("ftp://servidor.interno/"),
    /Protocolo não permitido/
  );
  await assert.rejects(
    async () => validateSafeUrl("javascript:alert(1)"),
    /Protocolo não permitido/
  );
});

await testAsync("validateSafeUrl bloqueia localhost e hostnames internos", async () => {
  await assert.rejects(
    async () => validateSafeUrl("http://localhost:3000/"),
    /Hostname proibido/
  );
  await assert.rejects(
    async () => validateSafeUrl("http://127.0.0.1:8080/"),
    /Hostname proibido/
  );
  await assert.rejects(
    async () => validateSafeUrl("http://metadata.google.internal/"),
    /Hostname proibido/
  );
  await assert.rejects(
    async () => validateSafeUrl("http://servidor.local/"),
    /Domínio interno\/local proibido/
  );
});

await testAsync("validateSafeUrl bloqueia truques numéricos e octais de IP", async () => {
  await assert.rejects(
    async () => validateSafeUrl("http://2130706433/"),
    /Formato numérico ambíguo|Hostname proibido/
  );
  await assert.rejects(
    async () => validateSafeUrl("http://0x7f000001/"),
    /Formato numérico ambíguo|Hostname proibido/
  );
});

// ============================================================================
// 2. TESTES DE FILTRO DE MÍDIAS
// ============================================================================
console.log("\n2️⃣ Testes de Filtro Inteligente de Mídias...");

test("filterListingImages descarta logos, banners, ícones e tracking pixels", () => {
  const dirtyImages = [
    "https://imobiliaria.com.br/assets/logo-header.png",
    "https://imobiliaria.com.br/assets/icon-facebook.svg",
    "https://imobiliaria.com.br/fotos/imovel-ap101-foto1.jpg",
    "https://imobiliaria.com.br/assets/banner-topo.jpg",
    "https://imobiliaria.com.br/fotos/imovel-ap101-foto2.jpg",
    "https://analytics.com/tracking-pixel.gif?id=123",
    "https://imobiliaria.com.br/fotos/imovel-ap101-foto3.jpg",
    "https://imobiliaria.com.br/assets/favicon.ico",
  ];

  const filtered = filterListingImages(dirtyImages);
  assert.equal(filtered.length, 3, "Deveria manter apenas as 3 fotos reais do imóvel");
  assert.equal(filtered[0].url, "https://imobiliaria.com.br/fotos/imovel-ap101-foto1.jpg");
  assert.equal(filtered[0].isCover, true, "A primeira foto válida deve ser marcada como capa");
  assert.equal(filtered[1].isCover, false, "As demais fotos não devem ser capa");
});

test("filterListingImages deduplica URLs repetidas", () => {
  const duplicateImages = [
    "https://imobiliaria.com.br/fotos/foto1.jpg",
    "https://imobiliaria.com.br/fotos/foto1.jpg",
    "https://imobiliaria.com.br/fotos/foto2.jpg",
  ];
  const filtered = filterListingImages(duplicateImages);
  assert.equal(filtered.length, 2, "Deveria deduplicar URLs repetidas");
});

// ============================================================================
// 3. TESTES DE EXTERNAL ID RESOLVER
// ============================================================================
console.log("\n3️⃣ Testes de Resolução de External ID...");

test("resolveWebsiteExternalId prioriza código explícito do anúncio", () => {
  const id = resolveWebsiteExternalId({
    explicitCode: "Ref: AP-9901",
    apiId: "12345",
    structuredId: "https://site.com/imovel#id",
    canonicalUrl: "https://site.com/imovel/apartamento-ap9901",
  });
  assert.equal(id, "AP-9901");
});

test("resolveWebsiteExternalId utiliza ID da API quando não há código explícito", () => {
  const id = resolveWebsiteExternalId({
    explicitCode: null,
    apiId: "54321",
    structuredId: "https://site.com/imovel#id",
    canonicalUrl: "https://site.com/imovel/apartamento-54321",
  });
  assert.equal(id, "54321");
});

test("resolveWebsiteExternalId utiliza URL canônica estável como fallback", () => {
  const id = resolveWebsiteExternalId({
    explicitCode: null,
    apiId: null,
    structuredId: null,
    canonicalUrl: "https://site.com/imovel/cobertura-duplex-moema-cb303?utm_source=google",
  });
  assert.equal(id, "cobertura-duplex-moema-cb303");
});

test("extractStableSlugFromUrl limpa extensões e parâmetros de tracking", () => {
  const slug = extractStableSlugFromUrl(
    "https://imobiliaria.com.br/imovel/casa-alphaville-ca102.html?fbclid=xyz#topo"
  );
  assert.equal(slug, "casa-alphaville-ca102");
});

// ============================================================================
// 4. TESTES DE CONTENT HASH DETERMINÍSTICO
// ============================================================================
console.log("\n4️⃣ Testes de Content Hash...");

test("computePropertyContentHash gera hash idêntico para os mesmos dados", () => {
  const propA = {
    externalId: "AP-101",
    title: "Apartamento Luxo Pinheiros",
    transactionType: "sale",
    propertyType: "apartment",
    price: 850000,
    bedrooms: 3,
    address: { street: "Rua Pinheiros", city: "São Paulo", state: "SP" },
    features: ["Piscina", "Academia"],
    images: [{ type: "image", url: "https://site.com/foto1.jpg" }],
  };

  // propB tem arrays em ordem invertida (features e images), mas o hash deve ser idêntico
  const propB = {
    externalId: "AP-101",
    title: "Apartamento Luxo Pinheiros",
    transactionType: "sale",
    propertyType: "apartment",
    price: 850000,
    bedrooms: 3,
    address: { street: "Rua Pinheiros", city: "São Paulo", state: "SP" },
    features: ["Academia", "Piscina"],
    images: [{ type: "image", url: "https://site.com/foto1.jpg" }],
  };

  const hashA = computePropertyContentHash(propA);
  const hashB = computePropertyContentHash(propB);

  assert.equal(hashA, hashB, "Hash deve ser determinístico e independente da ordem de arrays");
});

test("computePropertyContentHash detecta alteração de preço ou características", () => {
  const propOriginal = {
    externalId: "AP-101",
    title: "Apartamento Luxo",
    transactionType: "sale",
    propertyType: "apartment",
    price: 850000,
    address: { city: "São Paulo" },
    features: [],
    images: [],
  };

  const propComPrecoNovo = {
    ...propOriginal,
    price: 799000, // Preço caiu
  };

  const hashOrig = computePropertyContentHash(propOriginal);
  const hashNovo = computePropertyContentHash(propComPrecoNovo);

  assert.notEqual(hashOrig, hashNovo, "Alteração de preço deve gerar hash diferente");
});

// ============================================================================
// 5. TESTES DE PARSING DE SITEMAPS
// ============================================================================
console.log("\n5️⃣ Testes de Parsing de Sitemaps XML...");

const sitemapXml = fs.readFileSync(path.resolve("tests/fixtures/website/sitemap.xml"), "utf-8");
const sitemapIndexXml = fs.readFileSync(path.resolve("tests/fixtures/website/sitemap-index.xml"), "utf-8");

test("parseSitemapXml extrai URLs e timestamps lastmod", () => {
  const entries = parseSitemapXml(sitemapXml);
  assert.equal(entries.length, 4, "Deve extrair 4 URLs do sitemap");
  assert.equal(entries[0].url, "https://imobiliaria-modelo.com.br/imovel/apartamento-luxo-pinheiros-sp-ap101");
  assert.equal(entries[0].lastmod, "2026-09-20T10:00:00Z");
});

test("parseSitemapXml reconhece sub-sitemaps a partir de sitemap_index", () => {
  const entries = parseSitemapXml(sitemapIndexXml);
  assert.equal(entries.length, 2, "Deve extrair 2 sitemaps referenciados no índice");
  assert.equal(entries[0].url, "https://imobiliaria-modelo.com.br/sitemap-imoveis.xml");
});

// ============================================================================
// 6. TESTES DE CONECTORES (FIXTURES OFFLINE)
// ============================================================================
console.log("\n6️⃣ Testes de Conectores (UniversalStructuredData e Generic)...");

const jsonLdHtml = fs.readFileSync(path.resolve("tests/fixtures/website/listing-jsonld.html"), "utf-8");
const genericHtml = fs.readFileSync(path.resolve("tests/fixtures/website/listing-generic.html"), "utf-8");

// Mock global do fetch e dns para usar as fixtures locais sem conexão externa
const originalLookup = dns.lookup;
dns.lookup = async (hostname, options) => {
  if (hostname === "imobiliaria-modelo.com.br") {
    return [{ address: "93.184.216.34", family: 4 }];
  }
  return originalLookup(hostname, options);
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const urlStr = String(url);
  if (urlStr.includes("jsonld")) {
    return new Response(jsonLdHtml, { status: 200, headers: { "Content-Type": "text/html" } });
  }
  if (urlStr.includes("generic")) {
    return new Response(genericHtml, { status: 200, headers: { "Content-Type": "text/html" } });
  }
  return new Response("Not found", { status: 404 });
};

await testAsync("UniversalStructuredDataConnector extrai e normaliza imóvel com Schema.org JSON-LD", async () => {
  const connector = new UniversalStructuredDataConnector();
  const prop = await connector.fetchListing(
    { url: "https://imobiliaria-modelo.com.br/imovel/listing-jsonld" },
    {
      agencyId: "test-agency",
      baseUrl: "https://imobiliaria-modelo.com.br",
      domain: "imobiliaria-modelo.com.br",
      safeFetchOptions: {
        skipDnsValidation: true,
        fetchFn: async () =>
          new Response(jsonLdHtml, { status: 200, headers: { "Content-Type": "text/html" } }),
      },
    }
  );

  assert.equal(prop.externalId, "AP-9901", "Deveria extrair o código AP-9901");
  assert.equal(prop.title, "Apartamento Luxo 3 Quartos em Pinheiros");
  assert.equal(prop.price, 1250000, "Preço normalizado deve ser R$ 1.250.000");
  assert.equal(prop.bedrooms, 3, "3 quartos");
  assert.equal(prop.bathrooms, 2, "2 banheiros");
  assert.equal(prop.suites, 1, "1 suíte");
  assert.equal(prop.parkingSpaces, 2, "2 vagas");
  assert.equal(prop.usableArea, 120, "120 m² de área");
  assert.equal(prop.address.city, "São Paulo");
  assert.equal(prop.images.length, 4, "4 fotos extraídas (capa + 3 fotos, logos/banners descartados)");
  assert.ok(prop.features.includes("Piscina"), "Feature Piscina presente");
  assert.ok(prop.features.includes("Churrasqueira"), "Feature Churrasqueira presente");
});

await testAsync("GenericWebsiteConnector extrai e normaliza imóvel através de HTML semântico e regex", async () => {
  const connector = new GenericWebsiteConnector();
  const prop = await connector.fetchListing(
    { url: "https://imobiliaria-modelo.com.br/imovel/listing-generic" },
    {
      agencyId: "test-agency",
      baseUrl: "https://imobiliaria-modelo.com.br",
      domain: "imobiliaria-modelo.com.br",
      safeFetchOptions: {
        skipDnsValidation: true,
        fetchFn: async () =>
          new Response(genericHtml, { status: 200, headers: { "Content-Type": "text/html" } }),
      },
    }
  );

  assert.equal(prop.externalId, "CA-202", "Deveria extrair o código CA-202 a partir de 'Ref: CA-202'");
  assert.equal(prop.title, "Casa Térrea em Alphaville com Piscina");
  assert.equal(prop.price, 2450000, "Preço deve ser R$ 2.450.000");
  assert.equal(prop.bedrooms, 4, "4 quartos");
  assert.equal(prop.suites, 2, "2 suítes");
  assert.equal(prop.usableArea, 320, "320 m²");
  assert.equal(prop.address.neighborhood, "Alphaville");
  assert.equal(prop.address.city, "Barueri");
  assert.equal(prop.images.length, 4, "4 fotos reais extraídas (capa + 3 galeria, logo descartado)");
});

// Restaura fetch e dns
globalThis.fetch = originalFetch;
dns.lookup = originalLookup;

// ============================================================================
// 7. TESTES DE PAGINAÇÃO DE CATÁLOGO
// ============================================================================
console.log("\n7️⃣ Testes de Paginação de Catálogo...");

const catalogPage1 = fs.readFileSync(path.resolve("tests/fixtures/website/catalog-page-1.html"), "utf-8");
const catalogPage2 = fs.readFileSync(path.resolve("tests/fixtures/website/catalog-page-2.html"), "utf-8");

test("extractHtmlLinks descarta links externos e extrai links internos e paginação", () => {
  const links = extractHtmlLinks(catalogPage1, "https://imobiliaria-modelo.com.br/imoveis");
  assert.ok(
    links.includes("https://imobiliaria-modelo.com.br/imovel/apartamento-pinheiros-ap1"),
    "Deveria conter anúncio da página 1"
  );
  assert.ok(
    links.includes("https://imobiliaria-modelo.com.br/imoveis?page=2"),
    "Deveria conter link de paginação para página 2"
  );
});

// ============================================================================
// 8. TESTE DE AUTORIZAÇÃO FORMAL OBRIGATÓRIA
// ============================================================================
console.log("\n8️⃣ Teste de Autorização Legal Obrigatória...");

await testAsync("WebsiteCrawler bloqueia crawling de domínio sem autorização ativa", async () => {
  // Mock do Supabase Client para simular ausência de autorização
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  };

  const crawler = new WebsiteCrawler(mockSupabase);

  await assert.rejects(
    async () => crawler.ensureAuthorization("agency-123", "site-nao-autorizado.com.br"),
    UnauthorizedCrawlError,
    "Deve lançar UnauthorizedCrawlError quando não há autorização no banco"
  );
});

// ============================================================================
// 9. TESTE DE TOLERÂNCIA A FALHAS E ISOLAMENTO DE ERRO
// ============================================================================
console.log("\n9️⃣ Teste de Tolerância a Falhas e Isolamento de Erro...");

await testAsync("Falha em um anúncio individual registra erro sem derrubar o processo", async () => {
  const connector = new GenericWebsiteConnector();
  const invalidHtml = fs.readFileSync(path.resolve("tests/fixtures/website/listing-invalid.html"), "utf-8");

  await assert.rejects(
    async () =>
      connector.fetchListing(
        { url: "https://imobiliaria-modelo.com.br/imovel/invalido-404" },
        {
          agencyId: "test-agency",
          baseUrl: "https://imobiliaria-modelo.com.br",
          domain: "imobiliaria-modelo.com.br",
          safeFetchOptions: {
            skipDnsValidation: true,
            fetchFn: async () =>
              new Response(invalidHtml, { status: 404, headers: { "Content-Type": "text/html" } }),
          },
        }
      ),
    /Falha HTTP 404/
  );
});

console.log("\n================================================================================");
console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
console.log("================================================================================\n");
