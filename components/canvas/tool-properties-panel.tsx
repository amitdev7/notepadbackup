"use client"

// ---------------------------------------------------------------------------
// Zenithsui Tool Properties & Style Panel
//
// Floating floating sidebar matching universal sketch style panel:
// - Stroke color swatches + custom color picker
// - Background color swatches (with transparent checkered swatch) + custom picker
// - Fill style (hachure, cross-hatch, solid)
// - Stroke width (thin, medium, thick)
// - Pressure wave toggle
// - Edges / Roundness (sharp vs rounded)
// - Stroke style (solid, dashed)
// - Text options (font family, font size, alignment)
// - Opacity slider (0 - 100)
//
// Automatically appears when a tool (draw, shape, arrow, line, text, sticky, laser)
// is active, or when elements are selected.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { fitTextBox } from "@/lib/canvas/text-reflow"
import { formatDurationLabel } from "@/lib/canvas/expiration-manager"
import { cn } from "@/lib/utils"
import {
  SlidersHorizontal,
  CaretLeft,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextB,
  TextItalic,
  TextUnderline,
  Timer,
  Clock,
  Archive,
  Check,
} from "@phosphor-icons/react"
import type { StrokeWeight, TextNode } from "@/lib/types"

const STROKE_COLORS = [
  "#1e1e1e", // Charcoal / Black
  "#e03131", // Red
  "#2f9e44", // Green
  "#1971c2", // Blue
  "#f08c00", // Orange
  "#6741d9", // Purple
]

const BG_COLORS = [
  "transparent", // Checkered transparent
  "#ffc9c9", // Pastel red / pink
  "#b2f2bb", // Pastel green
  "#a5d8ff", // Pastel blue
  "#ffec99", // Pastel yellow
  "#74c0fc", // Pastel sky blue
]

export function ToolPropertiesPanel() {
  const tool = useSquig((s) => s.tool)
  const shapeKind = useSquig((s) => s.shapeKind)
  const selection = useSquig((s) => s.selection)
  const nodes = useSquig((s) => s.nodes)
  const uiHidden = useSquig((s) => s.uiHidden)
  const activeStyle = useSquig((s) => s.activeStyle)
  const setActiveStyle = useSquig((s) => s.setActiveStyle)
  const stylePanelOpen = useSquig((s) => s.stylePanelOpen)
  const setStylePanelOpen = useSquig((s) => s.setStylePanelOpen)

  const strokeColorInputRef = useRef<HTMLInputElement>(null)
  const bgColorInputRef = useRef<HTMLInputElement>(null)

  const temporarySettings = useShellStore((s) => s.preferences.temporarySettings)
  const toggleTemporaryMode = useShellStore((s) => s.toggleTemporaryMode)
  const setTemporaryDuration = useShellStore((s) => s.setTemporaryDuration)
  const updateTemporarySettings = useShellStore((s) => s.updateTemporarySettings)
  const setExpiredArchiveOpen = useShellStore((s) => s.setExpiredArchiveOpen)

  const [customDurationOpen, setCustomDurationOpen] = useState(false)
  const [customDays, setCustomDays] = useState(0)
  const [customHours, setCustomHours] = useState(0)
  const [customMins, setCustomMins] = useState(5)
  const [customSecs, setCustomSecs] = useState(0)

  // Determine what element types are selected or what tool is active
  const isSelectionActive = selection.length > 0
  const isDrawTool = tool === "draw"
  const isShapeTool = tool === "shape"
  const isArrowTool = tool === "arrow" || tool === "line"
  const isTextTool = tool === "text"
  const isStickyTool = tool === "sticky"
  const isLaserTool = tool === "laser"

  // Should the panel be visible at all?
  const isRelevantTool =
    isDrawTool ||
    isShapeTool ||
    isArrowTool ||
    isTextTool ||
    isStickyTool ||
    isLaserTool ||
    isSelectionActive

  if (uiHidden || !isRelevantTool) {
    return null
  }

  // Selected elements inspection
  const selectedNodes = selection.map((id) => nodes[id]).filter(Boolean)
  const hasShape = isShapeTool || selectedNodes.some((n) => n.type === "shape")
  const hasDraw = isDrawTool || selectedNodes.some((n) => n.type === "draw")
  const hasArrow = isArrowTool || selectedNodes.some((n) => n.type === "arrow")
  const hasText = isTextTool || selectedNodes.some((n) => n.type === "text")
  const hasSticky = isStickyTool || selectedNodes.some((n) => n.type === "sticky")

  // For pure freedraw pencil mode (matching universal sketch spec & screenshot):
  const isPureDraw =
    (isDrawTool && !isSelectionActive) ||
    (isSelectionActive && selectedNodes.length > 0 && selectedNodes.every((n) => n.type === "draw"))

  const showBackground = (hasShape || hasSticky) && !isPureDraw && !isLaserTool && !hasText && !hasArrow
  const showFill = hasShape && !isPureDraw && !isLaserTool && !hasText && !hasArrow
  const showStrokeWidth = !hasText && !hasSticky
  const showPressure = !isPureDraw && isDrawTool
  const showEdges = hasShape && !isPureDraw && !isLaserTool && !hasText && !hasArrow
  const showStrokeStyle = (hasShape || hasArrow) && !isPureDraw && !isLaserTool && !hasText
  const showTextOptions = hasText || hasSticky

  const headerTitle = isSelectionActive
    ? selectedNodes.length === 1
      ? `${selectedNodes[0].type.toUpperCase()} STYLES`
      : `${selectedNodes.length} SELECTED`
    : isDrawTool
      ? "DRAW"
      : isShapeTool
        ? `${shapeKind.toUpperCase()}`
        : isArrowTool
          ? tool === "line"
            ? "LINE"
            : "ARROW"
          : isTextTool
            ? "TEXT"
            : isStickyTool
              ? "STICKY"
              : isLaserTool
                ? "LASER"
                : "STYLES"

  if (!stylePanelOpen) {
    return (
      <button
        type="button"
        onClick={() => setStylePanelOpen(true)}
        className="fixed left-3 sm:left-4 top-16 sm:top-18 z-30 flex items-center gap-1.5 p-2 rounded-xl bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800 shadow-md text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800 transition-all cursor-pointer"
        title="Show Styles Panel"
        aria-label="Show Styles Panel"
      >
        <SlidersHorizontal size={16} weight="bold" />
        <span className="text-[11px] font-medium hidden sm:inline">Styles</span>
      </button>
    )
  }

  return (
    <div
      role="region"
      aria-label="Tool Properties"
      className={cn(
        "fixed left-3 sm:left-4 top-16 sm:top-18 z-30 flex flex-col w-[218px] max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar",
        "rounded-2xl border border-stone-200/90 dark:border-stone-800",
        "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-2xl shadow-xl shadow-stone-950/10 dark:shadow-black/60",
        "p-3.5 space-y-3.5 select-none text-stone-900 dark:text-stone-100 text-xs animate-panel-left gpu-accelerated font-sans"
      )}
    >
      {/* Header with Title & Collapse */}
      <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800/80">
        <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 tracking-wider uppercase">
          {headerTitle}
        </span>
        <button
          type="button"
          onClick={() => setStylePanelOpen(false)}
          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title="Collapse Panel"
          aria-label="Collapse Panel"
        >
          <CaretLeft size={14} weight="bold" />
        </button>
      </div>

      {/* ── 1. Stroke (Color) ──────────────────────────────────────────────── */}
      <div>
        <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
          <span>Stroke</span>
          <span className="text-[10px] font-mono text-stone-400 uppercase">
            {activeStyle.strokeColor}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {STROKE_COLORS.map((c) => {
            const isSelected = activeStyle.strokeColor.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveStyle({ strokeColor: c })}
                style={{ backgroundColor: c }}
                className={cn(
                  "size-7 rounded-xl border border-black/10 dark:border-white/10 transition-transform cursor-pointer shrink-0",
                  isSelected
                    ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1F] scale-105"
                    : "hover:scale-105"
                )}
                title={`Stroke ${c}`}
              />
            )
          })}
          {/* Custom stroke color picker */}
          <div className="relative">
            <input
              ref={strokeColorInputRef}
              type="color"
              value={activeStyle.strokeColor}
              onChange={(e) => setActiveStyle({ strokeColor: e.target.value })}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => strokeColorInputRef.current?.click()}
              className="size-7 rounded-xl border border-stone-300 dark:border-stone-700 bg-gradient-to-tr from-rose-400 via-amber-300 to-blue-500 hover:scale-105 transition-transform cursor-pointer shrink-0"
              title="Custom stroke color"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Background (Fill Color) ─────────────────────────────────────── */}
      {showBackground && (
        <div>
          <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
            <span>Background</span>
            <span className="text-[10px] font-mono text-stone-400">
              {activeStyle.backgroundColor === "transparent" ? "None" : activeStyle.backgroundColor}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {BG_COLORS.map((c) => {
              const isSelected = activeStyle.backgroundColor.toLowerCase() === c.toLowerCase()
              const isTransparent = c === "transparent"
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setActiveStyle({
                      backgroundColor: c,
                      fill: isTransparent ? "none" : activeStyle.fill === "none" ? "solid" : activeStyle.fill,
                    })
                  }
                  style={
                    isTransparent
                      ? {
                        backgroundImage:
                          "repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%)",
                        backgroundPosition: "0 0, 4px 4px",
                        backgroundSize: "8px 8px",
                      }
                      : { backgroundColor: c }
                  }
                  className={cn(
                    "size-7 rounded-xl border border-black/10 dark:border-white/10 transition-transform cursor-pointer shrink-0",
                    isSelected
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1F] scale-105"
                      : "hover:scale-105"
                  )}
                  title={`Background ${c}`}
                />
              )
            })}
            {/* Custom background color picker */}
            <div className="relative">
              <input
                ref={bgColorInputRef}
                type="color"
                value={activeStyle.backgroundColor === "transparent" ? "#ffffff" : activeStyle.backgroundColor}
                onChange={(e) => setActiveStyle({ backgroundColor: e.target.value, fill: "solid" })}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => bgColorInputRef.current?.click()}
                className="size-7 rounded-xl border border-stone-300 dark:border-stone-700 bg-gradient-to-tr from-emerald-300 via-teal-300 to-indigo-400 hover:scale-105 transition-transform cursor-pointer shrink-0"
                title="Custom background color"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Fill Style ──────────────────────────────────────────────────── */}
      {showFill && (
        <div>
          <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Fill
          </div>
          <div className="flex items-center gap-2">
            {[
              {
                id: "hachure" as const,
                label: "Hachure",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
                    <line x1="3" y1="15" x2="15" y2="3" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="3" y1="9" x2="9" y2="3" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="9" y1="15" x2="15" y2="9" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                id: "cross-hatch" as const,
                label: "Cross-hatch",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
                    <line x1="3" y1="15" x2="15" y2="3" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3" y1="3" x2="15" y2="15" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="9" y1="3" x2="15" y2="9" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3" y1="9" x2="9" y2="15" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                id: "solid" as const,
                label: "Solid",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" className="fill-current">
                    <rect x="3" y="3" width="12" height="12" rx="3" />
                  </svg>
                ),
              },
            ].map(({ id, label, icon }) => {
              const isSelected = activeStyle.fill === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveStyle({ fill: id })}
                  className={cn(
                    "flex-1 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50 shadow-2xs font-semibold"
                      : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80 hover:text-stone-900 dark:hover:text-white"
                  )}
                  title={label}
                  aria-label={label}
                >
                  {icon}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 4. Stroke Width ────────────────────────────────────────────────── */}
      {showStrokeWidth && (
        <div>
          <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Stroke width
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: "light" as StrokeWeight, label: "Thin", height: 2 },
              { id: "regular" as StrokeWeight, label: "Medium", height: 3.5 },
              { id: "heavy" as StrokeWeight, label: "Thick", height: 5.5 },
            ].map(({ id, label, height }) => {
              const isSelected = activeStyle.strokeWidth === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveStyle({ strokeWidth: id })}
                  className={cn(
                    "flex-1 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-blue-600/20 border-2 border-blue-500 text-white dark:bg-[#16274a] dark:border-blue-500 shadow-2xs font-semibold"
                      : "bg-stone-100/90 dark:bg-[#27272A] border border-transparent text-stone-400 dark:text-stone-300 hover:bg-stone-200/90 dark:hover:bg-[#323236]"
                  )}
                  title={label}
                  aria-label={label}
                >
                  <span
                    className={cn(
                      "block w-5 rounded-full transition-colors",
                      isSelected ? "bg-white" : "bg-stone-400 dark:bg-stone-300"
                    )}
                    style={{ height }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 5. Pressure / Sloppiness ───────────────────────────────────────── */}
      {showPressure && (
        <div>
          <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Pressure
          </div>
          <div className="flex items-center gap-2">
            {[
              {
                id: false,
                label: "Uniform wave",
                icon: (
                  <svg width="22" height="14" viewBox="0 0 22 14" fill="none" className="stroke-current">
                    <path
                      d="M2 7 C 6 2, 8 2, 11 7 C 14 12, 16 12, 20 7"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
              {
                id: true,
                label: "Pressure sensitive",
                icon: (
                  <svg width="22" height="14" viewBox="0 0 22 14" fill="none" className="stroke-current">
                    <path
                      d="M2 7 C 6 2, 8 2, 11 7 C 14 12, 16 12, 20 7"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
            ].map(({ id, label, icon }) => {
              const isSelected = activeStyle.pressure === id
              return (
                <button
                  key={String(id)}
                  type="button"
                  onClick={() => setActiveStyle({ pressure: id })}
                  className={cn(
                    "flex-1 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50 shadow-2xs font-semibold"
                      : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                  )}
                  title={label}
                  aria-label={label}
                >
                  {icon}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 6. Edges / Roundness (for Shapes) ──────────────────────────────── */}
      {showEdges && (
        <div>
          <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Edges
          </div>
          <div className="flex items-center gap-2">
            {[
              {
                id: false,
                label: "Sharp",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
                    <path d="M4 14 L 4 4 L 14 4" strokeWidth="2" strokeLinecap="square" />
                  </svg>
                ),
              },
              {
                id: true,
                label: "Rounded",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-current">
                    <path d="M4 14 L 4 8 A 4 4 0 0 1 8 4 L 14 4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map(({ id, label, icon }) => {
              const isSelected = activeStyle.roundness === id
              return (
                <button
                  key={String(id)}
                  type="button"
                  onClick={() => setActiveStyle({ roundness: id })}
                  className={cn(
                    "flex-1 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50 shadow-2xs font-semibold"
                      : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                  )}
                  title={label}
                  aria-label={label}
                >
                  {icon}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 7. Stroke Style (Solid vs Dashed) ──────────────────────────────── */}
      {showStrokeStyle && (
        <div>
          <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Stroke style
          </div>
          <div className="flex items-center gap-2">
            {[
              {
                id: "solid" as const,
                label: "Solid",
                icon: (
                  <svg width="24" height="6" viewBox="0 0 24 6" fill="none" className="stroke-current">
                    <line x1="2" y1="3" x2="22" y2="3" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                id: "dashed" as const,
                label: "Dashed",
                icon: (
                  <svg width="24" height="6" viewBox="0 0 24 6" fill="none" className="stroke-current">
                    <line x1="2" y1="3" x2="22" y2="3" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
                  </svg>
                ),
              },
            ].map(({ id, label, icon }) => {
              const isSelected = activeStyle.strokeStyle === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveStyle({ strokeStyle: id })}
                  className={cn(
                    "flex-1 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50 shadow-2xs font-semibold"
                      : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                  )}
                  title={label}
                  aria-label={label}
                >
                  {icon}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 8. Text Options (Font, Size, Align, Styles) ────────────────────── */}
      {showTextOptions && (
        <>
          <div>
            <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Font family
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "hand" as const, label: "Virgil", sample: "Handwritten" },
                { id: "code" as const, label: "Cascadia", sample: "Monospace" },
                { id: "sans" as const, label: "Inter", sample: "Sans-serif" },
                { id: "serif" as const, label: "Lora", sample: "Serif" },
              ].map(({ id, label, sample }) => {
                const isSelected = activeStyle.fontFamily === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveStyle({ fontFamily: id })
                      useShellStore.getState().updateTextSettings({ fontFamily: id === "code" ? "mono" : id })
                    }}
                    className={cn(
                      "px-2 py-1.5 rounded-xl text-left transition-all cursor-pointer border",
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-950 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold shadow-2xs"
                        : "bg-stone-100/80 dark:bg-stone-800/80 border-transparent text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                    )}
                  >
                    <div className="text-xs font-medium leading-none">{label}</div>
                    <div className="text-[9px] text-stone-400 mt-0.5">{sample}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">Font size</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={4}
                  max={200}
                  value={activeStyle.fontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val >= 4 && val <= 200) {
                      setActiveStyle({ fontSize: val })
                      useShellStore.getState().updateTextSettings({ fontSize: val })
                    }
                  }}
                  className="w-12 h-6 px-1 text-right text-xs font-mono font-semibold rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-blue-500"
                />
                <span className="text-[10px] text-stone-400 font-mono">px</span>
              </div>
            </div>

            {/* Quick Size Presets */}
            <div className="grid grid-cols-6 gap-1 mb-2">
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map((sz) => {
                const isSelected = activeStyle.fontSize === sz
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setActiveStyle({ fontSize: sz })
                      useShellStore.getState().updateTextSettings({ fontSize: sz })
                    }}
                    className={cn(
                      "h-6 rounded text-[11px] font-mono font-medium transition-all cursor-pointer",
                      isSelected
                        ? "bg-blue-600 text-white font-bold shadow-2xs"
                        : "bg-stone-100/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                    )}
                  >
                    {sz}
                  </button>
                )
              })}
            </div>

            {/* Continuous Font Size Slider */}
            <input
              type="range"
              min={8}
              max={72}
              value={activeStyle.fontSize}
              onChange={(e) => {
                const val = Number(e.target.value)
                setActiveStyle({ fontSize: val })
                useShellStore.getState().updateTextSettings({ fontSize: val })
              }}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-stone-200 dark:bg-stone-700 rounded-lg"
            />
          </div>

          <div>
            <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Typography & Alignment
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = !activeStyle.bold
                  setActiveStyle({ bold: next })
                  useShellStore.getState().updateTextSettings({ bold: next })
                }}
                className={cn(
                  "flex-1 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer font-bold",
                  activeStyle.bold
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50"
                    : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                )}
                title="Bold"
                aria-label="Bold"
              >
                <TextB size={15} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !activeStyle.italic
                  setActiveStyle({ italic: next })
                  useShellStore.getState().updateTextSettings({ italic: next })
                }}
                className={cn(
                  "flex-1 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer italic",
                  activeStyle.italic
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50"
                    : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                )}
                title="Italic"
                aria-label="Italic"
              >
                <TextItalic size={15} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !activeStyle.underline
                  setActiveStyle({ underline: next })
                  useShellStore.getState().updateTextSettings({ underline: next })
                }}
                className={cn(
                  "flex-1 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer underline",
                  activeStyle.underline
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50"
                    : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                )}
                title="Underline"
                aria-label="Underline"
              >
                <TextUnderline size={15} weight="bold" />
              </button>

              <div className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-0.5" />

              {[
                { id: "left" as const, icon: TextAlignLeft, label: "Left" },
                { id: "center" as const, icon: TextAlignCenter, label: "Center" },
                { id: "right" as const, icon: TextAlignRight, label: "Right" },
              ].map(({ id, icon: Icon, label }) => {
                const isSelected = activeStyle.textAlign === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveStyle({ textAlign: id })
                      useShellStore.getState().updateTextSettings({ align: id })
                    }}
                    className={cn(
                      "flex-1 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50"
                        : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                    )}
                    title={label}
                    aria-label={label}
                  >
                    <Icon size={14} weight="bold" />
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── 9. Opacity ─────────────────────────────────────────────────────── */}
      <div className="pt-1 border-t border-stone-100 dark:border-stone-800/80">
        <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-2 flex items-center justify-between">
          <span>Opacity</span>
          <span className="font-mono text-xs text-stone-900 dark:text-stone-100 font-semibold">
            {activeStyle.opacity}%
          </span>
        </div>
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="100"
            value={activeStyle.opacity}
            onChange={(e) => setActiveStyle({ opacity: Number(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-stone-200 dark:bg-stone-700 rounded-lg"
          />
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* ── 10. Temporary Creation Mode ────────────────────────────────────────── */}
      <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Timer
              size={14}
              weight={temporarySettings?.temporaryMode ? "bold" : "regular"}
              className={temporarySettings?.temporaryMode ? "text-amber-500 animate-pulse" : "text-stone-400"}
            />
            <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
              Temporary Mode
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTemporaryMode}
            className={cn(
              "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              temporarySettings?.temporaryMode ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
            )}
            title="Toggle Temporary Mode for new elements"
            aria-label="Toggle Temporary Mode"
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                temporarySettings?.temporaryMode ? "translate-x-3" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {temporarySettings?.temporaryMode && (
          <div className="mt-2 space-y-2 animate-fade-in">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>Expires after creation:</span>
              <span className="font-mono font-bold">
                {formatDurationLabel(temporarySettings.defaultDurationMs || 300000)}
              </span>
            </div>

            {/* Quick Duration Preset Pills */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: "10s", ms: 10 * 1000 },
                { label: "1m", ms: 60 * 1000 },
                { label: "5m", ms: 5 * 60 * 1000 },
                { label: "30m", ms: 30 * 60 * 1000 },
                { label: "1h", ms: 60 * 60 * 1000 },
                { label: "24h", ms: 24 * 3600 * 1000 },
                { label: "7d", ms: 7 * 86400 * 1000 },
                { label: "Custom", ms: -1 },
              ].map(({ label, ms }) => {
                const isSelected = ms === -1 ? customDurationOpen : temporarySettings.defaultDurationMs === ms
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (ms === -1) {
                        setCustomDurationOpen(!customDurationOpen)
                      } else {
                        setTemporaryDuration(ms)
                        setCustomDurationOpen(false)
                      }
                    }}
                    className={cn(
                      "py-1 px-1 rounded-md text-[10px] font-mono font-medium transition-all text-center cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-white shadow-2xs font-bold"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Custom Duration Sub-panel */}
            {customDurationOpen && (
              <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 text-[10px] space-y-1.5 animate-popover-enter">
                <span className="font-semibold text-stone-700 dark:text-stone-300 block">Set Custom Lifetime:</span>
                <div className="grid grid-cols-4 gap-1 text-center font-mono">
                  <div>
                    <label className="text-[9px] text-stone-400">Days</label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={customDays}
                      onChange={(e) => setCustomDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-stone-400">Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={customHours}
                      onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-stone-400">Mins</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={customMins}
                      onChange={(e) => setCustomMins(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-stone-400">Secs</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={customSecs}
                      onChange={(e) => setCustomSecs(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const totalMs =
                      customDays * 86400000 +
                      customHours * 3600000 +
                      customMins * 60000 +
                      customSecs * 1000
                    if (totalMs > 0) {
                      setTemporaryDuration(totalMs)
                      setCustomDurationOpen(false)
                    }
                  }}
                  className="w-full py-1 rounded bg-amber-500 text-white font-medium text-[10px] hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  Apply Lifetime
                </button>
              </div>
            )}

            {/* Countdown Badge Toggle & Archive Button */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-stone-600 dark:text-stone-400">
                <input
                  type="checkbox"
                  checked={temporarySettings.showCountdown}
                  onChange={(e) => updateTemporarySettings({ showCountdown: e.target.checked })}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Show Countdown</span>
              </label>

              <button
                type="button"
                onClick={() => setExpiredArchiveOpen(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
              >
                <Archive size={12} />
                <span>Archive</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
