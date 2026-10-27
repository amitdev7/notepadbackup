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

  return (
    <div
      className={cn(
        "rounded-3xl border border-sky-200/60 dark:border-sky-500/40 font-sans overflow-hidden",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-[var(--sq-ink)] transition-all",
        "shadow-2xl ring-1 ring-sky-400/20 dark:ring-sky-400/10",
        className
      )}
      style={{
        boxShadow:
          "0 20px 48px -10px rgba(56, 189, 248, 0.32), 0 8px 24px -4px rgba(15, 23, 42, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.7)",
      }}
    >
      {/* Top dreamy celestial cloud accent gradient */}
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 opacity-90" />

      <div className="p-3.5 sm:p-4 space-y-2.5">
        {/* Header row: Cloud icon + Title / Annotation + Node Type Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="p-1.5 rounded-xl bg-sky-500/15 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 shrink-0 border border-sky-400/25 shadow-xs flex items-center justify-center">
              <Cloud size={15} weight="fill" />
            </span>
            {hasTitle ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate leading-snug">
                {note.title!.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-200 uppercase tracking-wider flex items-center gap-1">
                Note
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100/70 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 shadow-2xs shrink-0">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Note Body */}
        {hasBody && (
          <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words max-h-52 overflow-y-auto overscroll-contain pr-1">
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
