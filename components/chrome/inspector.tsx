"use client"

// ---------------------------------------------------------------------------
// Inspector — the panel that edits whatever is selected.
//
// It edits a *selection*, never "the selected node". One node is a selection of
// one; anything the selection disagrees on shows a dash you can type over.
//
// The layout borrows a design tool's grammar — folding sections, one alignment
// seam every control lands on, scrubbable numbers — but not a design tool's
// appetite. Sections appear only when the selection has something for them to
// edit, so a scribble shows Position, Fill and Outline and nothing else. If you
// ever find yourself adding a section that's usually empty, it belongs
// somewhere else.
// ---------------------------------------------------------------------------

import { useSquig } from "@/lib/store"
import type { ArrowNode, ComponentNode, FillTone, ImageNode, PdfNode, ShapeNode, SquigNode, StrokeWeight, TextNode } from "@/lib/types"
import { normalizeFill } from "@/lib/types"
import { getDef } from "@/lib/library/registry"
import { selectionSummary, shared, sharedControls, sharedNumber, unionBounds } from "@/lib/selection"
import { scaleNodes, MIN_SIZE } from "@/lib/canvas/transform"
import { fitTextBox, setTextWidth } from "@/lib/canvas/text-reflow"
import { VariantControl } from "./variant-controls"
import { MixedNumberField, MixedSwitch, MixedTextField } from "./mixed-fields"
import { AlignRow } from "./align-row"
import { ALIGN_OPTIONS, TextStyleToggles, sharedAlign } from "./text-controls"
import { FontPicker } from "./font-picker"
import { importImage } from "@/lib/files"
import { Panel, PanelFooter, PanelHeader, PanelNote, PanelSection, Row, StackRow } from "@/components/ui/panel"
import { IconAction, Segmented, type SegmentOption } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowsOutIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  LinkBreakIcon,
  SelectionAllIcon,
  TrashIcon,
  XIcon,
  Lock as LockIcon,
  LockKey as LockKeyIcon,
  Shield as ShieldIcon,
  FilePdf as FilePdfIcon,
  FileSvg as FileSvgIcon,
  FileImage as FileImageIcon,
  CaretLeft as CaretLeftIcon,
  CaretRight as CaretRightIcon,
  DownloadSimple as DownloadSimpleIcon,
  ArrowSquareOut as ArrowSquareOutIcon,
  ChalkboardTeacher as ChalkboardTeacherIcon,
  ArrowsClockwise as ArrowsClockwiseIcon,
  LockOpen as LockOpenIcon,
  Sparkle as SparkleIcon,
  Square as SquareIcon,
  Circle as CircleIcon,
  LineSegment as LineSegmentIcon,
  ArrowUpRight as ArrowUpRightIcon,
  PencilSimple as PencilSimpleIcon,
  TextT as TextTIcon,
  Palette as PaletteIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { exportAsPdf, exportAsSvg, exportAsPngFile } from "@/lib/export-image"
import { kbd } from "@/lib/shortcuts"
import { InkPicker } from "./ink-picker"
import { ColorPencilPalette } from "./color-pencil-palette"
import { bgOf, paletteOf, PAPER_SHADES, type FontMode, type PaperShade } from "@/lib/theme"
import { downloadOriginalPdf, openPdfInNewTab } from "@/lib/pdf-attachment-store"
import { renderPdfPage } from "@/lib/pdf-renderer"
import { recognizeSketch } from "@/lib/sketch-recognition/orchestrator"
import { renderRecognizedNode } from "@/lib/sketch-recognition/renderers"
import { getSketchLabel } from "@/lib/sketch-recognition/registry"

// ---------------------------------------------------------------------------
// Option sets. Declared out here so they aren't rebuilt on every keystroke.

/** A tone chip, drawn from the live palette so it previews the actual ink. */
function ToneChip({ fill, slash = false }: { fill?: string; slash?: boolean }) {
  return (
    <span
      className="relative block size-3.5 rounded-chrome-xs border border-[var(--sq-faint)]"
      style={{ background: fill ?? "transparent" }}
    >
      {slash && (
        <span className="absolute inset-0 overflow-hidden rounded-chrome-xs">
          <span className="absolute top-1/2 -left-1/4 h-px w-[150%] -translate-y-1/2 rotate-45 bg-[var(--sq-faint)]" />
        </span>
      )}
    </span>
  )
}

const FILL_OPTIONS: readonly SegmentOption<FillTone>[] = [
  { value: "none", label: "No fill", content: <ToneChip slash /> },
  { value: "paper", label: "Paper — opaque, hides what's behind", content: <ToneChip fill="var(--sq-paper)" /> },
  { value: "light", label: "Light shade", content: <ToneChip fill="var(--sq-shade)" /> },
  { value: "strong", label: "Strong shade", content: <ToneChip fill="var(--sq-shade-strong)" /> },
]

/**
 * A sheet sample — the literal colour that shade puts behind the drawing,
 * filling its whole segment. Three near-whites can only be told apart at size,
 * so the swatch is the segment rather than a chip beside a word.
 */
function PaperSample({ fill }: { fill: string }) {
  return (
    <span
      // a neutral hairline, not the ink's faint: an inked outline would read as
      // a drawn box rather than as a sheet of paper
      className="block h-[18px] w-full rounded-chrome-xs border border-border"
      style={{ background: fill }}
    />
  )
}

/** A pen-weight chip — the actual relative widths, not three identical bars. */
function PenChip({ height }: { height: number }) {
  return <span className="block w-4 rounded-full bg-current" style={{ height }} />
}

const STROKE_OPTIONS: readonly SegmentOption<StrokeWeight>[] = [
  { value: "light", label: "Light pen", content: <PenChip height={1} /> },
  { value: "regular", label: "Regular pen", content: <PenChip height={1.75} /> },
  { value: "heavy", label: "Heavy pen", content: <PenChip height={3} /> },
]

// ---------------------------------------------------------------------------

export function Inspector() {
  const nodes = useSquig((s) => s.nodes)
  const selection = useSquig((s) => s.selection)
  const pagePanel = useSquig((s) => s.pagePanel)

  const selected = selection.map((id) => nodes[id]).filter(Boolean) as SquigNode[]
  const empty = selected.length === 0

  if (empty && !pagePanel) {
    return null
  }

  // Nothing selected is not an absence — it's the page. So the panel keeps its
  // job and changes its subject rather than going blank.
  const heading = empty
    ? "Page"
    : selected.length > 1
      ? `${selected.length} selected`
      : selected[0].type === "component"
        ? (getDef((selected[0] as ComponentNode).kind)?.name ?? (selected[0] as ComponentNode).kind)
        : selected[0].type

  const subtitle = selected.length > 1 ? selectionSummary(selected) : undefined

  return (
    <Panel className="fixed top-14 right-3 md:top-4 md:right-4 z-30 max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] sm:w-[272px] shadow-panel">
      <PanelHeader
        title={heading}
        subtitle={subtitle}
        right={
          <button
            type="button"
            aria-label={empty ? "Hide page settings" : "Deselect"}
            onClick={() => {
              if (empty) {
                useSquig.getState().setPagePanel(false)
              } else {
                useSquig.getState().selectNone()
              }
            }}
            className="flex size-6 items-center justify-center rounded-chrome-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        }
      />

      <ScrollArea className="min-h-0">
        {/* remounting on a selection change drops any half-typed draft, which
            is what you want — the field now describes different objects */}
        <div key={selection.join(",")} className="flex flex-col">
          {empty ? <PageSettings /> : <SelectionEditor selected={selected} />}
        </div>
      </ScrollArea>

      {empty ? <PageFooter /> : <Footer selected={selected} />}
    </Panel>
  )
}

// ---------------------------------------------------------------------------

/**
 * With nothing selected the panel edits the page instead of apologising for
 * being empty. Paper and Ink belong to the document and are saved inside it —
 * two drawings can hold two different looks. View is the one app-level section,
 * which is why it sits apart at the bottom.
 */
function PageSettings() {
  const tool = useSquig((s) => s.tool)
  const shapeKind = useSquig((s) => s.shapeKind)
  const arrowHead = useSquig((s) => s.arrowHead)
  const pencilGrade = useSquig((s) => s.pencilGrade)
  const paper = useSquig((s) => s.paper)
  const grid = useSquig((s) => s.grid)
  const font = useSquig((s) => s.font)
  const theme = useSquig((s) => s.theme)
  const contextRow = useSquig((s) => s.contextRow)
  const pagePanel = useSquig((s) => s.pagePanel)
  const smartSketch = useSquig((s) => s.smartSketch)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const isReadOnly = useSquig((s) => s.isReadOnly)
  const hasPassword = useSquig((s) => s.hasPassword)
  const permissionRole = useSquig((s) => s.permissionRole)
  const st = useSquig.getState

  const palette = paletteOf(theme)

  /** Built per palette, not once at module load — the samples preview this
      theme's actual sheet, which is the whole point of showing them. */
  const paperOptions: SegmentOption<PaperShade>[] = PAPER_SHADES.map(({ value, label }) => ({
    value,
    label: `${label} paper`,
    content: <PaperSample fill={bgOf(palette, value)} />,
  }))

  return (
    <>
      {/* Drawing Tools, Shapes & Media shifted to inside page */}
      <PanelSection id="page-tools" title="Drawing Tools, Shapes & Media">
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors",
              tool === "shape" && shapeKind === "rect"
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              st().setShapeKind("rect")
              st().setTool("shape")
            }}
          >
            <SquareIcon size={16} weight={tool === "shape" && shapeKind === "rect" ? "fill" : "regular"} />
            <span>Rectangle</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors",
              tool === "shape" && shapeKind === "ellipse"
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              st().setShapeKind("ellipse")
              st().setTool("shape")
            }}
          >
            <CircleIcon size={16} weight={tool === "shape" && shapeKind === "ellipse" ? "fill" : "regular"} />
            <span>Ellipse</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors",
              tool === "arrow" && !arrowHead
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              st().setArrowHead(false)
              st().setTool("arrow")
            }}
          >
            <LineSegmentIcon size={16} weight={tool === "arrow" && !arrowHead ? "bold" : "regular"} />
            <span>Line</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors",
              tool === "arrow" && arrowHead
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              st().setArrowHead(true)
              st().setTool("arrow")
            }}
          >
            <ArrowUpRightIcon size={16} weight={tool === "arrow" && arrowHead ? "bold" : "regular"} />
            <span>Arrow</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors",
              tool === "draw"
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => st().setTool("draw")}
          >
            <PencilSimpleIcon size={16} weight={tool === "draw" ? "fill" : "regular"} />
            <span>Draw ({pencilGrade})</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors",
              tool === "text"
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => st().setTool("text")}
          >
            <TextTIcon size={16} weight={tool === "text" ? "bold" : "regular"} />
            <span>Text</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="col-span-2 h-9 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px] transition-colors text-muted-foreground hover:text-foreground hover:border-foreground/40"
            onClick={() => importImage()}
            title="Import image (.png, .jpg, .svg, .webp) onto canvas"
          >
            <FileImageIcon size={16} weight="duotone" className="text-blue-500" />
            <span>Import Image</span>
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-1.5 pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1.5 rounded-chrome-sm text-xs font-medium"
            onClick={() => st().setColorSizeStudioOpen(true)}
          >
            <PaletteIcon size={14} weight="duotone" />
            <span>Open Color & Size Studio</span>
          </Button>
        </div>
      </PanelSection>
      {/* Access & Protection for Shared Database Pages */}
      {selectedDbId && (
        <PanelSection id="page-access" title="Document Access">
          <Row label="Role">
            <div className="flex items-center justify-between w-full">
              <span className="capitalize text-label font-medium text-foreground">
                {isReadOnly ? "Viewer (Read-only)" : permissionRole === "owner" ? "Owner" : "Editor"}
              </span>
              {hasPassword && (
                <span className="flex items-center gap-1 rounded-chrome-xs bg-amber-500/10 px-1.5 py-0.5 text-micro font-medium text-amber-600 dark:text-amber-400">
                  <LockIcon size={10} weight="bold" />
                  Protected
                </span>
              )}
            </div>
          </Row>
          <div className="mt-1 flex flex-col gap-1.5">
            {isReadOnly ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-full gap-1.5 rounded-chrome-sm text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={() => st().setUnlockModalOpen(true)}
              >
                <LockKeyIcon size={13} weight="bold" />
                Unlock to Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-full gap-1.5 rounded-chrome-sm text-xs font-medium"
                onClick={() => st().setPasswordModalOpen(true)}
              >
                <ShieldIcon size={13} weight="duotone" />
                {hasPassword ? "Manage Password" : "Set Password Protection"}
              </Button>
            )}
          </div>
          <PanelNote>
            {hasPassword
              ? "Password-protected page. 3 failed attempts locks editing."
              : "Protect this page with a password to restrict edit access."}
          </PanelNote>
        </PanelSection>
      )}

      {/* Export Section */}
      <PanelSection id="page-export" title="Export">
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px]"
            onClick={() => exportAsPdf()}
          >
            <FilePdfIcon size={14} className="text-red-500" weight="bold" />
            <span>PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px]"
            onClick={() => exportAsSvg()}
          >
            <FileSvgIcon size={14} className="text-amber-500" weight="bold" />
            <span>SVG</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-col gap-0.5 rounded-chrome-sm p-1 text-[11px]"
            onClick={() => exportAsPngFile()}
          >
            <FileImageIcon size={14} className="text-blue-500" weight="bold" />
            <span>PNG</span>
          </Button>
        </div>
      </PanelSection>

      <PanelSection id="page-paper" title="Paper">
        <Row label="Shade">
          <Segmented
            ariaLabel="Paper shade"
            options={paperOptions}
            shared={{ mixed: false, value: paper }}
            onChange={(s) => st().setPaper(s)}
          />
        </Row>
        <Row spread label="Dot grid">
          <Switch checked={grid} aria-label="Dot grid" onCheckedChange={(on) => st().setGrid(on)} className="scale-90" />
        </Row>
      </PanelSection>

      <PanelSection id="page-ink" title="Ink & Typography">
        <Row label="Palette">
          <InkPicker />
        </Row>
        <Row label="All Colors">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1.5 rounded-chrome-sm text-xs font-medium justify-start"
            onClick={() => st().setColorSizeStudioOpen(true)}
            title="Open all colors, custom swatches & pencil options"
          >
            <PaletteIcon size={14} weight="duotone" className="text-primary" />
            <span>Open All Color Options</span>
          </Button>
        </Row>
        <Row label="Font">
          <FontPicker
            value={font}
            onChange={(f) => st().setFont(f)}
          />
        </Row>
        <PanelNote>50+ curated fonts & custom Google fonts — saved with this drawing</PanelNote>
      </PanelSection>

      <PanelSection id="page-view" title="View">
        <Row spread label="Smart Sketch">
          <Switch
            checked={smartSketch}
            aria-label="Smart Sketch"
            onCheckedChange={(on) => st().setSmartSketch(on)}
            className="scale-90"
          />
        </Row>
        <PanelNote>auto-recognize shapes & symbols from freehand sketches</PanelNote>
        <Row spread label="Page panel">
          <Switch
            checked={pagePanel}
            aria-label="Page panel"
            onCheckedChange={(on) => st().setPagePanel(on)}
            className="scale-90"
          />
        </Row>
        <Row spread label="Context menu">
          <Switch
            checked={!!contextRow}
            aria-label="Context menu"
            onCheckedChange={(on) => st().setContextRow(on)}
            className="scale-90"
          />
        </Row>
        <PanelNote>quick controls float above the selection</PanelNote>
      </PanelSection>
    </>
  )
}

/** Footer for the page panel — whole-canvas moves, not selection ones. */
function PageFooter() {
  const count = useSquig((s) => s.order.length)
  const st = useSquig.getState

  return (
    <PanelFooter>
      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        className="h-ctl flex-1 rounded-chrome-sm text-label"
        onClick={() => st().zoomToFit()}
      >
        <ArrowsOutIcon className="size-3" /> Fit
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        className="h-ctl flex-1 rounded-chrome-sm text-label"
        onClick={() => st().selectAll()}
      >
        <SelectionAllIcon className="size-3" /> Select all
      </Button>
    </PanelFooter>
  )
}

// ---------------------------------------------------------------------------

function SelectionEditor({ selected }: { selected: SquigNode[] }) {
  const st = useSquig.getState
  const multi = selected.length > 1

  /**
   * Apply a patch to every node that wants one.
   *
   * `checkpoint: false` is for controls that stream — a scrub takes a single
   * checkpoint when the drag starts and then writes freely, so asking for one
   * per pixel would bury the undo stack.
   */
  const patch = (make: (n: SquigNode) => Partial<SquigNode> | null, opts?: { checkpoint?: boolean }) => {
    const patches: Record<string, Partial<SquigNode>> = {}
    for (const n of selected) {
      const p = make(n)
      if (p) patches[n.id] = p
    }
    if (Object.keys(patches).length) st().updateNodes(patches, { checkpoint: opts?.checkpoint ?? true })
  }
  const live = (make: (n: SquigNode) => Partial<SquigNode> | null) => patch(make, { checkpoint: false })
  const startGesture = () => st().checkpoint()

  const grouped = selected.some((n) => n.groupIds?.length)
  const font = useSquig((s) => s.font)
  const components = selected.filter((n): n is ComponentNode => n.type === "component")
  const shapes = selected.filter((n): n is ShapeNode => n.type === "shape")
  const arrows = selected.filter((n): n is ArrowNode => n.type === "arrow")
  const texts = selected.filter((n): n is TextNode => n.type === "text")
  const pdfs = selected.filter((n): n is PdfNode => n.type === "pdf")
  const images = selected.filter((n): n is ImageNode => n.type === "image")
  // components draw their own strokes from authored prims — a pen weight set
  // here would have nothing to apply to without rewriting the whole library
  const outlined = selected.filter((n) => n.type === "shape" || n.type === "draw" || n.type === "arrow")

  const controls = components.length === selected.length ? sharedControls(components) : []
  const variantControls = controls.filter((c) => c.type !== "text")
  const textControls = controls.filter((c) => c.type === "text")

  /** Only worth printing a count when the section misses part of the selection. */
  const partial = (n: number) => (n === selected.length ? undefined : n)

  return (
    <>
      {grouped && (
        <div className="border-b border-border/60 px-gutter py-3">
          <PanelNote>
            grouped — {kbd("mod+click")} to reach one piece, {kbd("mod+shift+g")} to undo the grouping.
          </PanelNote>
        </div>
      )}

      {/* Position & size — a dash means they disagree; type to make them agree.
          Typing sets every node to that value (Figma does the same); scrubbing
          and arrow keys nudge each from its own, so a mixed field stays mixed. */}
      <PanelSection id="position" title="Position">
        <div className="grid grid-cols-2 gap-1.5">
          <MixedNumberField
            label="X"
            shared={sharedNumber(selected, (n) => n.x)}
            onGestureStart={startGesture}
            onCommit={(v) => live(() => ({ x: v }))}
            onStep={(d) => live((n) => ({ x: n.x + d }))}
          />
          <MixedNumberField
            label="Y"
            shared={sharedNumber(selected, (n) => n.y)}
            onGestureStart={startGesture}
            onCommit={(v) => live(() => ({ y: v }))}
            onStep={(d) => live((n) => ({ y: n.y + d }))}
          />
          <MixedNumberField
            label="W"
            min={MIN_SIZE}
            shared={sharedNumber(selected, (n) => n.w)}
            onGestureStart={startGesture}
            onCommit={(v) => live((n) => resizeTo(n, Math.max(MIN_SIZE, v), n.h))}
            onStep={(d) => live((n) => resizeTo(n, Math.max(MIN_SIZE, n.w + d), n.h))}
          />
          <MixedNumberField
            label="H"
            min={MIN_SIZE}
            shared={sharedNumber(selected, (n) => n.h)}
            onGestureStart={startGesture}
            onCommit={(v) => live((n) => resizeTo(n, n.w, Math.max(MIN_SIZE, v)))}
            onStep={(d) => live((n) => resizeTo(n, n.w, Math.max(MIN_SIZE, n.h + d)))}
          />
        </div>

        {/* eight icons don't fit beside a label column, so alignment takes the
            full width and flipping — which is always available — keeps the row */}
        {multi && (
          <StackRow label="Align">
            <AlignRow count={selected.length} className="justify-between" />
          </StackRow>
        )}

        <Row label="Flip">
          <IconAction label={`Flip horizontally · ${kbd("shift+h")}`} onClick={() => st().flipSelected("x")}>
            <FlipHorizontalIcon className="size-3.5" />
          </IconAction>
          <IconAction label={`Flip vertically · ${kbd("shift+v")}`} onClick={() => st().flipSelected("y")}>
            <FlipVerticalIcon className="size-3.5" />
          </IconAction>
        </Row>
      </PanelSection>

      {/* --- contextual: text ------------------------------------------- */}
      {texts.length > 0 && (
        <PanelSection id="text" title="Text" count={partial(texts.length)}>
          <StackRow>
            <MixedTextField
              ariaLabel="Text"
              shared={shared(texts.map((n) => n.text))}
              onCommit={(v) => patch((n) => (n.type === "text" ? (fitTextBox(n, v) as Partial<SquigNode>) : null))}
            />
          </StackRow>

          <Row label="Font">
            <FontPicker
              value={texts[0]?.fontFamily || font || "hand"}
              onChange={(f) => {
                patch((n) => (n.type === "text" ? ({ fontFamily: f } as Partial<SquigNode>) : null))
              }}
            />
          </Row>

          <Row label="Align">
            <Segmented
              ariaLabel="Text alignment"
              options={ALIGN_OPTIONS}
              shared={sharedAlign(texts)}
              onChange={(align) => st().setTextAlign(align)}
            />
          </Row>

          <Row label="Style">
            <TextStyleToggles texts={texts} />
          </Row>

          {/* A link is a value, not a mode — so it gets a field showing where
              the text actually points. Empty means it points nowhere, and
              clearing the field is how you unlink. ⌘K still opens the floating
              editor over the canvas for the same value. */}
          <Row label="Link">
            <MixedTextField
              ariaLabel="Link"
              placeholder="https://…"
              shared={shared(texts.map((n) => n.link ?? ""))}
              onCommit={(v) => st().setLinkOnSelection(v)}
            />
          </Row>

          <Row label="Size">
            <MixedNumberField
              label=""
              min={4}
              className="w-[78px]"
              shared={sharedNumber(texts, (n) => (n as TextNode).fontSize)}
              onGestureStart={startGesture}
              onCommit={(v) =>
                live((n) => (n.type === "text" && v > 0 ? (fitTextBox(n, n.text, v) as Partial<SquigNode>) : null))
              }
              onStep={(d) =>
                live((n) =>
                  n.type === "text" ? (fitTextBox(n, n.text, Math.max(4, n.fontSize + d)) as Partial<SquigNode>) : null
                )
              }
            />
          </Row>
        </PanelSection>
      )}

      {texts.length > 0 && (
        <PanelSection id="text-color" title="Text Color" count={partial(texts.length)}>
          <ColorPencilPalette initialTarget="text" showPencilGrades={false} />
        </PanelSection>
      )}

      {/* --- contextual: fill ------------------------------------------- */}
      {shapes.length > 0 && (
        <PanelSection id="fill" title="Fill" count={partial(shapes.length)}>
          <Row label="Tone">
            <Segmented
              ariaLabel="Fill tone"
              options={FILL_OPTIONS}
              shared={shared(shapes.map((n) => normalizeFill(n.fill)))}
              onChange={(tone) => patch((n) => (n.type === "shape" ? ({ fill: tone } as Partial<SquigNode>) : null))}
            />
          </Row>
        </PanelSection>
      )}

      {/* --- contextual: outline ---------------------------------------- */}
      {outlined.length > 0 && (
        <PanelSection id="outline" title="Outline" count={partial(outlined.length)}>
          <Row label="Pen">
            <Segmented
              ariaLabel="Pen weight"
              options={STROKE_OPTIONS}
              shared={shared(outlined.map((n) => ("stroke" in n ? (n.stroke ?? "regular") : "regular")))}
              onChange={(weight) => patch((n) => (isOutlined(n) ? ({ stroke: weight } as Partial<SquigNode>) : null))}
            />
          </Row>
          <Row spread label="Dashed">
            <MixedSwitch
              ariaLabel="Dashed"
              shared={shared(outlined.map((n) => ("dashed" in n ? !!n.dashed : false)))}
              onChange={(on) => patch((n) => (isOutlined(n) ? ({ dashed: on } as Partial<SquigNode>) : null))}
            />
          </Row>
        </PanelSection>
      )}

      {outlined.length > 0 && (
        <PanelSection id="drawing-color-pencil" title="Drawing Color & Pencil" count={partial(outlined.length)}>
          <ColorPencilPalette initialTarget="draw" showPencilGrades={true} />
        </PanelSection>
      )}

      {/* --- contextual: arrows ------------------------------------------ */}
      {arrows.length > 0 && (
        <PanelSection id="arrow" title="Arrow" count={partial(arrows.length)}>
          <Row spread label="Head">
            <MixedSwitch
              ariaLabel="Arrowhead"
              shared={shared(arrows.map((n) => n.head))}
              onChange={(on) => patch((n) => (n.type === "arrow" ? ({ head: on } as Partial<SquigNode>) : null))}
            />
          </Row>
        </PanelSection>
      )}

      {/* --- contextual: pdf documents ----------------------------------- */}
      {pdfs.length > 0 && (
        <PanelSection id="pdf" title="PDF Document" count={partial(pdfs.length)}>
          {pdfs.length === 1 && (
            <>
              <div className="px-gutter py-1">
                <p className="truncate text-label font-medium text-foreground" title={pdfs[0].name}>
                  {pdfs[0].name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[
                    pdfs[0].pageCount ? `${pdfs[0].pageCount} ${pdfs[0].pageCount === 1 ? "page" : "pages"}` : null,
                    pdfs[0].fileSize ? `${Math.round(pdfs[0].fileSize / 1024)} KB` : null,
                    Object.values(pdfs[0].annotations || {}).flat().length > 0
                      ? `${Object.values(pdfs[0].annotations || {}).flat().length} annotations`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>

              <Row label="View">
                <Segmented
                  ariaLabel="View mode"
                  options={[
                    { value: "card", label: "Card" },
                    { value: "page", label: "Page" },
                  ]}
                  shared={{ mixed: false, value: pdfs[0].viewMode || "card" }}
                  onChange={(v) => st().updateNode(pdfs[0].id, { viewMode: v as "card" | "page" })}
                />
              </Row>

              {(pdfs[0].pageCount ?? 1) > 1 && (
                <Row label="Page">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={(pdfs[0].currentPage ?? 1) <= 1}
                      onClick={async () => {
                        const pdf = pdfs[0]
                        const newPage = Math.max(1, (pdf.currentPage ?? 1) - 1)
                        const previewSrc = (await renderPdfPage(pdf.src, newPage, pdf.attachmentId)) ?? undefined
                        st().updateNode(pdf.id, { currentPage: newPage, previewSrc })
                      }}
                    >
                      <CaretLeftIcon className="size-3" />
                    </Button>
                    <span className="text-[12px] tabular-nums font-mono">
                      {pdfs[0].currentPage ?? 1} / {pdfs[0].pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={(pdfs[0].currentPage ?? 1) >= (pdfs[0].pageCount ?? 1)}
                      onClick={async () => {
                        const pdf = pdfs[0]
                        const total = pdf.pageCount ?? 1
                        const newPage = Math.min(total, (pdf.currentPage ?? 1) + 1)
                        const previewSrc = (await renderPdfPage(pdf.src, newPage, pdf.attachmentId)) ?? undefined
                        st().updateNode(pdf.id, { currentPage: newPage, previewSrc })
                      }}
                    >
                      <CaretRightIcon className="size-3" />
                    </Button>
                  </div>
                </Row>
              )}

              <div className="flex flex-col gap-1.5 px-gutter py-2">
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 w-full justify-start text-[11px] bg-[var(--sq-ink)] text-[var(--sq-paper)] hover:opacity-90"
                  onClick={() => st().openClassroom(pdfs[0].id)}
                >
                  <ChalkboardTeacherIcon className="mr-1.5 size-3.5" /> Present / Classroom Mode
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-full justify-start text-[11px]"
                  onClick={() => downloadOriginalPdf(pdfs[0].src, pdfs[0].attachmentId, pdfs[0].name)}
                >
                  <DownloadSimpleIcon className="mr-1.5 size-3.5" /> Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-full justify-start text-[11px]"
                  onClick={() => openPdfInNewTab(pdfs[0].src, pdfs[0].attachmentId)}
                >
                  <ArrowSquareOutIcon className="mr-1.5 size-3.5" /> Open in New Tab
                </Button>
                {pdfs[0].naturalW && pdfs[0].naturalH && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full justify-start text-[11px]"
                    onClick={() => {
                      const pdf = pdfs[0]
                      const ratio = (pdf.naturalW || 612) / (pdf.naturalH || 792)
                      const previewH = Math.round((pdf.w - 28) / ratio)
                      const newH = Math.max(120, previewH + 66)
                      st().updateNode(pdf.id, { h: newH })
                    }}
                  >
                    <ArrowsClockwiseIcon className="mr-1.5 size-3.5" /> Reset Aspect Ratio
                  </Button>
                )}
              </div>
            </>
          )}
        </PanelSection>
      )}

      {/* --- contextual: image media layers ------------------------------ */}
      {images.length > 0 && (
        <PanelSection id="image" title="Image" count={partial(images.length)}>
          <div className="px-gutter py-1">
            <p className="truncate text-label font-medium text-foreground">
              {images[0].name || "Image Layer"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {Math.round(images[0].w)} × {Math.round(images[0].h)} px
              {images[0].naturalW ? ` (native: ${images[0].naturalW} × ${images[0].naturalH})` : ""}
            </p>
          </div>
          <div className="px-gutter py-1.5 flex flex-col gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full justify-start text-[11px] gap-1.5"
              onClick={() => importImage()}
            >
              <FileImageIcon className="size-3.5 text-blue-500" />
              <span>Import / Insert Another Image</span>
            </Button>
            {images[0].naturalW && images[0].naturalH && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-full justify-start text-[11px] gap-1.5"
                onClick={() => {
                  const img = images[0]
                  const ratio = img.naturalW / img.naturalH
                  st().updateNode(img.id, { h: Math.round(img.w / ratio) })
                }}
              >
                <ArrowsClockwiseIcon className="size-3.5" />
                <span>Reset Aspect Ratio</span>
              </Button>
            )}
          </div>
        </PanelSection>
      )}

      {/* --- contextual: component variants ------------------------------ */}
      {components.length > 0 && components.length === selected.length && (
        <>
          {variantControls.length > 0 && (
            <PanelSection id="variant" title="Variant">
              {variantControls.map((c) => (
                <VariantControl key={c.key} nodes={components} control={c} />
              ))}
            </PanelSection>
          )}
          {textControls.length > 0 && (
            <PanelSection id="content" title="Content">
              {textControls.map((c) => (
                <VariantControl key={c.key} nodes={components} control={c} />
              ))}
            </PanelSection>
          )}
          {multi && !controls.length && (
            <div className="p-gutter">
              <PanelNote>
                these components don&apos;t share any settings. select fewer kinds at once to tweak them.
              </PanelNote>
            </div>
          )}
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------

function Footer({ selected }: { selected: SquigNode[] }) {
  const st = useSquig.getState
  // icons re-emit as icon components, so detaching one changes nothing
  const components = selected.filter((n) => n.type === "component" && n.kind !== "icon")
  const draws = selected.filter((n) => n.type === "draw")
  const allLocked = selected.length > 0 && selected.every((n) => n.locked)

  return (
    <PanelFooter className="flex-col gap-1.5 items-stretch">
      {draws.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-ctl w-full rounded-chrome-sm text-label bg-[var(--sq-bg)] hover:bg-[var(--sq-paper)] text-[var(--sq-ink)] border-[var(--sq-border)]"
            onClick={async () => {
              try {
                for (const d of draws) {
                  const pts = d.strokes && d.strokes.length > 0
                    ? d.strokes.map((stroke) => stroke.map(([px, py]) => [px + d.x, py + d.y] as [number, number]))
                    : [(d.points || []).map(([px, py]) => [px + d.x, py + d.y] as [number, number])]
                  const res = await recognizeSketch(pts, { x: d.x, y: d.y, w: d.w, h: d.h }, true)
                  if (res.recognized && res.kind) {
                    st().checkpoint()
                    const recognizedNode = renderRecognizedNode(
                      d.id,
                      res.kind,
                      { x: d.x, y: d.y, w: d.w, h: d.h },
                      { color: d.color, stroke: (d as any).stroke, opacity: d.opacity },
                      res.metadata
                    )
                    useSquig.setState((s) => ({ nodes: { ...s.nodes, [d.id]: recognizedNode } }))
                    st().setNotice(`Converted to ${getSketchLabel(res.kind, res.text)}`)
                  } else {
                    st().setNotice("Could not recognize a matching shape")
                  }
                }
              } catch (err) {
                console.warn("[Inspector] Recognize shape failed:", err)
              }
            }}
            title="Convert sketch into clean recognized napkin shape"
          >
            <SparkleIcon className="size-3 text-amber-500" /> Recognize Shape
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-ctl w-full rounded-chrome-sm text-label bg-[var(--sq-bg)] hover:bg-[var(--sq-paper)] text-[var(--sq-ink)] border-[var(--sq-border)]"
            onClick={() => st().setHandwritingModalOpen(true)}
            title="Convert handwriting to text or LaTeX math using Gemini OCR"
          >
            <SparkleIcon className="size-3 text-[var(--sq-accent)]" /> OCR Handwriting / Math
          </Button>
        </>
      )}

      <div className="flex items-center gap-1.5 w-full">
        <Button
          variant="outline"
          size="sm"
          className="h-ctl flex-1 rounded-chrome-sm text-label"
          onClick={() => st().toggleLockSelected()}
          title={allLocked ? "Unlock selected layers" : "Lock selected layers"}
        >
          {allLocked ? <LockOpenIcon className="size-3" /> : <LockIcon className="size-3" />}
          {allLocked ? "Unlock" : "Lock"}
        </Button>

        {components.length > 0 && (
          <Button variant="outline" size="sm" className="h-ctl flex-1 rounded-chrome-sm text-label" onClick={() => st().detachSelected()}>
            <LinkBreakIcon className="size-3" /> Detach
            {components.length > 1 && <span className="tabular-nums">({components.length})</span>}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-ctl flex-1 rounded-chrome-sm text-label text-muted-foreground hover:text-destructive"
          onClick={() => st().deleteSelected()}
        >
          <TrashIcon className="size-3" /> Delete
        </Button>
      </div>
    </PanelFooter>
  )
}

// ---------------------------------------------------------------------------

/** Nodes that carry their own pen settings. */
function isOutlined(n: SquigNode): boolean {
  return n.type === "shape" || n.type === "draw" || n.type === "arrow"
}

/**
 * Set one node's size through the exact transform the resize handle uses, so
 * typing "200" and dragging to 200 produce the same document rather than two
 * subtly different ones.
 */
function resizeTo(n: SquigNode, w: number, h: number): Partial<SquigNode> {
  // typing a width into a text layer sets the measure its words wrap to — the
  // same thing dragging a side handle does — rather than stretching the box
  // around the type
  if (n.type === "text" && w !== n.w) return setTextWidth(n, w) as Partial<SquigNode>
  const from = unionBounds([n])!
  return scaleNodes([n], from, { x: n.x, y: n.y, w, h })[n.id]
}

