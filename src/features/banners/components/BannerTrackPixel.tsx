'use client';

import { useEffect, useRef } from 'react';

interface BannerTrackPixelProps {
  bannerId: string;
}

/**
 * Client Component de tracking de banners.
 *
 * - Registra impressão via Intersection Observer quando o banner entra na viewport.
 * - Registra clique quando o link do banner é clicado.
 * - Fire-and-forget — nunca bloqueia a renderização ou navegação.
 */
export function BannerTrackPixel({ bannerId }: BannerTrackPixelProps) {
  const impressionSentRef = useRef(false);

  useEffect(() => {
    const element = document.getElementById(`banner-slot-${bannerId}`);
    if (!element) return;

    // --- Tracking de impressão via IntersectionObserver ---
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !impressionSentRef.current) {
          impressionSentRef.current = true;
          observer.disconnect();
          fetch(`/api/banners/${bannerId}/track?type=impression`, {
            method: 'POST',
          }).catch(() => {});
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    // --- Tracking de clique ---
    const handleClick = () => {
      fetch(`/api/banners/${bannerId}/track?type=click`, {
        method: 'POST',
      }).catch(() => {});
    };

    element.addEventListener('click', handleClick);

    return () => {
      observer.disconnect();
      element.removeEventListener('click', handleClick);
    };
  }, [bannerId]);

  return null;
}
