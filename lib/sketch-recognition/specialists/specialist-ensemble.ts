// ---------------------------------------------------------------------------
// Specialist Sketch Recognition — Global Specialist Ensemble & Arbitrator
// Runs candidate specialists, enforces hard-negative margins, performs
// context disambiguation, and strictly rejects random scribbles as UNKNOWN.
// ---------------------------------------------------------------------------

import type { Point, StrokeFeatures } from "../types"
import type {
  NormalizedDrawingInput,
  SpecialistEnsembleResult,
  SpecialistEnsembleCandidate,
  SpecialistEvaluationResult,
} from "./types"
import { specialistRegistry } from "./specialist-registry"
import { extractStrokeFeatures, cleanStrokes } from "../preprocessing"
import { rasterizeStrokesTo32x32 } from "../cnn-rasterizer"
import { disambiguateConfusablePair } from "./hard-negatives-matrix"

/**
 * Normalizes user strokes into structured multi-representation input
 * (raw vectors + geometric features + normalized 32x32 raster tensor)
 */
export function prepareDrawingInput(rawStrokes: Point[][]): NormalizedDrawingInput | null {
  const cleaned = cleanStrokes(rawStrokes)
  if (cleaned.length === 0) return null

  const features = extractStrokeFeatures(cleaned)
  if (features.pointCount < 3 || (features.w < 5 && features.h < 5)) {
    return null
  }

  const raster32 = rasterizeStrokesTo32x32(cleaned)

  return {
    rawStrokes: cleaned,
    normalizedStrokes: cleaned,
    features,
    raster32,
    bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
  }
}

/**
 * Checks if drawing is a chaotic scribble, zigzag, or stray noise
 */
function isChaoticScribble(features: StrokeFeatures, strokes: Point[][]): boolean {
  // 1. High corner count relative to size (dense jagged zigzags)
  if (features.corners.length >= 10 && features.w < 90 && features.h < 90) {
    return true
  }

  // 2. High path length in a tiny bounding box (dense scribble cluster)
  const density = features.totalLength / Math.max(10, Math.sqrt(features.w * features.h))
  if (density > 14 && strokes.length === 1) {
    return true
  }

  // 3. Dense back-and-forth oscillations with low straightness and low circularity
  if (features.corners.length >= 8 && features.straightness < 0.25 && features.circularity < 0.2) {
    return true
  }

  return false
}

/**
 * Evaluates a drawing across the specialist network.
 * Runs in < 3.5ms on average.
 */
export function evaluateSpecialistEnsemble(
  rawStrokes: Point[][],
  contextHint?: "letter" | "digit" | "geometry" | "object" | "all"
): SpecialistEnsembleResult {
  const t0 = performance.now()

  const input = prepareDrawingInput(rawStrokes)
  if (!input) {
    return {
      recognized: false,
      topClass: null,
      topFamily: null,
      confidence: 0,
      calibratedConfidence: 0,
      isUnknown: true,
      rejectionReason: "Trivial or empty stroke",
      candidates: [],
      latencyMs: performance.now() - t0,
    }
  }

  // 1. Chaotic Scribble / Stray Noise Rejection Check
  if (isChaoticScribble(input.features, input.rawStrokes)) {
    return {
      recognized: false,
      topClass: null,
      topFamily: null,
      confidence: 0,
      calibratedConfidence: 0,
      isUnknown: true,
      rejectionReason: "Chaotic zigzag / random scribble detected",
      candidates: [],
      latencyMs: performance.now() - t0,
    }
  }

  // 2. Filter relevant specialists
  let candidateModels = specialistRegistry.filterRelevantSpecialists(input)
  if (contextHint && contextHint !== "all") {
    const hintModels = specialistRegistry.getByFamily(contextHint)
    if (hintModels.length > 0) {
      candidateModels = hintModels
    }
  }

  // 3. Run individual specialists
  const results: SpecialistEvaluationResult[] = []
  for (const model of candidateModels) {
    const res = model.evaluate(input)
    results.push(res)
  }

  // 4. Sort by calibrated confidence descending
  results.sort((a, b) => b.calibratedConfidence - a.calibratedConfidence)

  // 5. Competitive Arbitration between top candidates
  if (results.length >= 2) {
    const top1 = results[0]
    const top2 = results[1]

    // If top 2 are a known confusable pair with close scores
    if (top1.calibratedConfidence - top2.calibratedConfidence < 0.22) {
      const disambig = disambiguateConfusablePair(top1.targetClass, top2.targetClass, input)
      if (disambig) {
        if (disambig.favoredClass === top2.targetClass) {
          // Swap top1 and top2
          results[0] = top2
          results[1] = top1
        }
      }
    }
  }

  const accepted = results.filter((r) => r.accepted)
  const top = accepted.length > 0 ? accepted[0] : results[0]

  // 6. Strict Unknown Rejection
  const MIN_ACCEPTED_CONFIDENCE = 0.55
  const MIN_ACCEPTED_MARGIN = -0.10

  const isUnknown =
    !top ||
    top.calibratedConfidence < MIN_ACCEPTED_CONFIDENCE ||
    top.marginOverHardNegatives < MIN_ACCEPTED_MARGIN ||
    top.rawScore < 0.50

  const candidates: SpecialistEnsembleCandidate[] = results
    .slice(0, 5)
    .filter((r) => r.rawScore > 0.35)
    .map((r) => ({
      targetClass: r.targetClass,
      family: r.family,
      score: r.rawScore,
      confidence: r.calibratedConfidence,
      marginOverNegative: r.marginOverHardNegatives,
      source: "specialist",
    }))

  const latencyMs = performance.now() - t0

  if (isUnknown) {
    return {
      recognized: false,
      topClass: null,
      topFamily: null,
      confidence: top ? top.rawScore : 0,
      calibratedConfidence: top ? top.calibratedConfidence : 0,
      isUnknown: true,
      rejectionReason: "Confidence or hard-negative margin below acceptance threshold",
      candidates,
      latencyMs,
    }
  }

  return {
    recognized: true,
    topClass: top.targetClass,
    topFamily: top.family,
    confidence: top.rawScore,
    calibratedConfidence: top.calibratedConfidence,
    isUnknown: false,
    candidates,
    latencyMs,
  }
}
