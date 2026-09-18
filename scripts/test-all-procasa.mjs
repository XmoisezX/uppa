import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { VRSyncParser } from "../src/features/feeds/parser/vrsync-parser.ts";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      process.env[key.trim()] = values.join("=").trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAllProperties() {
  const filePath = path.resolve(process.cwd(), "procasa_vrsync.xml.xml");
  const xmlContent = fs.readFileSync(filePath, "utf-8");
  const parser = new VRSyncParser();
  const { properties, parseErrors } = parser.parse(xmlContent);

  console.log(`Total de imóveis parseados: ${properties.length}`);
  console.log(`Total de erros de parse: ${parseErrors.length}`);

  // Verificar campos obrigatórios e restrições de schema em cada um dos 788 imóveis
  const schemaIssues = [];
  const propertyTypesFound = new Set();
  const transactionTypesFound = new Set();
  const statesFound = new Set();
  const citiesFound = new Set();

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    propertyTypesFound.add(p.propertyType);
    transactionTypesFound.add(p.transactionType);
    if (p.address.state) statesFound.add(p.address.state);
    if (p.address.city) citiesFound.add(p.address.city);

    // Checar se falta algo crítico
    if (!p.externalId) {
      schemaIssues.push({ idx: i, id: p.externalId, issue: "Sem externalId" });
    }
    if (!p.title) {
      schemaIssues.push({ idx: i, id: p.externalId, issue: "Sem title" });
    }
    if (p.transactionType === "sale" && (p.price === undefined || p.price === null)) {
      schemaIssues.push({ idx: i, id: p.externalId, issue: "Venda sem price" });
    }
    if (p.transactionType === "rent" && (p.rentPrice === undefined || p.rentPrice === null)) {
      schemaIssues.push({ idx: i, id: p.externalId, issue: "Locação sem rentPrice" });
    }
    // Checar latitude e longitude
    if (p.address.latitude !== undefined && (isNaN(p.address.latitude) || Math.abs(p.address.latitude) > 90)) {
      schemaIssues.push({ idx: i, id: p.externalId, issue: `Latitude inválida: ${p.address.latitude}` });
    }
    if (p.address.longitude !== undefined && (isNaN(p.address.longitude) || Math.abs(p.address.longitude) > 180)) {
      schemaIssues.push({ idx: i, id: p.externalId, issue: `Longitude inválida: ${p.address.longitude}` });
    }
  }

  console.log("\nTipos de imóvel encontrados:", Array.from(propertyTypesFound));
  console.log("Tipos de transação encontrados:", Array.from(transactionTypesFound));
  console.log("Estados encontrados:", Array.from(statesFound));
  console.log("Cidades encontradas:", Array.from(citiesFound));
  console.log(`Problemas de validação de schema encontrados: ${schemaIssues.length}`);

  if (schemaIssues.length > 0) {
    console.log("Exemplos de problemas:", schemaIssues.slice(0, 10));
  }
}

checkAllProperties().catch(console.error);
