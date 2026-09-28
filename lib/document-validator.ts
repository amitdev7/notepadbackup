// ---------------------------------------------------------------------------
// Document Validator & Schema Migration
// Validates untrusted incoming .zenithsui / JSON files, sanitizes nodes,
// migrates older schema versions, and strips sensitive credentials.
// ---------------------------------------------------------------------------

import type { FontMode, Look, PaperShade, ThemeName } from "./theme"
import type { SquigNode, Viewport, PdfPageAnnotation } from "./types"
import { normalizeFill } from "./types"
import { DEFAULT_LOOK, THEMES } from "./theme"

export const CURRENT_SCHEMA_VERSION = 1

export interface ZenithsuiDocument {
  app: "zenithsui"
  schemaVersion: number
  version?: number
  docId?: string
  fileName: string
  look: Look
  nodes: Record<string, SquigNode>
  order: string[]
  viewport?: Viewport
  metadata?: {
    appVersion?: string
    exportedAt?: string
    client?: string
  }
}

export type ValidationResult =
  | { success: true; doc: ZenithsuiDocument }
  | { success: false; error: string }

const NODE_TYPES = new Set(["component", "shape", "draw", "text", "arrow", "image", "pdf", "file"])
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const str = (v: unknown): v is string => typeof v === "string"

function validPoints(v: unknown): v is [number, number][] {
  return (
    Array.isArray(v) &&
    v.length >= 1 &&
    v.every((p) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1]))
  )
}

function validAnnotationsMap(v: unknown): Record<number, PdfPageAnnotation[]> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined
  const out: Record<number, PdfPageAnnotation[]> = {}
  for (const [k, list] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(list)) out[Number(k)] = list as PdfPageAnnotation[]
  }
  return out
}

/** Sanitize an individual node from an untrusted document */
export function sanitizeNode(id: string, v: unknown): SquigNode | null {
  if (!v || typeof v !== "object") return null
  const n = v as Record<string, unknown>

  if (!str(n.type) || !NODE_TYPES.has(n.type)) return null
  if (!num(n.x) || !num(n.y) || !num(n.w) || !num(n.h)) return null

  const baseNode = {
    id: str(n.id) && n.id.trim() ? n.id : id,
    x: n.x,
    y: n.y,
    w: Math.max(0, n.w),
    h: Math.max(0, n.h),
    seed: num(n.seed) ? n.seed : Math.floor(Math.random() * 2 ** 31),
    groupIds: Array.isArray(n.groupIds) && n.groupIds.every(str) ? n.groupIds : undefined,
    flipX: Boolean(n.flipX),
    flipY: Boolean(n.flipY),
  }

  switch (n.type) {
    case "component":
      if (!str(n.kind) || !n.props || typeof n.props !== "object") return null
      return {
        ...baseNode,
        type: "component",
        kind: n.kind,
        props: n.props as Record<string, unknown>,
      }

    case "shape":
      if (n.shape !== "rect" && n.shape !== "ellipse") return null
      return {
        ...baseNode,
        type: "shape",
        shape: n.shape,
        fill: normalizeFill(n.fill),
        stroke: n.stroke === "light" || n.stroke === "heavy" ? n.stroke : "regular",
        dashed: Boolean(n.dashed),
        color: str(n.color) ? n.color : undefined,
        opacity: num(n.opacity) ? n.opacity : undefined,
      }

    case "draw":
      if (!validPoints(n.points)) return null
      return {
        ...baseNode,
        type: "draw",
        points: n.points,
        strokes: Array.isArray(n.strokes) && n.strokes.every(validPoints) ? n.strokes : undefined,
        stroke: n.stroke === "light" || n.stroke === "heavy" ? n.stroke : "regular",
        dashed: Boolean(n.dashed),
        color: str(n.color) ? n.color : undefined,
        drawMode: n.drawMode === "marker" || n.drawMode === "highlighter" || n.drawMode === "pen" ? n.drawMode : undefined,
        opacity: num(n.opacity) ? n.opacity : undefined,
        strokeWidth: num(n.strokeWidth) ? n.strokeWidth : undefined,
      }

    case "arrow":
      if (!validPoints(n.points) || n.points.length !== 2) return null
      return {
        ...baseNode,
        type: "arrow",
        points: n.points as [[number, number], [number, number]],
        head: Boolean(n.head),
        stroke: n.stroke === "light" || n.stroke === "heavy" ? n.stroke : "regular",
        dashed: Boolean(n.dashed),
        color: str(n.color) ? n.color : undefined,
        opacity: num(n.opacity) ? n.opacity : undefined,
      }

    case "text":
      if (!str(n.text) || !num(n.fontSize)) return null
      return {
        ...baseNode,
        type: "text",
        text: n.text,
        fontSize: n.fontSize,
        fixedW: Boolean(n.fixedW),
        align: n.align === "center" || n.align === "right" ? n.align : "left",
        bold: Boolean(n.bold),
        italic: Boolean(n.italic),
        underline: Boolean(n.underline),
        link: str(n.link) ? n.link : undefined,
      }

    case "image":
      if (!str(n.src) || !/^data:image\//i.test(n.src)) return null
      return {
        ...baseNode,
        type: "image",
        src: n.src,
        naturalW: num(n.naturalW) ? n.naturalW : n.w,
        naturalH: num(n.naturalH) ? n.naturalH : n.h,
        name: str(n.name) ? n.name : undefined,
      }

    case "pdf":
      if (!str(n.src) || !str(n.name)) return null
      return {
        ...baseNode,
        type: "pdf",
        src: n.src,
        name: n.name,
        fileSize: num(n.fileSize) ? n.fileSize : undefined,
        pageCount: num(n.pageCount) && n.pageCount > 0 ? n.pageCount : 1,
        currentPage: num(n.currentPage) && n.currentPage > 0 ? n.currentPage : 1,
        previewSrc: str(n.previewSrc) && /^data:image\//i.test(n.previewSrc) ? n.previewSrc : undefined,
        attachmentId: str(n.attachmentId) ? n.attachmentId : undefined,
        naturalW: num(n.naturalW) ? n.naturalW : undefined,
        naturalH: num(n.naturalH) ? n.naturalH : undefined,
        annotations: validAnnotationsMap(n.annotations),
        annotationsByPage: validAnnotationsMap(n.annotationsByPage),
        rotations: n.rotations && typeof n.rotations === "object" && !Array.isArray(n.rotations) ? (n.rotations as Record<number, number>) : undefined,
        viewMode: n.viewMode === "page" || n.viewMode === "card" ? n.viewMode : undefined,
        whiteboardNotes: n.whiteboardNotes && typeof n.whiteboardNotes === "object" ? (n.whiteboardNotes as Record<string, any>) : undefined,
      }

    case "file":
      return {
        ...baseNode,
        type: "file",
        src: str(n.src) ? n.src : "",
        name: str(n.name) ? n.name : "attachment",
        fileSize: num(n.fileSize) ? n.fileSize : undefined,
        attachmentId: str(n.attachmentId) ? n.attachmentId : undefined,
        mimeType: str(n.mimeType) ? n.mimeType : undefined,
      }

    default:
      return null
  }
}

/**
 * Validate and safely parse an incoming JSON or .zenithsui document string/object.
 * Handles schema version checks and safe data migration.
 */
export function validateZenithsuiDocument(raw: unknown): ValidationResult {
  let parsed: Record<string, unknown>

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw.trim())
    } catch {
      return { success: false, error: "Invalid JSON format." }
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw as Record<string, unknown>
  } else {
    return { success: false, error: "Expected a valid document object or string." }
  }

  if (!parsed || typeof parsed !== "object") {
    return { success: false, error: "Document payload must be an object." }
  }

  // Schema version guard — coerce strings ("2") so they can't slip past.
  const incomingSchema = Number(
    typeof parsed.schemaVersion === "number" || typeof parsed.schemaVersion === "string"
      ? parsed.schemaVersion
      : (parsed.version as number)
  ) || 1
  if (incomingSchema > CURRENT_SCHEMA_VERSION) {
    return {
      success: false,
      error: `This document was created with a newer version of Zenithsui (schema v${incomingSchema}). Please update Zenithsui to open this file.`,
    }
  }

  // Basic structure check — arrays are objects too, but never a nodes map.
  if (!parsed.nodes || typeof parsed.nodes !== "object" || Array.isArray(parsed.nodes)) {
    return { success: false, error: "Document is missing a valid 'nodes' map." }
  }
  if (!Array.isArray(parsed.order)) {
    return { success: false, error: "Document is missing a valid 'order' array." }
  }

  // Sanitize nodes
  const cleanNodes: Record<string, SquigNode> = {}
  const rawNodes = parsed.nodes as Record<string, unknown>

  for (const [id, nodeData] of Object.entries(rawNodes)) {
    const sanitized = sanitizeNode(id, nodeData)
    if (sanitized) {
      cleanNodes[sanitized.id] = sanitized
    }
  }

  // Sanitize order
  const seen = new Set<string>()
  const cleanOrder: string[] = []
  for (const id of parsed.order) {
    if (typeof id === "string" && cleanNodes[id] && !seen.has(id)) {
      seen.add(id)
      cleanOrder.push(id)
    }
  }
  // Add any clean nodes that weren't listed in order
  for (const id of Object.keys(cleanNodes)) {
    if (!seen.has(id)) {
      cleanOrder.push(id)
      seen.add(id)
    }
  }

  const fileName =
    (str(parsed.fileName) && parsed.fileName.trim()) ||
    (str(parsed.name) && parsed.name.trim()) ||
    "imported scribbles"
  
  const rawLook = parsed.look as Partial<Look> | undefined
  const look: Look = {
    theme: rawLook?.theme && Object.prototype.hasOwnProperty.call(THEMES, rawLook.theme) ? rawLook.theme as ThemeName : DEFAULT_LOOK.theme,
    paper: rawLook?.paper && ["white", "subtle", "shaded"].includes(rawLook.paper) ? rawLook.paper as PaperShade : DEFAULT_LOOK.paper,
    font: rawLook?.font && ["hand", "sans", "serif"].includes(rawLook.font) ? rawLook.font as FontMode : DEFAULT_LOOK.font,
    grid: typeof rawLook?.grid === "boolean" ? rawLook.grid : DEFAULT_LOOK.grid,
  }

  let viewport: Viewport | undefined = undefined
  if (parsed.viewport && typeof parsed.viewport === "object") {
    const vp = parsed.viewport as Record<string, unknown>
    if (num(vp.x) && num(vp.y) && num(vp.zoom) && (vp.zoom as number) > 0) {
      viewport = { x: vp.x, y: vp.y, zoom: vp.zoom }
    }
  }

  const meta = (parsed.metadata ?? {}) as Record<string, unknown>
  const doc: ZenithsuiDocument = {
    app: "zenithsui",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    fileName,
    look,
    nodes: cleanNodes,
    order: cleanOrder,
    viewport,
    metadata: {
      exportedAt: str(meta.exportedAt) ? (meta.exportedAt as string) : new Date().toISOString(),
      appVersion: "1.0.0",
    },
  }

  return { success: true, doc }
}
