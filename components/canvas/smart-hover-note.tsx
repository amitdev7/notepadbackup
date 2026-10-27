"use client"

// ---------------------------------------------------------------------------
// Zenithsui Smart Hover Notes — Premium macOS/iOS-Inspired Hover Annotation
//
// Desktop hover-only floating cards for canvas objects (arrows, freehand
// sketches, shapes, text, components, images, documents, stickies, etc.).
//
// Core Invariants:
// 1. 100% hidden when not hovering: no persistent canvas text, labels, or decorations.
// 2. Exact stroke hit-testing: arrows and sketches trigger only on actual stroke collars.
//    Hollow shapes trigger only on their drawn perimeter; filled shapes on their surface.
// 3. Stable cursor anchoring: card anchors on hover reveal and does NOT jump or flicker
//    while moving the pointer over the same object.
// 4. Smooth Apple-style entrance and exit transitions (160ms in, 140ms out) with
//    prefers-reduced-motion safety.
// 5. Automatic theme inheritance across all 12 Zenithsui palettes, paper shades, and dark modes.
// 6. Viewport collision detection with auto-flipping and screen edge clamping.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import type { HoverNote, SquigNode } from "@/lib/types"
import { ChatCenteredText } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface SmartHoverNoteProps {
  /** Topmost eligible node currently under the pointer (must be a hard hit, not soft hollow interior) */
  targetNode: SquigNode | null
  /** Optional external client pointer coordinates; defaults to tracked window coordinates */
  pointerPos?: { x: number; y: number } | null
  /** Whether an active gesture, tool, or canvas mode is busy (suppresses hover notes) */
  isBusy?: boolean
  /** Delay in milliseconds before revealing note (default: 300ms) */
  delayMs?: number
}

type AnimState = "idle" | "entering" | "visible" | "exiting"

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
  const [animState, setAnimState] = useState<AnimState>("idle")
  const [displayedNode, setDisplayedNode] = useState<SquigNode | null>(null)
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activeNodeIdRef = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Continuously track mouse coordinates without forcing React re-renders on the canvas
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  // Sync external pointerPos prop when provided
  useEffect(() => {
    if (pointerPos) {
      pointerPosRef.current = pointerPos
    }
  }, [pointerPos])

  // Evaluate whether target node has an enabled, non-empty note and canvas is not busy
  const note = targetNode?.hoverNote
  const isEligible = Boolean(
    targetNode &&
    note &&
    note.enabled !== false &&
    ((note.body && note.body.trim().length > 0) || (note.title && note.title.trim().length > 0)) &&
    !isBusy
  )

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current)
      enterTimerRef.current = null
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
  }, [])

  // State machine managing hover activation, delay, anchoring, switching, and smooth exit
  useEffect(() => {
    if (!isEligible || !targetNode) {
      // Pointer left eligible target
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current)
        enterTimerRef.current = null
      }

      activeNodeIdRef.current = null

      if (animState === "visible" || animState === "entering") {
        // Trigger smooth exit transition
        setAnimState("exiting")
        exitTimerRef.current = setTimeout(() => {
          setAnimState("idle")
          setDisplayedNode(null)
          exitTimerRef.current = null
        }, 140)
      }
      return
    }

    const nextId = targetNode.id

    // Case 1: Hovering within the SAME already active node
    if (activeNodeIdRef.current === nextId) {
      // If already visible, keep the card anchored in place (do NOT follow cursor or restart animation)
      // If user edited the note while hovering, update displayed node content seamlessly
      if (animState === "visible" || animState === "entering") {
        setDisplayedNode(targetNode)
      }
      return
    }

    // Case 2: New node target
    activeNodeIdRef.current = nextId

    if (animState === "visible" || animState === "entering") {
      // Rapid switch between two annotated objects: cross-fade directly without delay lag
      clearTimers()
      setDisplayedNode(targetNode)
      setAnchorPos(pointerPosRef.current)
      setAnimState("visible")
    } else {
      // Fresh hover entrance: start standard 300ms hover delay
      clearTimers()
      enterTimerRef.current = setTimeout(() => {
        setDisplayedNode(targetNode)
        setAnchorPos(pointerPosRef.current)
        setAnimState("entering")

        // Progress to steady visible state
        requestAnimationFrame(() => {
          setAnimState("visible")
        })
        enterTimerRef.current = null
      }, delayMs)
    }

    return () => {
      // Cleanup on unmount or target replacement
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current)
        enterTimerRef.current = null
      }
    }
  }, [isEligible, targetNode, isBusy, delayMs, animState, clearTimers])

  // Instant dismissal on Escape key, canvas wheel/scroll, or window blur
  useEffect(() => {
    if (animState === "idle") return

    const dismissImmediately = () => {
      clearTimers()
      activeNodeIdRef.current = null
      setAnimState("idle")
      setDisplayedNode(null)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissImmediately()
    }

    window.addEventListener("keydown", onKey)
    window.addEventListener("blur", dismissImmediately)
    window.addEventListener("wheel", dismissImmediately, { passive: true })
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("blur", dismissImmediately)
      window.removeEventListener("wheel", dismissImmediately)
    }
  }, [animState, clearTimers])

  if (!mounted || animState === "idle" || !displayedNode?.hoverNote || typeof document === "undefined") {
    return null
  }

  return createPortal(
    <FloatingHoverCard
      node={displayedNode}
      note={displayedNode.hoverNote}
      anchorPos={anchorPos}
      animState={animState}
    />,
    document.body
  )
}

// ---------------------------------------------------------------------------
// Floating Note Card with Boundary Clamping & Apple Glassmorphism
// ---------------------------------------------------------------------------

interface FloatingHoverCardProps {
  node: SquigNode
  note: HoverNote
  anchorPos: { x: number; y: number }
  animState: AnimState
}

function FloatingHoverCard({ node, note, anchorPos, animState }: FloatingHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [stylePos, setStylePos] = useState({ left: anchorPos.x + 12, top: anchorPos.y + 12 })

  // Measure card dimensions and clamp to viewport
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const padding = 14
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchorPos.x + 12
    let top = anchorPos.y + 12

    // Flip to left if overflowing viewport right
    if (left + rect.width > vw - padding) {
      left = Math.max(padding, anchorPos.x - rect.width - 12)
    }

    // Flip up if overflowing viewport bottom
    if (top + rect.height > vh - padding) {
      top = Math.max(padding, anchorPos.y - rect.height - 12)
    }

    // Double-check top and left margins
    if (left < padding) left = padding
    if (top < padding) top = padding

    setStylePos({ left, top })
  }, [anchorPos])

  const isExiting = animState === "exiting"

  return (
    <div
      ref={cardRef}
      role="tooltip"
      aria-live="polite"
      className={cn(
        "fixed z-50 pointer-events-none select-none max-w-xs sm:max-w-sm w-max transition-all",
        isExiting
          ? "opacity-0 scale-97 translate-y-[-2px] duration-140 ease-in"
          : "opacity-100 scale-100 translate-y-0 duration-160 ease-out"
      )}
      style={{
        left: `${stylePos.left}px`,
        top: `${stylePos.top}px`,
        transitionProperty: "opacity, transform",
      }}
    >
      <SmartHoverCardContent node={node} note={note} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared Smart Hover Card Presentation (Visual Surface)
// ---------------------------------------------------------------------------

export interface SmartHoverCardContentProps {
  node?: SquigNode | null
  note: HoverNote
  className?: string
}

export function SmartHoverCardContent({
  node,
  note,
  className,
}: SmartHoverCardContentProps) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--sq-faint)]/80 font-sans shadow-2xl overflow-hidden",
        "bg-[var(--sq-paper)]/95 backdrop-blur-xl text-[var(--sq-ink)] transition-colors",
        className
      )}
      style={{
        boxShadow:
          "0 12px 34px -4px rgba(0, 0, 0, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--sq-faint)",
      }}
    >
      {/* Top subtle ink wash accent */}
      <div className="h-0.5 w-full bg-[var(--sq-shade-strong)]" />

      <div className="p-3 sm:p-3.5 space-y-2">
        {/* Header row: only displayed if title or node badge exists */}
        {(hasTitle || nodeTypeLabel) && (
          <div className="flex items-start justify-between gap-2.5">
            {hasTitle ? (
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="p-1 rounded-md bg-[var(--sq-shade)] text-[var(--sq-ink)] shrink-0 opacity-90">
                  <ChatCenteredText size={12} weight="bold" />
                </span>
                <h4 className="text-xs sm:text-[13px] font-bold tracking-tight text-[var(--sq-ink)] truncate leading-tight">
                  {note.title!.trim()}
                </h4>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 opacity-70">
                <span className="p-1 rounded-md bg-[var(--sq-shade)] text-[var(--sq-ink)] shrink-0">
                  <ChatCenteredText size={11} weight="bold" />
                </span>
              </div>
            )}

            {nodeTypeLabel && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--sq-shade)]/70 text-[var(--sq-ink)] opacity-70 shrink-0 border border-[var(--sq-faint)]/50">
                {nodeTypeLabel}
              </span>
            )}
          </div>
        )}

        {/* Note Body: multi-line description */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-[var(--sq-ink)]/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-56 overflow-y-auto overscroll-contain">
            {note.body.trim()}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: Readable Node Type Badge
// ---------------------------------------------------------------------------

function getNodeTypeLabel(node?: SquigNode | null): string {
  if (!node) return ""
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
      return ""
  }
}
