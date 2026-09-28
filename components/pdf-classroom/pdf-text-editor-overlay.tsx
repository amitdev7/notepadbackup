"use client"

import { useEffect, useRef, useState } from "react"

export interface PdfTextEditorProps {
  initialText?: string
  x: number // Normalized 0..1 coordinate on the stage
  y: number // Normalized 0..1 coordinate on the stage
  fontSize?: number
  color?: string
  zoom?: number
  onCommit: (text: string) => void
  onCancel: () => void
  placeholder?: string
}

/**
 * Inline text editor overlay for PDF slides and Whiteboard.
 * Replaces native browser window.prompt() dialogs with an authentic,
 * in-place Zenithsui napkin/sketch inline text area that matches
 * canvas fonts, colors, and positioning.
 */
export function PdfTextEditorOverlay({
  initialText = "",
  x,
  y,
  fontSize = 18,
  color = "var(--sq-ink)",
  zoom = 1,
  onCommit,
  onCancel,
  placeholder = "Type note…",
}: PdfTextEditorProps) {
  const [text, setText] = useState(initialText)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const committedRef = useRef(false)

  // Focus and select immediately on mount
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  // Auto-resize height as typing happens
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${Math.max(34, el.scrollHeight)}px`
    }
  }, [text])

  const handleCommit = () => {
    if (committedRef.current) return
    committedRef.current = true
    const trimmed = text.trim()
    if (trimmed) {
      onCommit(trimmed)
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent PDF / whiteboard modal hotkeys (like arrows, 'f', space) from capturing keystrokes
    e.stopPropagation()

    if (e.key === "Escape") {
      e.preventDefault()
      if (text.trim()) {
        handleCommit()
      } else {
        committedRef.current = true
        onCancel()
      }
      return
    }

    // Enter commits (Shift+Enter inserts newline for multiline note)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleCommit()
    }
  }

  // Pointer down outside commits
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        handleCommit()
      }
    }
    window.addEventListener("pointerdown", handlePointerDown, true)
    return () => window.removeEventListener("pointerdown", handlePointerDown, true)
  }, [text])

  return (
    <div
      className="absolute z-30"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: "translate(-2px, -8px)",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleCommit}
        placeholder={placeholder}
        rows={1}
        className="block min-w-[140px] max-w-[420px] resize-none overflow-hidden rounded-[3px] border border-dashed px-2 py-1 outline-none transition-shadow"
        style={{
          fontFamily: "var(--sq-font)",
          fontSize: `${Math.max(14, fontSize * (zoom < 1 ? 1 : 1))}px`,
          lineHeight: 1.35,
          color: color,
          caretColor: "var(--sq-ink)",
          borderColor: "var(--sq-select, #0284c7)",
          backgroundColor: "color-mix(in srgb, var(--sq-select, #0284c7) 12%, var(--sq-paper, #ffffff))",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      />
      <div className="mt-1 flex items-center gap-1.5 px-1 font-sans text-[10px] text-muted-foreground select-none">
        <span>↵ commit</span>
        <span>•</span>
        <span>⇧↵ newline</span>
        <span>•</span>
        <span>esc cancel</span>
      </div>
    </div>
  )
}

