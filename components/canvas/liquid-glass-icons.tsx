"use client"

// ---------------------------------------------------------------------------
// Zenithsui Apple iOS & macOS Liquid Glass Icon System
//
// Crafts authentic physical squircle tiles with:
// - Continuous Apple HIG squircle geometry
// - Multi-layer liquid glass specularity & diagonal glossy light sheen
// - 1:1 miniature representations of the 5 hardware reference designs:
//   1. Yellow Slate: Sunny yellow bezel + obsidian black screen
//   2. Ice Ceramic: Translucent ice-blue glass rim + frosted milky white ceramic
//   3. Royal Slate: Royal cobalt blue bezel + obsidian black screen
//   4. Cyan Slate: Neon electric cyan bezel + obsidian black screen
//   5. Acrylic Glass: Transparent acrylic chassis + specular sheen + nested white card
// ---------------------------------------------------------------------------

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
  const sizeClasses = {
    sm: "w-6 h-4 rounded-[6px] p-[1.5px]",
    md: "w-8 h-5.5 rounded-[8px] p-[2px]",
    lg: "w-11 h-7.5 rounded-[10px] p-[2.5px]",
  }[size]

  const innerSizeClasses = {
    sm: "rounded-[4.5px]",
    md: "rounded-[6px]",
    lg: "rounded-[8px]",
  }[size]

  switch (themeId) {
    case "yellow-slate":
      return (
        <div
          aria-hidden="true"
          className={cn(
            "relative shrink-0 select-none overflow-hidden transition-all duration-200",
            sizeClasses,
            "bg-[#FACC15] shadow-[0_2px_8px_rgba(250,204,21,0.4),0_1px_2px_rgba(0,0,0,0.12)]",
            "border border-[#FDE047]/80",
            active && "ring-2 ring-[#FACC15] ring-offset-1 ring-offset-background scale-105",
            className
          )}
        >
          {/* Top-left specular sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent pointer-events-none z-10" />

          {/* Inner Matte Obsidian Screen */}
          <div
            className={cn(
              "w-full h-full bg-[#18191E] flex flex-col justify-center items-center px-1 relative shadow-inner overflow-hidden",
              innerSizeClasses
            )}
          >
            {/* Screen specular light bar */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <div className="w-full flex items-center justify-between gap-0.5">
              <span className="w-1.5 h-0.5 rounded-full bg-[#FACC15]/80" />
              <span className="size-1 rounded-full bg-[#FACC15] shadow-[0_0_3px_#FACC15]" />
            </div>
            <div className="w-3/4 h-0.5 rounded-full bg-white/30 mt-0.5" />
          </div>
        </div>
      )

    case "ice-ceramic":
      return (
        <div
          aria-hidden="true"
          className={cn(
            "relative shrink-0 select-none overflow-hidden transition-all duration-200",
            sizeClasses,
            "bg-[#7DD3FC]/90 backdrop-blur-md shadow-[0_2px_8px_rgba(125,211,252,0.45),0_1px_2px_rgba(0,0,0,0.08)]",
            "border border-[#BAE6FD]",
            active && "ring-2 ring-[#38BDF8] ring-offset-1 ring-offset-background scale-105",
            className
          )}
        >
          {/* Specular glass reflection */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-transparent pointer-events-none z-10" />

          {/* Inner Frosted Milky Ceramic Card */}
          <div
            className={cn(
              "w-full h-full bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#EFF6FF] flex flex-col justify-center items-center px-1 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.95)] overflow-hidden",
              innerSizeClasses
            )}
          >
            <div className="w-full flex items-center justify-between gap-0.5">
              <span className="w-1.5 h-0.5 rounded-full bg-sky-400" />
              <span className="size-1 rounded-full bg-sky-500 shadow-[0_0_3px_rgba(14,165,233,0.7)]" />
            </div>
            <div className="w-3/4 h-0.5 rounded-full bg-slate-300 mt-0.5" />
          </div>
        </div>
      )

    case "royal-slate":
      return (
        <div
          aria-hidden="true"
          className={cn(
            "relative shrink-0 select-none overflow-hidden transition-all duration-200",
            sizeClasses,
            "bg-[#2563EB] shadow-[0_2px_8px_rgba(37,99,235,0.45),0_1px_2px_rgba(0,0,0,0.15)]",
            "border border-[#60A5FA]/80",
            active && "ring-2 ring-[#2563EB] ring-offset-1 ring-offset-background scale-105",
            className
          )}
        >
          {/* Specular sapphire sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/45 via-white/5 to-transparent pointer-events-none z-10" />

          {/* Inner Matte Obsidian Screen */}
          <div
            className={cn(
              "w-full h-full bg-[#18191E] flex flex-col justify-center items-center px-1 relative shadow-inner overflow-hidden",
              innerSizeClasses
            )}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <div className="w-full flex items-center justify-between gap-0.5">
              <span className="w-1.5 h-0.5 rounded-full bg-[#3B82F6]/90" />
              <span className="size-1 rounded-full bg-[#3B82F6] shadow-[0_0_3px_#3B82F6]" />
            </div>
            <div className="w-3/4 h-0.5 rounded-full bg-white/30 mt-0.5" />
          </div>
        </div>
      )

    case "cyan-slate":
      return (
        <div
          aria-hidden="true"
          className={cn(
            "relative shrink-0 select-none overflow-hidden transition-all duration-200",
            sizeClasses,
            "bg-[#00B4D8] shadow-[0_2px_8px_rgba(0,180,216,0.45),0_1px_2px_rgba(0,0,0,0.12)]",
            "border border-[#90E0EF]",
            active && "ring-2 ring-[#00B4D8] ring-offset-1 ring-offset-background scale-105",
            className
          )}
        >
          {/* Specular cyan sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/5 to-transparent pointer-events-none z-10" />

          {/* Inner Matte Obsidian Screen */}
          <div
            className={cn(
              "w-full h-full bg-[#18191E] flex flex-col justify-center items-center px-1 relative shadow-inner overflow-hidden",
              innerSizeClasses
            )}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <div className="w-full flex items-center justify-between gap-0.5">
              <span className="w-1.5 h-0.5 rounded-full bg-[#00B4D8]/90" />
              <span className="size-1 rounded-full bg-[#00B4D8] shadow-[0_0_3px_#00B4D8]" />
            </div>
            <div className="w-3/4 h-0.5 rounded-full bg-white/30 mt-0.5" />
          </div>
        </div>
      )

    case "acrylic-glass":
    default:
      return (
        <div
          aria-hidden="true"
          className={cn(
            "relative shrink-0 select-none overflow-hidden transition-all duration-200",
            sizeClasses,
            "bg-gradient-to-br from-amber-100/60 to-white/40 backdrop-blur-md",
            "border border-[#EAB308] shadow-[0_2px_8px_rgba(234,179,8,0.35),0_1px_2px_rgba(0,0,0,0.08)]",
            active && "ring-2 ring-[#EAB308] ring-offset-1 ring-offset-background scale-105",
            className
          )}
        >
          {/* 135deg Diagonal specular reflection */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 28%, transparent 28.5%)",
            }}
          />

          {/* Floating Nested White Card */}
          <div
            className={cn(
              "w-full h-full bg-white flex flex-col justify-center items-center px-1 relative shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] overflow-hidden",
              innerSizeClasses
            )}
          >
            <div className="w-full flex items-center justify-between gap-0.5">
              <span className="w-1.5 h-0.5 rounded-full bg-amber-400" />
              <span className="size-1 rounded-full bg-amber-400 shadow-[0_0_3px_rgba(251,191,36,0.8)]" />
            </div>
            <div className="w-3/4 h-0.5 rounded-full bg-stone-200 mt-0.5" />
          </div>
        </div>
      )
  }
}
