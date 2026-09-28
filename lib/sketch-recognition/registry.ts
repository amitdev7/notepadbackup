// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Centralized Registry of Supported Classes
// Strictly restricted to four shapes: ELLIPSE, RECTANGLE, LINE, ARROW
// All other classes have been safely removed and preserved in recognition_backup.
// ---------------------------------------------------------------------------

import type { ActiveFourShape, RecognizedSketchKind, SketchClassMetadata } from "./types"

export const FOUR_SHAPE_CLASSES: readonly ActiveFourShape[] = [
  "ELLIPSE",
  "RECTANGLE",
  "LINE",
  "ARROW",
] as const

export const SKETCH_REGISTRY: Record<string, SketchClassMetadata> = {
  ellipse: {
    id: "ellipse",
    label: "Ellipse",
    category: "geometry",
    aliases: ["oval", "circle", "round", "egg"],
    supportsLocal: true,
    supportsAI: false,
    minConfidence: 0.75,
    autoConvertAllowed: true,
  },
  rectangle: {
    id: "rectangle",
    label: "Rectangle",
    category: "geometry",
    aliases: ["box", "rect", "square"],
    supportsLocal: true,
    supportsAI: false,
    minConfidence: 0.75,
    autoConvertAllowed: true,
  },
  line: {
    id: "line",
    label: "Line",
    category: "geometry",
    aliases: ["segment", "bar", "stroke"],
    supportsLocal: true,
    supportsAI: false,
    minConfidence: 0.75,
    autoConvertAllowed: true,
  },
  arrow: {
    id: "arrow",
    label: "Arrow",
    category: "geometry",
    aliases: ["pointer", "vector"],
    supportsLocal: true,
    supportsAI: false,
    minConfidence: 0.75,
    autoConvertAllowed: true,
  },
  circle: {
    id: "circle",
    label: "Ellipse",
    category: "geometry",
    aliases: ["round", "disc"],
    supportsLocal: true,
    supportsAI: false,
    minConfidence: 0.75,
    autoConvertAllowed: true,
  },
}

export function isSupportedSketchKind(kind: string): kind is RecognizedSketchKind {
  return kind in SKETCH_REGISTRY
}

export function getSketchMetadata(kind: RecognizedSketchKind): SketchClassMetadata {
  return SKETCH_REGISTRY[kind] || SKETCH_REGISTRY.ellipse
}

export function getSketchLabel(kind: string, _text?: string): string {
  const norm = kind?.toLowerCase()
  if (norm === "ellipse" || norm === "circle") return "Ellipse"
  if (norm === "rectangle" || norm === "rect") return "Rectangle"
  if (norm === "line") return "Line"
  if (norm === "arrow") return "Arrow"
  return "Shape"
}
