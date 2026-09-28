"use client"

// ---------------------------------------------------------------------------
// Zenithsui — 48-Color & Pencil Grade System
//
// Features:
//   1. 48-Color Palette (6 chromatic rows of 8 swatches) + Custom Color Picker
//   2. Separate Color Controls for:
//      - Text (active text tool & selected text layers)
//      - Drawing (active pencil/pen tool & selected sketches/strokes)
//   3. Full 19-Step Graphite Pencil Grade Scale (9H through HB to 9B)
//   4. Embedded Graphite Hardness Guide:
//      "HB is the standard, everyday middle-ground pencil. It is what most school pencils use.
//       B Grades (Soft & Dark): These have more graphite, creating dark, bold black lines. They range from 1B to 9B (or higher).
//       H Grades (Hard & Light): These have more clay, creating very light, precise grey lines. They range from 1H to 9H."
// ---------------------------------------------------------------------------

import { useState, useRef, useId } from "react"
import { useSquig } from "@/lib/store"
import { PALETTE_48 } from "@/lib/colors"
import {
  ORDERED_PENCIL_GRADES,
  PENCIL_GRADES,
  PENCIL_GUIDE_TEXT,
  type PencilGrade,
} from "@/lib/pencil-grades"
import {
  PencilSimple as PencilIcon,
  TextT as TextIcon,
  Check as CheckIcon,
  Eyedropper as EyedropperIcon,
  ArrowsClockwise as ResetIcon,
  Info as InfoIcon,
  CaretDown as CaretDownIcon,
  Palette as PaletteIcon,
  X as XIcon,
} from "@phosphor-icons/react"
import { Panel } from "@/components/ui/panel"

export type ColorTarget = "draw" | "text"

interface ColorPencilPaletteProps {
  initialTarget?: ColorTarget
  compact?: boolean
  showPencilGrades?: boolean
  onClose?: () => void
}

export function ColorPencilPalette({
  initialTarget = "draw",
  compact = false,
  showPencilGrades = true,
  onClose,
}: ColorPencilPaletteProps) {
  const [target, setTarget] = useState<ColorTarget>(initialTarget)
  const [guideOpen, setGuideOpen] = useState(false)
  const colorInputId = useId()
  const customColorInputRef = useRef<HTMLInputElement>(null)

  const drawColor = useSquig((s) => s.drawColor)
  const textColor = useSquig((s) => s.textColor)
  const pencilGrade = useSquig((s) => s.pencilGrade)
  const setDrawColor = useSquig((s) => s.setDrawColor)
  const setTextColor = useSquig((s) => s.setTextColor)
  const setPencilGrade = useSquig((s) => s.setPencilGrade)

  const activeColor = target === "draw" ? drawColor : textColor
  const activeSetter = target === "draw" ? setDrawColor : setTextColor

  const currentGradeInfo = PENCIL_GRADES[pencilGrade as keyof typeof PENCIL_GRADES] || PENCIL_GRADES["HB"]

  // A pick lands on the live selection first (when there is one) and always
  // updates the default for the next thing drawn.
  const applyColorToSelection = (hex: string) => {
    const s = useSquig.getState()
    if (s.isReadOnly || s.isLocked || !s.selection.length) return
    const patches: Record<string, any> = {}
    for (const id of s.selection) {
      const n = s.nodes[id] as any
      if (!n) continue
      if (target === "text") {
        if (n.type === "text") patches[id] = { color: hex }
      } else {
        if (n.type === "draw" || n.type === "shape" || n.type === "arrow") patches[id] = { color: hex }
      }
    }
    if (Object.keys(patches).length) s.updateNodes(patches)
  }

  const applyGradeToSelection = (grade: PencilGrade) => {
    const s = useSquig.getState()
    if (s.isReadOnly || s.isLocked || !s.selection.length) return
    const info = PENCIL_GRADES[grade]
    if (!info) return
    const patches: Record<string, any> = {}
    for (const id of s.selection) {
      const n = s.nodes[id] as any
      if (!n) continue
      if (n.type === "draw") patches[id] = { strokeWidth: info.strokeWidth, opacity: info.opacity }
    }
    if (Object.keys(patches).length) s.updateNodes(patches)
  }

  const handleSelectColor = (hex: string) => {
    activeSetter(hex)
    applyColorToSelection(hex)
  }

  const handleResetToTheme = () => {
    activeSetter("")
    applyColorToSelection("")
  }

  const handleSelectGrade = (grade: PencilGrade) => {
    setPencilGrade(grade)
    applyGradeToSelection(grade)
  }

  return (
    <div className="flex flex-col gap-3 text-foreground w-full max-w-[340px]">
      {/* Header & Target Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-1 rounded-chrome-sm bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setTarget("draw")}
            className={`flex items-center gap-1.5 rounded-chrome-xs px-2.5 py-1 text-xs font-medium transition-all ${
              target === "draw"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PencilIcon size={14} weight={target === "draw" ? "fill" : "regular"} />
            <span>Draw Color</span>
          </button>
          <button
            type="button"
            onClick={() => setTarget("text")}
            className={`flex items-center gap-1.5 rounded-chrome-xs px-2.5 py-1 text-xs font-medium transition-all ${
              target === "text"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TextIcon size={14} weight={target === "text" ? "bold" : "regular"} />
            <span>Text Color</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-chrome-xs p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Close"
          >
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Active Color Status & Custom Picker Controls */}
      <div className="flex items-center justify-between gap-2 rounded-chrome-sm bg-muted/30 p-1.5 px-2">
        <div className="flex items-center gap-2">
          <div
            className="size-5 rounded-full border border-border/80 shadow-sm shrink-0"
            style={{
              backgroundColor: activeColor || "var(--sq-ink)",
            }}
          />
          <span className="text-xs font-mono font-medium">
            {activeColor ? activeColor.toUpperCase() : "Theme Ink (Default)"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Custom Color Native Trigger */}
          <label
            htmlFor={colorInputId}
            className="flex h-6 items-center gap-1 rounded-chrome-xs border border-border/80 bg-background px-2 text-[11px] font-medium text-foreground cursor-pointer hover:bg-muted transition-colors"
            title="Choose any custom RGB / Hex color"
          >
            <EyedropperIcon size={12} weight="bold" />
            <span>Custom</span>
            <input
              id={colorInputId}
              ref={customColorInputRef}
              type="color"
              value={activeColor || "#1e293b"}
              onChange={(e) => handleSelectColor(e.target.value)}
              className="sr-only"
            />
          </label>

          {activeColor && (
            <button
              type="button"
              onClick={handleResetToTheme}
              className="flex h-6 items-center gap-1 rounded-chrome-xs border border-border/80 bg-background px-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Reset to theme default ink"
            >
              <ResetIcon size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 48 Colors Matrix */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            48-Color Palette
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {target === "draw" ? "For Pencil & Strokes" : "For Text"}
          </span>
        </div>

        <div className="grid grid-cols-8 gap-1.5 rounded-chrome-sm border border-border/50 bg-background/50 p-2 shadow-inner">
          {PALETTE_48.map((c) => {
            const isSelected = activeColor.toLowerCase() === c.hex.toLowerCase()
            const isLight =
              c.hex === "#ffffff" || c.hex === "#f1f5f9" || c.hex === "#fef08a" || c.hex === "#fda4af"

            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => handleSelectColor(c.hex)}
                title={`${c.name} (${c.hex})`}
                className={`group relative flex size-7 items-center justify-center rounded-chrome-xs border transition-all hover:scale-110 hover:z-10 focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/40 scale-105 z-10 shadow-sm"
                    : "border-border/60 hover:border-foreground/80"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {isSelected && (
                  <CheckIcon
                    size={13}
                    weight="bold"
                    className={isLight ? "text-slate-900" : "text-white"}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pencil Grade System (Only shown for Draw or if requested) */}
      {showPencilGrades && target === "draw" && (
        <div className="mt-1 flex flex-col gap-2 rounded-chrome-sm border border-border/60 bg-muted/20 p-2.5">
          {/* Section Header with live thickness indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PencilIcon size={14} weight="duotone" className="text-primary" />
              <span className="text-xs font-bold text-foreground">Pencil Hardness Grade</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-primary">
                {pencilGrade}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setGuideOpen(!guideOpen)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Graphite Hardness Guide"
            >
              <InfoIcon size={13} />
              <span>Guide</span>
              <CaretDownIcon
                size={11}
                className={`transition-transform duration-150 ${guideOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Live Line Preview */}
          <div className="flex items-center justify-between gap-3 rounded-chrome-xs border border-border/60 bg-background px-3 py-1.5">
            <span className="text-[10px] font-medium text-muted-foreground font-mono">Preview</span>
            <div className="flex-1 flex items-center justify-center px-2">
              <div
                className="w-full rounded-full transition-all"
                style={{
                  height: `${Math.max(1, currentGradeInfo.strokeWidth)}px`,
                  backgroundColor: drawColor || "var(--sq-ink)",
                  opacity: currentGradeInfo.opacity,
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {currentGradeInfo.hardness}
            </span>
          </div>

          {/* 19-Step Pencil Ladder */}
          <div className="flex flex-col gap-1.5">
            {/* Category Labels */}
            <div className="grid grid-cols-3 text-[10px] font-semibold text-muted-foreground text-center">
              <span className="text-left">Hard & Light (9H-H)</span>
              <span>Standard (HB)</span>
              <span className="text-right">Soft & Dark (B-9B)</span>
            </div>

            {/* Interactive Grade Buttons */}
            <div className="grid grid-cols-10 sm:grid-cols-19 gap-0.5 sm:gap-1">
              {ORDERED_PENCIL_GRADES.map((g) => {
                const info = PENCIL_GRADES[g]
                const isActive = pencilGrade === g
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSelectGrade(g)}
                    title={`${g} — ${info.hardness} (Width: ${info.strokeWidth}px, Opacity: ${Math.round(info.opacity * 100)}%)`}
                    className={`flex flex-col items-center justify-center rounded-chrome-xs py-1 px-0.5 text-[10px] font-mono font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-sm scale-110 z-10"
                        : "bg-background text-foreground/80 hover:bg-muted border border-border/40"
                    }`}
                  >
                    <span>{g}</span>
                    {/* Visual dot showing relative lead size */}
                    <span
                      className="mt-0.5 rounded-full"
                      style={{
                        width: `${Math.min(6, Math.max(2, info.strokeWidth * 1.2))}px`,
                        height: `${Math.min(6, Math.max(2, info.strokeWidth * 1.2))}px`,
                        backgroundColor: isActive ? "currentColor" : "var(--sq-ink)",
                        opacity: info.opacity,
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Required User Guide Text Box */}
          {guideOpen && (
            <div className="mt-1 rounded-chrome-xs border border-primary/20 bg-primary/5 p-2.5 text-[11px] leading-relaxed text-foreground">
              <p className="font-sans whitespace-pre-wrap">{PENCIL_GUIDE_TEXT}</p>
            </div>
          )}

          {/* Jump to Full Color & Size Studio */}
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Looking for shape fills & sizes?</span>
            <button
              type="button"
              onClick={() => {
                useSquig.getState().setActiveStudioTab(target)
                useSquig.getState().setColorSizeStudioOpen(true)
                if (onClose) onClose()
              }}
              className="text-[11px] font-medium text-[var(--sq-ink)] hover:underline flex items-center gap-1"
            >
              Open Studio →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Floating Canvas Color & Pencil Bar
 * Floats unobtrusively on the canvas allowing one-click color and pencil adjustments
 */
export function CanvasColorBar() {
  const [open, setOpen] = useState(false)
  const drawColor = useSquig((s) => s.drawColor)
  const textColor = useSquig((s) => s.textColor)
  const pencilGrade = useSquig((s) => s.pencilGrade)
  const tool = useSquig((s) => s.tool)
  const setTool = useSquig((s) => s.setTool)

  const isTextTool = tool === "text"
  const currentColor = isTextTool ? textColor : drawColor

  return (
    <div className="relative">
      {/* Floating Pill Trigger */}
      <Panel className="flex items-center gap-1.5 p-1 px-2 shadow-panel">
        {/* Draw Color Chip & Pencil Grade */}
        <button
          type="button"
          onClick={() => {
            if (tool !== "draw") setTool("draw")
            setOpen(!open)
          }}
          className={`flex items-center gap-1.5 rounded-chrome-xs px-2 py-1 text-xs font-medium transition-colors ${
            tool === "draw"
              ? "bg-accent text-accent-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
          title="Drawing Pencil & Color"
        >
          <PencilIcon size={14} weight={tool === "draw" ? "fill" : "regular"} />
          <span
            className="size-3.5 rounded-full border border-border/80 shadow-xs"
            style={{ backgroundColor: drawColor || "var(--sq-ink)" }}
          />
          <span className="font-mono text-[11px]">{pencilGrade}</span>
        </button>

        <div className="h-3.5 w-px bg-border/60" />

        {/* Text Color Chip */}
        <button
          type="button"
          onClick={() => {
            if (tool !== "text") setTool("text")
            setOpen(!open)
          }}
          className={`flex items-center gap-1.5 rounded-chrome-xs px-2 py-1 text-xs font-medium transition-colors ${
            tool === "text"
              ? "bg-accent text-accent-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
          title="Text Color"
        >
          <TextIcon size={14} weight={tool === "text" ? "bold" : "regular"} />
          <span
            className="size-3.5 rounded-full border border-border/80 shadow-xs"
            style={{ backgroundColor: textColor || "var(--sq-ink)" }}
          />
        </button>

        <div className="h-3.5 w-px bg-border/60" />

        {/* 48-Color Palette Button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 rounded-chrome-xs px-1.5 py-1 text-xs transition-colors ${
            open ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Open 48-Color & Pencil Grade Palette"
        >
          <PaletteIcon size={14} weight={open ? "fill" : "regular"} />
          <CaretDownIcon
            size={11}
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Panel>

      {/* Popover Card */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-40 rounded-chrome-md border border-border/80 bg-background p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <ColorPencilPalette
            initialTarget={isTextTool ? "text" : "draw"}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
