"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FloatingPropertyPreview } from "./FloatingPropertyPreview";
import type { HeroBubbleProperty } from "../services";

export interface FloatingPropertyBubbleProps {
  property: HeroBubbleProperty;
  size?: "sm" | "md" | "lg";
  depth?: "front" | "mid" | "back";
  animationPattern?: 1 | 2 | 3 | 4;
  positionStyle: React.CSSProperties;
  alignPreview?: "left" | "right";
  className?: string;
  mobileHidden?: boolean;
  tabletHidden?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20",
  md: "w-20 h-20 sm:w-24 sm:h-24 lg:w-26 lg:h-26",
  lg: "w-26 h-26 sm:w-28 sm:h-28 lg:w-32 lg:h-32",
};

const DEPTH_CLASSES = {
  front: "z-20 opacity-100 shadow-[0_16px_36px_-6px_rgba(0,32,74,0.22)] dark:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.65)]",
  mid: "z-10 opacity-90 shadow-[0_12px_28px_-6px_rgba(0,32,74,0.16)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.55)]",
  back: "z-0 opacity-75 shadow-[0_8px_20px_-6px_rgba(0,32,74,0.12)] dark:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)]",
};

export function FloatingPropertyBubble({
  property,
  size = "md",
  depth = "mid",
  animationPattern = 1,
  positionStyle,
  alignPreview = "left",
  className = "",
  mobileHidden = false,
  tabletHidden = false,
}: FloatingPropertyBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  const responsiveVisibility = mobileHidden
    ? tabletHidden
      ? "hidden lg:block"
      : "hidden md:block"
    : tabletHidden
    ? "hidden lg:block"
    : "block";

  const baseZIndex = depth === "front" ? 30 : depth === "mid" ? 20 : 10;

  return (
    <div
      style={{
        ...positionStyle,
        zIndex: isHovered ? 9999 : baseZIndex,
      }}
      className={`absolute pointer-events-auto select-none ${isHovered ? "z-[9999]" : ""} ${responsiveVisibility} ${className}`}
    >
      {/* Wrapper de Animação com Pausa no Hover */}
      <div
        className={`bubble-float-wrapper animate-bubble-${animationPattern} group relative ${isHovered ? "z-[9999]" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={`/imovel/${property.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative cursor-pointer"
          title={`${property.title} - Abrir imóvel em nova aba`}
          aria-label={`Ver imóvel: ${property.title}`}
        >
          {/* Corpo do Balão Imobiliário (Formato Circular com Relevo e Brilho Especular) */}
          <div
            className={`relative rounded-full overflow-hidden transition-all duration-300 ease-out transform group-hover:scale-110 group-hover:ring-4 group-hover:ring-indigo-500/80 group-hover:shadow-2xl ring-2 ring-white/90 dark:ring-slate-700/80 ${SIZE_CLASSES[size]} ${DEPTH_CLASSES[depth]}`}
          >
            {/* Foto Real do Imóvel */}
            <img
              src={property.imageUrl}
              alt={property.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-115"
            />

            {/* Brilho Especular de Vidro/Balão no Topo */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-white/5 to-transparent pointer-events-none" />

            {/* Vinheta Suave Inferior para Contraste */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Sutil Nó de Balão da Identidade UPPA (Inspirado no Logo) */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            <div className="w-2.5 h-1.5 bg-white dark:bg-slate-700 rounded-b-xs shadow-xs border-t border-black/10 dark:border-white/10" />
          </div>
        </Link>

        {/* Card de Informações e Preview Flutuante no Hover */}
        <div
          className={`transition-all duration-200 relative z-[9999] ${
            isHovered
              ? "opacity-100 visible translate-y-0 scale-100"
              : "opacity-0 invisible pointer-events-none translate-y-2 scale-95"
          }`}
        >
          <FloatingPropertyPreview property={property} align={alignPreview} />
        </div>
      </div>
    </div>
  );
}
