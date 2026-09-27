"use client"

// ---------------------------------------------------------------------------
// Zenith PDF Classroom — Selectable Text Layer & Search Highlights
// Real selectable text layer over the rendered PDF page with search matches
// and quick-action selection pill (Copy, Highlight, Add Note).
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from "react"
import { CopyIcon, HighlighterIcon, ChatTextIcon } from "@phosphor-icons/react"
import type { PdfTextToken, PdfSearchMatch } from "@/lib/pdf-types"
import { useSquig } from "@/lib/store"

interface PdfTextLayerProps {
  tokens: PdfTextToken[]
  width: number
  height: number
  searchMatches?: PdfSearchMatch[]
  activeMatchIndex?: number
  onHighlightSelection?: (boxes: { nx: number; ny: number; nw: number; nh: number }[]) => void
  onAddNoteFromSelection?: (text: string, nx: number, ny: number) => void
}

export function PdfTextLayer({
  tokens,
  width,
  height,
  searchMatches = [],
  activeMatchIndex = 0,
  onHighlightSelection,
  onAddNoteFromSelection,
}: PdfTextLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedRange, setSelectedRange] = useState<{
    text: string
    boxes: { nx: number; ny: number; nw: number; nh: number }[]
    screenPos: { x: number; y: number }
  } | null>(null)

  // Track text selection within the layer
  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setSelectedRange(null)
      return
    }

    const text = sel.toString().trim()
    if (!text) {
      setSelectedRange(null)
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const range = sel.getRangeAt(0)
    const clientRects = Array.from(range.getClientRects())
    if (!clientRects.length) return

    const boxes = clientRects.map((r) => ({
      nx: Math.max(0, Math.min(1, (r.left - containerRect.left) / width)),
      ny: Math.max(0, Math.min(1, (r.top - containerRect.top) / height)),
      nw: Math.min(1, r.width / width),
      nh: Math.min(1, r.height / height),
    }))

    const firstRect = clientRects[0]
    setSelectedRange({
      text,
      boxes,
      screenPos: {
        x: firstRect.left - containerRect.left + firstRect.width / 2,
        y: Math.max(10, firstRect.top - containerRect.top - 42),
      },
    })
  }

  // Hide selection pill if clicked elsewhere
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedRange(null)
      }
    }
    document.addEventListener("mousedown", handleDown)
    return () => document.removeEventListener("mousedown", handleDown)
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-text overflow-hidden"
      style={{ width, height }}
      onMouseUp={handleMouseUp}
    >
      {/* 1. Search match highlights */}
      {searchMatches.map((m, mi) => {
        const isActive = m.matchIndex === activeMatchIndex
        return m.boxes.map((b, bi) => (
          <div
            key={`match-${mi}-${bi}`}
            className="pointer-events-none absolute rounded-xs transition-colors"
            style={{
              left: `${b.nx * 100}%`,
              top: `${b.ny * 100}%`,
              width: `${b.nw * 100}%`,
              height: `${b.nh * 100}%`,
              backgroundColor: isActive ? "rgba(245, 158, 11, 0.55)" : "rgba(250, 204, 21, 0.35)",
              border: isActive ? "1.5px solid #d97706" : "1px solid #eab308",
              mixBlendMode: "multiply",
            }}
          />
        ))
      })}

      {/* 2. Selectable text tokens */}
      {tokens.map((token, idx) => (
        <span
          key={idx}
          className="absolute font-sans leading-none cursor-text text-transparent selection:bg-yellow-300/40"
          style={{
            left: `${token.nx * 100}%`,
            top: `${token.ny * 100}%`,
            width: `${token.nw * 100}%`,
            height: `${token.nh * 100}%`,
            fontSize: `${Math.max(10, token.h * 0.95)}px`,
            whiteSpace: "pre",
            transformOrigin: "top left",
          }}
        >
          {token.str}
        </span>
      ))}

      {/* 3. Floating Quick-Action Pill for selected text */}
      {selectedRange && (
        <div
          className="absolute z-30 flex items-center gap-1 rounded-chrome-sm border bg-[var(--sq-paper)] p-1 shadow-md animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: selectedRange.screenPos.x,
            top: selectedRange.screenPos.y,
            transform: "translateX(-50%)",
          }}
        >
          <button
            type="button"
            className="flex items-center gap-1 rounded-xs px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(selectedRange.text)
              useSquig.getState().setNotice("Copied selected text")
              setSelectedRange(null)
              window.getSelection()?.removeAllRanges()
            }}
          >
            <CopyIcon className="size-3.5" />
            <span>Copy</span>
          </button>

          <div className="h-3.5 w-px bg-border" />

          <button
            type="button"
            className="flex items-center gap-1 rounded-xs px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onHighlightSelection?.(selectedRange.boxes)
              setSelectedRange(null)
              window.getSelection()?.removeAllRanges()
            }}
          >
            <HighlighterIcon className="size-3.5" />
            <span>Highlight</span>
          </button>

          <div className="h-3.5 w-px bg-border" />

          <button
            type="button"
            className="flex items-center gap-1 rounded-xs px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              const firstBox = selectedRange.boxes[0]
              onAddNoteFromSelection?.(selectedRange.text, firstBox.nx + firstBox.nw + 0.02, firstBox.ny)
              setSelectedRange(null)
              window.getSelection()?.removeAllRanges()
            }}
          >
            <ChatTextIcon className="size-3.5" />
            <span>Note</span>
          </button>
        </div>
      )}
    </div>
  )
}
