// ---------------------------------------------------------------------------
// Excalidraw v2 Data Types and Interop Schema
// Compatible with @excalidraw/excalidraw v0.18.0
// ---------------------------------------------------------------------------

export type ExcalidrawElementType =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "line"
  | "arrow"
  | "freedraw"
  | "text"
  | "image"
  | "frame"
  | "magicframe"
  | "embeddable"
  | "stickyNote"

export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag"
export type StrokeStyle = "solid" | "dashed" | "dotted"
export type TextAlign = "left" | "center" | "right"
export type VerticalAlign = "top" | "middle" | "bottom"
export type FontFamily = 1 | 2 | 3 | 4 | 5 // 1=Virgil, 2=Helvetica/Sans, 3=Cascadia/Code, 4=Assistant

export interface PointBinding {
  elementId: string
  focus: number
  gap: number
}

export interface ExcalidrawElementBase {
  id: string
  x: number
  y: number
  strokeColor: string
  backgroundColor: string
  fillStyle: FillStyle
  strokeWidth: number
  strokeStyle: StrokeStyle
  roughness: number
  opacity: number
  width: number
  height: number
  angle: number
  seed: number
  version: number
  versionNonce: number
  isDeleted: boolean
  groupIds: readonly string[]
  frameId: string | null
  boundElements: readonly { id: string; type: "arrow" | "text" }[] | null
  updated?: number
  link: string | null
  locked: boolean
  customData?: Record<string, unknown>
}

export interface ExcalidrawGenericElement extends ExcalidrawElementBase {
  type: "rectangle" | "diamond" | "ellipse" | "frame" | "magicframe" | "embeddable"
  roundness: { type: number; value?: number } | null
}

export interface ExcalidrawTextElement extends ExcalidrawElementBase {
  type: "text"
  text: string
  fontSize: number
  fontFamily: FontFamily
  textAlign: TextAlign
  verticalAlign: VerticalAlign
  baseline: number
  containerId: string | null
  originalText: string
  lineHeight?: number
}

export interface ExcalidrawLinearElement extends ExcalidrawElementBase {
  type: "line" | "arrow"
  points: readonly [number, number][]
  lastCommittedPoint?: [number, number] | null
  startBinding: PointBinding | null
  endBinding: PointBinding | null
  startArrowhead: "arrow" | "bar" | "dot" | "triangle" | null
  endArrowhead: "arrow" | "bar" | "dot" | "triangle" | null
  elbowed?: boolean
}

export interface ExcalidrawFreeDrawElement extends ExcalidrawElementBase {
  type: "freedraw"
  points: readonly [number, number][]
  pressures: readonly number[]
  simulatePressure: boolean
}

export interface ExcalidrawImageElement extends ExcalidrawElementBase {
  type: "image"
  fileId: string | null
  status: "pending" | "saved" | "error"
  scale: [number, number]
}

export interface ExcalidrawStickyNoteElement extends ExcalidrawElementBase {
  type: "stickyNote"
  text?: string
}

export type ExcalidrawElement =
  | ExcalidrawGenericElement
  | ExcalidrawTextElement
  | ExcalidrawLinearElement
  | ExcalidrawFreeDrawElement
  | ExcalidrawImageElement
  | ExcalidrawStickyNoteElement

export interface ExcalidrawDocument {
  type: "excalidraw"
  version: 2
  source?: string
  elements: readonly ExcalidrawElement[]
  appState?: {
    viewBackgroundColor?: string
    gridSize?: number | null
    theme?: "light" | "dark"
    zoom?: { value: number }
    scrollX?: number
    scrollY?: number
  }
  files?: Record<string, { mimeType: string; id: string; dataURL: string; created: number }>
}

export interface ExcalidrawLibraryItem {
  id: string
  status: "published" | "unpublished"
  elements: readonly ExcalidrawElement[]
  name?: string
  created?: number
}

export interface ExcalidrawLibraryDoc {
  type: "excalidrawlib"
  version: 1 | 2
  source?: string
  libraryItems: readonly ExcalidrawLibraryItem[]
}
