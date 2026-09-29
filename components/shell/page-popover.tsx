"use client"

// ---------------------------------------------------------------------------
// Zenithsui Floating Page & Canvas Popover
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import {
  PAPER_SHADES,
  THEME_NAMES,
  bgOf,
  paletteOf,
  type FontMode,
} from "@/lib/theme"
import { Switch } from "@/components/ui/switch"
import { X, Trash, ArrowCounterClockwise } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function PagePopover() {
  const isOpen = useShellStore((s) => s.pagePopoverOpen)
  const setIsOpen = useShellStore((s) => s.setPagePopoverOpen)

  const showPage = useSquig((s) => s.showPage)
  const setShowPage = useSquig((s) => s.setShowPage)
  const paper = useSquig((s) => s.paper)
  const setPaper = useSquig((s) => s.setPaper)
  const grid = useSquig((s) => s.grid)
  const setGrid = useSquig((s) => s.setGrid)
  const theme = useSquig((s) => s.theme)
  const setTheme = useSquig((s) => s.setTheme)
  const font = useSquig((s) => s.font)
  const setFont = useSquig((s) => s.setFont)
  const contextRow = useSquig((s) => s.contextRow)
  const setContextRow = useSquig((s) => s.setContextRow)
  const clearCanvas = useSquig((s) => s.clearCanvas)
  const setViewport = useSquig((s) => s.setViewport)

  const popoverRef = useRef<HTMLDivElement>(null)
  const palette = paletteOf(theme)

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (!target.closest("[data-dock-page-btn]")) {
          setIsOpen(false)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Page and Canvas Settings"
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[340px] max-w-[calc(100vw-2rem)]",
        "rounded-2xl border border-stone-200/80 dark:border-stone-800/80",
        "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl shadow-2xl shadow-stone-900/10 dark:shadow-black/50",
        "p-4 text-stone-800 dark:text-stone-100 font-sans",
        "animate-in fade-in zoom-in-95 duration-150 ease-out"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 dark:border-stone-800/70">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-50">Page & Canvas</h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">Surface appearance and presentation</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Close (Esc)"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-3.5 pt-3 text-xs">
        {/* Show Page Boundary Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-stone-900 dark:text-stone-100">Show Page</span>
            <p className="text-[10px] text-stone-500 dark:text-stone-400">Display visual page boundary on canvas</p>
          </div>
          <Switch
            checked={showPage}
            onCheckedChange={setShowPage}
            aria-label="Toggle show page"
          />
        </div>

        {/* Paper Shade */}
        <div>
          <label className="block mb-1.5 font-medium text-stone-700 dark:text-stone-300 text-[11px]">
            Paper Shade
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            {PAPER_SHADES.map(({ value, label }) => {
              const bg = bgOf(palette, value)
              const selected = paper === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaper(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                    selected
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  )}
                >
                  <span
                    className="size-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                    style={{ backgroundColor: bg }}
                  />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dot Grid */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-stone-900 dark:text-stone-100">Dot Grid</span>
            <p className="text-[10px] text-stone-500 dark:text-stone-400">Background spatial guide</p>
          </div>
          <Switch
            checked={grid}
            onCheckedChange={setGrid}
            aria-label="Toggle dot grid"
          />
        </div>

        {/* Ink Palette */}
        <div>
          <label className="block mb-1.5 font-medium text-stone-700 dark:text-stone-300 text-[11px]">
            Ink Palette
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {THEME_NAMES.map((t) => {
              const p = paletteOf(t)
              const selected = theme === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  title={t}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all text-center",
                    selected
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-xs"
                      : "border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700"
                  )}
                >
                  <div className="flex items-center gap-0.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: p.ink }} />
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: p.muted }} />
                  </div>
                  <span className="text-[10px] capitalize leading-none truncate w-full">{t}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Canvas Font */}
        <div>
          <label className="block mb-1.5 font-medium text-stone-700 dark:text-stone-300 text-[11px]">
            Canvas Font
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            {(
              [
                { id: "sans", label: "Sans", fontClass: "font-sans" },
                { id: "hand", label: "Hand", fontClass: "font-serif" },
                { id: "serif", label: "Serif", fontClass: "font-serif" },
              ] as const
            ).map(({ id, label, fontClass }) => {
              const selected = font === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFont(id as FontMode)}
                  className={cn(
                    "py-1.5 rounded-lg text-[11px] font-medium transition-all text-center",
                    fontClass,
                    selected
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Floating Context Row on Selection */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="font-medium text-stone-900 dark:text-stone-100">Context Toolbar</span>
            <p className="text-[10px] text-stone-500 dark:text-stone-400">Show floating actions near selected item</p>
          </div>
          <Switch
            checked={contextRow}
            onCheckedChange={setContextRow}
            aria-label="Toggle context toolbar"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-800/70">
          <button
            type="button"
            onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ArrowCounterClockwise size={12} />
            <span>Reset View</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear all items from this canvas?")) {
                clearCanvas()
                setIsOpen(false)
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  )
}
