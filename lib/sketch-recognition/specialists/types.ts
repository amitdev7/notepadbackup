// ---------------------------------------------------------------------------
// Specialist Sketch Recognition — Core Types & Contracts
// Research-grade multi-specialist architecture for Zenithsui
// ---------------------------------------------------------------------------

import type { Point, StrokeFeatures } from "../types"

export type SpecialistFamily = "letter" | "digit" | "geometry" | "symbol" | "object"

export interface NormalizedDrawingInput {
  rawStrokes: Point[][]
  normalizedStrokes: Point[][]
  features: StrokeFeatures
  raster32: Float32Array // 32x32 normalized grayscale tensor [0.0, 1.0]
  bounds: { x: number; y: number; w: number; h: number }
}

export interface StrokePriors {
  minStrokes: number
  maxStrokes: number
  preferredStrokes: number[]
  minAspectRatio: number // w / h
  maxAspectRatio: number
  closure?: "must_close" | "must_open" | "either"
  minCircularity?: number
  maxCircularity?: number
  minStraightness?: number
  maxStraightness?: number
}

export interface ClassDefinition {
  id: string
  targetClass: string
  family: SpecialistFamily
  description: string
  positiveDescription: string
  hardNegatives: string[]
  priors: StrokePriors
  customConstraint?: (input: NormalizedDrawingInput) => {
    penalty: number
    reason?: string
    reject?: boolean
  }
}

export interface SpecialistEvaluationResult {
  classId: string
  targetClass: string
  family: SpecialistFamily
  rawScore: number // 0.0 - 1.0 raw matching score
  calibratedConfidence: number // 0.0 - 1.0 sigmoid/calibrated confidence
  accepted: boolean // true if score exceeds acceptance threshold
  hardNegativePenalty: number
  marginOverHardNegatives: number
  nearestHardNegative: string | null
  nearestHardNegativeScore: number
  metadata?: Record<string, any>
}

export interface SpecialistEnsembleCandidate {
  targetClass: string
  family: SpecialistFamily
  score: number
  confidence: number
  marginOverNegative: number
  source: "specialist"
}

export interface SpecialistEnsembleResult {
  recognized: boolean
  topClass: string | null
  topFamily: SpecialistFamily | null
  confidence: number
  calibratedConfidence: number
  isUnknown: boolean
  rejectionReason?: string
  candidates: SpecialistEnsembleCandidate[]
  latencyMs: number
}
