#!/usr/bin/env node

/**
 * Script de Recálculo em Lote do Ranking para todo o estoque existente
 * Processa todos os imóveis com ranking_score = 0 ou reavalia todo o estoque.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...values] = trimmed.split('=');
      process.env[key.trim()] = values.join('=').trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: Credenciais Supabase ausentes em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runRecalculation() {
  console.log('\n======================================================');
  console.log(' RECÁLCULO EM LOTE DE RANKING DE IMÓVEIS (UPPA)');
  console.log('======================================================\n');

  const { count: totalProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  const { count: pendingProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('ranking_score', 0);

  console.log(`Estoque total: ${totalProperties} imóveis.`);
  console.log(`Imóveis pendentes de cálculo (score = 0): ${pendingProperties} imóveis.\n`);

  if (!pendingProperties || pendingProperties === 0) {
    console.log('Todos os imóveis já possuem ranking calculado!');
    return;
  }

  const BATCH_SIZE = 50;
  let processed = 0;
  const startTime = Date.now();

  while (true) {
    const { data: batch, error } = await supabase
      .from('properties')
      .select('id')
      .eq('ranking_score', 0)
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Erro ao buscar lote:', error);
      break;
    }

    if (!batch || batch.length === 0) {
      break;
    }

    await Promise.all(
      batch.map((p) =>
        supabase.rpc('calculate_property_ranking_score', { p_property_id: p.id })
      )
    );

    processed += batch.length;
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const speed = (processed / Math.max(1, elapsedSec)).toFixed(1);

    process.stdout.write(
      `\rProgresso: ${processed} / ${pendingProperties} imóveis (${Math.round(
        (processed / pendingProperties) * 100
      )}%) — ${speed} imóveis/s`
    );
  }

  console.log('\n\n✓ Recálculo concluído com sucesso para todo o estoque!');
}

runRecalculation().catch((err) => {
  console.error('\nErro inesperado:', err);
  process.exitCode = 1;
});
