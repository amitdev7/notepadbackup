"use client"

// ---------------------------------------------------------------------------
// Zenithsui Apple iOS & macOS Liquid Glass Icon System
//
// 1:1 Authentic Vector Physical Card Replicas for the 5 Reference Designs:
// 1. Yellow Slate: Sunny yellow 3D bezel + deep obsidian screen + specular sheen
// 2. Ice Ceramic: Translucent ice-blue glass rim + frosted milky ceramic white card
// 3. Royal Slate: Electric royal cobalt blue bezel + obsidian screen + sapphire gloss
// 4. Cyan Slate: Neon electric cyan bezel + obsidian screen + cyan glow
// 5. Acrylic Glass: Transparent acrylic chassis + amber wire rim + 135° diagonal reflection
// ---------------------------------------------------------------------------

import { useId } from "react"
import { cn } from "@/lib/utils"

export type CardThemeId =
  | "yellow-slate"
  | "ice-ceramic"
  | "royal-slate"
  | "cyan-slate"
  | "acrylic-glass"
  | string

interface LiquidGlassCardIconProps {
  themeId: CardThemeId
  size?: "sm" | "md" | "lg"
  active?: boolean
  className?: string
}

export function LiquidGlassCardIcon({
  themeId,
  size = "md",
  active = false,
  className,
}: LiquidGlassCardIconProps) {
  const uid = useId().replace(/:/g, "")

  const dims = {
    sm: "w-7 h-[19px]",
    md: "w-11 h-[29px]",
    lg: "w-14 h-[37px]",
  }[size]

  switch (themeId) {
    case "yellow-slate": {
      const gBezel = `ys-b-${uid}`
      const gScreen = `ys-s-${uid}`
      const gGloss = `ys-g-${uid}`
      const fShadow = `ys-f-${uid}`
      return (
        <svg
          viewBox="0 0 48 32"
          aria-hidden="true"
          className={cn(
            "shrink-0 select-none transition-transform duration-200 overflow-visible",
            dims,
            active && "scale-105",
            className
          )}
          fill="none"
        >
          <defs>
            {/* 3D Yellow Bezel Gradient: light from top-left */}
            <linearGradient id={gBezel} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="30%" stopColor="#FACC15" />
              <stop offset="85%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            {/* Matte Obsidian Screen Gradient */}
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121316" />
            </linearGradient>
            {/* Liquid Specular Gloss Arc */}
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            {/* Ambient Physical Drop Shadow */}
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.45" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#FACC15" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Sunny Yellow Bezel with 3D Shadow */}
          <rect x="2" y="2" width="44" height="28" rx="8" fill={`url(#${gBezel})`} filter={`url(#${fShadow})`} />
          {/* Top-Edge Specular Rim Light */}
          <rect x="2.5" y="2.5" width="43" height="27" rx="7.5" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" fill="none" />
          {/* Inner Matte Obsidian Screen */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" fill={`url(#${gScreen})`} />
          {/* Inner Bezel Inset Contour */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" stroke="rgba(0,0,0,0.65)" strokeWidth="0.8" fill="none" />
          {/* Glass Specular Reflection Sheen */}
          <path
            d="M 6 11.5 C 6 8.5, 8.5 6, 11.5 6 L 36.5 6 C 39.5 6, 42 8.5, 42 11.5 L 42 13.5 C 26 15.5, 16 15.5, 6 13.5 Z"
            fill={`url(#${gGloss})`}
          />
        </svg>
      )
    }

    case "ice-ceramic": {
      const gRim = `ic-r-${uid}`
      const gScreen = `ic-s-${uid}`
      const gGloss = `ic-g-${uid}`
      const fShadow = `ic-f-${uid}`
      return (
        <svg
          viewBox="0 0 48 32"
          aria-hidden="true"
          className={cn(
            "shrink-0 select-none transition-transform duration-200 overflow-visible",
            dims,
            active && "scale-105",
            className
          )}
          fill="none"
        >
          <defs>
            {/* Translucent Ice-Blue Glass Rim Gradient */}
            <linearGradient id={gRim} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="40%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            {/* Frosted Milky Ceramic Screen Gradient */}
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#EFF6FF" />
            </linearGradient>
            {/* Specular Light Reflection */}
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
              <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.15" />
              <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            {/* Ambient Ice-Blue Diffusion Shadow */}
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.32" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Outer Translucent Ice Blue Rim */}
          <rect x="2" y="2" width="44" height="28" rx="8" fill={`url(#${gRim})`} filter={`url(#${fShadow})`} />
          {/* Specular White Rim Highlight */}
          <rect x="2.5" y="2.5" width="43" height="27" rx="7.5" stroke="rgba(255,255,255,0.95)" strokeWidth="0.9" fill="none" />
          {/* Frosted Milky Ceramic White Card */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" fill={`url(#${gScreen})`} />
          {/* Inset Reflection Edge */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" stroke="rgba(186,230,253,0.75)" strokeWidth="0.8" fill="none" />
          {/* Specular Glass Gloss Arc */}
          <path
            d="M 6 11.5 C 6 8.5, 8.5 6, 11.5 6 L 36.5 6 C 39.5 6, 42 8.5, 42 11.5 L 42 13.5 C 26 15.5, 16 15.5, 6 13.5 Z"
            fill={`url(#${gGloss})`}
          />
        </svg>
      )
    }

    case "royal-slate": {
      const gBezel = `rs-b-${uid}`
      const gScreen = `rs-s-${uid}`
      const gGloss = `rs-g-${uid}`
      const fShadow = `rs-f-${uid}`
      return (
        <svg
          viewBox="0 0 48 32"
          aria-hidden="true"
          className={cn(
            "shrink-0 select-none transition-transform duration-200 overflow-visible",
            dims,
            active && "scale-105",
            className
          )}
          fill="none"
        >
          <defs>
            {/* Electric Royal Cobalt Blue Bezel Gradient */}
            <linearGradient id={gBezel} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="35%" stopColor="#2563EB" />
              <stop offset="85%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121316" />
            </linearGradient>
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.48" />
              <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#1D4ED8" floodOpacity="0.45" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Royal Cobalt Blue Bezel */}
          <rect x="2" y="2" width="44" height="28" rx="8" fill={`url(#${gBezel})`} filter={`url(#${fShadow})`} />
          {/* Specular Rim Light */}
          <rect x="2.5" y="2.5" width="43" height="27" rx="7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" fill="none" />
          {/* Inner Matte Obsidian Screen */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" fill={`url(#${gScreen})`} />
          {/* Inset Screen Shadow */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" stroke="rgba(0,0,0,0.65)" strokeWidth="0.8" fill="none" />
          {/* Sapphire Glass Gloss Arc */}
          <path
            d="M 6 11.5 C 6 8.5, 8.5 6, 11.5 6 L 36.5 6 C 39.5 6, 42 8.5, 42 11.5 L 42 13.5 C 26 15.5, 16 15.5, 6 13.5 Z"
            fill={`url(#${gGloss})`}
          />
        </svg>
      )
    }

    case "cyan-slate": {
      const gBezel = `cs-b-${uid}`
      const gScreen = `cs-s-${uid}`
      const gGloss = `cs-g-${uid}`
      const fShadow = `cs-f-${uid}`
      return (
        <svg
          viewBox="0 0 48 32"
          aria-hidden="true"
          className={cn(
            "shrink-0 select-none transition-transform duration-200 overflow-visible",
            dims,
            active && "scale-105",
            className
          )}
          fill="none"
        >
          <defs>
            {/* Electric Neon Cyan Bezel Gradient */}
            <linearGradient id={gBezel} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5F3FC" />
              <stop offset="35%" stopColor="#00B4D8" />
              <stop offset="85%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121316" />
            </linearGradient>
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.48" />
              <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#00B4D8" floodOpacity="0.45" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Electric Neon Cyan Bezel */}
          <rect x="2" y="2" width="44" height="28" rx="8" fill={`url(#${gBezel})`} filter={`url(#${fShadow})`} />
          {/* Specular Rim Light */}
          <rect x="2.5" y="2.5" width="43" height="27" rx="7.5" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" fill="none" />
          {/* Inner Matte Obsidian Screen */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" fill={`url(#${gScreen})`} />
          {/* Inset Screen Shadow */}
          <rect x="6" y="6" width="36" height="20" rx="5.5" stroke="rgba(0,0,0,0.65)" strokeWidth="0.8" fill="none" />
          {/* Cyan Glass Gloss Arc */}
          <path
            d="M 6 11.5 C 6 8.5, 8.5 6, 11.5 6 L 36.5 6 C 39.5 6, 42 8.5, 42 11.5 L 42 13.5 C 26 15.5, 16 15.5, 6 13.5 Z"
            fill={`url(#${gGloss})`}
          />
        </svg>
      )
    }

    case "acrylic-glass":
    default: {
      const gGlass = `ag-g-${uid}`
      const gDiag = `ag-d-${uid}`
      const fShadow = `ag-f-${uid}`
      return (
        <svg
          viewBox="0 0 48 32"
          aria-hidden="true"
          className={cn(
            "shrink-0 select-none transition-transform duration-200 overflow-visible",
            dims,
            active && "scale-105",
            className
          )}
          fill="none"
        >
          <defs>
            {/* Transparent Acrylic Glass Material */}
            <linearGradient id={gGlass} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#F8FAFC" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.18" />
            </linearGradient>
            {/* 135-degree Diagonal Specular Sheen (Image 5 1:1) */}
            <linearGradient id={gDiag} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="28.5%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#CA8A04" floodOpacity="0.32" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Transparent Acrylic Glass Frame with Ambient Shadow */}
          <rect x="2" y="2" width="44" height="28" rx="8.5" fill={`url(#${gGlass})`} filter={`url(#${fShadow})`} />
          {/* Amber Yellow Wire Rim */}
          <rect x="2" y="2" width="44" height="28" rx="8.5" stroke="#EAB308" strokeWidth="1.2" fill="none" />
          {/* Nested Floating Ceramic White Card */}
          <rect x="7" y="6" width="34" height="20" rx="5.5" fill="#FFFFFF" />
          <rect x="7" y="6" width="34" height="20" rx="5.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" fill="none" />
          {/* 135° Diagonal Specular Glass Reflection Slicing Across Pane */}
          <rect x="2" y="2" width="44" height="28" rx="8.5" fill={`url(#${gDiag})`} />
        </svg>
      )
    }
  }
}
