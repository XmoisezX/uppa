import { BannerSlot } from '@/features/banners/components/BannerSlot';

interface HomeAdBannerProps {
  className?: string;
}

/**
 * Bloco de publicidade da home — posição "home_after_featured".
 *
 * Delega para BannerSlot que colapsa graciosamente se não houver banner ativo.
 * Mantém a assinatura original do componente para compatibilidade com page.tsx.
 */
export async function HomeAdBanner({ className }: HomeAdBannerProps) {
  return <BannerSlot position="home_after_featured" className={className} />;
}
