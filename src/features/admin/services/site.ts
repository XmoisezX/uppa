import { createAdminClient } from '@/lib/supabase/admin';
import type { SiteFAQ, SiteSettingsData } from '@/types/admin';

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  hero_headline: 'Encontre o melhor imóvel para você no portal Uppa',
  hero_subheadline: '',
  hero_search_placeholder: 'Busque uma localização...',
  hero_background_image: null,
  hero_image_layout: 'side',
  hero_image_fit: 'cover',
  hero_background_color: '#FAF7F5',
  hero_variant: 'bubbles',
  home_sections: [
    { id: 'hero', label: 'Busca Principal (Hero)', enabled: true, order: 1 },
    { id: 'featured_properties', label: 'Imóveis em Destaque', enabled: true, order: 2 },
    { id: 'ad_banner_middle', label: 'Banner Publicitário Central', enabled: true, order: 3 },
    { id: 'city_shortcuts', label: 'Cidades Principais', enabled: true, order: 4 },
    { id: 'editorial_guides', label: 'Guias e Dicas Imobiliárias', enabled: true, order: 5 },
    { id: 'popular_searches', label: 'Buscas Mais Populares', enabled: true, order: 6 },
    { id: 'agency_cta', label: 'Chamada para Anunciantes', enabled: true, order: 7 },
    { id: 'faq', label: 'Perguntas Frequentes', enabled: true, order: 8 },
  ],
  institutional_links: [
    { label: 'Sobre a UPPA', href: '/sobre', category: 'institucional' },
    { label: 'Termos de Uso', href: '/termos', category: 'legal' },
    { label: 'Política de Privacidade', href: '/privacidade', category: 'legal' },
    { label: 'Anunciar Imóveis', href: '/anunciar', category: 'anunciantes' },
    { label: 'Planos e Preços', href: '/planos', category: 'anunciantes' },
    { label: 'Central de Ajuda', href: '/ajuda', category: 'institucional' },
  ],
  seo_global: {
    meta_title: 'UPPA — Portal Imobiliário Nacional | Casas e Apartamentos',
    meta_description: 'Busque imóveis para comprar e alugar em todo o Brasil. Apartamentos, casas em condomínio, salas comerciais e lançamentos com corretores credenciados.',
    og_image: '/images/og-uppa.jpg',
    keywords: ['imoveis', 'comprar imovel', 'alugar apartamento', 'casas a venda', 'portal imobiliario', 'uppa'],
  },
  contact_info: {
    phone: '(11) 4002-8922',
    email: 'contato@uppa.com.br',
    whatsapp: '(11) 99999-8888',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
  },
};

export const DEFAULT_FAQS: SiteFAQ[] = [
  {
    id: '1',
    question: 'Como faço para anunciar meus imóveis no portal UPPA?',
    answer: 'Imobiliárias e corretores credenciados no CRECI podem cadastrar sua conta na página Anunciar ou integrar seu sistema de CRM via feed XML (VRSync).',
    category: 'anunciantes',
    position: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    question: 'A sincronização de imóveis via feed é automática?',
    answer: 'Sim, o UPPA sincroniza os estoques de anúncios automaticamente a cada poucas horas, mantendo disponibilidade, valores e fotos sempre atualizados.',
    category: 'integracoes',
    position: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    question: 'Como falar diretamente com a imobiliária responsável por um imóvel?',
    answer: 'Em cada anúncio você encontra o formulário de contato oficial e botão de WhatsApp para falar instantaneamente com o anunciante.',
    category: 'geral',
    position: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('site_settings').select('*');

    if (!error && data && data.length > 0) {
      const settingsMap: Record<string, any> = {};
      data.forEach((row: any) => {
        if (row.key === 'home_hero' && row.value && typeof row.value === 'object') {
          Object.assign(settingsMap, row.value);
        } else {
          settingsMap[row.key] = row.value;
        }
      });

      return {
        ...DEFAULT_SITE_SETTINGS,
        ...settingsMap,
      };
    }
  } catch {
    // Tabela pendente de migração
  }

  return DEFAULT_SITE_SETTINGS;
}

export async function saveSiteSetting(key: string, value: any, description?: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('site_settings').upsert({
    key,
    value,
    description: description || null,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

export async function getAllFAQs(): Promise<SiteFAQ[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('site_faqs')
      .select('*')
      .order('position', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as SiteFAQ[];
    }
  } catch {
    // Tabela pendente de migração
  }

  return DEFAULT_FAQS;
}

export async function createFAQ(faq: Partial<SiteFAQ>): Promise<SiteFAQ | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('site_faqs')
    .insert({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'geral',
      position: faq.position || 0,
      is_active: faq.is_active ?? true,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as SiteFAQ;
}

export async function updateFAQ(id: string, updates: Partial<SiteFAQ>): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('site_faqs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
}

export async function deleteFAQ(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('site_faqs').delete().eq('id', id);
  return !error;
}
