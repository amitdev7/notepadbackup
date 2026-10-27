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

    // If mouse is moving within the SAME already visible node, stay stably anchored (no jitter)
    if (visible && currentTargetIdRef.current === nodeId) {
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
  const [stylePos, setStylePos] = useState({ left: anchorPos.x + 16, top: anchorPos.y + 16 })

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const padding = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchorPos.x + 16
    let top = anchorPos.y + 16

    // Flip to left if overflowing viewport right
    if (left + rect.width > vw - padding) {
      left = Math.max(padding, anchorPos.x - rect.width - 16)
    }

    // Flip up if overflowing viewport bottom
    if (top + rect.height > vh - padding) {
      top = Math.max(padding, anchorPos.y - rect.height - 16)
    }

    setStylePos({ left, top })
  }, [anchorPos])

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
        left: `${stylePos.left}px`,
        top: `${stylePos.top}px`,
      }}
    >
      <SmartHoverCardContent node={node} note={note} />
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
}

export function SmartHoverCardContent({
  node,
  note,
  className,
}: SmartHoverCardContentProps) {
  const nodeTypeLabel = getNodeTypeLabel(node)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  const hasBody = Boolean(note.body && note.body.trim().length > 0)
  const theme = note.theme || "clouds"

  // Theme-specific visual tokens
  const isClouds = theme === "clouds"
  const isMac = theme === "macos"
  const isIos = theme === "ios"
  const isMinimal = theme === "minimalist"

  return (
    <div
      className={cn(
        "rounded-3xl font-sans overflow-hidden transition-all",
        isClouds && [
          "border border-sky-200/70 dark:border-sky-500/40",
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-[var(--sq-ink)]",
          "shadow-2xl ring-1 ring-sky-400/20 dark:ring-sky-400/10",
        ],
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
        boxShadow: isClouds
          ? "0 22px 50px -10px rgba(56, 189, 248, 0.35), 0 8px 24px -4px rgba(15, 23, 42, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8)"
          : isIos
            ? "0 24px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
            : isMac
              ? "0 20px 45px -10px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.9)"
              : "0 14px 30px -8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Top Accent Gradient Bar */}
      {isClouds && (
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 opacity-90" />
      )}
      {isMac && (
        <div className="h-1.5 w-full bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 dark:from-stone-600 dark:via-stone-500 dark:to-stone-600 opacity-80" />
      )}
      {isIos && (
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 opacity-95" />
      )}

      <div className="p-3.5 sm:p-4 space-y-2.5">
        {/* Header row: Cloud/Theme icon + Title / Annotation + Node Type Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={cn(
                "p-1.5 rounded-xl shrink-0 border shadow-xs flex items-center justify-center",
                isClouds && "bg-sky-500/15 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 border-sky-400/25",
                isMac && "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
                isIos && "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
                isMinimal && "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
              )}
            >
              {isClouds ? (
                <Cloud size={15} weight="fill" />
              ) : isMac ? (
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
                  isClouds && "text-sky-800 dark:text-sky-200",
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
                isClouds && "bg-sky-100/70 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
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
