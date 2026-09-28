// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Core Types and Interfaces
// Exposes strictly: ELLIPSE | RECTANGLE | LINE | ARROW | UNKNOWN
// ---------------------------------------------------------------------------

export type Point = [number, number]

export type ActiveFourShape = "ELLIPSE" | "RECTANGLE" | "LINE" | "ARROW" | "UNKNOWN"

export type GeometryKind =
  | "ellipse"
  | "rectangle"
  | "line"
  | "arrow"
  | "circle" // legacy alias that maps directly to ellipse

export type SymbolKind =
  | "checkmark"
  | "x"
  | "plus"
  | "minus"
  | "star"
  | "heart"
  | "cloud"

export type ObjectKind =
  | "apple"
  | "house"
  | "lightbulb"
  | "phone"
  | "tree"
  | "folder"
  | "camera"
  | "lock"
  | "envelope"
  | "calendar"
  | "document"
  | "gear"
  | "computer"
  | "monitor"
  | "person"
  | "car"
  | "clock"
  | "microphone"
  | "database"
  | "server"

export type RecognizedSketchKind = GeometryKind | SymbolKind | ObjectKind

export type SketchCategory = "geometry" | "symbol" | "object" | "handwriting"

export type RecognitionMode = "geometry" | "symbol" | "object" | "handwriting" | "sequence"

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export interface CharacterCandidate {
  text: string
  confidence: number
  bounds: Bounds
  strokeIndices: number[]
  source: "local" | "ai"
}

export interface HandwritingResult {
  recognized: boolean
  text: string
  characters: CharacterCandidate[]
  confidence: number
  bounds: { x: number; y: number; w: number; h: number }
  mode: "single_char" | "multi_char" | "word" | "number" | "alphanumeric"
  isWord?: boolean
  isNumber?: boolean
  isAlphanumeric?: boolean
  lineCount?: number
  baselineY?: number
}

export interface SketchClassMetadata {
  id: RecognizedSketchKind
  label: string
  category: SketchCategory
  aliases: string[]
  supportsLocal: boolean
  supportsAI: boolean
  minConfidence: number
  autoConvertAllowed: boolean
}

export interface StrokeFeatures {
  // Geometry bounds
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  aspectRatio: number
  diagonal: number

  // Path metrics
  pointCount: number
  strokeCount: number
  totalLength: number
  endpointsDistance: number
  closureRatio: number // endpointsDistance / Math.max(w, h, 1)
  straightness: number // endpointsDistance / totalLength

  // Corner and curvature metrics
  corners: Point[]
  cornerCount: number
  averageCurvature: number
  maxCurvature: number

  // Area and radial dispersion
  hullArea: number
  boxArea: number
  areaFillRatio: number // hullArea / boxArea
  circularity: number // (4 * Math.PI * hullArea) / (perimeter^2)
  radialVariance: number // standard deviation of distances from centroid / mean distance

  // Directional characteristics
  startPoint: Point
  endPoint: Point
  hasSelfIntersection: boolean
  inflectionPoints: Point[]
}

export interface RecognitionCandidate {
  kind: RecognizedSketchKind | string
  activeShape?: ActiveFourShape
  confidence: number
  source: "geometry" | "handwriting" | "symbol" | "object" | "ai" | "local"
  mode?: RecognitionMode
  text?: string
  characters?: CharacterCandidate[]
  metadata?: Record<string, any>
}

export interface RecognitionResult {
  recognized: boolean
  kind: RecognizedSketchKind | string | null
  activeShape?: ActiveFourShape
  confidence: number
  calibratedConfidence?: number
  source: "geometry" | "handwriting" | "symbol" | "object" | "ai" | "local"
  mode?: RecognitionMode
  text?: string
  characters?: CharacterCandidate[]
  candidates?: RecognitionCandidate[]
  bounds: {
    x: number
    y: number
    w: number
    h: number
  }
  metadata?: Record<string, any>
}

export interface PendingSuggestion {
  id: string
  nodeId: string
  kind: RecognizedSketchKind | string
  confidence: number
  label: string
  createdAt: number
  mode?: RecognitionMode
  text?: string
  canTeach?: boolean
  teachTarget?: "A" | "B"
  bounds: {
    x: number
    y: number
    w: number
    h: number
  }
  originalNode: Record<string, any>
}

export type DrawingSessionState =
  | "idle"
  | "stroke_active"
  | "stroke_finished"
  | "character_continuation_possible"
  | "character_group_confirmed"
  | "text_sequence_active"
  | "object_stroke_group"
  | "object_confirmed"
  | "sequence_finished"

export interface SessionStroke {
  id: string
  points: Point[]
  bounds: { x: number; y: number; w: number; h: number }
  timestamp: number
  features?: StrokeFeatures
}

export interface StrokeGroup {
  id: string
  strokes: Point[][]
  strokeIds: string[]
  bounds: { x: number; y: number; w: number; h: number }
  createdAt: number
  lastUpdated: number
  modeCandidate?: RecognitionMode
}

export const CONFIDENCE_THRESHOLDS = {
  /** Automatic conversion threshold (>= 0.88 for high precision) */
  AUTO_CONVERT: 0.88,
  /** Lightweight suggestion threshold (0.60 .. 0.87) */
  SUGGESTION: 0.6,
  /** Ignore / untouched threshold (< 0.60) */
  IGNORE: 0.6,
} as const
