import React from 'react';
import Link from 'next/link';
import { getBannersByPosition } from '../services';
import { BannerTrackPixel } from './BannerTrackPixel';
import type { BannerPosition } from '../types';

interface BannerSlotProps {
  position: BannerPosition;
  className?: string;
}

/**
 * Componente reutilizável de slot de banner.
 *
 * Server Component: busca dados diretamente, sem estado cliente.
 * - Colapsa completamente (retorna null) quando não há banner ativo para a posição.
 * - Suporta imagens desktop/mobile separadas via <picture>.
 * - Registra impressão via BannerTrackPixel (Intersection Observer, fire-and-forget).
 * - Cliques são registrados pelo Client Component BannerTrackPixel ao detectar o clique.
 */
export async function BannerSlot({ position, className = '' }: BannerSlotProps) {
  const banners = await getBannersByPosition(position);

  // Degradação graciosa: colapsa sem deixar espaço vazio
  if (!banners || banners.length === 0) {
    return null;
  }

  // MVP: exibe o banner de maior prioridade
  const banner = banners[0];

  return (
    <section
      className={`banner-slot banner-slot--${position} ${className}`}
      aria-label="Publicidade"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Badge de publicidade */}
        <p className="text-[10px] text-slate-400 dark:text-slate-600 text-right mb-1 select-none">
          Publicidade
        </p>

        {/* Banner clicável */}
        <Link
          href={banner.destinationUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          id={`banner-slot-${banner.id}`}
          aria-label={banner.title}
          className="block relative overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          <picture>
            {/* Imagem mobile quando disponível */}
            {banner.imageUrlMobile && (
              <source
                media="(max-width: 639px)"
                srcSet={banner.imageUrlMobile}
              />
            )}
            {/* Imagem desktop (fallback padrão) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrlDesktop}
              alt={banner.title}
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover rounded-xl"
              style={{ maxHeight: '120px', objectFit: 'cover' }}
            />
          </picture>
        </Link>

        {/* Client Component para tracking de impressão e clique */}
        <BannerTrackPixel bannerId={banner.id} />
      </div>
    </section>
  );
}
