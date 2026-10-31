"use client"

// ---------------------------------------------------------------------------
// Zenithsui Apple iOS & macOS Liquid Glass Icon System
//
// 1:1 Vector Physical Card Replicas for the 5 Hardware Reference Designs:
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
    md: "w-10 h-[27px]",
    lg: "w-13 h-[35px]",
  }[size]

  switch (themeId) {
    case "yellow-slate": {
      const gBezel = `ys-b-${uid}`
      const gScreen = `ys-s-${uid}`
      const gGloss = `ys-g-${uid}`
      const fShadow = `ys-f-${uid}`
      return (
        <svg
          viewBox="0 0 44 30"
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
            <linearGradient id={gBezel} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121316" />
            </linearGradient>
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#FACC15" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Outer Sunny Yellow Bezel */}
          <rect x="2" y="2" width="40" height="26" rx="7.5" fill={`url(#${gBezel})`} filter={`url(#${fShadow})`} />
          {/* Top Edge Specular Rim Light */}
          <rect x="2.4" y="2.4" width="39.2" height="25.2" rx="7.1" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" fill="none" />
          {/* Inner Matte Obsidian Screen */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" fill={`url(#${gScreen})`} />
          {/* Inset Screen Shadow */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" fill="none" />
          {/* Glass Specular Gloss Arc */}
          <path
            d="M 5.5 10.5 C 5.5 7.5, 7.5 5.5, 10.5 5.5 L 33.5 5.5 C 36.5 5.5, 38.5 7.5, 38.5 10.5 L 38.5 12.5 C 24 14.5, 14 14.5, 5.5 12.5 Z"
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
          viewBox="0 0 44 30"
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
            <linearGradient id={gRim} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="45%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#EFF6FF" />
            </linearGradient>
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.3" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Outer Translucent Ice Blue Glass Rim */}
          <rect x="2" y="2" width="40" height="26" rx="7.5" fill={`url(#${gRim})`} filter={`url(#${fShadow})`} />
          {/* Top Edge Specular White Light */}
          <rect x="2.4" y="2.4" width="39.2" height="25.2" rx="7.1" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" fill="none" />
          {/* Inner Frosted Milky Ceramic Card */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" fill={`url(#${gScreen})`} />
          {/* Inset Rim Reflection */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" stroke="rgba(186,230,253,0.7)" strokeWidth="0.8" fill="none" />
          {/* Ceramic Glass Gloss Arc */}
          <path
            d="M 5.5 10.5 C 5.5 7.5, 7.5 5.5, 10.5 5.5 L 33.5 5.5 C 36.5 5.5, 38.5 7.5, 38.5 10.5 L 38.5 12.5 C 24 14.5, 14 14.5, 5.5 12.5 Z"
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
          viewBox="0 0 44 30"
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
            <linearGradient id={gBezel} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="35%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121316" />
            </linearGradient>
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D4ED8" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Royal Cobalt Blue Bezel */}
          <rect x="2" y="2" width="40" height="26" rx="7.5" fill={`url(#${gBezel})`} filter={`url(#${fShadow})`} />
          {/* Top Edge Specular Light */}
          <rect x="2.4" y="2.4" width="39.2" height="25.2" rx="7.1" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" fill="none" />
          {/* Inner Matte Obsidian Screen */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" fill={`url(#${gScreen})`} />
          {/* Inset Screen Shadow */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" fill="none" />
          {/* Sapphire Glass Gloss Arc */}
          <path
            d="M 5.5 10.5 C 5.5 7.5, 7.5 5.5, 10.5 5.5 L 33.5 5.5 C 36.5 5.5, 38.5 7.5, 38.5 10.5 L 38.5 12.5 C 24 14.5, 14 14.5, 5.5 12.5 Z"
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
          viewBox="0 0 44 30"
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
            <linearGradient id={gBezel} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5F3FC" />
              <stop offset="35%" stopColor="#00B4D8" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id={gScreen} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121316" />
            </linearGradient>
            <linearGradient id={gGloss} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00B4D8" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Electric Neon Cyan Bezel */}
          <rect x="2" y="2" width="40" height="26" rx="7.5" fill={`url(#${gBezel})`} filter={`url(#${fShadow})`} />
          {/* Top Edge Specular Light */}
          <rect x="2.4" y="2.4" width="39.2" height="25.2" rx="7.1" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" fill="none" />
          {/* Inner Matte Obsidian Screen */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" fill={`url(#${gScreen})`} />
          {/* Inset Screen Shadow */}
          <rect x="5.5" y="5.5" width="33" height="19" rx="5" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" fill="none" />
          {/* Cyan Glass Gloss Arc */}
          <path
            d="M 5.5 10.5 C 5.5 7.5, 7.5 5.5, 10.5 5.5 L 33.5 5.5 C 36.5 5.5, 38.5 7.5, 38.5 10.5 L 38.5 12.5 C 24 14.5, 14 14.5, 5.5 12.5 Z"
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
          viewBox="0 0 44 30"
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
            <linearGradient id={gGlass} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#F8FAFC" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id={gDiag} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.32" />
              <stop offset="28.5%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id={fShadow} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#CA8A04" floodOpacity="0.3" />
              <feDropShadow dx="0" dy="0.8" stdDeviation="1" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Transparent Acrylic Glass Frame with Ambient Shadow */}
          <rect x="2" y="2" width="40" height="26" rx="8" fill={`url(#${gGlass})`} filter={`url(#${fShadow})`} />
          {/* Amber Yellow Wire Rim */}
          <rect x="2" y="2" width="40" height="26" rx="8" stroke="#EAB308" strokeWidth="1.2" fill="none" />
          {/* Nested Floating White Card */}
          <rect x="6.5" y="5.5" width="31" height="19" rx="5" fill="#FFFFFF" />
          <rect x="6.5" y="5.5" width="31" height="19" rx="5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" fill="none" />
          {/* 135° Diagonal Specular Glass Reflection Slicing Across Pane */}
          <rect x="2" y="2" width="40" height="26" rx="8" fill={`url(#${gDiag})`} />
        </svg>
      )
    }
  }
}
