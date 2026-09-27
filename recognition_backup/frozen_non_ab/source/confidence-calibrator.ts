// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Confidence Calibration & Decision Engine
// Calibrates multi-stage confidence scores and decides auto-convert vs suggestion vs preserve
// ---------------------------------------------------------------------------

import type { RecognitionCandidate, RecognitionResult, StrokeFeatures } from "./types"
import { CONFIDENCE_THRESHOLDS } from "./types"

export interface CalibrationWeights {
  rawScoreWeight: number
  topologyWeight: number
  sequenceWeight: number
  aiWeight: number
}

export const DEFAULT_WEIGHTS: CalibrationWeights = {
  rawScoreWeight: 0.55,
  topologyWeight: 0.25,
  sequenceWeight: 0.20,
  aiWeight: 0.35,
}

export type ActionDecision = "auto_convert" | "suggest" | "preserve"

/**
 * Calibrate recognition confidence based on multi-source evidence and context
 */
export function calibrateConfidence(
  candidate: RecognitionCandidate,
  features: StrokeFeatures,
  context?: {
    isSequence?: boolean
    sequenceLength?: number
    isDictionaryWord?: boolean
    isMultiDigitNumber?: boolean
  }
): { calibratedConfidence: number; action: ActionDecision } {
  let score = candidate.confidence

  // Penalty for tiny ambiguous scribbles or low point counts
  if (features.diagonal < 18 || features.pointCount < 6) {
    score -= 0.15
  }

  // Bonus for strong contextual consistency
  if (context?.isDictionaryWord) {
    score += 0.08
  } else if (context?.isMultiDigitNumber && (context.sequenceLength || 0) >= 2) {
    score += 0.06
  }

  // Bonus for clean topological closure in geometry
  if (candidate.kind === "circle" || candidate.kind === "rectangle") {
    if (features.closureRatio < 0.15 && features.circularity > 0.8) {
      score += 0.05
    }
  }

  // Bound score between 0 and 0.99
  const calibratedConfidence = Math.max(0, Math.min(0.99, Number(score.toFixed(3))))

  let action: ActionDecision = "preserve"
  if (calibratedConfidence >= CONFIDENCE_THRESHOLDS.AUTO_CONVERT) {
    action = "auto_convert"
  } else if (calibratedConfidence >= CONFIDENCE_THRESHOLDS.SUGGESTION) {
    action = "suggest"
  }

  return { calibratedConfidence, action }
}

/**
 * Combine and rank candidates from geometry, handwriting, and AI
 */
export function rankAndCalibrateCandidates(
  candidates: RecognitionCandidate[],
  features: StrokeFeatures,
  context?: {
    isSequence?: boolean
    sequenceLength?: number
    isDictionaryWord?: boolean
    isMultiDigitNumber?: boolean
  }
): RecognitionResult {
  if (candidates.length === 0) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      calibratedConfidence: 0,
      source: "geometry",
      bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
    }
  }

  // Calibrate each candidate
  const evaluated = candidates.map((c) => {
    const { calibratedConfidence, action } = calibrateConfidence(c, features, context)
    return {
      candidate: c,
      calibratedConfidence,
      action,
    }
  })

  // Sort descending by calibrated confidence
  evaluated.sort((a, b) => b.calibratedConfidence - a.calibratedConfidence)
  const top = evaluated[0]

  return {
    recognized: top.calibratedConfidence >= CONFIDENCE_THRESHOLDS.SUGGESTION,
    kind: top.candidate.kind,
    confidence: top.candidate.confidence,
    calibratedConfidence: top.calibratedConfidence,
    source: top.candidate.source,
    mode: top.candidate.mode,
    text: top.candidate.text,
    characters: top.candidate.characters,
    candidates: evaluated.map((e) => ({
      ...e.candidate,
      confidence: e.calibratedConfidence,
    })),
    bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
    metadata: top.candidate.metadata,
  }
}
