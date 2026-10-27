"use client"

// ---------------------------------------------------------------------------
// Zenithsui Quick Note Dialog — Clouds-Themed Inline Annotation Editor
//
// Allows users to easily add, edit, or delete Smart Hover Notes on ANY canvas
// object (Arrows, Doodles, Shapes, Frames, Components, Text, Images, etc.).
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { SquigNode, HoverNote } from "@/lib/types"
import { Cloud, X, Trash, Check, Sparkle, Tag } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface QuickNoteDialogProps {
  node: SquigNode | null
  isOpen: boolean
  onClose: () => void
  onSave: (nodeId: string, note: HoverNote) => void
  onDeleteNote?: (nodeId: string) => void
}

const NOTE_TEMPLATES = [
  { label: "Explanation", text: "Explains: " },
  { label: "Connection", text: "Connects to: " },
  { label: "Key Rule", text: "Important rule: " },
  { label: "Next Step", text: "Next action: " },
]

const THEME_OPTIONS = [
  { id: "clouds", label: "Clouds ☁️" },
  { id: "macos", label: "macOS 🍏" },
  { id: "ios", label: "iOS Glass 📱" },
  { id: "minimalist", label: "Clean 📄" },
]

export function QuickNoteDialog({
  node,
  isOpen,
  onClose,
  onSave,
  onDeleteNote,
}: QuickNoteDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [theme, setTheme] = useState("clouds")
  const bodyInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen || !node) return
    const existing = node.hoverNote
    setTitle(existing?.title || "")
    setBody(existing?.body || "")
    setTheme(existing?.theme || "clouds")

    const t = setTimeout(() => {
      bodyInputRef.current?.focus()
    }, 60)
    return () => clearTimeout(t)
  }, [isOpen, node])

  if (!mounted || !isOpen || !node || typeof document === "undefined") return null

  const hasExistingNote = Boolean(
    node.hoverNote &&
    ((node.hoverNote.body && node.hoverNote.body.trim().length > 0) ||
      (node.hoverNote.title && node.hoverNote.title.trim().length > 0))
  )

  const handleSave = () => {
    if (!node) return
    const trimmedBody = body.trim()
    const trimmedTitle = title.trim()

    if (!trimmedBody && !trimmedTitle) {
      // Empty note behaves as remove
      onDeleteNote?.(node.id)
      onClose()
      return
    }

    const updatedNote: HoverNote = {
      title: trimmedTitle || undefined,
      body: trimmedBody,
      enabled: true,
      theme,
      createdAt: node.hoverNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onSave(node.id, updatedNote)
    onClose()
  }

  const handleDelete = () => {
    if (!node) return
    onDeleteNote?.(node.id)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      onClose()
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      handleSave()
    }
  }

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-note-dialog-title"
        className={cn(
          "w-full max-w-md rounded-3xl border border-sky-300/50 dark:border-sky-500/30 overflow-hidden font-sans",
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-[var(--sq-ink)] shadow-2xl animate-popover-enter"
        )}
        style={{
          boxShadow:
            "0 24px 50px -10px rgba(56, 189, 248, 0.35), 0 10px 25px -5px rgba(15, 23, 42, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top celestial cloud gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 opacity-90" />

        <div className="p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-2xl bg-sky-500/15 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 border border-sky-400/25 shadow-xs shrink-0 flex items-center justify-center">
                <Cloud size={18} weight="fill" />
              </span>
              <div>
                <h3 id="quick-note-dialog-title" className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {hasExistingNote ? "Edit Hover Note" : "Add Hover Note"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Appears beautifully when hovering over this {node.type}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title input (optional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Title <span className="opacity-50 lowercase font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Factorisation Step, Architecture Note..."
              className="w-full px-3 py-1.5 rounded-xl border border-sky-200/70 dark:border-sky-800/70 bg-white dark:bg-slate-800/90 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all shadow-2xs"
            />
          </div>

          {/* Description / Body textarea */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Note Text <span className="text-sky-500">*</span>
            </label>
            <textarea
              ref={bodyInputRef}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the note shown when someone hovers over this element..."
              className="w-full px-3 py-2 rounded-xl border border-sky-200/70 dark:border-sky-800/70 bg-white dark:bg-slate-800/90 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all resize-none shadow-2xs leading-relaxed"
            />
          </div>

          {/* Visual Theme Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Hover Card Aesthetic
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border select-none",
                    theme === t.id
                      ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-sky-400/40 shadow-xs scale-102"
                      : "bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-transparent"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick template starters */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mr-0.5">Quick add:</span>
            {NOTE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => {
                  setBody((prev) => (prev ? `${prev}\n${tmpl.text}` : tmpl.text))
                  bodyInputRef.current?.focus()
                }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50 transition-colors cursor-pointer"
              >
                + {tmpl.label}
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              {hasExistingNote && onDeleteNote && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Remove hover note"
                >
                  <Trash size={14} />
                  <span>Delete Note</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!body.trim() && !title.trim()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-md shadow-sky-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Cloud size={14} weight="fill" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
