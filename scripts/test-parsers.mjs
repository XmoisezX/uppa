#!/usr/bin/env node

/**
 * Script de teste automatizado para os parsers de feed XML:
 * 1. Detecção automática de formato (VRSync, Chaves na Mão, Unknown)
 * 2. VRSyncParser continua funcionando perfeitamente
 * 3. ChavesNaMaoParser normaliza todos os campos especificados
 * 4. Tolerância a falhas: imóvel sem referência não quebra o lote
 * 5. Parsing completo do XML real de 127 imóveis do Chaves na Mão
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const { detectFeedFormat } = await import("../src/features/feeds/parser/feed-detector.ts");
const { VRSyncParser } = await import("../src/features/feeds/parser/vrsync-parser.ts");
const { ChavesNaMaoParser } = await import("../src/features/feeds/parser/chaves-na-mao-parser.ts");

console.log("================================================================================");
console.log("TESTE AUTOMATIZADO: FEED DETECTOR & PARSERS (VRSYNC & CHAVES NA MÃO)");
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

// ============================================================================
// 1. TESTES DE DETECÇÃO AUTOMÁTICA DE FORMATO
// ============================================================================
console.log("1️⃣ Testes de Detecção Automática de Formato (detectFeedFormat)...");

const vrsyncXml = fs.readFileSync(path.resolve("tests/fixtures/vrsync-sample.xml"), "utf-8");
const cnmXml = fs.readFileSync(path.resolve("tests/fixtures/chaves-na-mao-sample.xml"), "utf-8");

test("detectFeedFormat identifica formato 'vrsync'", () => {
  const format = detectFeedFormat(vrsyncXml);
  assert.equal(format, "vrsync");
});

test("detectFeedFormat identifica formato 'chaves_na_mao'", () => {
  const format = detectFeedFormat(cnmXml);
  assert.equal(format, "chaves_na_mao");
});

test("detectFeedFormat retorna 'unknown' para XML genérico / desconhecido", () => {
  const unknownXml = `<root><items><item><id>1</id><name>Item</name></item></items></root>`;
  const format = detectFeedFormat(unknownXml);
  assert.equal(format, "unknown");
});

test("detectFeedFormat retorna 'unknown' para payload vazio ou inválido", () => {
  assert.equal(detectFeedFormat(""), "unknown");
  assert.equal(detectFeedFormat("   "), "unknown");
  assert.equal(detectFeedFormat(null), "unknown");
});

// ============================================================================
// 2. TESTES DO VRSYNCPARSER (NÃO REGRESSÃO)
// ============================================================================
console.log("\n2️⃣ Testes do VRSyncParser (Garantia de Não Regressão)...");

test("VRSyncParser normaliza listings do fixture sem erros", () => {
  const parser = new VRSyncParser();
  const { properties, parseErrors } = parser.parse(vrsyncXml);

  assert.equal(parseErrors.length, 0, "Não deve haver erros no fixture VRSync");
  assert.equal(properties.length, 2, "Deve encontrar 2 imóveis no fixture VRSync");

  const [p1, p2] = properties;

  // Imóvel 1: Venda
  assert.equal(p1.externalId, "VR-1001");
  assert.equal(p1.title, "Apartamento Moderno no Centro");
  assert.equal(p1.transactionType, "sale");
  assert.equal(p1.propertyType, "apartment");
  assert.equal(p1.price, 350000);
  assert.equal(p1.condominiumFee, 450);
  assert.equal(p1.iptu, 1200);
  assert.equal(p1.bedrooms, 2);
  assert.equal(p1.suites, 1);
  assert.equal(p1.parkingSpaces, 1);
  assert.equal(p1.address.state, "SP");
  assert.equal(p1.address.city, "São Paulo");
  assert.equal(p1.address.postalCode, "01310100");
  assert.equal(p1.images.length, 2);
  assert.equal(p1.images[0].isCover, true);
  assert.deepEqual(p1.features, ["Piscina", "Academia", "Churrasqueira"]);

  // Imóvel 2: Locação
  assert.equal(p2.externalId, "VR-1002");
  assert.equal(p2.transactionType, "rent");
  assert.equal(p2.propertyType, "condo_house");
  assert.equal(p2.rentPrice, 6500);
  assert.equal(p2.parkingSpaces, 3);
  assert.equal(p2.address.city, "Campinas");
});

// ============================================================================
// 3. TESTES DO CHAVESNAMAOPARSER (NOVO PARSER)
// ============================================================================
console.log("\n3️⃣ Testes do ChavesNaMaoParser...");

test("ChavesNaMaoParser normaliza imóveis válidos e isola falhas individuais", () => {
  const parser = new ChavesNaMaoParser();
  const { properties, parseErrors } = parser.parse(cnmXml);

  // O fixture possui 4 imóveis, sendo 1 inválido propositalmente (sem referencia)
  assert.equal(properties.length, 3, "Deve normalizar com sucesso os 3 imóveis válidos");
  assert.equal(parseErrors.length, 1, "Deve registrar exatamente 1 erro para o imóvel sem tag <referencia>");
  assert.match(parseErrors[0].message, /refer[eê]ncia.*ausente/i);

  // Validação Imóvel 1 (Venda com normalização de estado RI -> RS)
  const prop1 = properties.find((p) => p.externalId === "CNM-57655");
  assert.ok(prop1, "Imóvel CNM-57655 deve existir");
  assert.equal(prop1.code, "57655");
  assert.equal(prop1.title, "Casa Nova 2 dormitórios com piscina e churrasqueira");
  assert.equal(prop1.transactionType, "sale");
  assert.equal(prop1.propertyType, "house");
  assert.equal(prop1.price, 450000);
  assert.equal(prop1.totalArea, 429);
  assert.equal(prop1.usableArea, 180);
  assert.equal(prop1.bedrooms, 2);
  assert.equal(prop1.suites, 1);
  assert.equal(prop1.parkingSpaces, 3);
  assert.equal(prop1.bathrooms, 2);
  assert.equal(prop1.address.state, "RS", "Estado 'RI' deve ser normalizado para 'RS'");
  assert.equal(prop1.address.city, "Pelotas");
  assert.equal(prop1.address.neighborhood, "Laranjal");
  assert.equal(prop1.address.postalCode, "96095140");
  assert.equal(prop1.images.length, 2);
  assert.equal(prop1.images[0].isCover, true);
  assert.equal(prop1.images[1].isCover, false);

  // Validação de features extraídas
  assert.ok(prop1.features.includes("Piscina"), "Deve conter feature Piscina");
  assert.ok(prop1.features.includes("Churrasqueira"), "Deve conter feature Churrasqueira");
  assert.ok(prop1.features.includes("Aceita Pet"), "Deve conter feature Aceita Pet");
  assert.ok(prop1.features.includes("Aceita Permuta / Troca"), "Deve conter feature Aceita Permuta / Troca");

  // Validação Imóvel 2 (Locação)
  const prop2 = properties.find((p) => p.externalId === "CNM-91491");
  assert.ok(prop2, "Imóvel CNM-91491 deve existir");
  assert.equal(prop2.transactionType, "rent");
  assert.equal(prop2.propertyType, "apartment");
  assert.equal(prop2.rentPrice, 3500);
  assert.equal(prop2.condominiumFee, 650);
  assert.equal(prop2.iptu, 180);
  assert.ok(prop2.features.includes("Varanda"), "Deve conter feature Varanda");
  assert.ok(prop2.features.includes("Portaria 24h"), "Deve conter feature de area_comum Portaria 24h");
  assert.ok(prop2.features.includes("Salão Gourmet"), "Deve conter feature de area_comum Salão Gourmet");

  // Validação Imóvel 3 (Dupla Transação: Venda e Locação Simultânea)
  const prop3 = properties.find((p) => p.externalId === "CNM-DualTx");
  assert.ok(prop3, "Imóvel CNM-DualTx deve existir");
  assert.equal(prop3.transactionType, "sale_or_rent", "Transações V + L devem resultar em 'sale_or_rent'");
  assert.equal(prop3.price, 600000, "Preço de venda deve ser preservado");
  assert.equal(prop3.rentPrice, 4500, "Preço de locação deve ser preservado");
  assert.equal(prop3.propertyType, "office", "Conjunto Comercial / Sala deve mapear para 'office'");
});

test("ChavesNaMaoParser lida com tipos desconhecidos com fallback 'other' sem rejeitar", () => {
  const parser = new ChavesNaMaoParser();
  const unknownTypeXml = `
  <Document>
    <imoveis>
      <imovel>
        <referencia>TEST-UNKNOWN-99</referencia>
        <titulo>Imóvel Com Tipo Exótico</titulo>
        <transacao>V</transacao>
        <tipo>Iglu Espacial</tipo>
        <valor>100000</valor>
      </imovel>
    </imoveis>
  </Document>`;

  const { properties, parseErrors } = parser.parse(unknownTypeXml);
  assert.equal(parseErrors.length, 0, "Tipo desconhecido não deve gerar erro de rejeição");
  assert.equal(properties.length, 1);
  assert.equal(properties[0].propertyType, "other", "Tipo exótico deve ter fallback 'other'");
});

// ============================================================================
// 4. TESTE COM O FEED REAL DE 127 IMÓVEIS (scratch-chaves-na-mao-127.xml)
// ============================================================================
console.log("\n4️⃣ Teste com o Feed XML Real de 127 Imóveis (Chave Reserva / Imperial Paris)...");

const realXmlPath = path.resolve("scratch-chaves-na-mao-127.xml");
if (fs.existsSync(realXmlPath)) {
  const realXml = fs.readFileSync(realXmlPath, "utf-8");

  test("detectFeedFormat identifica feed real como 'chaves_na_mao'", () => {
    const format = detectFeedFormat(realXml);
    assert.equal(format, "chaves_na_mao");
  });

  test("ChavesNaMaoParser processa com sucesso os 127 imóveis reais", () => {
    const parser = new ChavesNaMaoParser();
    const { properties, parseErrors } = parser.parse(realXml);

    console.log(`    ℹ️  Total normalizado: ${properties.length}`);
    console.log(`    ℹ️  Total de erros de parsing: ${parseErrors.length}`);

    assert.equal(properties.length, 127, "Deve normalizar exatamente os 127 imóveis do feed real");
    assert.equal(parseErrors.length, 0, "Nenhum imóvel deve ser rejeitado por erro de parsing");

    // Validações amostrais de integridade no lote real
    const totalPhotos = properties.reduce((acc, p) => acc + p.images.length, 0);
    const withPrices = properties.filter((p) => (p.price && p.price > 0) || (p.rentPrice && p.rentPrice > 0));
    const allHaveRef = properties.every((p) => p.externalId && p.externalId.length > 0);

    console.log(`    ℹ️  Total de fotos extraídas no lote: ${totalPhotos}`);
    console.log(`    ℹ️  Imóveis com preço válido: ${withPrices.length}/${properties.length}`);

    assert.ok(allHaveRef, "Todos os 127 imóveis devem possuir externalId extraído de <referencia>");
    assert.ok(totalPhotos > 500, "Deve extrair centenas de fotos do feed real");
    assert.equal(withPrices.length, 127, "Todos os 127 imóveis devem possuir preço");
  });
} else {
  console.warn("  ⚠️ scratch-chaves-na-mao-127.xml não encontrado para teste de lote completo.");
}

console.log("\n================================================================================");
console.log(`RESULTADO DOS TESTES: ${passedTests}/${totalTests} PASSARAM`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
