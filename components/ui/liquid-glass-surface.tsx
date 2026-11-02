"use client"

// ---------------------------------------------------------------------------
// Zenithsui Liquid Glass Surface Component
// Renders an optical liquid glass container combining WebGL refraction shaders
// with physics-based CSS multi-specular fallback layers.
// ---------------------------------------------------------------------------

import React, { useRef, useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { LiquidGlassOptions } from "@/lib/liquidglass/types"
import { LIQUID_GLASS_PRESETS } from "@/lib/liquidglass/types"

export interface LiquidGlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  preset?: keyof typeof LIQUID_GLASS_PRESETS
  options?: LiquidGlassOptions
  enableInteractiveSheen?: boolean
  as?: React.ElementType
  children?: React.ReactNode
}

export function LiquidGlassSurface({
  preset = "apple-hig",
  options,
  enableInteractiveSheen = true,
  className,
  children,
  style,
  ...props
}: LiquidGlassSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const mergedConfig = useMemo(() => {
    const base = LIQUID_GLASS_PRESETS[preset]?.config ?? LIQUID_GLASS_PRESETS["apple-hig"].config
    return { ...base, ...options }
  }, [preset, options])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableInteractiveSheen) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePos({ x, y })
    }
  }

  const handlePointerLeave = () => {
    setMousePos(null)
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative overflow-hidden apple-glass-panel transition-all duration-200",
        "liquid-glass-surface",
        className
      )}
      style={{
        ...style,
        ...(mousePos
          ? ({
              "--lg-mouse-x": `${mousePos.x.toFixed(1)}%`,
              "--lg-mouse-y": `${mousePos.y.toFixed(1)}%`,
            } as React.CSSProperties)
          : {}),
      }}
      data-config={JSON.stringify(mergedConfig)}
      {...props}
    >
      {/* Dynamic Specular Arc Highlight Overlay (Simulating L1 + L4 Blinn-Phong Glint) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 opacity-80"
        style={{
          background: mousePos
            ? `radial-gradient(circle 120px at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 70%)`
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Chromatic Dispersion Edge Fringe */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border border-white/20 dark:border-white/10"
        style={{
          boxShadow: `
            inset 0 1.5px 0.5px rgba(255, 255, 255, 0.85),
            inset 0 -1px 1px rgba(0, 0, 0, 0.08),
            0 0 1px 0.5px rgba(96, 165, 250, 0.15)
          `,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-20 w-full h-full">{children}</div>
    </div>
  )
}
