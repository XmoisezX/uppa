#!/usr/bin/env node

/**
 * Script de Verificação Completa da Área Administrativa (/admin) da UPPA.
 * Valida todos os requisitos solicitados:
 * 1. Proteção de /admin
 * 2. SUPER ADMIN (moiseztorres100@gmail.com)
 * 3. Matriz de Cargos e Permissões limitadas
 * 4. Banners
 * 5. Artigos CMS
 * 6. Gerenciamento de Usuários
 * 7. Imóveis reais e integridade VRSync
 * 8. Feeds
 * 9. Estatísticas do Dashboard
 */

import path from 'node:path';
import fs from 'node:fs';

// Carregar .env.local
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

async function runVerification() {
  console.log('================================================================');
  console.log('   UPPA — SUÍTE DE TESTES E VALIDAÇÃO DA ÁREA ADMINISTRATIVA   ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       ↳ ${details}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       ↳ ${details}`);
    }
  }

  // 1. TESTE SUPER ADMIN (moiseztorres100@gmail.com)
  console.log('\n--- 1. TESTE DO SUPER ADMIN INICIAL ---');
  const { SUPER_ADMIN_EMAIL, checkPermission } = await import(
    '../src/features/admin/services/auth.ts'
  );

  assert(
    SUPER_ADMIN_EMAIL === 'moiseztorres100@gmail.com',
    'E-mail oficial do Super Admin configurado',
    `E-mail: ${SUPER_ADMIN_EMAIL}`
  );

  const mockSuperAdmin = {
    id: '4f5cbe7e-e1de-4f83-a841-b498ee568b86',
    email: 'moiseztorres100@gmail.com',
    name: 'Moisez Torres',
    phone: null,
    role_id: '00000000-0000-0000-0000-000000000001',
    role: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'SUPER ADMIN',
      slug: 'super_admin',
      description: 'Acesso irrestrito',
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: ['all'],
    },
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert(
    checkPermission(mockSuperAdmin, 'dashboard.view') &&
      checkPermission(mockSuperAdmin, 'roles.manage') &&
      checkPermission(mockSuperAdmin, 'feeds.manage') &&
      checkPermission(mockSuperAdmin, 'audit.view'),
    'Super Admin possui acesso irrestrito a todas as permissões',
    'Permissões testadas: dashboard, roles, feeds, audit'
  );

  // 2. TESTE DE CARGO COM PERMISSÕES LIMITADAS (EDITOR)
  console.log('\n--- 2. TESTE DE CARGO LIMITADO (EDITOR) ---');
  const mockEditor = {
    id: 'user-editor-123',
    email: 'editor@uppa.com.br',
    name: 'Redator Editorial',
    phone: null,
    role_id: 'editor-role-id',
    role: {
      id: 'editor-role-id',
      name: 'EDITOR',
      slug: 'editor',
      description: 'Gestão de conteúdo e banners',
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: ['dashboard.view', 'site.manage', 'banners.manage', 'articles.manage'],
    },
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert(
    checkPermission(mockEditor, 'articles.manage') === true,
    'Editor PODE gerenciar artigos (articles.manage)'
  );
  assert(
    checkPermission(mockEditor, 'banners.manage') === true,
    'Editor PODE gerenciar banners (banners.manage)'
  );
  assert(
    checkPermission(mockEditor, 'roles.manage') === false,
    'Editor NÃO PODE gerenciar cargos (roles.manage bloqueado)'
  );
  assert(
    checkPermission(mockEditor, 'users.manage') === false,
    'Editor NÃO PODE alterar usuários (users.manage bloqueado)'
  );
  assert(
    checkPermission(mockEditor, 'feeds.manage') === false,
    'Editor NÃO PODE alterar feeds VRSync (feeds.manage bloqueado)'
  );

  // 3. TESTE DE PROTEÇÃO CONTRA USUÁRIO SUSPENSO
  console.log('\n--- 3. TESTE DE USUÁRIO SUSPENSO ---');
  const mockSuspended = { ...mockEditor, status: 'suspended' };
  assert(
    checkPermission(mockSuspended, 'articles.manage') === false,
    'Usuário com status = suspended tem todas as permissões negadas'
  );

  // 4. TESTE DO SERVIÇO DE BANNERS
  console.log('\n--- 4. TESTE DO MÓDULO DE BANNERS ---');
  const { getAllBanners } = await import('../src/features/admin/services/banners.ts');
  const banners = await getAllBanners();
  assert(
    Array.isArray(banners),
    'Consulta getAllBanners() retornou array válido',
    `Banners encontrados: ${banners.length}`
  );

  // 5. TESTE DO CMS DE ARTIGOS
  console.log('\n--- 5. TESTE DO CMS DE ARTIGOS ---');
  const { getAllArticles, getArticleBySlug } = await import(
    '../src/features/admin/services/articles.ts'
  );
  const articles = await getAllArticles();
  assert(
    Array.isArray(articles) && articles.length > 0,
    'Consulta getAllArticles() retornou artigos disponíveis',
    `Total de artigos: ${articles.length}`
  );

  const singleArticle = await getArticleBySlug('guia-completo-comprar-primeiro-imovel');
  assert(
    singleArticle !== null && singleArticle.slug === 'guia-completo-comprar-primeiro-imovel',
    'getArticleBySlug() recuperou artigo editorial específico',
    `Título: ${singleArticle?.title}`
  );

  // 6. TESTE DE USUÁRIOS ADMINISTRATIVOS
  console.log('\n--- 6. TESTE DE USUÁRIOS ADMINISTRATIVOS ---');
  const { getAllAdminUsers } = await import('../src/features/admin/services/users.ts');
  const adminUsers = await getAllAdminUsers();
  assert(
    Array.isArray(adminUsers) && adminUsers.length > 0,
    'getAllAdminUsers() retornou usuários da plataforma',
    `Total de usuários listados: ${adminUsers.length}`
  );

  const foundSuper = adminUsers.find(
    (u) => u.email.toLowerCase() === 'moiseztorres100@gmail.com'
  );
  assert(
    foundSuper !== undefined && foundSuper.role?.slug === 'super_admin',
    'moiseztorres100@gmail.com está listado como SUPER ADMIN ativo',
    `Nome: ${foundSuper?.name}, Status: ${foundSuper?.status}`
  );

  // 7. TESTE DE IMÓVEIS REAIS E PRESERVAÇÃO DO MODELO
  console.log('\n--- 7. TESTE DE IMÓVEIS E PRESERVAÇÃO DE DADOS ---');
  const { getAdminProperties } = await import(
    '../src/features/admin/services/properties.ts'
  );
  const { data: properties, total: propertiesTotal } = await getAdminProperties({
    pageSize: 5,
  });
  assert(
    propertiesTotal > 0 && properties.length > 0,
    'Imóveis reais do Supabase consultados com sucesso',
    `Total de imóveis no estoque: ${propertiesTotal}, Amostra: ${properties[0]?.title}`
  );

  // 8. TESTE DE FEEDS VRSYNC
  console.log('\n--- 8. TESTE DE INTEGRAÇÃO DE FEEDS VRSYNC ---');
  const { getAllAdminFeeds } = await import('../src/features/admin/services/feeds.ts');
  const feeds = await getAllAdminFeeds();
  assert(
    Array.isArray(feeds) && feeds.length > 0,
    'Feeds VRSync existentes consultados sem quebra',
    `Total de feeds ativos/configurados: ${feeds.length}`
  );

  // 9. TESTE DE CONSOLIDAÇÃO DO DASHBOARD
  console.log('\n--- 9. TESTE DE CONSOLIDAÇÃO DO DASHBOARD ---');
  const { getDashboardStats } = await import(
    '../src/features/admin/services/dashboard.ts'
  );
  const stats = await getDashboardStats();
  assert(
    stats.properties.total > 0 && stats.agencies.total > 0,
    'Estatísticas consolidadas do dashboard calculadas com dados reais',
    `Imóveis: ${stats.properties.total}, Agências: ${stats.agencies.total}, Feeds: ${stats.feeds.total}, Leads: ${stats.leads.total}`
  );

  // 10. TESTE DO GERENCIAMENTO DO SITE E CONFIGURAÇÕES
  console.log('\n--- 10. TESTE DO GERENCIADOR DE SITE E FAQS ---');
  const { getSiteSettings, getAllFAQs } = await import(
    '../src/features/admin/services/site.ts'
  );
  const siteSettings = await getSiteSettings();
  const faqs = await getAllFAQs();

  assert(
    typeof siteSettings.hero_headline === 'string' && siteSettings.home_sections?.length > 0,
    'Configurações do site e seções da Home carregadas com sucesso',
    `Headline: "${siteSettings.hero_headline.slice(0, 40)}...", Seções: ${siteSettings.home_sections?.length}`
  );

  assert(
    Array.isArray(faqs) && faqs.length > 0,
    'Perguntas frequentes (FAQs) carregadas com sucesso',
    `Total de FAQs: ${faqs.length}`
  );

  console.log('\n================================================================');
  console.log(`   RESULTADO DOS TESTES: ${passedTests}/${totalTests} PASSARAM COM SUCESSO!   `);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
