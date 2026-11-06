"use client"

// ---------------------------------------------------------------------------
// Zenithsui Floating Contextual Toolbar — Compact, Ergonomic, Professional
//
// Complete replacement for the oversized permanent right-side inspector.
// Follows Reference Image 2:
// - Approximate dimensions: ~438px width, ~62px height.
// - Floats directly adjacent to the selected canvas object.
// - Deep dark premium backdrop with subtle glass blur & thin border.
// - Context-aware primary controls (Text formatting, Font size stepper,
//   Component quick variants, Shape styling, Alignment).
// - Comprehensive secondary popovers for all Reference Image 1 properties:
//   1. Position & Dimensions (X, Y, W, H, Flip H/V, Lock/Unlock)
//   2. Appearance & Variants (Star Accent swatches, Paperclip, Stars, Shape styles, Image border)
//   3. Content & Titles (Title text editing, file names, embed details)
//   4. Smart Hover Notes (Add/Edit note, title, body, 5 reference styles, live preview, remove)
//   5. More Actions (Detach component, Duplicate, Delete with undo)
// - Clamped to viewport bounds; flips below if top lacks space.
// - All inputs and buttons marked with `data-zenithsui-chrome` and event-isolated.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react"
import { useSquig } from "@/lib/store"
import type {
  SquigNode,
  Viewport,
  ComponentNode,
  ShapeNode,
  ArrowNode,
  TextNode,
  StickyNoteNode,
  DocumentNode,
  ImageNode,
  MediaNode,
  EmbedNode,
  FrameNode,
  FillTone,
  StrokeWeight,
} from "@/lib/types"
import { normalizeFill, DEFAULT_IMAGE_BORDER } from "@/lib/types"
import { getDef } from "@/lib/library/registry"
import {
  shared,
  sharedControls,
  sharedNumber,
  sharedProp,
  unionBounds,
  selectionSummary,
} from "@/lib/selection"
import { scaleNodes, MIN_SIZE } from "@/lib/canvas/transform"
import { fitTextBox, setTextWidth } from "@/lib/canvas/text-reflow"
import { VariantControl } from "@/components/chrome/variant-controls"
import { MixedNumberField, MixedSwitch, MixedTextField } from "@/components/chrome/mixed-fields"
import { AlignRow } from "@/components/chrome/align-row"
import {
  TextAlignMenu,
  TextStyleToggles,
  sharedAlign,
} from "@/components/chrome/text-controls"
import { SmartHoverCardContent } from "@/components/canvas/smart-hover-note"
import { HOVER_THEMES } from "@/lib/hover-themes"
import { kbd } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"
import {
  PencilSimple,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  LinkBreakIcon,
  TrashIcon,
  Lock,
  LockOpen,
  ChatCenteredText,
  Plus,
  Minus,
  X,
  Copy,
  SlidersHorizontal,
  Article,
  DotsThreeVertical,
  ArrowSquareOut,
  DownloadSimple,
  Sparkle,
  Check,
  PaintBrush,
  BoundingBox,
  ArrowsClockwise,
} from "@phosphor-icons/react"

// ---------------------------------------------------------------------------
// Tone & Fill Chips
// ---------------------------------------------------------------------------

function ToneChip({ fill, slash = false }: { fill?: string; slash?: boolean }) {
  return (
    <span
      className="relative block size-3.5 rounded-sm border border-white/20"
      style={{ background: fill ?? "transparent" }}
    >
      {slash && (
        <span className="absolute inset-0 overflow-hidden rounded-sm">
          <span className="absolute top-1/2 -left-1/4 h-px w-[150%] -translate-y-1/2 rotate-45 bg-white/40" />
        </span>
      )}
    </span>
  )
}

const FILL_OPTIONS: readonly { value: FillTone; label: string; chip: React.ReactNode }[] = [
  { value: "none", label: "No fill", chip: <ToneChip slash /> },
  { value: "paper", label: "Paper", chip: <ToneChip fill="var(--sq-paper, #ffffff)" /> },
  { value: "light", label: "Light shade", chip: <ToneChip fill="var(--sq-shade, #e5e5ea)" /> },
  { value: "strong", label: "Strong shade", chip: <ToneChip fill="var(--sq-shade-strong, #c7c7cc)" /> },
]

const STROKE_OPTIONS: readonly { value: StrokeWeight; label: string; height: number }[] = [
  { value: "light", label: "Light pen", height: 1.2 },
  { value: "regular", label: "Regular pen", height: 2 },
  { value: "heavy", label: "Heavy pen", height: 3.5 },
]

const ACCENT_SWATCHES: { id: string; label: string; hex: string }[] = [
  { id: "orange", label: "Orange", hex: "#FC883F" },
  { id: "emerald", label: "Emerald", hex: "#10B981" },
  { id: "pink", label: "Pink", hex: "#EC4899" },
  { id: "sky", label: "Sky Blue", hex: "#0284C7" },
  { id: "violet", label: "Violet", hex: "#8B5CF6" },
  { id: "black", label: "Charcoal", hex: "#1C1917" },
]

const STICKY_TONE_SWATCHES: { id: "yellow" | "blue" | "green" | "pink" | "orange"; label: string; hex: string }[] = [
  { id: "yellow", label: "Yellow", hex: "#FEF08A" },
  { id: "blue", label: "Blue", hex: "#BAE6FD" },
  { id: "green", label: "Green", hex: "#BBF7D0" },
  { id: "pink", label: "Pink", hex: "#FBCFE8" },
  { id: "orange", label: "Orange", hex: "#FED7AA" },
]

function resizeTo(n: SquigNode, w: number, h: number): Partial<SquigNode> {
  if (n.type === "text" && w !== n.w) return setTextWidth(n, w) as Partial<SquigNode>
  const from = unionBounds([n])!
  return scaleNodes([n], from, { x: n.x, y: n.y, w, h })[n.id] ?? {}
}

type ActivePopoverType = "position" | "variant" | "content" | "note" | "actions" | null

interface FloatingContextToolbarProps {
  selectedNodes: SquigNode[]
  viewport: Viewport
  busy?: boolean
}

export const FloatingContextToolbar = memo(function FloatingContextToolbar({
  selectedNodes,
  viewport,
  busy = false,
}: FloatingContextToolbarProps) {
  const uiHidden = useSquig((s) => s.uiHidden)
  const editingId = useSquig((s) => s.editingId)
  const st = useSquig.getState

  const [activePopover, setActivePopover] = useState<ActivePopoverType>(null)
  const [size, setSize] = useState({ w: 438, h: 62 })

  const toolbarRef = useRef<HTMLDivElement>(null)

  // Measure toolbar dimensions to ensure precise clamping
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return
    toolbarRef.current = el
    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      setSize((prev) => (prev.w === rect.width && prev.h === rect.height ? prev : { w: rect.width, h: rect.height }))
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Close popover when clicking anywhere outside or pressing Escape
  useEffect(() => {
    if (!activePopover) return

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest("[data-zenithsui-chrome]")) {
        setActivePopover(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setActivePopover(null)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown, { capture: true })
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true })
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [activePopover])

  // Clear active popover when selection changes
  const prevSelectionKey = useRef("")
  const currentSelectionKey = selectedNodes.map((n) => n.id).join(",")
  if (prevSelectionKey.current !== currentSelectionKey) {
    prevSelectionKey.current = currentSelectionKey
    if (activePopover) setActivePopover(null)
  }

  const bounds = unionBounds(selectedNodes)
  if (selectedNodes.length === 0 || uiHidden || editingId || busy || !bounds) {
    return null
  }

  // Bounding box in screen coordinates
  const boxLeft = bounds.x * viewport.zoom + viewport.x
  const boxTop = bounds.y * viewport.zoom + viewport.y
  const boxBottom = (bounds.y + bounds.h) * viewport.zoom + viewport.y
  const boxRight = (bounds.x + bounds.w) * viewport.zoom + viewport.x

  const vw = typeof window === "undefined" ? 1280 : window.innerWidth
  const vh = typeof window === "undefined" ? 800 : window.innerHeight

  // If selection is completely scrolled outside viewport, hide toolbar
  if (boxRight < 0 || boxLeft > vw || boxBottom < 0 || boxTop > vh) {
    return null
  }

  // Positioning calculations: prefer placing above; flip below if tight
  const gap = 12
  const aboveY = boxTop - size.h - gap
  const belowY = boxBottom + gap

  const targetX = (boxLeft + boxRight) / 2 - size.w / 2
  const clampedX = Math.min(Math.max(targetX, 16), Math.max(16, vw - size.w - 16))
  // Flip below if above leaves less than 72px (avoids clipping under TopBar)
  const isFlippedBelow = aboveY < 72
  const clampedY = isFlippedBelow ? Math.min(belowY, vh - size.h - 16) : aboveY

  // Popover Placement Calculation: Dynamic collision avoidance
  const popoverEstimatedH = 320
  let popoverTop: number
  if (isFlippedBelow) {
    // Toolbar is below object. Place popover below toolbar if fits, else above toolbar
    if (clampedY + size.h + 8 + popoverEstimatedH <= vh - 16) {
      popoverTop = clampedY + size.h + 8
    } else {
      popoverTop = Math.max(16, clampedY - popoverEstimatedH - 8)
    }
  } else {
    // Toolbar is above object. Place popover above toolbar if fits, else below toolbar
    if (clampedY - popoverEstimatedH - 8 >= 72) {
      popoverTop = clampedY - popoverEstimatedH - 8
    } else {
      popoverTop = Math.min(clampedY + size.h + 8, vh - popoverEstimatedH - 16)
    }
  }

  // Node Type Segmentation
  const texts = selectedNodes.filter((n): n is TextNode => n.type === "text")
  const components = selectedNodes.filter((n): n is ComponentNode => n.type === "component")
  const shapes = selectedNodes.filter((n): n is ShapeNode => n.type === "shape")
  const stickies = selectedNodes.filter((n): n is StickyNoteNode => n.type === "sticky")
  const images = selectedNodes.filter((n): n is ImageNode => n.type === "image")
  const documents = selectedNodes.filter((n): n is DocumentNode => n.type === "document")
  const mediaNodes = selectedNodes.filter((n): n is MediaNode => n.type === "media")
  const embedNodes = selectedNodes.filter((n): n is EmbedNode => n.type === "embed")
  const frames = selectedNodes.filter((n): n is FrameNode => n.type === "frame")
  const arrows = selectedNodes.filter((n): n is ArrowNode => n.type === "arrow")
  const outlined = selectedNodes.filter((n) => n.type === "shape" || n.type === "draw" || n.type === "arrow")

  const multi = selectedNodes.length > 1
  const single = selectedNodes.length === 1 ? selectedNodes[0] : null
  const anyLocked = selectedNodes.some((n) => n.locked)

  // Component Controls
  const controls = components.length === selectedNodes.length ? sharedControls(components) : []
  const variantControls = controls.filter((c) => c.type !== "text")
  const textControls = controls.filter((c) => c.type === "text")
  const hasVariants = variantControls.length > 0 || outlined.length > 0 || stickies.length > 0 || images.length > 0 || mediaNodes.length > 0
  const hasContent = textControls.length > 0 || documents.length > 0 || embedNodes.length > 0 || frames.length > 0

  // Hover Note presence badge
  const hasHoverNote = selectedNodes.some((n) => Boolean(n.hoverNote?.enabled !== false && (n.hoverNote?.title || n.hoverNote?.body)))

  // Node Patch Helper (respects locked flag)
  const patch = (make: (n: SquigNode) => Partial<SquigNode> | null, opts?: { checkpoint?: boolean }) => {
    const patches: Record<string, Partial<SquigNode>> = {}
    for (const n of selectedNodes) {
      if (n.locked && opts?.checkpoint !== undefined) continue
      const p = make(n)
      if (p) patches[n.id] = p
    }
    if (Object.keys(patches).length) {
      st().updateNodes(patches, { checkpoint: opts?.checkpoint ?? true })
    }
  }

  const live = (make: (n: SquigNode) => Partial<SquigNode> | null) => patch(make, { checkpoint: false })
  const startGesture = () => st().checkpoint()

  // Font Size Stepper Handler
  const handleStepFontSize = (delta: number) => {
    if (anyLocked) return
    startGesture()
    live((n) => {
      if (n.type !== "text") return null
      const current = n.fontSize || 16
      const next = Math.max(6, Math.min(180, current + delta))
      return fitTextBox(n, n.text, next) as Partial<SquigNode>
    })
  }

  const togglePopover = (type: ActivePopoverType) => {
    setActivePopover((prev) => (prev === type ? null : type))
  }

  return (
    <>
      {/* ── Main Compact Floating Toolbar (Approx 438 × 62 px) ── */}
      <div
        ref={measureRef}
        data-zenithsui-chrome="true"
        className={cn(
          "fixed z-40 select-none flex items-center justify-between gap-1.5 px-3 py-2",
          "w-auto max-w-[460px] min-w-[340px] h-[58px] sm:h-[62px]",
          "rounded-2xl bg-[#18181b]/95 dark:bg-[#18181b]/95 backdrop-blur-2xl text-stone-100",
          "border border-white/10 dark:border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25)]",
          "transition-[left,top] duration-75 ease-out animate-in fade-in-0 zoom-in-95"
        )}
        style={{
          left: clampedX,
          top: clampedY,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left / Center Section: Node-Specific Quick Controls ── */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {/* Prominent Locked Indicator Pill */}
          {anyLocked && (
            <button
              type="button"
              onClick={() => st().toggleLockSelected()}
              className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer shrink-0"
              title="Click to Unlock Object"
            >
              <Lock size={12} className="text-amber-400" />
              <span>Locked</span>
            </button>
          )}

          {/* 1. Text Object Controls */}
          {texts.length > 0 && !anyLocked && (
            <>
              {texts.length === 1 && (
                <button
                  type="button"
                  onClick={() => st().setEditing(texts[0].id)}
                  className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 active:scale-95 border border-blue-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Edit Text (Enter / Double-Click)"
                >
                  <PencilSimple size={14} weight="bold" />
                  <span>Edit</span>
                  <span className="text-[10px] font-mono opacity-60">↵</span>
                </button>
              )}

              <span className="h-5 w-px bg-white/15 mx-0.5 shrink-0" />

              {/* Font Size Stepper */}
              <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0" title="Font Size">
                <button
                  type="button"
                  onClick={() => handleStepFontSize(-2)}
                  className="size-6 flex items-center justify-center rounded text-stone-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                  title="Decrease font size"
                >
                  <Minus size={11} weight="bold" />
                </button>

                <div className="w-[42px] px-0.5">
                  <MixedNumberField
                    label=""
                    min={6}
                    max={180}
                    className="w-full text-center text-xs font-mono font-bold bg-transparent text-white border-0 shadow-none px-0"
                    shared={sharedNumber(texts, (n) => (n as TextNode).fontSize || 16)}
                    onGestureStart={startGesture}
                    onCommit={(v) =>
                      live((n) => (n.type === "text" && v > 0 ? (fitTextBox(n, n.text, v) as Partial<SquigNode>) : null))
                    }
                    onStep={(d) =>
                      live((n) =>
                        n.type === "text" ? (fitTextBox(n, n.text, Math.max(6, (n.fontSize || 16) + d)) as Partial<SquigNode>) : null
                      )
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStepFontSize(2)}
                  className="size-6 flex items-center justify-center rounded text-stone-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                  title="Increase font size"
                >
                  <Plus size={11} weight="bold" />
                </button>
              </div>

              <span className="h-5 w-px bg-white/15 mx-0.5 shrink-0" />

              {/* Text Styling: Bold, Italic, Underline */}
              <div className="flex items-center gap-0.5 shrink-0">
                <TextStyleToggles texts={texts} compact />
                <TextAlignMenu texts={texts} />
              </div>
            </>
          )}

          {/* 2. Component Quick Tools */}
          {components.length > 0 && texts.length === 0 && (
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold text-stone-200 truncate">
                {single && single.type === "component"
                  ? getDef((single as ComponentNode).kind)?.name || "Component"
                  : `${components.length} components`}
              </span>

              {/* Render quick toggle switches if authored in ComponentDef */}
              {variantControls
                .filter((c) => c.quick && c.type === "toggle")
                .slice(0, 2)
                .map((c) => (
                  <VariantControl key={c.key} nodes={components} control={c} compact />
                ))}
            </div>
          )}

          {/* 3. Outlined / Shape / Stroke Quick Tools */}
          {outlined.length > 0 && texts.length === 0 && components.length === 0 && (
            <div className="flex items-center gap-1.5">
              {/* Fill Tone Selector (for shapes) */}
              {shapes.length > 0 && (
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                  {FILL_OPTIONS.map((opt) => {
                    const currentFill = shared(shapes.map((n) => normalizeFill(n.fill)))
                    const isSelected = !currentFill.mixed && currentFill.value === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => patch((n) => (n.type === "shape" ? ({ fill: opt.value } as Partial<SquigNode>) : null))}
                        className={cn(
                          "p-1 rounded transition-colors cursor-pointer",
                          isSelected ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
                        )}
                        title={opt.label}
                      >
                        {opt.chip}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Stroke Pen Weight (for shapes, pencil drawings, and arrows) */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {STROKE_OPTIONS.map((opt) => {
                  const currentStroke = shared(outlined.map((n) => (n as ShapeNode).stroke || "regular"))
                  const isSelected = !currentStroke.mixed && currentStroke.value === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patch((n) => ("stroke" in n ? ({ stroke: opt.value } as Partial<SquigNode>) : null))}
                      className={cn(
                        "w-5 h-4 flex items-center justify-center rounded transition-colors cursor-pointer",
                        isSelected ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
                      )}
                      title={opt.label}
                    >
                      <span className="block w-3.5 rounded-full bg-current" style={{ height: opt.height }} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 4. Sticky Note Quick Tools */}
          {stickies.length > 0 && texts.length === 0 && components.length === 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => st().setEditing(stickies[0].id)}
                className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 active:scale-95 border border-amber-500/30 transition-all cursor-pointer shadow-2xs"
                title="Edit Sticky Note"
              >
                <PencilSimple size={14} weight="bold" />
                <span>Edit Note</span>
                <span className="text-[10px] font-mono opacity-60">↵</span>
              </button>
            </div>
          )}

          {/* 5. Document Quick Tools */}
          {documents.length > 0 && texts.length === 0 && components.length === 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => st().setViewerDoc(documents[0])}
                className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-all cursor-pointer"
                title="Open Document Viewer"
              >
                <ArrowSquareOut size={14} weight="bold" />
                <span>Open File</span>
              </button>
            </div>
          )}

          {/* 6. Multi-Selection Alignment */}
          {multi && texts.length === 0 && components.length === 0 && (
            <div className="flex items-center gap-1">
              <AlignRow count={selectedNodes.length} />
            </div>
          )}
        </div>

        {/* ── Right Section: Unified Popover Buttons (Position, Appearance, Content, Note, Actions) ── */}
        <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-white/15">
          {/* Position & Size Button */}
          <button
            type="button"
            onClick={() => togglePopover("position")}
            className={cn(
              "size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer text-stone-300 hover:text-white hover:bg-white/10 active:scale-95",
              activePopover === "position" && "bg-white/20 text-white ring-1 ring-white/30 shadow-xs"
            )}
            title="Position & Dimensions (X, Y, W, H, Flip, Lock)"
          >
            <BoundingBox size={16} weight="bold" />
          </button>

          {/* Appearance & Variants Button */}
          {hasVariants && (
            <button
              type="button"
              onClick={() => togglePopover("variant")}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer text-stone-300 hover:text-white hover:bg-white/10 active:scale-95",
                activePopover === "variant" && "bg-white/20 text-white ring-1 ring-white/30 shadow-xs"
              )}
              title="Appearance & Variants"
            >
              <PaintBrush size={16} weight="bold" />
            </button>
          )}

          {/* Content Button */}
          {hasContent && (
            <button
              type="button"
              onClick={() => togglePopover("content")}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer text-stone-300 hover:text-white hover:bg-white/10 active:scale-95",
                activePopover === "content" && "bg-white/20 text-white ring-1 ring-white/30 shadow-xs"
              )}
              title="Content & Title"
            >
              <Article size={16} weight="bold" />
            </button>
          )}

          {/* Hover Note Button (with active dot badge if note exists) */}
          <button
            type="button"
            onClick={() => togglePopover("note")}
            className={cn(
              "relative size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer text-stone-300 hover:text-white hover:bg-white/10 active:scale-95",
              activePopover === "note" && "bg-white/20 text-white ring-1 ring-white/30 shadow-xs"
            )}
            title="Smart Hover Note Annotation"
          >
            <ChatCenteredText size={16} weight="bold" />
            {hasHoverNote && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber-400 ring-2 ring-[#18181b]" />
            )}
          </button>

          {/* More Actions Button (Detach, Duplicate, Delete) */}
          <button
            type="button"
            onClick={() => togglePopover("actions")}
            className={cn(
              "size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer text-stone-300 hover:text-white hover:bg-white/10 active:scale-95",
              activePopover === "actions" && "bg-white/20 text-white ring-1 ring-white/30 shadow-xs"
            )}
            title="More Actions (Detach, Duplicate, Delete)"
          >
            <DotsThreeVertical size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Secondary Popovers (Mounted adjacent to toolbar, within viewport) ── */}
      {activePopover && (
        <div
          data-zenithsui-chrome="true"
          className={cn(
            "fixed z-50 rounded-2xl bg-[#18181b]/98 dark:bg-[#18181b]/98 backdrop-blur-2xl text-stone-100",
            "border border-white/15 shadow-[0_20px_45px_rgba(0,0,0,0.55),0_6px_16px_rgba(0,0,0,0.3)]",
            "p-3.5 animate-in fade-in-0 zoom-in-95 duration-150 select-none max-h-[calc(100vh-140px)] overflow-y-auto"
          )}
          style={{
            left: Math.min(Math.max(clampedX, 16), Math.max(16, vw - 330)),
            top: popoverTop,
            maxWidth: "340px",
            width: "320px",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {activePopover === "position" && "Position & Dimensions"}
              {activePopover === "variant" && "Appearance & Variants"}
              {activePopover === "content" && "Content & Titles"}
              {activePopover === "note" && "Hover Note Annotation"}
              {activePopover === "actions" && "Object Actions"}
            </span>
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="size-5 rounded flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X size={12} weight="bold" />
            </button>
          </div>

          {/* ── 1. Position & Size Popover ── */}
          {activePopover === "position" && (
            <div className="flex flex-col gap-3">
              {anyLocked && (
                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
                  Object is locked. Unlock below to modify position or size.
                </div>
              )}

              {/* Numeric X, Y, W, H Inputs */}
              <div className={cn("grid grid-cols-2 gap-2", anyLocked && "opacity-50 pointer-events-none")}>
                <MixedNumberField
                  label="X"
                  className="bg-white/5 border border-white/10 text-white rounded-lg"
                  shared={sharedNumber(selectedNodes, (n) => n.x)}
                  onGestureStart={startGesture}
                  onCommit={(v) => live(() => ({ x: v }))}
                  onStep={(d) => live((n) => ({ x: n.x + d }))}
                />
                <MixedNumberField
                  label="Y"
                  className="bg-white/5 border border-white/10 text-white rounded-lg"
                  shared={sharedNumber(selectedNodes, (n) => n.y)}
                  onGestureStart={startGesture}
                  onCommit={(v) => live(() => ({ y: v }))}
                  onStep={(d) => live((n) => ({ y: n.y + d }))}
                />
                <MixedNumberField
                  label="W"
                  min={MIN_SIZE}
                  className="bg-white/5 border border-white/10 text-white rounded-lg"
                  shared={sharedNumber(selectedNodes, (n) => n.w)}
                  onGestureStart={startGesture}
                  onCommit={(v) => live((n) => resizeTo(n, Math.max(MIN_SIZE, v), n.h))}
                  onStep={(d) => live((n) => resizeTo(n, Math.max(MIN_SIZE, n.w + d), n.h))}
                />
                <MixedNumberField
                  label="H"
                  min={MIN_SIZE}
                  className="bg-white/5 border border-white/10 text-white rounded-lg"
                  shared={sharedNumber(selectedNodes, (n) => n.h)}
                  onGestureStart={startGesture}
                  onCommit={(v) => live((n) => resizeTo(n, n.w, Math.max(MIN_SIZE, v)))}
                  onStep={(d) => live((n) => resizeTo(n, n.w, Math.max(MIN_SIZE, n.h + d)))}
                />
              </div>

              {/* Flip Controls */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-xs font-semibold text-stone-300">Flip</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => st().flipSelected("x")}
                    className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/15 border border-white/10 active:scale-95 transition-all cursor-pointer"
                    title={`Flip horizontally · ${kbd("shift+h")}`}
                  >
                    <FlipHorizontalIcon size={14} />
                    <span>Horizontal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => st().flipSelected("y")}
                    className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/15 border border-white/10 active:scale-95 transition-all cursor-pointer"
                    title={`Flip vertically · ${kbd("shift+v")}`}
                  >
                    <FlipVerticalIcon size={14} />
                    <span>Vertical</span>
                  </button>
                </div>
              </div>

              {/* Lock / Unlock Control */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-xs font-semibold text-stone-300">Lock Position</span>
                <button
                  type="button"
                  onClick={() => st().toggleLockSelected()}
                  className={cn(
                    "h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer",
                    anyLocked
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      : "bg-white/5 hover:bg-white/15 text-stone-300 border-white/10"
                  )}
                >
                  {anyLocked ? (
                    <>
                      <Lock size={13} className="text-amber-400" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <LockOpen size={13} />
                      <span>Lock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── 2. Appearance & Variant Popover ── */}
          {activePopover === "variant" && (
            <div className="flex flex-col gap-3">
              {/* For Components: Dynamic Variant Controls (Star Accent Swatches, Paperclip, Stars, etc.) */}
              {components.length > 0 && (
                <>
                  {/* Star Accent Color Swatches (without rendering duplicate select) */}
                  {components.some((n) => n.props?.accentColor !== undefined || getDef(n.kind)?.defaults?.accentColor !== undefined) && (
                    <div className="flex flex-col gap-1.5 pb-2 border-b border-white/10">
                      <span className="text-xs font-semibold text-stone-300">Star Accent Color</span>
                      <div className="flex items-center gap-2">
                        {ACCENT_SWATCHES.map((swatch) => {
                          const currentAccent = sharedProp(components, "accentColor")
                          const isSelected = !currentAccent.mixed && (currentAccent.value === swatch.id || (!currentAccent.value && swatch.id === "orange"))

                          return (
                            <button
                              key={swatch.id}
                              type="button"
                              onClick={() => {
                                startGesture()
                                const patches: Record<string, Partial<SquigNode>> = {}
                                for (const n of components) {
                                  patches[n.id] = { props: { ...n.props, accentColor: swatch.id } } as Partial<SquigNode>
                                }
                                st().updateNodes(patches)
                              }}
                              className={cn(
                                "size-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs",
                                isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#18181b] scale-110" : "opacity-80 hover:opacity-100"
                              )}
                              style={{ backgroundColor: swatch.hex }}
                              title={`${swatch.label} (${swatch.id})`}
                            >
                              {isSelected && <Check size={11} weight="bold" className="text-white drop-shadow-xs" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Component Toggles & Selectors (filtering out accentColor to prevent duplicates) */}
                  {variantControls
                    .filter((c) => c.key !== "accentColor")
                    .map((c) => (
                      <div key={c.key} className="flex items-center justify-between py-1 border-b border-white/10 last:border-0">
                        <span className="text-xs font-semibold text-stone-300">{c.label}</span>
                        <VariantControl nodes={components} control={c} compact />
                      </div>
                    ))}
                </>
              )}

              {/* For Shapes: Rounded corners */}
              {shapes.length > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-white/10">
                  <span className="text-xs font-semibold text-stone-300">Rounded Corners</span>
                  <MixedSwitch
                    ariaLabel="Rounded corners"
                    shared={shared(shapes.map((n) => Boolean(n.roundness)))}
                    onChange={(on) => patch((n) => (n.type === "shape" ? ({ roundness: on } as Partial<SquigNode>) : null))}
                  />
                </div>
              )}

              {/* For Arrows: Arrowhead */}
              {arrows.length > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-white/10">
                  <span className="text-xs font-semibold text-stone-300">Arrowhead</span>
                  <MixedSwitch
                    ariaLabel="Arrowhead"
                    shared={shared(arrows.map((n) => n.head))}
                    onChange={(on) => patch((n) => (n.type === "arrow" ? ({ head: on } as Partial<SquigNode>) : null))}
                  />
                </div>
              )}

              {/* For Sticky Notes: Tone Swatches */}
              {stickies.length > 0 && (
                <div className="flex flex-col gap-1.5 py-1">
                  <span className="text-xs font-semibold text-stone-300">Note Tone</span>
                  <div className="flex items-center gap-2">
                    {STICKY_TONE_SWATCHES.map((t) => {
                      const curTone = shared(stickies.map((n) => n.tone || "yellow"))
                      const isSelected = !curTone.mixed && curTone.value === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => patch((n) => (n.type === "sticky" ? ({ tone: t.id } as Partial<SquigNode>) : null))}
                          className={cn(
                            "size-6 rounded-md flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs",
                            isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#18181b] scale-110" : "opacity-80 hover:opacity-100"
                          )}
                          style={{ backgroundColor: t.hex }}
                          title={t.label}
                        >
                          {isSelected && <Check size={11} weight="bold" className="text-stone-900 drop-shadow-xs" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* For Images: Border */}
              {images.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-300">Image Border</span>
                    <MixedSwitch
                      ariaLabel="Image border"
                      shared={shared(images.map((n) => Boolean(n.border?.enabled)))}
                      onChange={(on) =>
                        patch((n) => {
                          if (n.type !== "image") return null
                          const cur = n.border || DEFAULT_IMAGE_BORDER
                          return { border: { ...cur, enabled: on } }
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Content Popover ── */}
          {activePopover === "content" && (
            <div className="flex flex-col gap-3">
              {/* Component Title & Authored Text Fields */}
              {textControls.length > 0 &&
                textControls.map((c) => {
                  const currentVal = sharedProp(components, c.key)
                  return (
                    <div key={c.key} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-stone-300">{c.label}</label>
                      <input
                        type="text"
                        value={currentVal.mixed ? "" : String(currentVal.value ?? "")}
                        placeholder={c.label}
                        onChange={(e) => {
                          const val = e.target.value
                          const patches: Record<string, Partial<SquigNode>> = {}
                          for (const n of components) {
                            patches[n.id] = { props: { ...n.props, [c.key]: val } } as Partial<SquigNode>
                          }
                          st().updateNodes(patches, { checkpoint: false })
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )
                })}

              {/* Document File Name */}
              {documents.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">File Name</label>
                  <input
                    type="text"
                    value={documents[0].name || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      patch((n) => (n.type === "document" ? ({ name: val } as Partial<SquigNode>) : null))
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Embed Title & URL */}
              {embedNodes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-stone-300">Title</label>
                    <input
                      type="text"
                      value={embedNodes[0].title || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        patch((n) => (n.type === "embed" ? ({ title: val } as Partial<SquigNode>) : null))
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-stone-300">URL</label>
                    <input
                      type="text"
                      value={embedNodes[0].url || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        patch((n) => (n.type === "embed" ? ({ url: val } as Partial<SquigNode>) : null))
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Frame Name */}
              {frames.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-stone-300">Frame Name</label>
                  <input
                    type="text"
                    value={frames[0].name || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      patch((n) => (n.type === "frame" ? ({ name: val } as Partial<SquigNode>) : null))
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none"
                  />
                </div>
              )}

              {textControls.length === 0 && documents.length === 0 && embedNodes.length === 0 && frames.length === 0 && (
                <p className="text-xs text-stone-400">No editable text properties for this object.</p>
              )}
            </div>
          )}

          {/* ── 4. Smart Hover Note Popover ── */}
          {activePopover === "note" && (
            <div className="flex flex-col gap-2.5">
              {multi ? (
                // Multi-selection notes manager
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-stone-300">
                    {selectedNodes.filter((n) => n.hoverNote).length} of {selectedNodes.length} objects have notes.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        patch(() => ({
                          hoverNote: {
                            enabled: true,
                            title: "",
                            body: "",
                            theme: "yellow-slate",
                          },
                        }))
                      }}
                      className="flex-1 h-7 px-2.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-1 border border-blue-500/40 cursor-pointer"
                    >
                      <Plus size={12} weight="bold" />
                      <span>Add to All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => patch(() => ({ hoverNote: undefined }))}
                      className="flex-1 h-7 px-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold text-xs flex items-center justify-center gap-1 border border-red-500/30 cursor-pointer"
                    >
                      <TrashIcon size={12} />
                      <span>Clear All</span>
                    </button>
                  </div>
                </div>
              ) : single?.hoverNote ? (
                <>
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="text-xs font-semibold text-stone-300">Enabled</span>
                    <MixedSwitch
                      ariaLabel="Hover note active"
                      shared={shared([single.hoverNote.enabled !== false])}
                      onChange={(checked) => {
                        patch((n) => ({
                          hoverNote: {
                            ...(n.hoverNote || { title: "", body: "" }),
                            enabled: checked,
                          },
                        }))
                      }}
                    />
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-stone-400">Title (optional)</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={single.hoverNote.title || ""}
                      placeholder="e.g. Important Study Tip"
                      onChange={(e) => {
                        const val = e.target.value
                        patch((n) => ({
                          hoverNote: {
                            ...(n.hoverNote || { enabled: true, body: "" }),
                            title: val,
                          },
                        }))
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Body */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-stone-400">Annotation Body</label>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={single.hoverNote.body || ""}
                      placeholder="Explain this component, formula, or study note..."
                      onChange={(e) => {
                        const val = e.target.value
                        patch((n) => ({
                          hoverNote: {
                            ...(n.hoverNote || { enabled: true, title: "" }),
                            body: val,
                          },
                        }))
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                    />
                  </div>

                  {/* Style Themes (5 designs) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-stone-400">Card Design</label>
                    <div className="grid grid-cols-5 gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      {HOVER_THEMES.map((t) => {
                        const currentTheme = single.hoverNote?.theme || "yellow-slate"
                        const isSelected = currentTheme === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              patch((n) => ({
                                hoverNote: {
                                  ...(n.hoverNote || { enabled: true, title: "", body: "" }),
                                  theme: t.id,
                                },
                              }))
                            }}
                            className={cn(
                              "h-6 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                              isSelected ? "ring-2 ring-white scale-105" : "opacity-75 hover:opacity-100"
                            )}
                            style={{ backgroundColor: t.previewColor }}
                            title={t.label}
                          >
                            <span>{t.emoji}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Live Preview Card */}
                  {(single.hoverNote.title?.trim() || single.hoverNote.body?.trim()) && (
                    <div className="mt-1 flex flex-col gap-1">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-400">
                        Live Preview
                      </span>
                      <div className="rounded-xl border border-white/15 overflow-hidden shadow-xs">
                        <SmartHoverCardContent note={single.hoverNote} node={single} />
                      </div>
                    </div>
                  )}

                  {/* Remove Note Button */}
                  <div className="pt-1 flex items-center justify-end border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => patch(() => ({ hoverNote: undefined }))}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <TrashIcon size={13} />
                      <span>Remove Note</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 py-1">
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Attach an explanatory floating annotation to this object. It appears when someone hovers over it.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      patch(() => ({
                        hoverNote: {
                          enabled: true,
                          title: "",
                          body: "",
                          theme: "yellow-slate",
                        },
                      }))
                    }}
                    className="h-8 px-3 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-500/40 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus size={13} weight="bold" />
                    <span>Add Hover Note</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 5. Actions Popover ── */}
          {activePopover === "actions" && (
            <div className="flex flex-col gap-1">
              {/* Detach Component Action */}
              {components.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    st().detachSelected()
                    setActivePopover(null)
                  }}
                  className="w-full h-8 px-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold text-stone-200 hover:bg-white/10 active:scale-98 transition-colors cursor-pointer"
                >
                  <LinkBreakIcon size={14} />
                  <span>Detach Component</span>
                  {components.length > 1 && <span className="text-stone-400 font-mono">({components.length})</span>}
                </button>
              )}

              {/* Duplicate Action */}
              <button
                type="button"
                onClick={() => {
                  st().duplicateSelected()
                  setActivePopover(null)
                }}
                className="w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-semibold text-stone-200 hover:bg-white/10 active:scale-98 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Copy size={14} />
                  <span>Duplicate</span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">{kbd("mod+d")}</span>
              </button>

              {/* Lock Action */}
              <button
                type="button"
                onClick={() => {
                  st().toggleLockSelected()
                  setActivePopover(null)
                }}
                className="w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-semibold text-stone-200 hover:bg-white/10 active:scale-98 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {anyLocked ? <LockOpen size={14} /> : <Lock size={14} />}
                  <span>{anyLocked ? "Unlock Object" : "Lock Object"}</span>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1" />

              {/* Delete Action */}
              <button
                type="button"
                onClick={() => {
                  st().deleteSelected()
                  setActivePopover(null)
                }}
                className="w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-bold text-red-400 hover:bg-red-500/15 hover:text-red-300 active:scale-98 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <TrashIcon size={14} />
                  <span>Delete</span>
                </div>
                <span className="text-[10px] text-red-400/70 font-mono">Del / ⌫</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
})
