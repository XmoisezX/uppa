"use client";

import React from "react";
import { FloatingPropertyBubble, type FloatingPropertyBubbleProps } from "./FloatingPropertyBubble";
import type { HeroBubbleProperty } from "../services";

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
  // Flanco Esquerdo (5 Balões)
  {
    size: "lg",
    depth: "front",
    animationPattern: 1,
    positionStyle: { left: "2%", top: "8%" },
    alignPreview: "left",
    mobileHidden: false,
    tabletHidden: false,
  },
  {
    size: "md",
    depth: "mid",
    animationPattern: 2,
    positionStyle: { left: "13%", top: "25%" },
    alignPreview: "left",
    mobileHidden: true,
    tabletHidden: false,
  },
  {
    size: "sm",
    depth: "back",
    animationPattern: 3,
    positionStyle: { left: "3%", top: "45%" },
    alignPreview: "left",
    mobileHidden: true,
    tabletHidden: true,
  },
  {
    size: "lg",
    depth: "front",
    animationPattern: 4,
    positionStyle: { left: "12%", top: "64%" },
    alignPreview: "left",
    mobileHidden: true,
    tabletHidden: false,
  },
  {
    size: "md",
    depth: "mid",
    animationPattern: 1,
    positionStyle: { left: "2%", top: "80%" },
    alignPreview: "left",
    mobileHidden: false,
    tabletHidden: false,
  },

  // Flanco Direito (5 Balões)
  {
    size: "lg",
    depth: "front",
    animationPattern: 2,
    positionStyle: { right: "2%", top: "10%" },
    alignPreview: "right",
    mobileHidden: false,
    tabletHidden: false,
  },
  {
    size: "md",
    depth: "mid",
    animationPattern: 3,
    positionStyle: { right: "13%", top: "26%" },
    alignPreview: "right",
    mobileHidden: true,
    tabletHidden: false,
  },
  {
    size: "lg",
    depth: "front",
    animationPattern: 4,
    positionStyle: { right: "3%", top: "46%" },
    alignPreview: "right",
    mobileHidden: true,
    tabletHidden: true,
  },
  {
    size: "sm",
    depth: "back",
    animationPattern: 1,
    positionStyle: { right: "12%", top: "65%" },
    alignPreview: "right",
    mobileHidden: true,
    tabletHidden: false,
  },
  {
    size: "md",
    depth: "mid",
    animationPattern: 2,
    positionStyle: { right: "2%", top: "80%" },
    alignPreview: "right",
    mobileHidden: false,
    tabletHidden: false,
  },
];

export function FloatingPropertyBubbles({
  properties = [],
  className = "",
}: FloatingPropertyBubblesProps) {
  if (!properties || properties.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {properties.slice(0, BUBBLE_CONFIGS.length).map((property, idx) => {
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
