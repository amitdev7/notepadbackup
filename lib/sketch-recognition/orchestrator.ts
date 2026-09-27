// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Orchestrator
// Strictly coordinates four-shape recognition: ELLIPSE, RECTANGLE, LINE, ARROW
// All other inputs produce UNKNOWN.
// ---------------------------------------------------------------------------

import type { ActiveFourShape, Point, RecognitionResult } from "./types"
import { cleanStrokes, extractStrokeFeatures } from "./preprocessing"
import { recognizeGeometry } from "./geometry-recognizer"

/**
 * Main sketch recognition orchestrator.
 * 1. Preprocesses and normalizes raw drawing strokes locally (< 1ms).
 * 2. Runs deterministic four-shape geometric classifier.
 * 3. Returns exclusively ELLIPSE, RECTANGLE, LINE, ARROW, or UNKNOWN.
 * 4. Zero server requests, zero AI calls, 100% deterministic local computation.
 */
export async function recognizeSketch(
  rawStrokes: Point[][],
  bounds: { x: number; y: number; w: number; h: number },
  _allowAI = false
): Promise<RecognitionResult> {
  const strokes = cleanStrokes(rawStrokes)
  const features = extractStrokeFeatures(strokes)

  // 1. Trivial or empty strokes check
  if (
    strokes.length === 0 ||
    features.pointCount < 3 ||
    (features.w < 8 && features.h < 8) ||
    features.diagonal < 14
  ) {
    return {
      recognized: false,
      kind: null,
      activeShape: "UNKNOWN",
      confidence: 0,
      calibratedConfidence: 0,
      source: "geometry",
      bounds: {
        x: features.x || bounds.x,
        y: features.y || bounds.y,
        w: features.w || bounds.w,
        h: features.h || bounds.h,
      },
    }
  }

  // 2. Deterministic local four-shape geometric classifier
  const geomResult = recognizeGeometry(strokes)

  if (!geomResult.recognized || !geomResult.kind) {
    return {
      recognized: false,
      kind: null,
      activeShape: "UNKNOWN",
      confidence: 0,
      calibratedConfidence: 0,
      source: "geometry",
      bounds: geomResult.bounds,
    }
  }

  const activeShape: ActiveFourShape =
    geomResult.kind === "ellipse"
      ? "ELLIPSE"
      : geomResult.kind === "rectangle"
      ? "RECTANGLE"
      : geomResult.kind === "line"
      ? "LINE"
      : geomResult.kind === "arrow"
      ? "ARROW"
      : "UNKNOWN"

  if (activeShape === "UNKNOWN") {
    return {
      recognized: false,
      kind: null,
      activeShape: "UNKNOWN",
      confidence: 0,
      calibratedConfidence: 0,
      source: "geometry",
      bounds: geomResult.bounds,
    }
  }

  return {
    recognized: true,
    kind: geomResult.kind,
    activeShape,
    confidence: geomResult.confidence,
    calibratedConfidence: geomResult.confidence,
    source: "geometry",
    candidates: geomResult.candidates,
    bounds: geomResult.bounds,
    metadata: geomResult.metadata,
  }
}
