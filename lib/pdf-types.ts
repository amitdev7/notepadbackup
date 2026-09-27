// ---------------------------------------------------------------------------
// Zenith — PDF Classroom & Smart Board Types & Coordinate Mathematics
// ---------------------------------------------------------------------------

export type PdfAnnotationTool =
  | "select"
  | "pencil"
  | "highlighter"
  | "eraser"
  | "text"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"

export type PdfSmartTool =
  | "laser"
  | "spotlight"
  | "magnifier"
  | "ruler"
  | "tempMarker"

export interface PdfAnnotationBase {
  id: string
  page: number // 1-based page index
  createdAt: number
  updatedAt?: number
  color?: string
  opacity?: number
  strokeWidth?: number
}

export interface PdfDrawAnnotation extends PdfAnnotationBase {
  type: "pencil" | "highlighter"
  /** Normalized coordinates [nx, ny] where (0,0) is top-left and (1,1) is bottom-right */
  points: [number, number][]
}

export interface PdfTextAnnotation extends PdfAnnotationBase {
  type: "text"
  /** Normalized coordinates */
  x: number
  y: number
  w?: number
  h?: number
  text: string
  fontSize: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export interface PdfShapeAnnotation extends PdfAnnotationBase {
  type: "rect" | "ellipse"
  /** Normalized coordinates */
  x: number
  y: number
  w: number
  h: number
  fill?: "none" | "shade" | "solid"
  fillColor?: string
  dashed?: boolean
}

export interface PdfLineAnnotation extends PdfAnnotationBase {
  type: "line" | "arrow"
  /** Normalized coordinates */
  x1: number
  y1: number
  x2: number
  y2: number
  head?: boolean
}

export interface PdfImageAnnotation extends PdfAnnotationBase {
  type: "image"
  /** Normalized coordinates */
  x: number
  y: number
  w: number
  h: number
  src: string
  name?: string
}

export type PdfAnnotation =
  | PdfDrawAnnotation
  | PdfTextAnnotation
  | PdfShapeAnnotation
  | PdfLineAnnotation
  | PdfImageAnnotation

export interface PdfTextToken {
  str: string
  x: number
  y: number
  w: number
  h: number
  nx: number
  ny: number
  nw: number
  nh: number
}

export interface PdfSearchMatch {
  page: number
  matchIndex: number
  text: string
  boxes: { nx: number; ny: number; nw: number; nh: number }[]
}

export interface DisappearingStroke {
  id: string
  points: [number, number][]
  createdAt: number
  expiresAt: number
  color?: string
}

export interface LaserPointerState {
  x: number // normalized or screen
  y: number
  active: boolean
  trail: { x: number; y: number; t: number }[]
}

export interface SpotlightState {
  x: number
  y: number
  radius: number
  enabled: boolean
}

export interface MagnifierState {
  x: number
  y: number
  zoom: number
  enabled: boolean
}

export interface RulerState {
  x: number
  y: number
  angle: number
  length: number
  enabled: boolean
}

export type SmartBoardGridKind = "none" | "dots" | "ruled" | "grid"

/** Coordinate conversions between Normalized (0..1), Display (px), and World (canvas) */
export const PdfCoord = {
  /** Convert normalized [0..1] point to display pixel point on screen */
  toDisplay(nx: number, ny: number, width: number, height: number): [number, number] {
    return [Math.round(nx * width), Math.round(ny * height)]
  },

  /** Convert display pixel point to normalized [0..1] coordinate */
  toNormalized(dx: number, dy: number, width: number, height: number): [number, number] {
    if (width <= 0 || height <= 0) return [0, 0]
    return [
      Math.max(0, Math.min(1, dx / width)),
      Math.max(0, Math.min(1, dy / height)),
    ]
  },

  /** Convert normalized point to canvas world coordinates */
  toWorld(
    nx: number,
    ny: number,
    nodeX: number,
    nodeY: number,
    nodeW: number,
    nodeH: number,
    contentInset = { left: 0, top: 0, right: 0, bottom: 0 }
  ): [number, number] {
    const usableW = Math.max(1, nodeW - contentInset.left - contentInset.right)
    const usableH = Math.max(1, nodeH - contentInset.top - contentInset.bottom)
    return [
      nodeX + contentInset.left + nx * usableW,
      nodeY + contentInset.top + ny * usableH,
    ]
  },

  /** Convert canvas world coordinate to normalized point on PDF node */
  fromWorld(
    wx: number,
    wy: number,
    nodeX: number,
    nodeY: number,
    nodeW: number,
    nodeH: number,
    contentInset = { left: 0, top: 0, right: 0, bottom: 0 }
  ): [number, number] {
    const usableW = Math.max(1, nodeW - contentInset.left - contentInset.right)
    const usableH = Math.max(1, nodeH - contentInset.top - contentInset.bottom)
    const localX = wx - (nodeX + contentInset.left)
    const localY = wy - (nodeY + contentInset.top)
    return [
      Math.max(0, Math.min(1, localX / usableW)),
      Math.max(0, Math.min(1, localY / usableH)),
    ]
  },
}
