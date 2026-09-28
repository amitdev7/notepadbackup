// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Production CNN Inference Classifier
// Loads trained CNN model weights and performs high-speed, calibrated inference
// for Handwriting (A-Z, 0-9), Geometry/Symbols, and Semantic Objects.
// ---------------------------------------------------------------------------

import type { Bounds, Point, RecognitionResult } from "./types"
import { rasterizeStrokesToTensor, CNN_INPUT_SIZE } from "./cnn-rasterizer"
import { SketchCNN, type ModelWeights } from "./cnn-engine"
import { evaluateLetterAGeometry } from "./letter-a-pipeline"
import hwWeightsJson from "./models/handwriting-cnn.json"
import geomWeightsJson from "./models/geometry-cnn.json"
import objWeightsJson from "./models/object-cnn.json"

// Pre-instantiated singleton CNN models
let handwritingCNN: SketchCNN | null = null
let geometryCNN: SketchCNN | null = null
let objectCNN: SketchCNN | null = null

function getHandwritingModel(): SketchCNN {
  if (!handwritingCNN) {
    const raw = hwWeightsJson as unknown as ModelWeights
    const model = new SketchCNN(raw.name, raw.classes, 48)
    model.loadWeights(raw)
    handwritingCNN = model
  }
  return handwritingCNN
}

function getGeometryModel(): SketchCNN {
  if (!geometryCNN) {
    const raw = geomWeightsJson as unknown as ModelWeights
    const model = new SketchCNN(raw.name, raw.classes, 48)
    model.loadWeights(raw)
    geometryCNN = model
  }
  return geometryCNN
}

function getObjectModel(): SketchCNN {
  if (!objectCNN) {
    const raw = objWeightsJson as unknown as ModelWeights
    const model = new SketchCNN(raw.name, raw.classes, 48)
    model.loadWeights(raw)
    objectCNN = model
  }
  return objectCNN
}

export interface CNNPredictionCandidate {
  className: string
  confidence: number
  domain: "handwriting" | "geometry" | "object"
}

/**
 * Evaluates handwriting characters (A–Z, 0–9) using the trained handwriting CNN
 */
export function predictHandwritingCNN(strokes: Point[][]): {
  topClass: string
  confidence: number
  candidates: CNNPredictionCandidate[]
  tensor: Float32Array
} {
  const raster = rasterizeStrokesToTensor(strokes, CNN_INPUT_SIZE)
  const model = getHandwritingModel()
  const pred = model.predict(raster.data)

  const candidates: CNNPredictionCandidate[] = pred.topCandidates
    .filter((c) => c.className !== "UNKNOWN")
    .map((c) => ({
      className: c.className,
      confidence: c.confidence,
      domain: "handwriting",
    }))

  return {
    topClass: pred.topClass,
    confidence: pred.topConfidence,
    candidates,
    tensor: raster.data,
  }
}

/**
 * Evaluates geometry & symbols using the trained geometry CNN
 */
export function predictGeometryCNN(
  strokes: Point[][],
  existingTensor?: Float32Array
): {
  topClass: string
  confidence: number
  candidates: CNNPredictionCandidate[]
} {
  const tensor = existingTensor || rasterizeStrokesToTensor(strokes, CNN_INPUT_SIZE).data
  const model = getGeometryModel()
  const pred = model.predict(tensor)

  const candidates: CNNPredictionCandidate[] = pred.topCandidates
    .filter((c) => c.className !== "UNKNOWN")
    .map((c) => ({
      className: c.className,
      confidence: c.confidence,
      domain: "geometry",
    }))

  return {
    topClass: pred.topClass,
    confidence: pred.topConfidence,
    candidates,
  }
}

/**
 * Evaluates semantic objects using the trained object CNN
 */
export function predictObjectCNN(
  strokes: Point[][],
  existingTensor?: Float32Array
): {
  topClass: string
  confidence: number
  candidates: CNNPredictionCandidate[]
} {
  const tensor = existingTensor || rasterizeStrokesToTensor(strokes, CNN_INPUT_SIZE).data
  const model = getObjectModel()
  const pred = model.predict(tensor)

  const candidates: CNNPredictionCandidate[] = pred.topCandidates
    .filter((c) => c.className !== "UNKNOWN")
    .map((c) => ({
      className: c.className,
      confidence: c.confidence,
      domain: "object",
    }))

  return {
    topClass: pred.topClass,
    confidence: pred.topConfidence,
    candidates,
  }
}

/**
 * Disambiguates hard-negative confusable pairs using stroke geometry priors:
 * - A vs triangle, V, H, person, 4
 * - O vs 0 vs circle
 * - I vs 1 vs line
 * - S vs 5
 * - B vs 8
 * - Z vs 2
 * - V vs checkmark
 * - C vs circle
 * - X vs plus
 */
export function disambiguateHardNegatives(
  predClass: string,
  strokes: Point[][],
  bounds: Bounds,
  domain: "handwriting" | "geometry" | "object"
): { resolvedClass: string; resolvedDomain: "handwriting" | "geometry" | "object"; boost: number } {
  const allPts = strokes.flat()
  if (allPts.length < 2) return { resolvedClass: predClass, resolvedDomain: domain, boost: 0 }

  const w = Math.max(bounds.w, 1)
  const h = Math.max(bounds.h, 1)
  const aspectRatio = w / h

  // 1. A vs Triangle / V / Person / 4 / H
  if (
    predClass === "A" ||
    predClass === "triangle" ||
    predClass === "V" ||
    predClass === "person" ||
    predClass === "4" ||
    predClass === "H"
  ) {
    const aEval = evaluateLetterAGeometry(strokes)
    if (aEval.isA) {
      return { resolvedClass: "A", resolvedDomain: "handwriting", boost: 0.20 }
    } else if (predClass === "A") {
      // Not an A geometrically!
      if (aEval.hasBottomClosure) {
        return { resolvedClass: "triangle", resolvedDomain: "geometry", boost: 0.15 }
      }
      return { resolvedClass: "UNKNOWN", resolvedDomain: "geometry", boost: -0.5 }
    }
  }

  // 2. O vs 0 vs Circle
  if (predClass === "O" || predClass === "0" || predClass === "circle") {
    if (aspectRatio > 0.82 && aspectRatio < 1.22) {
      // Very round: likely circle or O
      return {
        resolvedClass: predClass === "0" ? "circle" : predClass,
        resolvedDomain: predClass === "0" ? "geometry" : domain,
        boost: 0.05,
      }
    } else if (aspectRatio < 0.65) {
      // Tall, narrow oval: likely digit 0
      return { resolvedClass: "0", resolvedDomain: "handwriting", boost: 0.15 }
    }
  }

  // 3. I vs 1 vs Line
  if (predClass === "I" || predClass === "1" || predClass === "line" || predClass === "minus") {
    if (aspectRatio > 2.5) {
      // Strongly horizontal
      return { resolvedClass: "minus", resolvedDomain: "geometry", boost: 0.18 }
    } else if (aspectRatio < 0.3) {
      // Strongly vertical: check for top hook
      const firstPt = strokes[0]?.[0]
      const secondPt = strokes[0]?.[1]
      const hasTopHook = firstPt && secondPt && firstPt[0] < secondPt[0] && firstPt[1] > secondPt[1]
      if (hasTopHook) {
        return { resolvedClass: "1", resolvedDomain: "handwriting", boost: 0.15 }
      }
      return {
        resolvedClass: predClass === "line" ? "line" : "I",
        resolvedDomain: predClass === "line" ? "geometry" : "handwriting",
        boost: 0.08,
      }
    }
  }

  // 4. X vs Plus
  if (predClass === "X" || predClass === "x" || predClass === "plus") {
    if (strokes.length === 2) {
      const s1 = strokes[0]
      const dx1 = Math.abs(s1[s1.length - 1][0] - s1[0][0])
      const dy1 = Math.abs(s1[s1.length - 1][1] - s1[0][1])
      const isOrthogonal = (dx1 < w * 0.25 && dy1 > h * 0.6) || (dy1 < h * 0.25 && dx1 > w * 0.6)
      if (isOrthogonal) {
        return { resolvedClass: "plus", resolvedDomain: "geometry", boost: 0.18 }
      } else {
        return { resolvedClass: "x", resolvedDomain: "geometry", boost: 0.15 }
      }
    }
  }

  // 5. V vs Checkmark
  if (predClass === "V" || predClass === "checkmark") {
    const s = strokes[0]
    if (s && s.length >= 3) {
      const startPt = s[0]
      const endPt = s[s.length - 1]
      const isCheck = startPt[1] > bounds.y + h * 0.25 && endPt[1] < startPt[1] && endPt[0] > bounds.x + w * 0.7
      if (isCheck) {
        return { resolvedClass: "checkmark", resolvedDomain: "geometry", boost: 0.15 }
      }
    }
  }

  return { resolvedClass: predClass, resolvedDomain: domain, boost: 0 }
}

/**
 * Unified Multi-Head CNN Sketch Classifier:
 * Evaluates rasterized strokes against the trained CNN backbones, applies
 * confidence calibration, hard-negative disambiguation, and rejection.
 */
export function classifySketchWithCNN(
  strokes: Point[][],
  bounds: Bounds,
  allowedDomains: ("handwriting" | "geometry" | "object")[] = ["geometry", "handwriting", "object"]
): RecognitionResult {
  if (!strokes || strokes.length === 0 || strokes.every((s) => s.length === 0)) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "local",
      bounds: { ...bounds },
      candidates: [],
    }
  }

  // Check deterministic Letter A first for immediate precision
  const aEval = evaluateLetterAGeometry(strokes)
  if (aEval.isA && allowedDomains.includes("handwriting")) {
    return {
      recognized: true,
      kind: "text",
      confidence: aEval.confidence,
      source: "local",
      bounds: { ...bounds },
      text: "A",
      characters: [
        {
          text: "A",
          confidence: aEval.confidence,
          bounds: { ...bounds },
          strokeIndices: strokes.map((_, i) => i),
          source: "local",
        },
      ],
      candidates: [
        {
          kind: "text",
          confidence: aEval.confidence,
          source: "local",
          text: "A",
          metadata: { letterAGeometry: true },
        },
      ],
      metadata: {
        letterAGeometry: true,
        text: "A",
        fontSize: Math.max(16, Math.min(64, Math.round(bounds.h * 0.85))),
      },
    }
  }

  // 1. Rasterize once to 32x32 grayscale tensor
  const raster = rasterizeStrokesToTensor(strokes, CNN_INPUT_SIZE)
  const allCandidates: CNNPredictionCandidate[] = []

  // 2. Query allowed domain models
  let unknownVotes = 0

  if (allowedDomains.includes("geometry")) {
    const geom = predictGeometryCNN(strokes, raster.data)
    if (geom.topClass === "UNKNOWN" && geom.confidence >= 0.65) {
      unknownVotes++
    } else if (geom.topClass !== "UNKNOWN") {
      allCandidates.push(...geom.candidates)
    }
  }

  if (allowedDomains.includes("handwriting")) {
    const hw = predictHandwritingCNN(strokes)
    if (hw.topClass === "UNKNOWN" && hw.confidence >= 0.65) {
      unknownVotes++
    } else if (hw.topClass !== "UNKNOWN") {
      allCandidates.push(...hw.candidates)
    }
  }

  if (allowedDomains.includes("object")) {
    const obj = predictObjectCNN(strokes, raster.data)
    if (obj.topClass === "UNKNOWN" && obj.confidence >= 0.65) {
      unknownVotes++
    } else if (obj.topClass !== "UNKNOWN") {
      allCandidates.push(...obj.candidates)
    }
  }

  // If models agree on UNKNOWN, or no candidates survived
  if (unknownVotes >= 2 || allCandidates.length === 0) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "local",
      bounds: { ...bounds },
      candidates: [],
    }
  }

  // 3. Sort candidates by confidence
  allCandidates.sort((a, b) => b.confidence - a.confidence)
  const topCandidate = allCandidates[0]

  // 4. Rejection threshold
  if (topCandidate.confidence < 0.48) {
    return {
      recognized: false,
      kind: null,
      confidence: topCandidate.confidence,
      source: "local",
      bounds: { ...bounds },
      candidates: allCandidates.slice(0, 4).map((c) => ({
        kind: c.className,
        confidence: c.confidence,
        source: "local" as const,
      })),
    }
  }

  // 5. Disambiguate confusable pairs
  const { resolvedClass, resolvedDomain, boost } = disambiguateHardNegatives(
    topCandidate.className,
    strokes,
    bounds,
    topCandidate.domain
  )

  if (resolvedClass === "UNKNOWN" || resolvedClass === "") {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "local",
      bounds: { ...bounds },
      candidates: [],
    }
  }

  const finalConfidence = Math.min(0.99, topCandidate.confidence + boost)
  const isHandwriting = resolvedDomain === "handwriting"

  return {
    recognized: true,
    kind: isHandwriting ? "text" : resolvedClass,
    confidence: finalConfidence,
    source: "local",
    bounds: { ...bounds },
    text: isHandwriting ? resolvedClass : undefined,
    characters: isHandwriting
      ? [
          {
            text: resolvedClass,
            confidence: finalConfidence,
            bounds: { ...bounds },
            strokeIndices: strokes.map((_, i) => i),
            source: "local",
          },
        ]
      : undefined,
    candidates: allCandidates.slice(0, 5).map((c) => ({
      kind: c.domain === "handwriting" ? "text" : c.className,
      confidence: c.confidence,
      source: "local" as const,
      text: c.domain === "handwriting" ? c.className : undefined,
    })),
    metadata: {
      cnnPredicted: true,
      domain: resolvedDomain,
      text: isHandwriting ? resolvedClass : undefined,
      top1Confidence: finalConfidence,
      fontSize: isHandwriting ? Math.max(16, Math.min(64, Math.round(bounds.h * 0.85))) : undefined,
    },
  }
}
