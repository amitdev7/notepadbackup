"use client"

import { useEffect } from "react"
import { useSquig } from "@/lib/store"
import { Sparkle, Check, X, Brain } from "@phosphor-icons/react"

export function SmartSketchSuggestionOverlay() {
  const pending = useSquig((s) => s.pendingSuggestion)
  const applyPendingSuggestion = useSquig((s) => s.applyPendingSuggestion)
  const dismissPendingSuggestion = useSquig((s) => s.dismissPendingSuggestion)
  const setSlmLearningModalOpen = useSquig((s) => s.setSlmLearningModalOpen)
  const viewport = useSquig((s) => s.viewport)

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      dismissPendingSuggestion()
    }, 6000)
    return () => clearTimeout(timer)
  }, [pending, dismissPendingSuggestion])

  // Keyboard shortcut: Enter to convert, Escape to dismiss
  useEffect(() => {
    if (!pending) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "Enter") {
        e.preventDefault()
        applyPendingSuggestion()
      } else if (e.key === "Escape") {
        e.preventDefault()
        dismissPendingSuggestion()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pending, applyPendingSuggestion, dismissPendingSuggestion])

  if (!pending) return null

  const isLetterCandidate =
    pending.text === "A" || pending.text === "B" || pending.label?.includes("A") || pending.label?.includes("B")
  const targetLetter: "A" | "B" =
    pending.teachTarget || (pending.text === "B" || pending.label?.includes("B") ? "B" : "A")

  // Calculate screen position near the shape
  const screenX = pending.bounds.x * viewport.zoom + viewport.x + (pending.bounds.w * viewport.zoom) / 2
  const screenY = pending.bounds.y * viewport.zoom + viewport.y + pending.bounds.h * viewport.zoom + 14

  return (
    <div
      className="pointer-events-auto absolute z-30 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs shadow-md transition-all select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        backgroundColor: "var(--sq-panel, #ffffff)",
        borderColor: "var(--sq-border, #d1d5db)",
        color: "var(--sq-ink, #1f2937)",
      }}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <Sparkle size={14} weight="fill" className="text-amber-500" />
        <span>Convert to <strong className="font-semibold">{pending.label}</strong>?</span>
      </div>

      <div className="flex items-center gap-1 ml-1 border-l pl-2" style={{ borderColor: "var(--sq-border, #e5e7eb)" }}>
        <button
          type="button"
          onClick={applyPendingSuggestion}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
          style={{
            backgroundColor: "var(--sq-ink, #1f2937)",
            color: "var(--sq-bg, #ffffff)",
          }}
          title="Convert to recognized shape (Enter)"
        >
          <Check size={12} weight="bold" />
          <span>Convert</span>
        </button>
        {isLetterCandidate && (
          <button
            type="button"
            onClick={() => {
              dismissPendingSuggestion()
              setSlmLearningModalOpen(true, targetLetter)
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 opacity-80 hover:opacity-100"
            title={`Enter Learning Mode for Letter ${targetLetter}`}
          >
            <Brain size={12} weight="duotone" />
            <span>Teach</span>
          </button>
        )}
        <button
          type="button"
          onClick={dismissPendingSuggestion}
          className="p-1 rounded text-[11px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 opacity-60 hover:opacity-100"
          title="Keep rough sketch (Esc)"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  )
}
