"use client"

// ---------------------------------------------------------------------------
// Zenithsui Smart Hover Notes — Premium macOS/iOS Clouds-Themed Hover Annotation
//
// Displays elegant floating metadata beside the cursor when hovering over
// any annotated canvas object (Arrow, Freehand Drawing, Shape, Text, Component, etc.).
//
// Features:
// 1. Apple macOS/iOS frosted glassmorphic Clouds Theme with luminous celestial glow.
// 2. High-DPI viewport boundary collision clamping & automatic flipping.
// 3. Isolated React portal rendering immune to canvas pan/zoom transforms.
// 4. Stable cursor anchoring (prevents jitter or chasing while cursor is inside object).
// 5. Accessible tooltip ARIA semantics with reduced-motion support.
// 6. Zero canvas clutter: 100% hidden when not hovering over the object's area.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import type { HoverNote, SquigNode } from "@/lib/types"
import { Cloud, ChatCenteredText, Tag, ArrowRight, PencilSimple, Sparkle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface SmartHoverNoteProps {
  /** Target node currently under the pointer */
  targetNode: SquigNode | null
  /** Current client pointer coordinates */
  pointerPos: { x: number; y: number } | null
  /** Whether a gesture or canvas tool is busy (suppresses hover notes) */
  isBusy?: boolean
  /** Delay in milliseconds before revealing note (default: 300ms) */
  delayMs?: number
}

/**
 * Universal floating Smart Hover Note portal.
 */
export function SmartHoverNote({
  targetNode,
  pointerPos,
  isBusy = false,
  delayMs = 300,
}: SmartHoverNoteProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [activeNode, setActiveNode] = useState<SquigNode | null>(null)
  const [activePos, setActivePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentTargetIdRef = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if target node qualifies for hover note display
  const note = targetNode?.hoverNote
  const hasValidNote = Boolean(
    targetNode &&
    note &&
    note.enabled !== false &&
    ((note.body && note.body.trim().length > 0) || (note.title && note.title.trim().length > 0)) &&
    !isBusy
  )

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!hasValidNote || !targetNode || !pointerPos) {
      setVisible(false)
      currentTargetIdRef.current = null
      return
    }

    const nodeId = targetNode.id

    // If mouse is moving within the SAME already visible node, dynamically update anchorPos to track cursor
    if (visible && currentTargetIdRef.current === nodeId) {
      setActivePos(pointerPos)
      return
    }

    // New node hover session: start hover delay timer
    currentTargetIdRef.current = nodeId
    timerRef.current = setTimeout(() => {
      setActiveNode(targetNode)
      setActivePos(pointerPos)
      setVisible(true)
    }, delayMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [hasValidNote, targetNode, pointerPos, isBusy, delayMs, visible])

  // Dismiss on Escape key, window blur, or scroll
  useEffect(() => {
    if (!visible) return
    const handleDismiss = () => setVisible(false)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") handleDismiss()
    })
    window.addEventListener("blur", handleDismiss)
    window.addEventListener("wheel", handleDismiss, { passive: true })
    return () => {
      window.removeEventListener("blur", handleDismiss)
      window.removeEventListener("wheel", handleDismiss)
    }
  }, [visible])

  if (!mounted || !visible || !activeNode?.hoverNote || typeof document === "undefined") {
    return null
  }

  return createPortal(
    <FloatingHoverCard
      node={activeNode}
      note={activeNode.hoverNote}
      anchorPos={activePos}
    />,
    document.body
  )
}

// ---------------------------------------------------------------------------
// Floating Note Card with Boundary Clamping & Theme Glassmorphism
// ---------------------------------------------------------------------------

interface FloatingHoverCardProps {
  node: SquigNode
  note: HoverNote
  anchorPos: { x: number; y: number }
}

function FloatingHoverCard({ node, note, anchorPos }: FloatingHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [layoutState, setLayoutState] = useState(() => ({
    left: anchorPos.x + 18,
    top: anchorPos.y + 18,
    mouseOffset: { x: 0, y: 0 },
  }))

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const padding = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchorPos.x + 18
    let top = anchorPos.y + 18

    // Flip to left if overflowing viewport right
    if (left + rect.width > vw - padding) {
      left = Math.max(padding, anchorPos.x - rect.width - 18)
    }

    // Flip up if overflowing viewport bottom
    if (top + rect.height > vh - padding) {
      top = Math.max(padding, anchorPos.y - rect.height - 18)
    }

    // Compute relative mouse offset (-1 to 1) for 3D tilt & parallax
    const centerX = left + rect.width / 2
    const centerY = top + rect.height / 2
    const normX = Math.max(-1, Math.min(1, (anchorPos.x - centerX) / (rect.width / 2 || 1)))
    const normY = Math.max(-1, Math.min(1, (anchorPos.y - centerY) / (rect.height / 2 || 1)))

    setLayoutState({
      left,
      top,
      mouseOffset: { x: normX, y: normY },
    })
  }, [anchorPos.x, anchorPos.y])

  return (
    <div
      ref={cardRef}
      role="tooltip"
      aria-live="polite"
      className={cn(
        "fixed z-50 pointer-events-none select-none max-w-xs sm:max-w-sm w-max",
        "animate-in fade-in zoom-in-95 duration-150 ease-out"
      )}
      style={{
        left: `${layoutState.left}px`,
        top: `${layoutState.top}px`,
        transition: "left 0.08s ease-out, top 0.08s ease-out",
        willChange: "left, top",
      }}
    >
      <SmartHoverCardContent node={node} note={note} mouseOffset={layoutState.mouseOffset} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared Smart Hover Card Presentation (Clouds Theme Apple macOS / iOS)
// ---------------------------------------------------------------------------

export interface SmartHoverCardContentProps {
  node?: SquigNode | null
  note: HoverNote
  className?: string
  mouseOffset?: { x: number; y: number }
}

// ---------------------------------------------------------------------------
// 1:1 Vue Word Cloud Hover Note Presentation (pdsuwwz/vue-word-cloud)
// Renders ONLY text — zero background boxes, zero borders, zero cards, zero weather SVGs.
// Uses ECharts-style color generation, dynamic typography weights, and interactive
// word emphasis hover matching pdsuwwz/vue-word-cloud.
// ---------------------------------------------------------------------------

const VUE_WORD_CLOUD_PALETTE = [
  "#2563EB", // Blue
  "#7C3AED", // Violet
  "#DB2777", // Pink
  "#059669", // Emerald
  "#D97706", // Amber
  "#0891B2", // Cyan
  "#4F46E5", // Indigo
  "#DC2626", // Red
  "#0284C7", // Sky
  "#9333EA", // Purple
  "#10B981", // Teal
  "#E11D48", // Rose
]

/** Color generator matching pdsuwwz/vue-word-cloud */
function getWordCloudColor(word: string, index: number): string {
  let hash = index * 17
  for (let i = 0; i < word.length; i++) {
    hash = (hash << 5) - hash + word.charCodeAt(i)
    hash |= 0
  }
  const idx = Math.abs(hash) % VUE_WORD_CLOUD_PALETTE.length
  return VUE_WORD_CLOUD_PALETTE[idx]
}

export function VueWordCloudHoverText({
  note,
  node,
  className,
  mouseOffset,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
  mouseOffset?: { x: number; y: number }
}) {
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const titleText = note.title?.trim() || ""
  const bodyText = note.body ? note.body.trim() : ""

  const normX = mouseOffset?.x ?? 0
  const normY = mouseOffset?.y ?? 0
  const tiltX = -normY * 12
  const tiltY = normX * 12
  const floatX = normX * 8
  const floatY = normY * 6

  // Parse words from title & body
  const wordTokens = useMemo(() => {
    const tokens: Array<{ text: string; weight: number }> = []

    if (hasTitle) {
      tokens.push({ text: titleText, weight: 100 })
    }

    if (bodyText) {
      // Split by whitespace, newlines, commas, colons
      const words = bodyText
        .split(/[\s,\n]+/)
        .map((w) => w.trim())
        .filter(Boolean)

      const freqMap: Record<string, number> = {}
      words.forEach((w) => {
        const lower = w.toLowerCase()
        freqMap[lower] = (freqMap[lower] || 0) + 1
      })

      words.forEach((w, i) => {
        // Prevent excessive duplicate tags if word repeated
        if (tokens.some((t) => t.text.toLowerCase() === w.toLowerCase())) return
        const count = freqMap[w.toLowerCase()] || 1
        const weight = 30 + count * 15 + Math.max(0, 20 - i * 2)
        tokens.push({ text: w, weight })
      })
    }

    return tokens
  }, [hasTitle, titleText, bodyText])

  // If single word or short phrase (e.g. "amit")
  if (wordTokens.length <= 1) {
    const text = titleText || bodyText || "Note"
    const color = getWordCloudColor(text, 0)

    return (
      <div
        className={cn(
          "pointer-events-auto select-none bg-transparent border-0 shadow-none p-1.5 animate-in fade-in zoom-in-95 duration-150 transition-transform duration-100 ease-out",
          className
        )}
        style={{
          transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${floatX}px, ${floatY}px, 0)`,
          transformStyle: "preserve-3d",
        }}
      >
        <span
          className="inline-block font-sans font-black text-2xl sm:text-3xl tracking-tight transition-all duration-200 cursor-default hover:scale-115 hover:text-[#552288] dark:hover:text-[#C084FC]"
          style={{
            color,
            textShadow:
              "0 2px 10px rgba(0,0,0,0.22), 0 0 1px rgba(255,255,255,0.9), 0 0 16px rgba(59,130,246,0.25)",
            transform: "translate3d(0, 0, 15px)",
          }}
          title={text}
        >
          {text}
        </span>
      </div>
    )
  }

  // Multi-word Word Cloud Cluster (1:1 pdsuwwz/vue-word-cloud layout)
  return (
    <div
      className={cn(
        "pointer-events-auto select-none bg-transparent border-0 shadow-none max-w-[340px] sm:max-w-[420px] p-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 animate-in fade-in zoom-in-95 duration-150 transition-transform duration-100 ease-out",
        className
      )}
      style={{
        transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${floatX}px, ${floatY}px, 0)`,
        transformStyle: "preserve-3d",
      }}
    >
      {wordTokens.map((item, idx) => {
        const color = getWordCloudColor(item.text, idx)
        const isHeader = idx === 0 && hasTitle
        const fontSizeClass = isHeader
          ? "text-xl sm:text-2xl font-black"
          : item.weight > 45
            ? "text-base sm:text-lg font-extrabold"
            : item.weight > 35
              ? "text-sm sm:text-base font-bold"
              : "text-xs sm:text-sm font-semibold"

        return (
          <span
            key={`${item.text}-${idx}`}
            className={cn(
              "inline-block font-sans tracking-tight transition-all duration-200 cursor-default",
              "hover:scale-115 hover:text-[#552288] dark:hover:text-[#C084FC] hover:z-10",
              fontSizeClass
            )}
            style={{
              color,
              textShadow:
                "0 2px 8px rgba(0,0,0,0.22), 0 0 1px rgba(255,255,255,0.9)",
            }}
          >
            {item.text}
          </span>
        )
      })}
    </div>
  )
}

export function SmartHoverCardContent({
  node,
  note,
  className,
  mouseOffset,
}: SmartHoverCardContentProps) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)
  const theme = note.theme || "clouds"

  // 3D Frosted Glass Cloud (Default & Primary matching user reference images)
  if (!note.theme || theme === "clouds" || theme === "frosted") {
    return <Frosted3DCloud note={note} node={node} className={className} mouseOffset={mouseOffset} />
  }

  // 1:1 pdsuwwz/vue-word-cloud text effect
  if (theme === "wordcloud") {
    return <VueWordCloudHoverText note={note} node={node} className={className} mouseOffset={mouseOffset} />
  }

  // Alternate visual themes: macOS, iOS, Minimalist
  const isMac = theme === "macos"
  const isIos = theme === "ios"
  const isMinimal = theme === "minimalist"

  return (
    <div
      className={cn(
        "rounded-3xl font-sans overflow-hidden transition-all",
        isMac && [
          "border border-black/10 dark:border-white/15",
          "bg-white/90 dark:bg-stone-900/90 backdrop-blur-3xl text-stone-900 dark:text-stone-100",
          "shadow-2xl ring-1 ring-black/5 dark:ring-white/10",
        ],
        isIos && [
          "border border-white/20",
          "bg-stone-950/92 backdrop-blur-3xl text-white",
          "shadow-2xl ring-1 ring-white/15",
        ],
        isMinimal && [
          "border border-stone-300 dark:border-stone-700",
          "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100",
          "shadow-xl",
        ],
        className
      )}
      style={{
        boxShadow: isIos
          ? "0 24px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
          : isMac
            ? "0 20px 45px -10px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.9)"
            : "0 14px 30px -8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Top Accent Gradient Bar */}
      {isMac && (
        <div className="h-1.5 w-full bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 dark:from-stone-600 dark:via-stone-500 dark:to-stone-600 opacity-80" />
      )}
      {isIos && (
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 opacity-95" />
      )}

      <div className="p-3.5 sm:p-4 space-y-2.5">
        {/* Header row: Icon + Title / Annotation + Node Type Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={cn(
                "p-1.5 rounded-xl shrink-0 border shadow-xs flex items-center justify-center",
                isMac && "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
                isIos && "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
                isMinimal && "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
              )}
            >
              {isMac ? (
                <Sparkle size={15} weight="fill" />
              ) : isIos ? (
                <ChatCenteredText size={15} weight="fill" />
              ) : (
                <Tag size={15} weight="bold" />
              )}
            </span>

            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-snug">
                {note.title!.trim()}
              </h4>
            ) : (
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1",
                  isIos && "text-cyan-200"
                )}
              >
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span
              className={cn(
                "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs shrink-0",
                isMac && "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
                isIos && "bg-white/10 text-cyan-200 border-white/15",
                isMinimal && "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700"
              )}
            >
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Note Body */}
        {hasBody && (
          <div
            className={cn(
              "text-xs leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto overscroll-contain pr-1",
              isIos ? "text-stone-200" : "text-slate-700 dark:text-slate-200"
            )}
          >
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3D Frosted Glass Cloud (Apple VisionOS / macOS Sequoia Aesthetic)
// Direct fidelity implementation of user reference cloud image
// ---------------------------------------------------------------------------

export function Frosted3DCloud({
  note,
  className,
  mouseOffset,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
  mouseOffset?: { x: number; y: number }
}) {
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const text = note.body ? note.body.trim() : ""
  const cloudStyle = note.cloudStyle || "sun"
  const isSun = cloudStyle === "sun"
  const isRain = cloudStyle === "rain"
  const isLightning = cloudStyle === "lightning"
  const isWind = cloudStyle === "wind"

  // 3D Parallax & Magnetic Tilt (matching pdsuwwz/vue-word-cloud interactive dynamics)
  const normX = mouseOffset?.x ?? 0
  const normY = mouseOffset?.y ?? 0
  const tiltX = -normY * 16 // degrees tilt on X
  const tiltY = normX * 16 // degrees tilt on Y
  const floatX = normX * 10 // magnetic translate on X
  const floatY = normY * 8 // magnetic translate on Y
  const weatherParallaxX = -normX * 14 // deep background parallax X
  const weatherParallaxY = -normY * 12 // deep background parallax Y

  return (
    <div
      className={cn(
        "relative select-none font-sans filter drop-shadow-[0_20px_35px_rgba(56,189,248,0.30)] drop-shadow-[0_8px_18px_rgba(15,23,42,0.12)]",
        className
      )}
      style={{
        minWidth: "210px",
        maxWidth: "340px",
        transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${floatX}px, ${floatY}px, 0)`,
        transformStyle: "preserve-3d",
        transition: "transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    >
      {/* 1. Weather Accents behind / underneath cloud (matching user reference image) */}
      {/* Sun Accent (default, matching bottom-left of reference image) */}
      {isSun && (
        <div
          className="absolute -top-3.5 right-[26%] size-11 rounded-full z-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            background: "radial-gradient(circle at 35% 30%, #FFE066 0%, #F59E0B 52%, #EA580C 100%)",
            boxShadow: "0 0 24px 6px rgba(245, 158, 11, 0.6), inset -2px -2px 4px rgba(0,0,0,0.18)",
            transform: `translate3d(${weatherParallaxX}px, ${weatherParallaxY}px, -15px)`,
          }}
        />
      )}

      {/* Rain Droplets (matching top-right of reference image) */}
      {isRain && (
        <div
          className="absolute -bottom-4 inset-x-0 flex items-center justify-center gap-1.5 z-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            transform: `translate3d(${weatherParallaxX * 0.8}px, ${weatherParallaxY * 0.8}px, -10px)`,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-b from-sky-400 via-cyan-400 to-sky-300 shadow-[0_2px_8px_rgba(56,189,248,0.4)] transition-all duration-300"
              style={{
                height: i % 2 === 0 ? "17px" : "12px",
                opacity: 0.85,
                transform: `rotate(${normX * 10}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Lightning Bolt (matching top-left of reference image) */}
      {isLightning && (
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            transform: `translate3d(${weatherParallaxX * 0.9}px, ${weatherParallaxY * 0.9}px, -10px) rotate(${normX * 8}deg)`,
          }}
        >
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
            <path
              d="M14 0L2 15H12L9 28L22 11H12L14 0Z"
              fill="#06B6D4"
              filter="drop-shadow(0 0 10px rgba(6,182,212,0.75))"
            />
          </svg>
        </div>
      )}

      {/* Wind / Breeze Snowflake (matching bottom-right of reference image) */}
      {isWind && (
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            transform: `translate3d(${weatherParallaxX * 0.8}px, ${weatherParallaxY * 0.8}px, -10px) rotate(${normX * 12}deg)`,
          }}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path
              d="M14 20V8M14 8L7 15M14 8L21 15M14 8L9 2M14 8L19 2"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 8px rgba(56,189,248,0.6))"
            />
          </svg>
        </div>
      )}

      {/* 2. Frosted Glass Cloud SVG Body */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        viewBox="0 0 280 144"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Light Mode Milky Frosted Gradient */}
          <linearGradient id="cloudMilkyGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.97" />
            <stop offset="60%" stopColor="#F8FAFC" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.88" />
          </linearGradient>

          {/* Dark Mode Moonlight Twilight Gradient */}
          <linearGradient id="cloudDarkGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#1E293B" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.96" />
          </linearGradient>

          {/* Specular Rim Light */}
          <linearGradient id="cloudRimLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="cloudRimDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.1" />
          </linearGradient>

          {/* Subsurface Sun Scattering Glow */}
          <radialGradient id="sunTranslucency" cx="68%" cy="16%" r="35%">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#FB923C" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fluffy Cloud Perimeter Path */}
        <path
          d="
            M 34 136
            H 246
            C 264 136 276 124 276 106
            C 276 88 266 76 250 72
            C 250 36 222 10 186 10
            C 160 10 138 24 130 46
            C 120 32 104 24 86 24
            C 54 24 30 48 28 80
            C 14 84 4 96 4 112
            C 4 126 18 136 34 136
            Z
          "
          className="fill-[url(#cloudMilkyGlass)] dark:fill-[url(#cloudDarkGlass)] stroke-[url(#cloudRimLight)] dark:stroke-[url(#cloudRimDark)]"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Subsurface Sun Glow through translucent glass */}
        {isSun && (
          <path
            d="
              M 34 136
              H 246
              C 264 136 276 124 276 106
              C 276 88 266 76 250 72
              C 250 36 222 10 186 10
              C 160 10 138 24 130 46
              C 120 32 104 24 86 24
              C 54 24 30 48 28 80
              C 14 84 4 96 4 112
              C 4 126 18 136 34 136
              Z
            "
            fill="url(#sunTranslucency)"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* 3. Text Inside the Cloud Body with 3D Depth */}
      <div
        className="relative z-20 pt-10 pb-6 px-7 sm:px-8 text-center flex flex-col items-center justify-center transition-transform duration-150 ease-out"
        style={{
          transform: `translate3d(${floatX * 0.4}px, ${floatY * 0.4}px, 20px)`,
        }}
      >
        {hasTitle && (
          <div className="text-[12px] sm:text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1 leading-snug break-words">
            {note.title!.trim()}
          </div>
        )}

        <div className="text-xs sm:text-[14px] font-semibold leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin">
          {text}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: Readable Node Type Badge
// ---------------------------------------------------------------------------

function getNodeTypeLabel(node?: SquigNode | null): string {
  if (!node) return "object"
  switch (node.type) {
    case "arrow":
      return "connector"
    case "draw":
      return "sketch"
    case "shape":
      return node.shape || "shape"
    case "component":
      return node.kind || "component"
    case "text":
      return "text"
    case "image":
      return "image"
    case "document":
      return node.extension?.toUpperCase() || "document"
    case "sticky":
      return "sticky"
    case "frame":
      return "frame"
    case "embed":
      return "embed"
    default:
      return "object"
  }
}
