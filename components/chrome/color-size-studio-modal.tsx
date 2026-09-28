"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import {
  SquareIcon,
  CircleIcon,
  LineSegmentIcon,
  ArrowUpRightIcon,
  PencilSimpleIcon,
  TextTIcon,
  XIcon,
  ArrowCounterClockwiseIcon,
  CheckIcon,
  SparkleIcon,
  SlidersHorizontalIcon,
  PaletteIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextBolderIcon,
  TextItalicIcon,
} from "@phosphor-icons/react"
import rough from "roughjs"
import { useSquig } from "@/lib/store"
import { DEFAULT_ELEMENT_DEFAULTS } from "@/lib/element-defaults"
import { cn } from "@/lib/utils"
import {
  type ElementTypeKey,
  STUDIO_PRESETS,
} from "@/lib/element-defaults"
import { PENCIL_GRADES, ORDERED_PENCIL_GRADES, PENCIL_GUIDE_TEXT, type PencilGrade } from "@/lib/pencil-grades"
import { PALETTE_48 } from "@/lib/colors"

const PALETTE_COLORS = [
  { name: "Default Ink", value: "" },
  { name: "Charcoal", value: "#1c1917" },
  { name: "Slate", value: "#475569" },
  { name: "Graphite", value: "#71717a" },
  { name: "Crimson", value: "#dc2626" },
  { name: "Coral", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Sunflower", value: "#eab308" },
  { name: "Emerald", value: "#059669" },
  { name: "Forest", value: "#065f46" },
  { name: "Teal", value: "#0d9488" },
  { name: "Cyan", value: "#0284c7" },
  { name: "Navy", value: "#1e3a8a" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#9333ea" },
  { name: "Fuchsia", value: "#c026d3" },
  { name: "Rose", value: "#e11d48" },
  { name: "Warm Earth", value: "#78350f" },
]

const FILL_TONE_COLORS = [
  { name: "None", value: "" },
  { name: "Paper Tint", value: "#fbf9f4" },
  { name: "Light Gray", value: "#f4f4f5" },
  { name: "Soft Amber", value: "#fef3c7" },
  { name: "Soft Yellow", value: "#fef08a" },
  { name: "Soft Rose", value: "#ffe4e6" },
  { name: "Soft Orange", value: "#ffedd5" },
  { name: "Soft Green", value: "#d1fae5" },
  { name: "Soft Cyan", value: "#e0f2fe" },
  { name: "Soft Lavender", value: "#f3e8ff" },
  { name: "Solid Slate", value: "#e2e8f0" },
  { name: "Solid Dark", value: "#27272a" },
]

const STROKE_WIDTH_PRESETS = [1.0, 1.4, 2.0, 3.5, 6.0, 10.0]
const FONT_SIZE_PRESETS = [14, 16, 18, 22, 28, 36, 48]

export function ColorSizeStudioModal() {
  const open = useSquig((s) => s.colorSizeStudioOpen)
  const setOpen = useSquig((s) => s.setColorSizeStudioOpen)
  const activeTab = useSquig((s) => s.activeStudioTab)
  const setActiveTab = useSquig((s) => s.setActiveStudioTab)
  const elementDefaults = useSquig((s) => s.elementDefaults)
  const setElementDefault = useSquig((s) => s.setElementDefault)
  const resetElementDefaults = useSquig((s) => s.resetElementDefaults)
  const applyStudioPreset = useSquig((s) => s.applyStudioPreset)
  const applyDefaultsToSelection = useSquig((s) => s.applyDefaultsToSelection)
  const selectionCount = useSquig((s) => s.selection.length)

  const [customHex, setCustomHex] = useState("")
  const [customFillHex, setCustomFillHex] = useState("")
  const canvasRef = useRef<SVGSVGElement>(null)

  const currentTab = (activeTab as keyof typeof DEFAULT_ELEMENT_DEFAULTS) || "rectangle"
  const currentConfig =
    (elementDefaults as any)[currentTab] ?? (DEFAULT_ELEMENT_DEFAULTS as any)[currentTab] ?? {}

  // Render Rough.js sketch preview
  useEffect(() => {
    if (!open || !canvasRef.current) return
    const svg = canvasRef.current
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild)
    }

    const rc = rough.svg(svg)
    const stroke = (currentConfig as any).color || "var(--sq-ink, #1c1917)"
    const strokeWidth = (currentConfig as any).strokeWidth || 1.6
    const dashed = (currentConfig as any).dashed || false
    const opacity = (currentConfig as any).opacity ?? 1
    const roughOpts: any = {
      stroke,
      strokeWidth,
      roughness: 1.2,
      bowing: 1.5,
      strokeLineDash: dashed ? [strokeWidth * 3, strokeWidth * 2] : undefined,
    }

    if (currentTab === "rectangle") {
      const cfg = elementDefaults.rectangle
      const fill = cfg.fillColor || (cfg.fill !== "none" ? (cfg.fill === "paper" ? "var(--sq-paper, #fbf9f4)" : stroke) : undefined)
      if (fill) {
        roughOpts.fill = fill
        roughOpts.fillStyle = "solid"
      }
      const node = rc.rectangle(25, 20, 150, 80, roughOpts)
      node.setAttribute("opacity", String(opacity))
      svg.appendChild(node)
    } else if (currentTab === "ellipse") {
      const cfg = elementDefaults.ellipse
      const fill = cfg.fillColor || (cfg.fill !== "none" ? (cfg.fill === "paper" ? "var(--sq-paper, #fbf9f4)" : stroke) : undefined)
      if (fill) {
        roughOpts.fill = fill
        roughOpts.fillStyle = "solid"
      }
      const node = rc.ellipse(100, 60, 140, 75, roughOpts)
      node.setAttribute("opacity", String(opacity))
      svg.appendChild(node)
    } else if (currentTab === "line") {
      const node = rc.line(30, 85, 170, 35, roughOpts)
      node.setAttribute("opacity", String(opacity))
      svg.appendChild(node)
    } else if (currentTab === "arrow") {
      // Draw arrow line and rough arrowhead
      const node = rc.line(30, 85, 150, 40, roughOpts)
      node.setAttribute("opacity", String(opacity))
      svg.appendChild(node)

      // Arrowhead points
      const head = rc.linearPath(
        [
          [130, 35],
          [165, 36],
          [152, 60],
        ],
        { ...roughOpts, strokeWidth: Math.max(1.4, strokeWidth * 0.9) }
      )
      head.setAttribute("opacity", String(opacity))
      svg.appendChild(head)
    } else if (currentTab === "draw") {
      const d = elementDefaults.draw
      const strokeW = d.strokeWidth || 2.0
      const strokeColor = d.color || "var(--sq-ink, #1c1917)"
      const path1 = rc.curve(
        [
          [30, 40],
          [70, 30],
          [110, 70],
          [150, 45],
          [170, 80],
        ],
        {
          stroke: strokeColor,
          strokeWidth: strokeW,
          roughness: 1.6,
          bowing: 1.8,
        }
      )
      path1.setAttribute("opacity", String(d.opacity ?? 1))
      svg.appendChild(path1)

      const path2 = rc.curve(
        [
          [40, 80],
          [80, 75],
          [120, 85],
          [160, 78],
        ],
        {
          stroke: strokeColor,
          strokeWidth: Math.max(1, strokeW * 0.75),
          roughness: 1.4,
        }
      )
      path2.setAttribute("opacity", String(Math.max(0.2, (d.opacity ?? 1) * 0.85)))
      svg.appendChild(path2)
    }
  }, [open, currentTab, currentConfig, elementDefaults])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onPointerDown={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-xs" />

      <div
        className="animate-in fade-in zoom-in-95 relative flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-[var(--sq-ink)] text-[var(--sq-paper)]">
              <PaletteIcon className="size-4" weight="bold" />
            </div>
            <div>
              <h2 className="text-title font-medium">Color & Size Studio</h2>
              <p className="text-micro text-muted-foreground hidden sm:block">
                Choose custom stroke color, fill tone, and size separately for every element
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <XIcon className="size-4" weight="bold" />
          </button>
        </div>

        {/* Global Presets */}
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/30 px-4 sm:px-6 py-2 overflow-x-auto no-scrollbar">
          <span className="text-micro font-medium text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <SparkleIcon className="size-3 text-amber-500" weight="fill" /> Palettes:
          </span>
          {STUDIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyStudioPreset(preset)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chrome-full text-micro font-medium border border-border/70 bg-background hover:bg-accent transition-colors shrink-0"
              title={preset.description}
            >
              <span
                className="size-2 rounded-full border border-black/10"
                style={{ backgroundColor: preset.badgeColor }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>

        {/* Element Type Tabs */}
        <div className="flex border-b border-border/70 px-4 sm:px-6 overflow-x-auto no-scrollbar bg-background">
          {(
            [
              { key: "rectangle", label: "Rectangle", icon: SquareIcon },
              { key: "ellipse", label: "Ellipse", icon: CircleIcon },
              { key: "line", label: "Line", icon: LineSegmentIcon },
              { key: "arrow", label: "Arrow", icon: ArrowUpRightIcon },
              { key: "draw", label: "Pencil / Draw", icon: PencilSimpleIcon },
              { key: "text", label: "Text", icon: TextTIcon },
            ] as const
          ).map((t) => {
            const Icon = t.icon
            const active = currentTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex items-center gap-2 py-3 px-3.5 text-label font-medium border-b-2 -mb-[1px] transition-colors whitespace-nowrap",
                  active
                    ? "border-[var(--sq-ink)] text-[var(--sq-ink)] font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="size-4" weight={active ? "fill" : "regular"} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content & Live Napkin Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Live Preview Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-chrome-md border border-border/70 bg-muted/20">
            <div className="flex-1 w-full flex items-center justify-center min-h-[110px]">
              {currentTab === "text" ? (
                <div
                  className="flex items-center justify-center p-4 max-w-full overflow-hidden"
                  style={{
                    color: elementDefaults.text.color || "var(--sq-ink, #1c1917)",
                    fontSize: `${elementDefaults.text.fontSize}px`,
                    fontFamily: "var(--sq-font)",
                    fontWeight: elementDefaults.text.bold ? 700 : 400,
                    fontStyle: elementDefaults.text.italic ? "italic" : "normal",
                    opacity: elementDefaults.text.opacity,
                    textAlign: elementDefaults.text.align,
                  }}
                >
                  Napkin Sketch Typography
                </div>
              ) : (
                <svg ref={canvasRef} className="w-[200px] h-[100px] overflow-visible" />
              )}
            </div>

            <div className="shrink-0 flex flex-col items-center sm:items-end text-micro text-muted-foreground gap-1 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-4">
              <span className="font-semibold text-foreground capitalize">{currentTab} Preview</span>
              <span>
                Stroke:{" "}
                <strong className="text-foreground">
                  {(currentConfig as any).color ? (currentConfig as any).color : "Theme Ink"}
                </strong>
              </span>
              {"strokeWidth" in currentConfig && (
                <span>
                  Thickness:{" "}
                  <strong className="text-foreground">
                    {(currentConfig as any).strokeWidth?.toFixed(1)}px
                  </strong>
                </span>
              )}
              {currentTab === "draw" && (
                <span>
                  Hardness:{" "}
                  <strong className="text-foreground">{elementDefaults.draw.pencilGrade}</strong>
                </span>
              )}
              {currentTab === "text" && (
                <span>
                  Font Size:{" "}
                  <strong className="text-foreground">{elementDefaults.text.fontSize}px</strong>
                </span>
              )}
            </div>
          </div>

          {/* Color Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-label font-medium text-foreground flex items-center gap-1.5">
                <PaletteIcon className="size-4 text-muted-foreground" />
                <span>Stroke / Text Color</span>
              </label>
              {(currentConfig as any).color && (
                <button
                  type="button"
                  onClick={() => setElementDefault(currentTab, { color: "" } as any)}
                  className="text-micro text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Reset to theme ink
                </button>
              )}
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 p-2 rounded-chrome-md border border-border/60 bg-muted/20">
              {/* Default theme ink */}
              <button
                type="button"
                onClick={() => setElementDefault(currentTab, { color: "" } as any)}
                className={cn(
                  "group relative flex items-center justify-center size-7 rounded-full border transition-all",
                  (currentConfig as any).color === ""
                    ? "border-[var(--sq-ink)] ring-2 ring-[var(--sq-ink)]/20 shadow-xs scale-110"
                    : "border-border/70 hover:scale-105"
                )}
                title="Default Theme Ink"
              >
                <span
                  className="size-5 rounded-full border border-black/10 flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: "var(--sq-ink, #ea580c)" }}
                >
                  {(currentConfig as any).color === "" && (
                    <CheckIcon className="size-3 text-white drop-shadow-xs" weight="bold" />
                  )}
                </span>
              </button>

              {PALETTE_48.map((c) => {
                const isSelected = (currentConfig as any).color === c.hex
                return (
                  <button
                    key={c.hex + c.name}
                    type="button"
                    onClick={() => {
                      setElementDefault(currentTab, { color: c.hex } as any)
                    }}
                    className={cn(
                      "group relative flex items-center justify-center size-7 rounded-full border transition-all",
                      isSelected
                        ? "border-[var(--sq-ink)] ring-2 ring-[var(--sq-ink)]/20 shadow-xs scale-110"
                        : "border-border/70 hover:scale-105"
                    )}
                    title={`${c.name} (${c.hex})`}
                  >
                    <span
                      className="size-5 rounded-full border border-black/10 flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <CheckIcon
                          className={cn(
                            "size-3 drop-shadow-xs",
                            c.hex === "#ffffff" || c.hex === "#f1f5f9" || c.hex === "#fef08a"
                              ? "text-black"
                              : "text-white"
                          )}
                          weight="bold"
                        />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Custom Hex Color Picker */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-micro text-muted-foreground">Custom Color:</span>
              <input
                type="color"
                value={(currentConfig as any).color || "#1c1917"}
                onChange={(e) => {
                  setCustomHex(e.target.value)
                  setElementDefault(currentTab, { color: e.target.value } as any)
                }}
                className="size-7 rounded-chrome-xs border border-border/80 cursor-pointer p-0.5 bg-background"
              />
              <input
                type="text"
                placeholder="#000000"
                value={customHex || (currentConfig as any).color || ""}
                onChange={(e) => {
                  setCustomHex(e.target.value)
                  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(e.target.value)) {
                    setElementDefault(currentTab, { color: e.target.value } as any)
                  }
                }}
                className="w-24 h-7 text-micro px-2 rounded-chrome-xs border border-border/80 font-mono bg-background focus:outline-none focus:ring-1 focus:ring-[var(--sq-ink)]"
              />
            </div>
          </div>

          {/* Fill Section (For Rectangle & Ellipse) */}
          {(currentTab === "rectangle" || currentTab === "ellipse") && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-label font-medium text-foreground">Fill Shade / Tint Color</label>
                {(elementDefaults[currentTab].fillColor || elementDefaults[currentTab].fill !== "none") && (
                  <button
                    type="button"
                    onClick={() =>
                      setElementDefault(currentTab, { fill: "none", fillColor: "" } as any)
                    }
                    className="text-micro text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Clear fill (transparent)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {FILL_TONE_COLORS.map((f) => {
                  const isSelected =
                    (f.value === "" && !elementDefaults[currentTab].fillColor && elementDefaults[currentTab].fill === "none") ||
                    elementDefaults[currentTab].fillColor === f.value

                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => {
                        if (f.value === "") {
                          setElementDefault(currentTab, { fill: "none", fillColor: "" } as any)
                        } else {
                          setElementDefault(currentTab, { fill: "none", fillColor: f.value } as any)
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded-chrome-sm border transition-all text-left",
                        isSelected
                          ? "border-[var(--sq-ink)] ring-2 ring-[var(--sq-ink)]/20 shadow-xs"
                          : "border-border/70 hover:border-foreground/40 bg-background"
                      )}
                    >
                      <span
                        className="size-4 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: f.value || "transparent" }}
                      />
                      <span className="text-micro text-foreground truncate">{f.name}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-micro text-muted-foreground">Custom Fill Tint:</span>
                <input
                  type="color"
                  value={elementDefaults[currentTab].fillColor || "#fef3c7"}
                  onChange={(e) => {
                    setCustomFillHex(e.target.value)
                    setElementDefault(currentTab, { fill: "none", fillColor: e.target.value } as any)
                  }}
                  className="size-7 rounded-chrome-xs border border-border/80 cursor-pointer p-0.5 bg-background"
                />
                <input
                  type="text"
                  placeholder="#ffffff"
                  value={customFillHex || elementDefaults[currentTab].fillColor || ""}
                  onChange={(e) => {
                    setCustomFillHex(e.target.value)
                    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(e.target.value)) {
                      setElementDefault(currentTab, { fill: "none", fillColor: e.target.value } as any)
                    }
                  }}
                  className="w-24 h-7 text-micro px-2 rounded-chrome-xs border border-border/80 font-mono bg-background focus:outline-none focus:ring-1 focus:ring-[var(--sq-ink)]"
                />
              </div>
            </div>
          )}

          {/* Size & Thickness Section (For Shapes, Lines, Arrows, Draw) */}
          {currentTab !== "text" && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-label font-medium text-foreground flex items-center gap-1.5">
                  <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
                  <span>Stroke Thickness / Size</span>
                </label>
                <span className="text-label font-mono font-medium text-foreground">
                  {((currentConfig as any).strokeWidth || 1.6).toFixed(1)}px
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="16"
                  step="0.1"
                  value={(currentConfig as any).strokeWidth || 1.6}
                  onChange={(e) =>
                    setElementDefault(currentTab, {
                      strokeWidth: parseFloat(e.target.value),
                    } as any)
                  }
                  className="flex-1 accent-[var(--sq-ink)] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-micro text-muted-foreground">Presets:</span>
                {STROKE_WIDTH_PRESETS.map((w) => {
                  const active = Math.abs(((currentConfig as any).strokeWidth || 0) - w) < 0.15
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setElementDefault(currentTab, { strokeWidth: w } as any)}
                      className={cn(
                        "px-2 py-0.5 rounded-chrome-xs text-micro font-mono border transition-colors",
                        active
                          ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                          : "border-border/70 hover:bg-accent text-muted-foreground"
                      )}
                    >
                      {w}px
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pencil Hardness & Mode (Specific to Draw Tool) */}
          {currentTab === "draw" && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-label font-medium text-foreground">
                  Pencil Graphite Hardness Scale (9H Hard → 9B Soft)
                </label>
                <span className="text-micro font-mono font-semibold text-foreground">
                  {elementDefaults.draw.pencilGrade} ({PENCIL_GRADES[elementDefaults.draw.pencilGrade as keyof typeof PENCIL_GRADES]?.label})
                </span>
              </div>

              <div className="grid grid-cols-10 sm:grid-cols-20 gap-1 overflow-x-auto">
                {ORDERED_PENCIL_GRADES.map((g) => {
                  const active = elementDefaults.draw.pencilGrade === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const info = PENCIL_GRADES[g] || PENCIL_GRADES["HB"]
                        setElementDefault("draw", {
                          pencilGrade: g,
                          strokeWidth: info.strokeWidth,
                          opacity: info.opacity,
                        })
                      }}
                      className={cn(
                        "py-1.5 px-0.5 rounded-chrome-xs text-[11px] font-mono font-medium border text-center transition-colors",
                        active
                          ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-xs"
                          : "border-border/60 hover:bg-accent text-foreground"
                      )}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-micro text-muted-foreground">Drawing Mode:</span>
                {(["pen", "marker", "highlighter"] as const).map((m) => {
                  const active = elementDefaults.draw.mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setElementDefault("draw", { mode: m })}
                      className={cn(
                        "px-2.5 py-1 rounded-chrome-xs text-micro capitalize border transition-colors",
                        active
                          ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                          : "border-border/70 hover:bg-accent text-muted-foreground"
                      )}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Text Font Size & Styles (Specific to Text Tool) */}
          {currentTab === "text" && (
            <div className="pt-2 border-t border-border/60 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-label font-medium text-foreground">Font Size</label>
                  <span className="text-label font-mono font-medium text-foreground">
                    {elementDefaults.text.fontSize}px
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="64"
                    step="1"
                    value={elementDefaults.text.fontSize}
                    onChange={(e) =>
                      setElementDefault("text", { fontSize: parseInt(e.target.value, 10) })
                    }
                    className="flex-1 accent-[var(--sq-ink)] cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-micro text-muted-foreground">Presets:</span>
                  {FONT_SIZE_PRESETS.map((fs) => {
                    const active = elementDefaults.text.fontSize === fs
                    return (
                      <button
                        key={fs}
                        type="button"
                        onClick={() => setElementDefault("text", { fontSize: fs })}
                        className={cn(
                          "px-2 py-0.5 rounded-chrome-xs text-micro font-mono border transition-colors",
                          active
                            ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                            : "border-border/70 hover:bg-accent text-muted-foreground"
                        )}
                      >
                        {fs}px
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Text Alignment & Formatting */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1">
                  <span className="text-micro text-muted-foreground mr-1">Align:</span>
                  {(["left", "center", "right"] as const).map((al) => {
                    const active = elementDefaults.text.align === al
                    const Icon =
                      al === "left"
                        ? TextAlignLeftIcon
                        : al === "center"
                        ? TextAlignCenterIcon
                        : TextAlignRightIcon
                    return (
                      <button
                        key={al}
                        type="button"
                        onClick={() => setElementDefault("text", { align: al })}
                        className={cn(
                          "p-1.5 rounded-chrome-xs border transition-colors",
                          active
                            ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                            : "border-border/70 hover:bg-accent text-muted-foreground"
                        )}
                        title={`Align ${al}`}
                      >
                        <Icon className="size-3.5" />
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1 border-l border-border/60 pl-4">
                  <button
                    type="button"
                    onClick={() =>
                      setElementDefault("text", { bold: !elementDefaults.text.bold })
                    }
                    className={cn(
                      "p-1.5 rounded-chrome-xs border transition-colors",
                      elementDefaults.text.bold
                        ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                        : "border-border/70 hover:bg-accent text-muted-foreground"
                    )}
                    title="Bold"
                  >
                    <TextBolderIcon className="size-3.5" weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setElementDefault("text", { italic: !elementDefaults.text.italic })
                    }
                    className={cn(
                      "p-1.5 rounded-chrome-xs border transition-colors",
                      elementDefaults.text.italic
                        ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                        : "border-border/70 hover:bg-accent text-muted-foreground"
                    )}
                    title="Italic"
                  >
                    <TextItalicIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stroke Style (Dashed & Opacity) */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
            {"dashed" in currentConfig && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(currentConfig as any).dashed}
                  onChange={(e) =>
                    setElementDefault(currentTab, { dashed: e.target.checked } as any)
                  }
                  className="size-4 accent-[var(--sq-ink)] rounded"
                />
                <span className="text-label text-foreground">Dashed Sketch Stroke</span>
              </label>
            )}

            {"opacity" in currentConfig && (
              <div className="flex items-center gap-2">
                <span className="text-micro text-muted-foreground">Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(currentConfig as any).opacity ?? 1}
                  onChange={(e) =>
                    setElementDefault(currentTab, {
                      opacity: parseFloat(e.target.value),
                    } as any)
                  }
                  className="w-24 accent-[var(--sq-ink)] cursor-pointer"
                />
                <span className="text-micro font-mono text-foreground w-8">
                  {Math.round(((currentConfig as any).opacity ?? 1) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-4 sm:px-6 py-3">
          <button
            type="button"
            onClick={resetElementDefaults}
            className="flex items-center gap-1.5 text-micro text-muted-foreground hover:text-foreground py-1 px-2 rounded-chrome-xs hover:bg-accent transition-colors"
          >
            <ArrowCounterClockwiseIcon className="size-3.5" />
            <span>Reset All Defaults</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {selectionCount > 0 && (
              <button
                type="button"
                onClick={applyDefaultsToSelection}
                className="h-8 px-3 rounded-chrome-sm border border-border/80 bg-background text-label text-foreground hover:bg-accent font-medium transition-colors"
              >
                Apply to Selected ({selectionCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                // Set the active canvas tool to the selected tab
                const st = useSquig.getState()
                if (currentTab === "rectangle") {
                  st.setTool("shape")
                  st.setShapeKind("rect")
                } else if (currentTab === "ellipse") {
                  st.setTool("shape")
                  st.setShapeKind("ellipse")
                } else if (currentTab === "line") {
                  st.setTool("arrow")
                  st.setArrowHead(false)
                } else if (currentTab === "arrow") {
                  st.setTool("arrow")
                  st.setArrowHead(true)
                } else if (currentTab === "draw") {
                  st.setTool("draw")
                } else if (currentTab === "text") {
                  st.setTool("text")
                }
                setOpen(false)
              }}
              className="h-8 px-4 rounded-chrome-sm bg-[var(--sq-ink)] text-[var(--sq-paper)] text-label font-medium hover:opacity-90 transition-opacity"
            >
              Done & Draw
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
