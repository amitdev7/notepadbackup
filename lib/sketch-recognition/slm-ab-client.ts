/**
 * Zenithsui Dedicated A/B Handwriting SLM Client & Feature Extractor
 * Executes deterministic 48-feature extraction and calibrated model inference.
 * Operates strictly on: 'A' | 'B' | 'UNKNOWN'.
 */

import { ACTIVE_AB_MODEL_CONFIG } from "./letter-ab-model-weights"

export type SLMPoint = { x: number; y: number } | [number, number]
export interface InternalPoint {
  x: number
  y: number
}

export type SLMClass = "A" | "B" | "UNKNOWN"

export interface SLMPredictionResult {
  predictedClass: SLMClass
  confidence: number
  reason: string
  probA: number
  probB: number
  probUnknown: number
  distA: number
  distB: number
  aGeomScore: number
  bGeomScore: number
  gateA: boolean
  gateB: boolean
}

function toInternalPoint(p: SLMPoint): InternalPoint {
  return Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }
}

/**
 * Resamples stroke to target point count with uniform arc-length spacing.
 */
function resampleStroke(stroke: SLMPoint[], targetCount = 32): InternalPoint[] {
  if (stroke.length <= 1) return stroke.map(toInternalPoint)
  const pts = stroke.map(toInternalPoint)
  let totalLength = 0
  const dists: number[] = [0]
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    totalLength += d
    dists.push(totalLength)
  }

  if (totalLength < 1e-4) {
    return Array.from({ length: targetCount }, () => ({ ...pts[0] }))
  }

  const step = totalLength / (targetCount - 1)
  const resampled: InternalPoint[] = [{ ...pts[0] }]
  let curIdx = 0

  for (let i = 1; i < targetCount - 1; i++) {
    const targetDist = i * step
    while (curIdx < dists.length - 1 && dists[curIdx + 1] < targetDist) {
      curIdx++
    }
    const segLen = dists[curIdx + 1] - dists[curIdx]
    const t = segLen > 1e-4 ? (targetDist - dists[curIdx]) / segLen : 0
    resampled.push({
      x: pts[curIdx].x + t * (pts[curIdx + 1].x - pts[curIdx].x),
      y: pts[curIdx].y + t * (pts[curIdx + 1].y - pts[curIdx].y),
    })
  }
  resampled.push({ ...pts[pts.length - 1] })
  return resampled
}

/**
 * Normalizes strokes into [0, 1] coordinate space while preserving aspect ratio.
 */
function normalizeStrokes(strokes: SLMPoint[][]): {
  normalized: InternalPoint[][]
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
} {
  const allPts = strokes.flat().map(toInternalPoint)
  if (!allPts.length) {
    return {
      normalized: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    }
  }

  const xs = allPts.map((p) => p.x)
  const ys = allPts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = Math.max(maxX - minX, 1e-3)
  const height = Math.max(maxY - minY, 1e-3)
  const scale = Math.max(width, height)

  const normalized = strokes.map((stroke) =>
    resampleStroke(stroke, 32).map((p) => ({
      x: (p.x - minX) / scale,
      y: (p.y - minY) / scale,
    }))
  )

  return {
    normalized,
    bounds: { minX, minY, maxX, maxY, width, height },
  }
}

/**
 * Extracts 48 deterministic features matching slm_ab/features.py
 */
export function extractSLMFeatures(rawStrokes: SLMPoint[][]): number[] {
  const { normalized, bounds } = normalizeStrokes(rawStrokes)
  const allPts = normalized.flat()
  if (allPts.length < 4) {
    return new Array(48).fill(0)
  }

  const xs = allPts.map((p) => p.x)
  const ys = allPts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const extentX = Math.max(maxX - minX, 1e-3)
  const extentY = Math.max(maxY - minY, 1e-3)
  const cx = minX + extentX / 2
  const cy = minY + extentY / 2

  const strokeCount = Math.min(rawStrokes.length / 5, 1)
  const pointCount = Math.min(allPts.length / 160, 1)
  const aspectRatio = Math.min(extentX / extentY, 2) / 2

  // Convex hull / bounding density
  const totalPoints = allPts.length
  const bboxArea = extentX * extentY
  const density = bboxArea > 1e-4 ? Math.min(totalPoints / (bboxArea * 400), 1) : 0

  // Curvature & path metrics
  let totalLength = 0
  let straightDist = 0
  for (const s of normalized) {
    if (s.length >= 2) {
      straightDist += Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y)
      for (let i = 0; i < s.length - 1; i++) {
        totalLength += Math.hypot(s[i + 1].x - s[i].x, s[i + 1].y - s[i].y)
      }
    }
  }
  const tortuosity = totalLength > 1e-4 ? Math.min(totalLength / Math.max(straightDist, 1e-4), 4) / 4 : 0

  // Closure metric
  const startPt = normalized[0][0]
  const endPt = normalized[normalized.length - 1][normalized[normalized.length - 1].length - 1]
  const isClosed = Math.max(0, 1 - Math.hypot(startPt.x - endPt.x, startPt.y - endPt.y) / Math.max(extentY, 1e-3))

  // Symmetry
  const leftHalfPts = allPts.filter((p) => p.x <= cx).length
  const rightHalfPts = allPts.filter((p) => p.x > cx).length
  const symmetryX = 1 - Math.abs(leftHalfPts - rightHalfPts) / Math.max(totalPoints, 1)

  // --- TOPOLOGICAL DESCRIPTORS FOR A ---
  // Apex convergence
  const top15Pts = allPts.filter((p) => p.y <= minY + extentY * 0.15)
  let apexConvergence = 0
  let apexLocationX = 0.5
  if (top15Pts.length >= 2) {
    const topXs = top15Pts.map((p) => p.x)
    const topSpan = Math.max(...topXs) - Math.min(...topXs)
    apexConvergence = Math.max(0, 1 - topSpan / extentX)
    apexLocationX = (topXs.reduce((a, b) => a + b, 0) / topXs.length - minX) / extentX
  }

  // Crossbar presence
  let crossbarPresence = 0
  let crossbarY = 0.5
  let crossbarSpan = 0
  let bestCrossbarSpan = 0
  for (const s of normalized) {
    const midPts = s.filter((p) => p.y >= cy - extentY * 0.18 && p.y <= cy + extentY * 0.18)
    if (midPts.length >= 3) {
      const midXs = midPts.map((p) => p.x)
      const span = Math.max(...midXs) - Math.min(...midXs)
      if (span > bestCrossbarSpan) {
        bestCrossbarSpan = span
        crossbarPresence = Math.min(span / (extentX * 0.45), 1)
        crossbarY = (midPts.reduce((a, b) => a + b.y, 0) / midPts.length - minY) / extentY
        crossbarSpan = Math.min(span / extentX, 1)
      }
    }
  }

  // Bottom openness vs closure (Triangle base)
  const bottomPts = allPts.filter((p) => p.y >= maxY - extentY * 0.25)
  let bottomOpenness = 0
  let bottomClosureBase = 0
  if (bottomPts.length) {
    const bXs = bottomPts.map((p) => p.x)
    const bSpan = Math.max(...bXs) - Math.min(...bXs)
    bottomOpenness = Math.min(bSpan / extentX, 1)

    const botThreshY = maxY - extentY * 0.18
    for (const s of normalized) {
      let run: InternalPoint[] = []
      for (const p of s) {
        if (p.y >= botThreshY) {
          run.push(p)
        } else {
          if (run.length >= 2) {
            const rXs = run.map((pt) => pt.x)
            if (Math.max(...rXs) - Math.min(...rXs) >= extentX * 0.32) {
              bottomClosureBase = 1
              break
            }
          }
          run = []
        }
      }
      if (run.length >= 2) {
        const rXs = run.map((pt) => pt.x)
        if (Math.max(...rXs) - Math.min(...rXs) >= extentX * 0.32) {
          bottomClosureBase = 1
          break
        }
      }
    }
  }

  const aGeometricScore = Math.max(
    0,
    Math.min(1, apexConvergence * 0.35 + crossbarPresence * 0.4 + bottomOpenness * 0.25 - bottomClosureBase * 0.6)
  )

  // --- TOPOLOGICAL DESCRIPTORS FOR B ---
  const leftPts = allPts.filter((p) => p.x <= minX + extentX * 0.3)
  let leftStemStraightness = 0
  let leftStemSpanY = 0
  if (leftPts.length >= 4) {
    const lYs = leftPts.map((p) => p.y)
    leftStemSpanY = (Math.max(...lYs) - Math.min(...lYs)) / extentY
    const lXs = leftPts.map((p) => p.x)
    const xVariance = Math.max(...lXs) - Math.min(...lXs)
    leftStemStraightness = Math.max(0, 1 - xVariance / (extentX * 0.35))
  }

  const upperRightPts = allPts.filter((p) => p.x >= minX + extentX * 0.35 && p.y >= 0.1 && p.y <= 0.55)
  const lowerRightPts = allPts.filter((p) => p.x >= minX + extentX * 0.35 && p.y >= 0.48 && p.y <= 0.95)
  const upperLoopArea = Math.min(upperRightPts.length / (totalPoints * 0.45), 1)
  const lowerLoopArea = Math.min(lowerRightPts.length / (totalPoints * 0.45), 1)

  const topBumpPts = allPts.filter((p) => p.y >= 0.1 && p.y <= 0.4 && p.x >= cx).map((p) => p.x)
  const botBumpPts = allPts.filter((p) => p.y >= 0.6 && p.y <= 0.9 && p.x >= cx).map((p) => p.x)
  const waistBandPts = allPts.filter((p) => p.y >= 0.44 && p.y <= 0.54 && p.x >= cx).map((p) => p.x)

  let waistIndentation = 0
  let dLoopSingularity = 0
  if (topBumpPts.length && botBumpPts.length && waistBandPts.length) {
    const xTop = Math.max(...topBumpPts)
    const xBot = Math.max(...botBumpPts)
    const xWaist = Math.max(...waistBandPts)
    const indent = Math.min(xTop - xWaist, xBot - xWaist)
    waistIndentation = Math.max(0, Math.min(1, indent / (extentX * 0.25)))
    if (xWaist >= xTop && xWaist >= xBot) {
      dLoopSingularity = 1
    }
  }

  const doubleLoopRatio =
    upperLoopArea > 0 && lowerLoopArea > 0
      ? Math.min(upperLoopArea, lowerLoopArea) / Math.max(upperLoopArea, lowerLoopArea)
      : 0

  const rightPts = allPts.filter((p) => p.x >= cx)
  const rightCurvature = Math.min(rightPts.length / (totalPoints * 0.5), 1)
  const pBottomEmptiness = upperLoopArea > 0.25 && lowerLoopArea < 0.1 ? 1 : 0

  const bGeometricScore = Math.max(
    0,
    Math.min(
      1,
      leftStemStraightness * 0.3 +
        leftStemSpanY * 0.2 +
        upperLoopArea * 0.2 +
        lowerLoopArea * 0.2 +
        waistIndentation * 0.3 -
        dLoopSingularity * 0.5 -
        pBottomEmptiness * 0.6
    )
  )

  // --- PROJECTION PROFILES (8 BINS Y, 8 BINS X) ---
  const projY = new Array(8).fill(0)
  const projX = new Array(8).fill(0)
  for (const p of allPts) {
    const binY = Math.min(7, Math.max(0, Math.floor(((p.y - minY) / extentY) * 8)))
    const binX = Math.min(7, Math.max(0, Math.floor(((p.x - minX) / extentX) * 8)))
    projY[binY]++
    projX[binX]++
  }
  const normProjY = projY.map((v) => Math.min(v / (totalPoints * 0.35), 1))
  const normProjX = projX.map((v) => Math.min(v / (totalPoints * 0.35), 1))

  // --- STROKE DYNAMICS & GEOMETRIC MOMENTS ---
  let startX = 0,
    startY = 0,
    endX = 1,
    endY = 1
  if (normalized.length) {
    const firstS = normalized[0]
    const lastS = normalized[normalized.length - 1]
    startX = (firstS[0].x - minX) / extentX
    startY = (firstS[0].y - minY) / extentY
    endX = (lastS[lastS.length - 1].x - minX) / extentX
    endY = (lastS[lastS.length - 1].y - minY) / extentY
  }

  let curvSum = 0
  let curvPoints = 0
  for (const s of normalized) {
    for (let i = 1; i < s.length - 1; i++) {
      const v1x = s[i].x - s[i - 1].x
      const v1y = s[i].y - s[i - 1].y
      const v2x = s[i + 1].x - s[i].x
      const v2y = s[i + 1].y - s[i].y
      const dot = v1x * v2x + v1y * v2y
      const m1 = Math.hypot(v1x, v1y)
      const m2 = Math.hypot(v2x, v2y)
      if (m1 > 1e-4 && m2 > 1e-4) {
        const cosTheta = Math.max(-1, Math.min(1, dot / (m1 * m2)))
        curvSum += Math.abs(Math.acos(cosTheta))
        curvPoints++
      }
    }
  }
  const curvatureVariance = curvPoints > 0 ? Math.min(curvSum / (curvPoints * Math.PI), 1) : 0

  const topHeavyRatio = allPts.filter((p) => p.y <= cy).length / Math.max(totalPoints, 1)

  return [
    strokeCount,
    pointCount,
    aspectRatio,
    density,
    tortuosity,
    isClosed,
    symmetryX,
    0.5,
    apexConvergence,
    apexLocationX,
    crossbarPresence,
    crossbarY,
    crossbarSpan,
    bottomOpenness,
    bottomClosureBase,
    aGeometricScore,
    leftStemStraightness,
    leftStemSpanY,
    upperLoopArea,
    lowerLoopArea,
    waistIndentation,
    doubleLoopRatio,
    rightCurvature,
    dLoopSingularity,
    pBottomEmptiness,
    bGeometricScore,
    ...normProjY,
    ...normProjX,
    startX,
    startY,
    endX,
    endY,
    curvatureVariance,
    topHeavyRatio,
  ]
}

/**
 * Executes SLM model inference on raw strokes.
 */
export function predictWithABModel(rawStrokes: SLMPoint[][]): SLMPredictionResult {
  const feat = extractSLMFeatures(rawStrokes)
  const cfg = ACTIVE_AB_MODEL_CONFIG

  // 1. Prototype distance
  let distA = 0
  let distB = 0
  for (let i = 0; i < cfg.num_features; i++) {
    const w = cfg.feature_weights[i]
    distA += w * (feat[i] - cfg.prototype_a[i]) ** 2
    distB += w * (feat[i] - cfg.prototype_b[i]) ** 2
  }
  distA = Math.sqrt(Math.max(distA, 0))
  distB = Math.sqrt(Math.max(distB, 0))

  // 2. Discriminant scores & logits
  let dotA = cfg.bias_a
  let dotB = cfg.bias_b
  for (let i = 0; i < cfg.num_features; i++) {
    dotA += cfg.weights_a[i] * feat[i]
    dotB += cfg.weights_b[i] * feat[i]
  }

  const logitA = dotA - 0.35 * distA
  const logitB = dotB - 0.35 * distB
  const logitU = cfg.bias_unknown

  const maxL = Math.max(logitA, logitB, logitU)
  const expA = Math.exp(Math.min((logitA - maxL) / cfg.temperature, 50))
  const expB = Math.exp(Math.min((logitB - maxL) / cfg.temperature, 50))
  const expU = Math.exp(Math.min((logitU - maxL) / cfg.temperature, 50))
  const sumExp = expA + expB + expU

  const probA = expA / sumExp
  const probB = expB / sumExp
  const probUnknown = expU / sumExp

  // Geometric gates
  const apexConv = feat[8]
  const crossbar = feat[10]
  const bottomClosure = feat[14]
  const aGeomScore = feat[15]

  const leftStem = feat[16]
  const upperLoop = feat[18]
  const lowerLoop = feat[19]
  const dSingularity = feat[23]
  const pEmptiness = feat[24]
  const bGeomScore = feat[25]

  const gateAPassed = apexConv >= 0.12 && (crossbar >= 0.25 || aGeomScore >= 0.28) && bottomClosure <= 0.5
  const gateBPassed =
    leftStem >= 0.1 && upperLoop >= 0.05 && lowerLoop >= 0.05 && dSingularity <= 0.5 && pEmptiness <= 0.5 && apexConv <= 0.75

  const margin = Math.abs(probA - probB)
  const confThresh = cfg.min_confidence_threshold
  const marginThresh = cfg.min_margin_threshold

  // Decision logic
  if (probA >= confThresh && margin >= marginThresh && probA > probB && probA > probUnknown) {
    if (gateAPassed) {
      return {
        predictedClass: "A",
        confidence: Math.round(probA * 1000) / 1000,
        reason: "Confident A match",
        probA,
        probB,
        probUnknown,
        distA,
        distB,
        aGeomScore,
        bGeomScore,
        gateA: gateAPassed,
        gateB: gateBPassed,
      }
    }
  }

  if (probB >= confThresh && margin >= marginThresh && probB > probA && probB > probUnknown) {
    if (gateBPassed) {
      return {
        predictedClass: "B",
        confidence: Math.round(probB * 1000) / 1000,
        reason: "Confident B match",
        probA,
        probB,
        probUnknown,
        distA,
        distB,
        aGeomScore,
        bGeomScore,
        gateA: gateAPassed,
        gateB: gateBPassed,
      }
    }
  }

  return {
    predictedClass: "UNKNOWN",
    confidence: Math.round(probUnknown * 1000) / 1000,
    reason: "Low confidence or ambiguous non-A/B drawing rejected",
    probA,
    probB,
    probUnknown,
    distA,
    distB,
    aGeomScore,
    bGeomScore,
    gateA: gateAPassed,
    gateB: gateBPassed,
  }
}
