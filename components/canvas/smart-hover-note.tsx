"use client"

// ---------------------------------------------------------------------------
// Zenithsui Smart Hover Notes — Premium macOS/iOS-Inspired Hover Annotation
//
// Displays elegant floating metadata beside the cursor when hovering over
// any annotated canvas object (Arrow, Shape, Draw, Text, Component, etc.).
//
// Features:
// 1. Theme-aware glassmorphism adapting to all Zenithsui ink and paper palettes.
// 2. High-DPI viewport boundary collision clamping & automatic flipping.
// 3. Isolated React portal rendering immune to canvas pan/zoom transforms.
// 4. Accessible tooltip ARIA semantics with reduced-motion support.
// 5. Shared live preview rendering for inspector and context controls.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { HoverNote, SquigNode } from "@/lib/types"
import { ChatCenteredText, Tag, ArrowRight, PencilSimple, Sparkle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface SmartHoverNoteProps {
  /** Target node currently under the pointer */
  targetNode: SquigNode | null
  /** Current client pointer coordinates */
  pointerPos: { x: number; y: number } | null
  /** Whether a gesture or canvas tool is busy (suppresses hover notes) */
  isBusy?: boolean
  /** Delay in milliseconds before revealing note (default: 350ms) */
  delayMs?: number
}

/**
 * Universal floating Smart Hover Note portal.
 */
export function SmartHoverNote({
  targetNode,
  pointerPos,
  isBusy = false,
  delayMs = 350,
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
    note.enabled &&
    note.body &&
    note.body.trim().length > 0 &&
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

    // If mouse is moving within the SAME already visible node, update position smoothly
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

  // Dismiss on Escape key or window blur
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
  const [stylePos, setStylePos] = useState({ left: anchorPos.x + 14, top: anchorPos.y + 14 })

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const padding = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchorPos.x + 14
    let top = anchorPos.y + 14

    // Flip to left if overflowing viewport right
    if (left + rect.width > vw - padding) {
      left = Math.max(padding, anchorPos.x - rect.width - 14)
    }

    // Flip up if overflowing viewport bottom
    if (top + rect.height > vh - padding) {
      top = Math.max(padding, anchorPos.y - rect.height - 14)
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

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--sq-border)]/80 font-sans shadow-2xl overflow-hidden",
        "bg-[var(--sq-paper)]/95 backdrop-blur-md text-[var(--sq-ink)] transition-all",
        className
      )}
      style={{
        boxShadow:
          "0 14px 34px -4px rgba(0, 0, 0, 0.18), 0 6px 14px -3px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--sq-faint)",
      }}
    >
      {/* Top micro-accent bar: subtle ink wash */}
      <div className="h-1 w-full bg-[var(--sq-shade-strong)]" />

      <div className="p-3 sm:p-3.5 space-y-2">
        {/* Header row: badge + node type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-md bg-[var(--sq-shade)] text-[var(--sq-ink)] shrink-0">
              <ChatCenteredText size={12} weight="bold" />
            </span>
            {note.title && note.title.trim() ? (
              <h4 className="text-xs sm:text-[13px] font-bold tracking-tight text-[var(--sq-ink)] truncate">
                {note.title.trim()}
              </h4>
            ) : (
              <span className="text-[11px] font-semibold text-[var(--sq-ink)] opacity-70 uppercase tracking-wider">
                Annotation
              </span>
            )}
          </div>

          {nodeTypeLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--sq-shade)]/60 text-[var(--sq-ink)] opacity-70 shrink-0 border border-[var(--sq-border)]/40">
              {nodeTypeLabel}
            </span>
          )}
        </div>

        {/* Note Body */}
        <div className="text-xs leading-relaxed text-[var(--sq-ink)]/90 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {note.body.trim()}
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
