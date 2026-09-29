"use client"

// ---------------------------------------------------------------------------
// Zenithsui Floating Page & Canvas Control Panel
//
// Matches the compact control language reference:
// - Compact floating contained panel
// - Simple section headers with subtle horizontal dividers
// - Minimalist switches and segmented controls
// - Small refined typography and monochrome/neutral structure
// - Canvas Document Style controls strictly separate from Application UI preferences:
//   * Page (Show Page boundary toggle)
//   * Paper (White / Subtle / Shaded)
//   * Dot Grid (ON / OFF)
//   * Ink (Palette & Pen Color swatches)
//   * Font (Sans / Hand / Serif canvas typography)
//   * View (Context menu toggle, Fit to Screen, Select All)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import {
  PAPER_SHADES,
  bgOf,
  paletteOf,
  type FontMode,
  type ThemeName,
} from "@/lib/theme"
import { PEN_COLORS, type PenColorOption } from "@/lib/design-tokens"
import { Switch } from "@/components/ui/switch"
import { X, Check, CornersOut, SelectionAll, Trash } from "@phosphor-icons/react"
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
  const zoomToFit = useSquig((s) => s.zoomToFit)
  const selectAll = useSquig((s) => s.selectAll)
  const clearCanvas = useSquig((s) => s.clearCanvas)

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

  // Find active pen color
  const activePenColor =
    PEN_COLORS.find((p) => p.themeMapping === theme) ?? PEN_COLORS[1]

  const handleSelectPenColor = (pen: PenColorOption) => {
    setTheme(pen.themeMapping as ThemeName)
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Page Settings"
      className={cn(
        "fixed bottom-18 left-1/2 -translate-x-1/2 z-50 w-[300px] max-w-[calc(100vw-2rem)]",
        "rounded-2xl border border-stone-200/90 dark:border-stone-800/90",
        "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl shadow-2xl shadow-stone-900/15 dark:shadow-black/60",
        "p-4 text-stone-800 dark:text-stone-100 font-sans",
        "animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
      )}
    >
      {/* ── Section: Header ── */}
      <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/70 dark:border-stone-800/70">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
            Page Settings
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Close (Esc)"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3 pt-3 text-xs">
        {/* ── Section: Page ── */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-stone-800 dark:text-stone-200 text-xs">
            Show Page
          </span>
          <Switch
            checked={showPage}
            onCheckedChange={setShowPage}
            aria-label="Toggle show page boundary"
          />
        </div>

        {/* ── Section: Paper Shade ── */}
        <div>
          <label className="block mb-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Paper
          </label>
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            {PAPER_SHADES.map(({ value, label }) => {
              const bg = bgOf(palette, value)
              const selected = paper === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaper(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    selected
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  )}
                >
                  <span
                    className="size-2.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                    style={{ backgroundColor: bg }}
                  />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Section: Dot Grid ── */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-stone-800 dark:text-stone-200 text-xs">
            Dot Grid
          </span>
          <Switch
            checked={grid}
            onCheckedChange={setGrid}
            aria-label="Toggle dot grid"
          />
        </div>

        <div className="h-px bg-stone-200/70 dark:border-stone-800/70" />

        {/* ── Section: Ink & Pen Color ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              Pen Color
            </label>
            <span className="text-[10px] font-mono text-stone-400 capitalize">
              {activePenColor.label}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 p-1 rounded-lg bg-stone-100/60 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60">
            {PEN_COLORS.map((pen) => {
              const isSelected = activePenColor.id === pen.id
              return (
                <button
                  key={pen.id}
                  type="button"
                  onClick={() => handleSelectPenColor(pen)}
                  title={pen.label}
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center transition-all relative",
                    isSelected
                      ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#1C1C1F] scale-105"
                      : "hover:scale-105 opacity-85 hover:opacity-100"
                  )}
                  style={{ backgroundColor: pen.color }}
                >
                  {isSelected && (
                    <Check
                      size={11}
                      weight="bold"
                      className={cn(
                        pen.color === "#2D2A26" || pen.color === "#2438FF" || pen.color === "#71268A" || pen.color === "#137A3D" || pen.color === "#E0342B"
                          ? "text-white"
                          : "text-black"
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Section: Canvas Font ── */}
        <div>
          <label className="block mb-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Font
          </label>
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
            {(
              [
                { id: "sans", label: "Sans" },
                { id: "hand", label: "Hand" },
                { id: "serif", label: "Serif" },
              ] as const
            ).map(({ id, label }) => {
              const selected = font === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFont(id as FontMode)}
                  className={cn(
                    "py-1 rounded-md text-[11px] font-medium transition-all text-center",
                    selected
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="h-px bg-stone-200/70 dark:border-stone-800/70" />

        {/* ── Section: View ── */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-stone-800 dark:text-stone-200 text-xs">
            Context Menu
          </span>
          <Switch
            checked={contextRow}
            onCheckedChange={setContextRow}
            aria-label="Toggle floating context actions"
          />
        </div>

        {/* Quick View Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              zoomToFit()
              setIsOpen(false)
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg border border-stone-200/80 dark:border-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <CornersOut size={12} />
            <span>Fit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              selectAll()
              setIsOpen(false)
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg border border-stone-200/80 dark:border-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <SelectionAll size={12} />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear all items from this canvas?")) {
                clearCanvas()
                setIsOpen(false)
              }
            }}
            title="Clear canvas"
            className="p-1 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
