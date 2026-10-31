"use client"

// ---------------------------------------------------------------------------
// Zenithsui Page Control Panel
//
// Matches the reference design with pixel-precision:
// - Header: "Page" with subtle divider
// - Paper: Shade (White / Subtle / Shaded swatch boxes), Dot grid toggle
// - Ink: Palette dropdown ("Hipster black", etc.), Font segmented (Aa / Aa / Aa)
//   with explanatory caption: "saved with this drawing — a new file starts from whatever you set last"
// - View: Context menu toggle
//   with explanatory caption: "quick controls float above the selection"
// - Bottom Actions: [Fit] and [Select all]
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import {
  PAPER_SHADES,
  THEMES,
  THEME_NAMES,
  bgOf,
  paletteOf,
  type FontMode,
  type ThemeName,
  type PaperShade,
} from "@/lib/theme"
import { Switch } from "@/components/ui/switch"
import {
  CaretDown,
  CornersOut,
  SelectionAll,
  Check,
  CircleHalf,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function PagePopover() {
  const isOpen = useShellStore((s) => s.pagePopoverOpen)
  const setIsOpen = useShellStore((s) => s.setPagePopoverOpen)

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

  const popoverRef = useRef<HTMLDivElement>(null)
  const palette = paletteOf(theme)
  const currentThemeLabel = THEMES[theme]?.label ?? "Hipster black"

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
      aria-label="Page Settings"
      className={cn(
        "fixed top-14 right-3 sm:right-6 z-50 w-[290px] max-w-[calc(100vw-1.5rem)]",
        "rounded-2xl border border-border/80 apple-glass-panel shadow-2xl",
        "text-popover-foreground font-sans",
        "animate-popover-enter select-none"
      )}
    >
      {/* ── Title Header ── */}
      <div className="px-4 pt-3.5 pb-3 border-b border-border/60">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Page
        </h2>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* ── Section: Paper ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-foreground">
            <span className="font-medium text-xs">Paper</span>
            <CaretDown size={12} className="text-muted-foreground" />
          </div>

          {/* Shade */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs shrink-0">
              Shade
            </span>
            <div className="flex items-center gap-2">
              {PAPER_SHADES.map(({ value, label }) => {
                const bg = bgOf(palette, value)
                const isSelected = paper === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaper(value)}
                    title={label}
                    aria-label={`Paper shade: ${label}`}
                    className={cn(
                      "tactile-press w-12 h-6.5 rounded-md transition-all border cursor-pointer hover:scale-105",
                      isSelected
                        ? "border-[var(--ui-accent,#007AFF)] shadow-xs scale-105 ring-1 ring-[var(--ui-accent,#007AFF)]/30"
                        : "border-border hover:border-muted-foreground"
                    )}
                    style={{ backgroundColor: bg }}
                  />
                )
              })}
            </div>
          </div>

          {/* Dot grid */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              Dot grid
            </span>
            <Switch
              checked={grid}
              onCheckedChange={setGrid}
              aria-label="Toggle dot grid"
            />
          </div>
        </div>

        {/* ── Section Divider ── */}
        <div className="h-px bg-border/60 -mx-4" />

        {/* ── Section: Ink ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-foreground">
            <span className="font-medium text-xs">Ink</span>
            <CaretDown size={12} className="text-muted-foreground" />
          </div>

          {/* Palette Dropdown */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs shrink-0">
              Palette
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg w-[164px]",
                  "border border-border/80 bg-muted/40",
                  "text-xs font-medium text-foreground hover:bg-muted/80 transition-colors outline-none cursor-pointer"
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="size-3 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: palette.ink }}
                  />
                  <span className="truncate">{currentThemeLabel}</span>
                </div>
                <CaretDown size={12} className="text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs font-sans">
                {THEME_NAMES.map((name) => {
                  const t = THEMES[name]
                  const isSelected = theme === name
                  return (
                    <DropdownMenuItem
                      key={name}
                      onClick={() => setTheme(name)}
                      className="flex items-center justify-between cursor-pointer py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                          style={{ backgroundColor: t.ink }}
                        />
                        <span>{t.label}</span>
                      </div>
                      {isSelected && <Check size={12} className="text-[var(--ui-accent,#007AFF)]" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Font Segmented Buttons */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs shrink-0">
              Font
            </span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "sans", fontClass: "font-sans", label: "Aa" },
                  { id: "hand", fontClass: "font-sketch", label: "Aa" },
                  { id: "serif", fontClass: "font-serif", label: "Aa" },
                ] as const
              ).map(({ id, fontClass, label }) => {
                const isSelected = font === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFont(id as FontMode)}
                    aria-label={`Canvas font: ${id}`}
                    className={cn(
                      "tactile-btn w-12 h-7 rounded-md text-xs flex items-center justify-center font-medium cursor-pointer",
                      fontClass,
                      isSelected
                        ? "bg-muted border border-border text-foreground shadow-2xs font-semibold scale-102"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal pt-0.5">
            saved with this drawing — a new file starts from whatever you set last
          </p>
        </div>

        {/* ── Section Divider ── */}
        <div className="h-px bg-border/60 -mx-4" />

        {/* ── Section: View ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-foreground">
            <span className="font-medium text-xs">View</span>
            <CaretDown size={12} className="text-muted-foreground" />
          </div>

          {/* Context menu */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground text-xs">
              Context menu
            </span>
            <Switch
              checked={contextRow}
              onCheckedChange={setContextRow}
              aria-label="Toggle floating context menu"
            />
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal pt-0.5">
            quick controls float above the selection
          </p>
        </div>

        {/* ── Section Divider ── */}
        <div className="h-px bg-border/60 -mx-4" />

        {/* ── Bottom Action Buttons ── */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              zoomToFit()
              setIsOpen(false)
            }}
            className="tactile-btn flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          >
            <CornersOut size={13} aria-hidden="true" />
            <span>Fit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              selectAll()
              setIsOpen(false)
            }}
            className="tactile-btn flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          >
            <SelectionAll size={13} aria-hidden="true" />
            <span>Select all</span>
          </button>
        </div>
      </div>
    </div>
  )
}
