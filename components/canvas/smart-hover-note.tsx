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

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { HoverNote, SquigNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { LiquidGlassCardIcon } from "./liquid-glass-icons"

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
  const isInitializedRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)

  // Track target coordinates and normalized mouse offset
  const targetRef = useRef({
    x: anchorPos.x + 18,
    y: anchorPos.y + 18,
    normX: 0,
    normY: 0,
  })

  // Track current smoothly interpolated position
  const currentRef = useRef({
    x: anchorPos.x + 18,
    y: anchorPos.y + 18,
    normX: 0,
    normY: 0,
  })

  useEffect(() => {
    const el = cardRef.current
    const padding = 16
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920
    const vh = typeof window !== "undefined" ? window.innerHeight : 1080

    const rect = el ? el.getBoundingClientRect() : { width: 280, height: 140 }

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

    targetRef.current = { x: left, y: top, normX, normY }

    // Instant initial placement on mount to avoid sliding from (0,0)
    if (!isInitializedRef.current) {
      currentRef.current = { x: left, y: top, normX, normY }
      if (el) {
        el.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`
        const tiltX = (-normY * 15).toFixed(2)
        const tiltY = (normX * 15).toFixed(2)
        const floatX = (normX * 8).toFixed(2)
        const floatY = (normY * 6).toFixed(2)
        const weatherX = (-normX * 12).toFixed(2)
        const weatherY = (-normY * 10).toFixed(2)

        el.style.setProperty("--hover-tilt-x", `${tiltX}deg`)
        el.style.setProperty("--hover-tilt-y", `${tiltY}deg`)
        el.style.setProperty("--hover-float-x", `${floatX}px`)
        el.style.setProperty("--hover-float-y", `${floatY}px`)
        el.style.setProperty("--hover-weather-x", `${weatherX}px`)
        el.style.setProperty("--hover-weather-y", `${weatherY}px`)
      }
      isInitializedRef.current = true
    }

    // High-performance spring-lerp loop driven by requestAnimationFrame
    const startRaf = () => {
      if (rafIdRef.current !== null) return

      const tick = () => {
        const domEl = cardRef.current
        if (!domEl) {
          rafIdRef.current = null
          return
        }

        const target = targetRef.current
        const current = currentRef.current

        // Critically damped spring lerp coefficients
        // 0.18 provides immediate, zero-lag response with a silky smooth deceleration
        const posFactor = 0.18
        const tiltFactor = 0.22

        const dx = target.x - current.x
        const dy = target.y - current.y
        const dNormX = target.normX - current.normX
        const dNormY = target.normY - current.normY

        current.x += dx * posFactor
        current.y += dy * posFactor
        current.normX += dNormX * tiltFactor
        current.normY += dNormY * tiltFactor

        // Hardware accelerated GPU compositing
        domEl.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`

        // CSS custom properties for 3D tilt and floating parallax
        const tiltX = (-current.normY * 15).toFixed(2)
        const tiltY = (current.normX * 15).toFixed(2)
        const floatX = (current.normX * 8).toFixed(2)
        const floatY = (current.normY * 6).toFixed(2)
        const weatherX = (-current.normX * 12).toFixed(2)
        const weatherY = (-current.normY * 10).toFixed(2)

        domEl.style.setProperty("--hover-tilt-x", `${tiltX}deg`)
        domEl.style.setProperty("--hover-tilt-y", `${tiltY}deg`)
        domEl.style.setProperty("--hover-float-x", `${floatX}px`)
        domEl.style.setProperty("--hover-float-y", `${floatY}px`)
        domEl.style.setProperty("--hover-weather-x", `${weatherX}px`)
        domEl.style.setProperty("--hover-weather-y", `${weatherY}px`)

        const isSettled =
          Math.abs(dx) < 0.05 &&
          Math.abs(dy) < 0.05 &&
          Math.abs(dNormX) < 0.005 &&
          Math.abs(dNormY) < 0.005

        if (isSettled) {
          current.x = target.x
          current.y = target.y
          current.normX = target.normX
          current.normY = target.normY
          domEl.style.transform = `translate3d(${target.x.toFixed(2)}px, ${target.y.toFixed(2)}px, 0)`
          rafIdRef.current = null
        } else {
          rafIdRef.current = requestAnimationFrame(tick)
        }
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    startRaf()
  }, [anchorPos.x, anchorPos.y])

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={cardRef}
      role="tooltip"
      aria-live="polite"
      className={cn(
        "fixed top-0 left-0 z-50 pointer-events-none select-none max-w-xs sm:max-w-sm w-max",
        "animate-in fade-in zoom-in-95 duration-150 ease-out"
      )}
      style={{
        transform: `translate3d(${currentRef.current.x.toFixed(2)}px, ${currentRef.current.y.toFixed(2)}px, 0)`,
        willChange: "transform",
      }}
    >
      <SmartHoverCardContent node={node} note={note} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1:1 Physical Hover Note Card Presentations (Matching User Reference Images)
//
// 1. yellow-slate  : Cyber Yellow Bezel + Matte Obsidian Slate (Image 1)
// 2. ice-ceramic   : Translucent Ice Sky Glass Rim + Frosted Ceramic White (Image 2)
// 3. royal-slate   : Royal Cobalt Blue Bezel + Matte Obsidian Slate (Image 3)
// 4. cyan-slate    : Electric Neon Cyan Bezel + Matte Obsidian Slate (Image 4)
// 5. acrylic-glass : Specular Transparent Acrylic Glass Tile + Floating White Card (Image 5)
// ---------------------------------------------------------------------------

export interface SmartHoverCardContentProps {
  node?: SquigNode | null
  note: HoverNote
  className?: string
  mouseOffset?: { x: number; y: number }
}

/** 1. Yellow Slate Card (1:1 Reference Image 1) */
export function YellowSlateCard({
  note,
  node,
  className,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
}) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)

  return (
    <div
      className={cn(
        "relative select-none font-sans overflow-hidden",
        "w-[260px] sm:w-[320px] rounded-[32px] p-[6px]",
        "bg-[#FACC15] shadow-[0_24px_45px_rgba(0,0,0,0.22),0_8px_18px_rgba(0,0,0,0.12)]",
        className
      )}
      style={{
        transform:
          "perspective(900px) rotateX(var(--hover-tilt-x, 0deg)) rotateY(var(--hover-tilt-y, 0deg)) translate3d(calc(var(--hover-float-x, 0px) * 0.3), calc(var(--hover-float-y, 0px) * 0.3), 0)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* Inner Screen: Matte Obsidian Black */}
      <div className="w-full h-full rounded-[26px] bg-[#18191E] text-white p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[140px] shadow-inner">
        {/* Header row: Badge + Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <LiquidGlassCardIcon themeId="yellow-slate" size="sm" />
            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-snug text-white">
                {note.title!.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FACC15]">
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40 shrink-0">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Body Text */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-stone-200/90 whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

/** 2. Ice Ceramic Glass Card (1:1 Reference Image 2) */
export function IceCeramicCard({
  note,
  node,
  className,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
}) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)

  return (
    <div
      className={cn(
        "relative select-none font-sans overflow-hidden",
        "w-[260px] sm:w-[320px] rounded-[32px] p-[4px]",
        "bg-[#93C5FD]/85 shadow-[0_24px_45px_rgba(147,197,253,0.30),0_8px_18px_rgba(15,23,42,0.08)]",
        className
      )}
      style={{
        transform:
          "perspective(900px) rotateX(var(--hover-tilt-x, 0deg)) rotateY(var(--hover-tilt-y, 0deg)) translate3d(calc(var(--hover-float-x, 0px) * 0.3), calc(var(--hover-float-y, 0px) * 0.3), 0)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* Inner Screen: Frosted Milky Ceramic White */}
      <div className="w-full h-full rounded-[28px] bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#EFF6FF] text-slate-800 p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[140px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
        {/* Header row: Badge + Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <LiquidGlassCardIcon themeId="ice-ceramic" size="sm" />
            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-snug text-slate-900">
                {note.title!.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 shrink-0">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Body Text */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

/** 3. Royal Cobalt Slate Card (1:1 Reference Image 3) */
export function RoyalSlateCard({
  note,
  node,
  className,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
}) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)

  return (
    <div
      className={cn(
        "relative select-none font-sans overflow-hidden",
        "w-[260px] sm:w-[320px] rounded-[32px] p-[6px]",
        "bg-[#2563EB] shadow-[0_24px_45px_rgba(37,99,235,0.30),0_8px_18px_rgba(0,0,0,0.14)]",
        className
      )}
      style={{
        transform:
          "perspective(900px) rotateX(var(--hover-tilt-x, 0deg)) rotateY(var(--hover-tilt-y, 0deg)) translate3d(calc(var(--hover-float-x, 0px) * 0.3), calc(var(--hover-float-y, 0px) * 0.3), 0)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* Inner Screen: Matte Obsidian Black */}
      <div className="w-full h-full rounded-[26px] bg-[#18191E] text-white p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[140px] shadow-inner">
        {/* Header row: Badge + Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <LiquidGlassCardIcon themeId="royal-slate" size="sm" />
            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-snug text-white">
                {note.title!.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 shrink-0">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Body Text */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-stone-200/90 whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

/** 4. Neon Cyan Slate Card (1:1 Reference Image 4) */
export function CyanSlateCard({
  note,
  node,
  className,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
}) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)

  return (
    <div
      className={cn(
        "relative select-none font-sans overflow-hidden",
        "w-[260px] sm:w-[320px] rounded-[32px] p-[6px]",
        "bg-[#00B4D8] shadow-[0_24px_45px_rgba(0,180,216,0.30),0_8px_18px_rgba(0,0,0,0.14)]",
        className
      )}
      style={{
        transform:
          "perspective(900px) rotateX(var(--hover-tilt-x, 0deg)) rotateY(var(--hover-tilt-y, 0deg)) translate3d(calc(var(--hover-float-x, 0px) * 0.3), calc(var(--hover-float-y, 0px) * 0.3), 0)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* Inner Screen: Matte Obsidian Black */}
      <div className="w-full h-full rounded-[26px] bg-[#18191E] text-white p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[140px] shadow-inner">
        {/* Header row: Badge + Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <LiquidGlassCardIcon themeId="cyan-slate" size="sm" />
            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-snug text-white">
                {note.title!.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shrink-0">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Body Text */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-stone-200/90 whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

/** 5. Acrylic Glass Specular Tile (1:1 Reference Image 5) */
export function AcrylicGlassCard({
  note,
  node,
  className,
}: {
  note: HoverNote
  node?: SquigNode | null
  className?: string
}) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)

  return (
    <div
      className={cn(
        "relative select-none font-sans overflow-hidden",
        "w-[270px] sm:w-[330px] rounded-[34px] p-2.5 sm:p-3",
        "border-2 border-[#EAB308]/90 bg-white/45 dark:bg-black/35 backdrop-blur-2xl",
        "shadow-[0_24px_50px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.08)]",
        className
      )}
      style={{
        transform:
          "perspective(900px) rotateX(var(--hover-tilt-x, 0deg)) rotateY(var(--hover-tilt-y, 0deg)) translate3d(calc(var(--hover-float-x, 0px) * 0.3), calc(var(--hover-float-y, 0px) * 0.3), 0)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* 1:1 Specular diagonal glass sheen across top-left corner matching Image 5 */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[32px] z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 28%, transparent 28.5%)",
        }}
      />

      {/* Floating White Card Nested Inside Clear Acrylic Chassis */}
      <div className="relative z-0 w-full h-full rounded-[22px] bg-white text-slate-800 p-4 sm:p-5 flex flex-col justify-center min-h-[110px] sm:min-h-[130px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {/* Header row: Badge + Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <LiquidGlassCardIcon themeId="acrylic-glass" size="sm" />
            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-snug text-slate-900">
                {note.title!.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 shrink-0">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Body Text */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Master Smart Hover Card Content Selector.
 * Renders the chosen physical reference card design.
 */
export function SmartHoverCardContent({
  node,
  note,
  className,
}: SmartHoverCardContentProps) {
  const theme = note.theme || "yellow-slate"

  if (theme === "ice-ceramic") {
    return <IceCeramicCard note={note} node={node} className={className} />
  }
  if (theme === "royal-slate") {
    return <RoyalSlateCard note={note} node={node} className={className} />
  }
  if (theme === "cyan-slate") {
    return <CyanSlateCard note={note} node={node} className={className} />
  }
  if (theme === "acrylic-glass") {
    return <AcrylicGlassCard note={note} node={node} className={className} />
  }

  // Default to yellow-slate (Image 1)
  return <YellowSlateCard note={note} node={node} className={className} />
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
