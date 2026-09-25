"use client";

import React from "react";
import { FloatingPropertyBubble, type FloatingPropertyBubbleProps } from "./FloatingPropertyBubble";
import { type HeroBubbleProperty, FALLBACK_HERO_BUBBLES } from "../types";

interface FloatingPropertyBubblesProps {
  properties: HeroBubbleProperty[];
  className?: string;
}

interface BubbleLayoutConfig {
  size: "sm" | "md" | "lg";
  depth: "front" | "mid" | "back";
  animationPattern: 1 | 2 | 3 | 4;
  positionStyle: React.CSSProperties;
  alignPreview: "left" | "right";
  mobileHidden?: boolean;
  tabletHidden?: boolean;
}

const BUBBLE_CONFIGS: BubbleLayoutConfig[] = [
  // 1. Destaque topo-centro (lg, front)
  {
    size: "lg",
    depth: "front",
    animationPattern: 1,
    positionStyle: { left: "16%", top: "4%" },
    alignPreview: "left",
    mobileHidden: false,
    tabletHidden: false,
  },
  // 2. Topo-direita (md, mid)
  {
    size: "md",
    depth: "mid",
    animationPattern: 2,
    positionStyle: { left: "56%", top: "5%" },
    alignPreview: "right",
    mobileHidden: true,
    tabletHidden: false,
  },
  // 3. Lateral direita alta (lg, front)
  {
    size: "lg",
    depth: "front",
    animationPattern: 3,
    positionStyle: { left: "70%", top: "25%" },
    alignPreview: "right",
    mobileHidden: false,
    tabletHidden: false,
  },
  // 4. Centro-alto (sm, back)
  {
    size: "sm",
    depth: "back",
    animationPattern: 4,
    positionStyle: { left: "40%", top: "26%" },
    alignPreview: "left",
    mobileHidden: true,
    tabletHidden: true,
  },
  // 5. Lateral esquerda média (lg, front)
  {
    size: "lg",
    depth: "front",
    animationPattern: 1,
    positionStyle: { left: "5%", top: "34%" },
    alignPreview: "left",
    mobileHidden: true,
    tabletHidden: false,
  },
  // 6. Centro-médio (md, mid)
  {
    size: "md",
    depth: "mid",
    animationPattern: 2,
    positionStyle: { left: "34%", top: "48%" },
    alignPreview: "left",
    mobileHidden: false,
    tabletHidden: false,
  },
  // 7. Centro-direita média (lg, front)
  {
    size: "lg",
    depth: "front",
    animationPattern: 3,
    positionStyle: { left: "66%", top: "52%" },
    alignPreview: "right",
    mobileHidden: true,
    tabletHidden: false,
  },
  // 8. Lateral esquerda baixa (sm, back)
  {
    size: "sm",
    depth: "back",
    animationPattern: 4,
    positionStyle: { left: "8%", top: "72%" },
    alignPreview: "left",
    mobileHidden: true,
    tabletHidden: true,
  },
  // 9. Centro-baixo (md, mid)
  {
    size: "md",
    depth: "mid",
    animationPattern: 1,
    positionStyle: { left: "40%", top: "74%" },
    alignPreview: "left",
    mobileHidden: false,
    tabletHidden: false,
  },
  // 10. Inferior direito (md, mid)
  {
    size: "md",
    depth: "mid",
    animationPattern: 2,
    positionStyle: { left: "74%", top: "72%" },
    alignPreview: "right",
    mobileHidden: true,
    tabletHidden: false,
  },
];

export function FloatingPropertyBubbles({
  properties = [],
  className = "",
}: FloatingPropertyBubblesProps) {
  const displayProperties = properties && properties.length > 0 ? properties : FALLBACK_HERO_BUBBLES;
  if (!displayProperties || displayProperties.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-visible z-0 ${className}`}
    >
      {displayProperties.slice(0, BUBBLE_CONFIGS.length).map((property, idx) => {
        const config = BUBBLE_CONFIGS[idx];
        return (
          <FloatingPropertyBubble
            key={property.id || idx}
            property={property}
            size={config.size}
            depth={config.depth}
            animationPattern={config.animationPattern}
            positionStyle={config.positionStyle}
            alignPreview={config.alignPreview}
            mobileHidden={config.mobileHidden}
            tabletHidden={config.tabletHidden}
          />
        );
      })}
    </div>
  );
}
