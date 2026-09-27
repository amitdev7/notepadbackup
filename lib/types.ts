// ---------------------------------------------------------------------------
// Zenithsui — Core Node Types, Enums & Coordinate Helpers
//
// Every canvas element is a SquigNode.  The union is discriminated on `type`.
// All data is JSON-serializable — no classes, no React, no DOM.
// ---------------------------------------------------------------------------

// ── Tool palette ────────────────────────────────────────────────────────────

export type ToolKind =
  | "select"
  | "hand"
  | "rect"
  | "ellipse"
  | "line"
  | "draw"
  | "text"
  | "component"
  | "shape"
  | "arrow"
  | "image"

// ── Small vocabulary types ──────────────────────────────────────────────────

/** The two geometric primitives a ShapeNode can be. */
export type ShapeKind = "rect" | "ellipse"

/**
 * Fill tone — a semantic fill level, not a colour.
 *
 * `none`   → transparent
 * `paper`  → opaque in the page's paper colour (hides what's behind)
 * `light`  → faint shade
 * `strong` → saturated shade
 */
export type FillTone = "none" | "paper" | "light" | "strong"

/** Pen weight — relative pressure, not an absolute pixel width. */
export type StrokeWeight = "light" | "regular" | "heavy"

/** Text horizontal alignment. */
export type TextAlign = "left" | "center" | "right"

// ── Outline mixin ───────────────────────────────────────────────────────────

/**
 * Properties shared by every node that carries its own pen settings
 * (shapes, draws, arrows).  The inspector reads these to show the
 * "Outline" section.
 */
export interface Outlined {
  stroke?: StrokeWeight
  strokeWidth?: number
  color?: string
  opacity?: number
  dashed?: boolean
}

// ── Viewport & coordinate helpers ───────────────────────────────────────────

export interface Viewport {
  x: number
  y: number
  zoom: number
}

/**
 * Convert a screen-pixel position to world coordinates given a viewport.
 *
 * The viewport stores where world-origin maps to in screen space (x, y)
 * and the current zoom level.  Inverting that:
 *
 *   worldX = (screenX − viewport.x) / zoom
 *   worldY = (screenY − viewport.y) / zoom
 */
export function screenToWorld(
  v: Viewport,
  screenX: number,
  screenY: number,
): [number, number] {
  const z = v.zoom || 1
  return [(screenX - v.x) / z, (screenY - v.y) / z]
}

/**
 * Convert a world coordinate to screen pixels given a viewport.
 */
export function worldToScreen(
  v: Viewport,
  worldX: number,
  worldY: number,
): [number, number] {
  const z = v.zoom || 1
  return [worldX * z + v.x, worldY * z + v.y]
}

// ── Fill normalizer ─────────────────────────────────────────────────────────

const FILL_SET = new Set<FillTone>(["none", "paper", "light", "strong"])

/**
 * Coerce an unknown value into a valid `FillTone`.
 *
 * Imported documents, JSON payloads and older file versions may carry
 * anything in the `fill` slot.  This maps bad / missing values to
 * `"none"` so that the rest of the stack never has to null-check.
 */
export function normalizeFill(v: unknown): FillTone {
  if (typeof v === "string" && FILL_SET.has(v as FillTone)) return v as FillTone
  return "none"
}

// ── Base node ───────────────────────────────────────────────────────────────

export interface BaseNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  seed?: number
  /** Flip axes — applied after prims are computed. */
  flipX?: boolean
  flipY?: boolean
  /** Group membership.  A node may belong to nested groups. */
  groupIds?: string[]
  /** Prevent accidental edits. */
  locked?: boolean
}

// ── Concrete node types ─────────────────────────────────────────────────────

// -- Shape (rect / ellipse with optional fill) ----------------------------

export interface ShapeNode extends BaseNode, Outlined {
  type: "shape"
  shape: ShapeKind
  fill?: FillTone
  /** Custom fill hex / CSS colour (overrides tone when present). */
  fillColor?: string
  roughness?: number
}

// -- Arrow / line ---------------------------------------------------------

export type Point = [number, number]

export interface ArrowNode extends BaseNode, Outlined {
  type: "arrow"
  /** Exactly two points: start and end, in node-local coordinates. */
  points: [Point, Point]
  /** Whether to draw an arrowhead at the end. */
  head: boolean
}

// -- Freehand draw --------------------------------------------------------

export interface DrawNode extends BaseNode, Outlined {
  type: "draw"
  points: Point[]
  /** When the drawing has multiple sub-strokes (e.g. recognized symbols). */
  strokes?: Point[][]
  /** Drawing tool variant. */
  drawMode?: "pen" | "marker" | "highlighter"
  /** If this stroke was the output of sketch recognition. */
  recognizedKind?: string
}

// -- Text -----------------------------------------------------------------

export interface TextNode extends BaseNode {
  type: "text"
  text: string
  fontSize: number
  /** Custom font family override (defaults to the document's font). */
  fontFamily?: string
  color?: string
  opacity?: number
  align?: TextAlign
  bold?: boolean
  italic?: boolean
  underline?: boolean
  /** Whether the box width is user-pinned (side-handle resized). */
  fixedW?: boolean
  /** A hyperlink attached to the whole text block. */
  link?: string
}

// -- Image ----------------------------------------------------------------

export interface ImageNode extends BaseNode {
  type: "image"
  /** Data-URL of the embedded image. */
  src: string
  /** Original pixel dimensions (for aspect-ratio reset). */
  naturalW: number
  naturalH: number
  name?: string
}

// -- PDF document ---------------------------------------------------------

export interface PdfNode extends BaseNode {
  type: "pdf"
  /** Data-URL or blob-URL of the PDF. */
  src: string
  name: string
  fileSize?: number
  pageCount?: number
  currentPage?: number
  /** Thumbnail / preview data-URL of the current page. */
  previewSrc?: string
  /** Key into the offline attachment store. */
  attachmentId?: string
  /** Native page dimensions in PDF points. */
  naturalW?: number
  naturalH?: number
  /** Legacy annotations keyed by page (flat format). */
  annotations?: Record<number, unknown[]>
  /** Classroom annotations keyed by 1-based page number. */
  annotationsByPage?: Record<number, PdfPageAnnotation[]>
  /** Per-page rotation overrides (degrees). */
  rotations?: Record<number, number>
  viewMode?: "card" | "page"
  /** Whiteboard-mode scratch notes. */
  whiteboardNotes?: Record<string, unknown>
}

// -- File attachment (generic binary) -------------------------------------

export interface FileNode extends BaseNode {
  type: "file"
  src: string
  name: string
  fileSize?: number
  attachmentId?: string
  mimeType?: string
}

// -- Component (library instances) ----------------------------------------

export interface ComponentNode extends BaseNode {
  type: "component"
  kind: string
  props: Record<string, unknown>
}

// ── PDF Classroom Annotation types (lightweight, normalized 0‑1) ─────────

/**
 * Stroke annotation — pen or highlighter strokes recorded in normalized
 * coordinates (0–1) relative to the rendered page.
 */
export interface PdfStrokeAnnotation {
  id: string
  type: "stroke"
  points: [number, number][]
  color: string
  strokeWidth: number
  opacity: number
  isHighlighter?: boolean
}

/** Shape annotation — rect, ellipse, line or arrow drawn on a PDF page. */
export interface PdfShapeAnnotation {
  id: string
  type: "shape"
  kind: "rect" | "ellipse" | "arrow" | "line"
  x: number
  y: number
  w: number
  h: number
  color: string
  strokeWidth: number
}

/** Text annotation placed on a PDF page. */
export interface PdfTextAnnotation {
  id: string
  type: "text"
  x: number
  y: number
  text: string
  fontSize: number
  color: string
}

/** Image annotation pasted/uploaded onto a PDF page. */
export interface PdfImageAnnotation {
  id: string
  type: "image"
  x: number
  y: number
  w: number
  h: number
  src: string
  name?: string
}

/** Union of all annotation kinds that can appear on a single PDF page. */
export type PdfPageAnnotation =
  | PdfStrokeAnnotation
  | PdfShapeAnnotation
  | PdfTextAnnotation
  | PdfImageAnnotation

// ── Node union ──────────────────────────────────────────────────────────────

/**
 * The union of every node that can appear on a Zenithsui canvas.
 *
 * Discriminate on `type`.  Every branch's `type` literal is unique, so
 * a `switch` narrows automatically.
 *
 * Legacy alias: the repo uses both `SquigNode` and contextual per-type
 * imports.
 */
export type SquigNode =
  | ShapeNode
  | ArrowNode
  | DrawNode
  | TextNode
  | ImageNode
  | PdfNode
  | FileNode
  | ComponentNode

// ── Legacy compatibility re-exports ─────────────────────────────────────────
// The original stub exported RectNode / EllipseNode / LineNode individually.
// Nothing in the live codebase imports them (those names never appear in any
// `import` statement), but we keep the aliases so any stale reference compiles.

export type RectNode = ShapeNode & { shape: "rect" }
export type EllipseNode = ShapeNode & { shape: "ellipse" }
export type LineNode = ArrowNode & { head: false }

// ── Bounding-box helper ─────────────────────────────────────────────────────
// scripts/test-text.ts imports `unionBox` from this module and expects a
// `{ minX, minY, maxX, maxY }` box (a box of one node is that node).
// lib/selection.ts exposes `unionBounds` ({ x, y, w, h }) for the UI;
// this is the pure, JSON-free companion that keeps the old import working.

export interface UnionBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function unionBox(nodes: readonly SquigNode[]): UnionBox | null {
  if (!nodes || !nodes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    if (!n) continue
    const x = Number.isFinite(n.x) ? n.x : 0
    const y = Number.isFinite(n.y) ? n.y : 0
    const w = Number.isFinite(n.w) ? Math.max(0, n.w) : 0
    const h = Number.isFinite(n.h) ? Math.max(0, n.h) : 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + w > maxX) maxX = x + w
    if (y + h > maxY) maxY = y + h
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }
  return { minX, minY, maxX, maxY }
}
