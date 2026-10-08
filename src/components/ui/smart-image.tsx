"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { TRUSTED_MEDIA_HOSTS } from "@/features/search/constants";

interface SmartImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  fallbackIconClassName?: string;
}

/**
 * Componente de imagem inteligente e de alta performance.
 * Utiliza next/image para hosts confiáveis com otimização automática de WebP/AVIF e dimensionamento responsivo.
 * Utiliza fallback seguro (<img>) com lazy loading para domínios de crawler não catalogados, evitando SSRF ou erros de host não configurado.
 * Previne CLS através de containers com aspect-ratio e exibe fallback limpo em caso de falha de carregamento.
 */
export function SmartImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 380px, 440px",
  className = "object-cover",
  fallbackIconClassName = "h-8 w-8 text-slate-400 stroke-[1.5]",
}: SmartImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 select-none">
        <Building2 className={fallbackIconClassName} />
        <span className="text-[10px] font-medium mt-1">Foto indisponível</span>
      </div>
    );
  }

  // Verifica se o hostname está na lista de hosts confiáveis do next/image
  let isTrusted = false;
  try {
    const parsed = new URL(src);
    isTrusted = TRUSTED_MEDIA_HOSTS.has(parsed.hostname);
  } catch {
    isTrusted = false;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
      {/* Skeleton suave antes do download completar */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200/60 dark:bg-slate-800/80 animate-pulse pointer-events-none" />
      )}

      {isTrusted ? (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          priority={priority}
          sizes={sizes}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 h-full w-full ${className} transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
