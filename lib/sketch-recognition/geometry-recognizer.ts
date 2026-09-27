// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Four-Shape Deterministic Geometric Engine
// Strictly recognizes ONLY: ELLIPSE, RECTANGLE, LINE, ARROW
// All other inputs produce: UNKNOWN
// ---------------------------------------------------------------------------

import type {
  ActiveFourShape,
  Point,
  RecognitionCandidate,
  RecognitionResult,
  StrokeFeatures,
} from "./types"
import {
  cleanStrokes,
  extractStrokeFeatures,
  resampleStroke,
  strokeArcLength,
  convexHull,
  polygonArea,
  findCorners,
} from "./preprocessing"

// ---------------------------------------------------------------------------
// Helper Mathematics & Algorithms
// ---------------------------------------------------------------------------

/** Perpendicular distance from point P to line segment (A, B) */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  const projX = a[0] + t * dx
  const projY = a[1] + t * dy
  return Math.hypot(p[0] - projX, p[1] - projY)
}

/** Douglas-Peucker polyline simplification */
function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points
  let maxDist = 0
  let maxIdx = 0
  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToSegmentDistance(points[i], first, last)
    if (dist > maxDist) {
      maxDist = dist
      maxIdx = i
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon)
    const right = douglasPeucker(points.slice(maxIdx), epsilon)
    return left.slice(0, left.length - 1).concat(right)
  }
  return [first, last]
}

/** Angle in degrees between vectors (p1 -> p0) and (p1 -> p2) */
function cornerAngleDeg(p0: Point, p1: Point, p2: Point): number {
  const v1x = p0[0] - p1[0]
  const v1y = p0[1] - p1[1]
  const v2x = p2[0] - p1[0]
  const v2y = p2[1] - p1[1]
  const l1 = Math.hypot(v1x, v1y)
  const l2 = Math.hypot(v2x, v2y)
  if (l1 < 1e-4 || l2 < 1e-4) return 180
  const dot = (v1x * v2x + v1y * v2y) / (l1 * l2)
  const clamped = Math.max(-1, Math.min(1, dot))
  return (Math.acos(clamped) * 180) / Math.PI
}

// ---------------------------------------------------------------------------
// 1. LINE RECOGNITION (Phase 6)
// ---------------------------------------------------------------------------

function evaluateLine(
  strokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  if (strokes.length !== 1) return null
  const pts = strokes[0]
  if (pts.length < 2) return null

  const pStart = pts[0]
  const pEnd = pts[pts.length - 1]
  const endpointsDist = Math.hypot(pEnd[0] - pStart[0], pEnd[1] - pStart[1])

  // Must have minimum length
  if (endpointsDist < 18 || features.diagonal < 16) return null

  // A line must NOT be a closed loop
  const maxDim = Math.max(features.w, features.h, 1)
  if (endpointsDist / maxDim < 0.68) return null

  const totalLen = features.totalLength
  const straightness = totalLen > 0 ? endpointsDist / totalLen : 0
  if (straightness < 0.88) return null

  // Perpendicular deviation from start-to-end chord
  let maxPerpDev = 0
  let sumSqDev = 0
  for (const pt of pts) {
    const dev = pointToSegmentDistance(pt, pStart, pEnd)
    if (dev > maxPerpDev) maxPerpDev = dev
    sumSqDev += dev * dev
  }
  const normMaxDev = maxPerpDev / endpointsDist
  const rmse = Math.sqrt(sumSqDev / pts.length) / endpointsDist

  if (normMaxDev > 0.12 || rmse > 0.065) return null

  // Check if stroke ends with an acute fold/hook (if so, defer to arrow)
  if (pts.length >= 6) {
    for (let i = Math.floor(pts.length * 0.7); i < pts.length - 1; i++) {
      const angle = cornerAngleDeg(pts[i - 1], pts[i], pts[i + 1])
      if (angle < 115) {
        return null // Arrow candidate, not a pure line
      }
    }
  }

  const confidence = Math.min(
    0.99,
    Math.max(0.82, 0.96 - normMaxDev * 0.8 - (1 - straightness) * 1.5)
  )

  return {
    kind: "line",
    activeShape: "LINE",
    confidence,
    source: "geometry",
    metadata: {
      x1: pStart[0],
      y1: pStart[1],
      x2: pEnd[0],
      y2: pEnd[1],
    },
  }
}

// ---------------------------------------------------------------------------
// 2. ARROW RECOGNITION (Phase 7)
// ---------------------------------------------------------------------------

function evaluateArrow(
  strokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  if (features.diagonal < 18) return null

  // --- Multi-Stroke Arrow: 2 strokes (Shaft + Arrowhead) ---
  if (strokes.length === 2) {
    const s1 = strokes[0]
    const s2 = strokes[1]
    const l1 = strokeArcLength(s1)
    const l2 = strokeArcLength(s2)
    if (l1 < 5 || l2 < 5) return null

    let shaft = s1
    let head = s2
    let shaftLen = l1
    let headLen = l2

    if (l2 > l1) {
      shaft = s2
      head = s1
      shaftLen = l2
      headLen = l1
    }

    // Shaft must be significantly longer than head
    if (headLen > shaftLen * 0.65 || headLen < 6) return null

    // Shaft linearity
    const sStart = shaft[0]
    const sEnd = shaft[shaft.length - 1]
    const sChord = Math.hypot(sEnd[0] - sStart[0], sEnd[1] - sStart[1])
    if (sChord / shaftLen < 0.82) return null

    // Arrowhead centroid & endpoints
    const headXs = head.map((p) => p[0])
    const headYs = head.map((p) => p[1])
    const headCx = headXs.reduce((a, b) => a + b, 0) / head.length
    const headCy = headYs.reduce((a, b) => a + b, 0) / head.length

    const distToShaftStart = Math.hypot(headCx - sStart[0], headCy - sStart[1])
    const distToShaftEnd = Math.hypot(headCx - sEnd[0], headCy - sEnd[1])
    const minDist = Math.min(distToShaftStart, distToShaftEnd)

    // Arrowhead must be at one of the shaft's ends, NOT in the middle (rejects X and +)
    if (minDist > shaftLen * 0.38) return null

    // Check that arrowhead does not simply cross the shaft in the middle
    const shaftMidX = (sStart[0] + sEnd[0]) / 2
    const shaftMidY = (sStart[1] + sEnd[1]) / 2
    const distToMid = Math.hypot(headCx - shaftMidX, headCy - shaftMidY)
    if (distToMid < shaftLen * 0.25) return null // Crossing in the middle is X or +, not an arrow!

    const isForward = distToShaftEnd <= distToShaftStart
    const tail = isForward ? sStart : sEnd
    const tip = isForward ? sEnd : sStart

    return {
      kind: "arrow",
      activeShape: "ARROW",
      confidence: 0.96,
      source: "geometry",
      metadata: {
        x1: tail[0],
        y1: tail[1],
        x2: tip[0],
        y2: tip[1],
        headStrokeCount: 1,
      },
    }
  }

  // --- Multi-Stroke Arrow: 3 strokes (Shaft + 2 Barbs) ---
  if (strokes.length === 3) {
    const lengths = strokes.map(strokeArcLength)
    const maxIdx = lengths.indexOf(Math.max(...lengths))
    const shaft = strokes[maxIdx]
    const shaftLen = lengths[maxIdx]
    if (shaftLen < 20) return null

    const barbs = strokes.filter((_, idx) => idx !== maxIdx)
    const sStart = shaft[0]
    const sEnd = shaft[shaft.length - 1]
    const sChord = Math.hypot(sEnd[0] - sStart[0], sEnd[1] - sStart[1])
    if (sChord / shaftLen < 0.82) return null

    // Both barbs must be near one shaft endpoint
    let nearEndCount = 0
    let nearStartCount = 0
    for (const barb of barbs) {
      const bLen = strokeArcLength(barb)
      if (bLen > shaftLen * 0.6) return null
      const bMidX = (barb[0][0] + barb[barb.length - 1][0]) / 2
      const bMidY = (barb[0][1] + barb[barb.length - 1][1]) / 2
      if (Math.hypot(bMidX - sEnd[0], bMidY - sEnd[1]) <= shaftLen * 0.40) nearEndCount++
      if (Math.hypot(bMidX - sStart[0], bMidY - sStart[1]) <= shaftLen * 0.40) nearStartCount++
    }

    if (nearEndCount === 2 || nearStartCount === 2) {
      const isForward = nearEndCount === 2
      const tail = isForward ? sStart : sEnd
      const tip = isForward ? sEnd : sStart
      return {
        kind: "arrow",
        activeShape: "ARROW",
        confidence: 0.97,
        source: "geometry",
        metadata: {
          x1: tail[0],
          y1: tail[1],
          x2: tip[0],
          y2: tip[1],
          headStrokeCount: 2,
        },
      }
    }
  }

  // --- Single-Stroke Arrow (Shaft + Head in 1 continuous movement) ---
  if (strokes.length === 1 && features.diagonal >= 20) {
    const pts = strokes[0]
    if (pts.length >= 5) {
      const totalLen = features.totalLength
      let accLen = 0
      const cumLens: number[] = [0]
      for (let i = 1; i < pts.length; i++) {
        accLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
        cumLens.push(accLen)
      }

      // Check for sharp turn near end of stroke: (tail -> tip -> barb)
      for (let i = 2; i < pts.length - 1; i++) {
        const lenRatio = cumLens[i] / (totalLen || 1)
        if (lenRatio >= 0.50 && lenRatio <= 0.97) {
          const angle = cornerAngleDeg(pts[i - 1], pts[i], pts[i + 1])
          if (angle < 120) {
            const shaftLen = cumLens[i]
            const barbLen = totalLen - cumLens[i]
            const shaftChord = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1])

            if (shaftChord / (shaftLen || 1) >= 0.80 && barbLen >= 5 && barbLen <= shaftLen * 0.65) {
              // Arrowhead barb MUST point backwards toward the tail
              const sx = pts[i][0] - pts[0][0]
              const sy = pts[i][1] - pts[0][1]
              const bx = pts[pts.length - 1][0] - pts[i][0]
              const by = pts[pts.length - 1][1] - pts[i][1]
              const dot = (sx * bx + sy * by) / (Math.hypot(sx, sy) * Math.hypot(bx, by) || 1)
              const distBarbToTail = Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1])

              if (dot <= 0.15 && distBarbToTail < shaftLen * 0.98) {
                return {
                  kind: "arrow",
                  activeShape: "ARROW",
                  confidence: 0.94,
                  source: "geometry",
                  metadata: {
                    x1: pts[0][0],
                    y1: pts[0][1],
                    x2: pts[i][0],
                    y2: pts[i][1],
                  },
                }
              }
            }
          }
        }

        // Check for sharp turn near start of stroke: (barb -> tip -> tail)
        if (lenRatio >= 0.03 && lenRatio <= 0.50) {
          const angle = cornerAngleDeg(pts[i - 1], pts[i], pts[i + 1])
          if (angle < 120) {
            const barbLen = cumLens[i]
            const shaftLen = totalLen - cumLens[i]
            const shaftChord = Math.hypot(pts[pts.length - 1][0] - pts[i][0], pts[pts.length - 1][1] - pts[i][1])

            if (shaftChord / (shaftLen || 1) >= 0.80 && barbLen >= 5 && barbLen <= shaftLen * 0.65) {
              // Barb MUST point backwards toward tail
              const sx = pts[i][0] - pts[pts.length - 1][0]
              const sy = pts[i][1] - pts[pts.length - 1][1]
              const bx = pts[0][0] - pts[i][0]
              const by = pts[0][1] - pts[i][1]
              const dot = (sx * bx + sy * by) / (Math.hypot(sx, sy) * Math.hypot(bx, by) || 1)
              const distBarbToTail = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1])

              if (dot <= 0.15 && distBarbToTail < shaftLen * 0.98) {
                return {
                  kind: "arrow",
                  activeShape: "ARROW",
                  confidence: 0.94,
                  source: "geometry",
                  metadata: {
                    x1: pts[pts.length - 1][0],
                    y1: pts[pts.length - 1][1],
                    x2: pts[i][0],
                    y2: pts[i][1],
                  },
                }
              }
            }
          }
        }
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// 3. RECTANGLE RECOGNITION (Phase 5)
// ---------------------------------------------------------------------------

function evaluateRectangle(
  strokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  if (features.diagonal < 18) return null

  // Single-stroke rectangle (closed loop)
  if (strokes.length === 1) {
    const pts = strokes[0]
    if (pts.length < 8) return null

    // 1. Must be closed or near-closed
    if (features.closureRatio > 0.38 || features.endpointsDistance / features.totalLength > 0.28) {
      return null
    }

    // 2. Corner analysis on closed loop:
    // Split the closed stroke at the point farthest from pts[0] (opposite diagonal)
    let maxDist = 0
    let farIdx = Math.floor(pts.length / 2)
    const p0 = pts[0]
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - p0[0], pts[i][1] - p0[1])
      if (d > maxDist) {
        maxDist = d
        farIdx = i
      }
    }

    // Simplify the two halves
    const eps = Math.max(3.5, features.totalLength * 0.04)
    const half1 = douglasPeucker(pts.slice(0, farIdx + 1), eps)
    const half2 = douglasPeucker(pts.slice(farIdx), eps)
    const polygon = half1.slice(0, half1.length - 1).concat(half2)

    // Remove near-identical closure point if any
    const uniqueVerts: Point[] = []
    for (const p of polygon) {
      if (
        uniqueVerts.length === 0 ||
        Math.hypot(p[0] - uniqueVerts[uniqueVerts.length - 1][0], p[1] - uniqueVerts[uniqueVerts.length - 1][1]) > eps * 0.8
      ) {
        uniqueVerts.push(p)
      }
    }
    if (
      uniqueVerts.length >= 2 &&
      Math.hypot(uniqueVerts[0][0] - uniqueVerts[uniqueVerts.length - 1][0], uniqueVerts[0][1] - uniqueVerts[uniqueVerts.length - 1][1]) <= eps
    ) {
      uniqueVerts.pop()
    }

    // A valid rectangle must simplify to 4 dominant vertices (corners)
    if (uniqueVerts.length === 4 || uniqueVerts.length === 5) {
      const corners = uniqueVerts.slice(0, 4)
      let rightAnglesCount = 0
      let totalAngleDev = 0

      for (let i = 0; i < 4; i++) {
        const pPrev = corners[(i + 3) % 4]
        const pCurr = corners[i]
        const pNext = corners[(i + 1) % 4]
        const angle = cornerAngleDeg(pPrev, pCurr, pNext)
        const dev = Math.abs(angle - 90)
        totalAngleDev += dev
        if (angle >= 65 && angle <= 115) {
          rightAnglesCount++
        }
      }

      // At least 3 of 4 corners should be approximately right angles (65°..115°)
      // and mean deviation from 90° should be <= 22°
      if (rightAnglesCount >= 3 && totalAngleDev / 4 <= 22) {
        // Parallelism of opposite edges
        const v0x = corners[1][0] - corners[0][0]
        const v0y = corners[1][1] - corners[0][1]
        const v2x = corners[3][0] - corners[2][0]
        const v2y = corners[3][1] - corners[2][1]

        const l0 = Math.hypot(v0x, v0y)
        const l2 = Math.hypot(v2x, v2y)
        const dotOpp0 = (v0x * v2x + v0y * v2y) / (l0 * l2 || 1)

        const v1x = corners[2][0] - corners[1][0]
        const v1y = corners[2][1] - corners[1][1]
        const v3x = corners[0][0] - corners[3][0]
        const v3y = corners[0][1] - corners[3][1]

        const l1 = Math.hypot(v1x, v1y)
        const l3 = Math.hypot(v3x, v3y)
        const dotOpp1 = (v1x * v3x + v1y * v3y) / (l1 * l3 || 1)

        // Opposite edges should be roughly parallel or anti-parallel (|dot| >= 0.65)
        if (Math.abs(dotOpp0) >= 0.65 && Math.abs(dotOpp1) >= 0.65) {
          // Quad area vs Hull area: quad should account for almost all hull area
          const quadArea = polygonArea(corners)
          const hull = convexHull(pts)
          const hArea = polygonArea(hull)

          if (quadArea / (hArea || 1) >= 0.70) {
            const confidence = Math.min(
              0.98,
              Math.max(0.82, 0.94 - (totalAngleDev / 4) * 0.005)
            )
            return {
              kind: "rectangle",
              activeShape: "RECTANGLE",
              confidence,
              source: "geometry",
              metadata: {
                corners,
              },
            }
          }
        }
      }
    }
  }

  // Multi-stroke rectangle (4 strokes: one for each side)
  if (strokes.length === 4) {
    const sFeats = strokes.map((s) => extractStrokeFeatures([s]))
    const allStraight = sFeats.every((f) => f.straightness >= 0.75)
    if (allStraight && features.areaFillRatio >= 0.65) {
      return {
        kind: "rectangle",
        activeShape: "RECTANGLE",
        confidence: 0.92,
        source: "geometry",
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// 4. ELLIPSE RECOGNITION (Phase 4)
// ---------------------------------------------------------------------------

function evaluateEllipse(
  strokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  if (strokes.length !== 1) return null
  const pts = strokes[0]
  if (pts.length < 10) return null
  if (features.diagonal < 18) return null

  // 1. Must form a closed or near-closed loop
  const maxDim = Math.max(features.w, features.h, 1)
  if (features.closureRatio > 0.42 || features.endpointsDistance / features.totalLength > 0.30) {
    return null
  }

  // 2. Reject shapes that have 3 or more sharp 90-degree corners (which indicates a rectangle/triangle)
  const sharpCorners = findCorners(pts, 4, 125)
  if (sharpCorners.length >= 3) {
    return null // Too many sharp corners for an ellipse
  }

  // 3. Center and Second Moments (Orientation & Semi-Axes)
  const n = pts.length
  let sumX = 0
  let sumY = 0
  for (const p of pts) {
    sumX += p[0]
    sumY += p[1]
  }
  const cx = sumX / n
  const cy = sumY / n

  let mxx = 0
  let myy = 0
  let mxy = 0
  for (const p of pts) {
    const dx = p[0] - cx
    const dy = p[1] - cy
    mxx += dx * dx
    myy += dy * dy
    mxy += dx * dy
  }
  mxx /= n
  myy /= n
  mxy /= n

  // Orientation angle
  const theta = 0.5 * Math.atan2(2 * mxy, mxx - myy)
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  // Rotate points into principal frame and find semi-axes
  let maxU = 0
  let maxV = 0
  const uArr: number[] = []
  const vArr: number[] = []

  for (const p of pts) {
    const dx = p[0] - cx
    const dy = p[1] - cy
    const u = dx * cosT + dy * sinT
    const v = -dx * sinT + dy * cosT
    uArr.push(u)
    vArr.push(v)
    if (Math.abs(u) > maxU) maxU = Math.abs(u)
    if (Math.abs(v) > maxV) maxV = Math.abs(v)
  }

  // Semi-axes estimates
  const a = Math.max(maxU * 0.88, Math.sqrt(Math.max(1, 2 * (mxx * cosT * cosT + 2 * mxy * cosT * sinT + myy * sinT * sinT))))
  const b = Math.max(maxV * 0.88, Math.sqrt(Math.max(1, 2 * (mxx * sinT * sinT - 2 * mxy * cosT * sinT + myy * cosT * cosT))))

  if (a < 5 || b < 5) return null

  // 4. Mean Radial Residual Error
  let sumResidual = 0
  for (let i = 0; i < n; i++) {
    const rho = Math.sqrt((uArr[i] / a) ** 2 + (vArr[i] / b) ** 2)
    sumResidual += Math.abs(rho - 1.0)
  }
  const meanResidual = sumResidual / n

  // For hand-drawn ellipses, mean residual is <= 0.16 (leaves room for jitter while rejecting rectangles)
  if (meanResidual > 0.16) return null

  // 5. Angular Sweep & Octant Distribution
  // Ensures the stroke swept around the center and didn't zigzag through the middle (scribble)
  const octants = new Set<number>()
  for (let i = 0; i < n; i++) {
    const angle = Math.atan2(vArr[i], uArr[i])
    const oct = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8) % 8
    octants.add(oct)
  }

  // A complete ellipse must cover at least 7 of 8 octants
  if (octants.size < 7) return null

  // 6. Radial variance check from centroid
  if (features.radialVariance > 0.32) return null

  const confidence = Math.min(
    0.98,
    Math.max(0.80, 0.96 - meanResidual * 1.2 - features.radialVariance * 0.3)
  )

  return {
    kind: "ellipse",
    activeShape: "ELLIPSE",
    confidence,
    source: "geometry",
    metadata: {
      cx,
      cy,
      a,
      b,
      theta,
      eccentricity: Math.sqrt(Math.max(0, 1 - (Math.min(a, b) / Math.max(a, b)) ** 2)),
    },
  }
}

// ---------------------------------------------------------------------------
// Main Four-Shape Recognition Engine (Phase 8)
// Priority, Disambiguation & Hard Negative Rejection
// ---------------------------------------------------------------------------

/**
 * Recognize rough sketch input as ONLY one of four shapes:
 * 1. ELLIPSE
 * 2. RECTANGLE
 * 3. LINE
 * 4. ARROW
 * Or UNKNOWN if no confident match.
 */
export function recognizeGeometry(rawStrokes: Point[][]): RecognitionResult {
  const strokes = cleanStrokes(rawStrokes)
  const features = extractStrokeFeatures(strokes)
  const bounds = { x: features.x, y: features.y, w: features.w, h: features.h }

  // 1. Degenerate / trivial input check
  if (
    strokes.length === 0 ||
    features.pointCount < 3 ||
    (features.w < 8 && features.h < 8) ||
    features.diagonal < 14 ||
    features.totalLength < 14
  ) {
    return {
      recognized: false,
      kind: null,
      activeShape: "UNKNOWN",
      confidence: 0,
      source: "geometry",
      bounds,
    }
  }

  const candidates: RecognitionCandidate[] = []

  // 2. Closed-loop candidates vs Open-stroke candidates
  const isLikelyClosed = features.closureRatio <= 0.38 && strokes.length === 1

  if (isLikelyClosed) {
    // Test Rectangle first (checks corners and parallelism)
    const rectRes = evaluateRectangle(strokes, features)
    if (rectRes) candidates.push(rectRes)

    // Test Ellipse
    const ellipseRes = evaluateEllipse(strokes, features)
    if (ellipseRes) candidates.push(ellipseRes)
  } else {
    // Test Arrow (handles 1, 2, or 3 strokes)
    const arrowRes = evaluateArrow(strokes, features)
    if (arrowRes) candidates.push(arrowRes)

    // Test Line (handles 1 stroke)
    const lineRes = evaluateLine(strokes, features)
    if (lineRes) candidates.push(lineRes)

    // Multi-stroke rectangle (4 strokes)
    if (strokes.length === 4) {
      const multiRectRes = evaluateRectangle(strokes, features)
      if (multiRectRes) candidates.push(multiRectRes)
    }
  }

  // If none detected yet, run all 4 shape tests as safety net
  if (candidates.length === 0) {
    const arrowRes = evaluateArrow(strokes, features)
    if (arrowRes) candidates.push(arrowRes)

    const rectRes = evaluateRectangle(strokes, features)
    if (rectRes) candidates.push(rectRes)

    const ellipseRes = evaluateEllipse(strokes, features)
    if (ellipseRes) candidates.push(ellipseRes)

    const lineRes = evaluateLine(strokes, features)
    if (lineRes) candidates.push(lineRes)
  }

  // 3. Hard Rejection: If no candidate matched
  if (candidates.length === 0) {
    return {
      recognized: false,
      kind: null,
      activeShape: "UNKNOWN",
      confidence: 0,
      source: "geometry",
      bounds,
    }
  }

  // 4. Disambiguation & Confidence Ranking
  candidates.sort((a, b) => b.confidence - a.confidence)
  const top = candidates[0]

  // If top candidate confidence is below threshold, reject as UNKNOWN
  if (top.confidence < 0.75) {
    return {
      recognized: false,
      kind: null,
      activeShape: "UNKNOWN",
      confidence: top.confidence,
      source: "geometry",
      bounds,
    }
  }

  // Ellipse vs Rectangle Disambiguation:
  // If both are candidates:
  const hasRect = candidates.find((c) => c.kind === "rectangle")
  const hasEllipse = candidates.find((c) => c.kind === "ellipse")
  if (hasRect && hasEllipse) {
    // If corners are sharp and right angles verified -> Rectangle
    if (hasRect.confidence >= 0.85) {
      top.kind = "rectangle"
      top.activeShape = "RECTANGLE"
      top.confidence = hasRect.confidence
    } else {
      top.kind = "ellipse"
      top.activeShape = "ELLIPSE"
      top.confidence = hasEllipse.confidence
    }
  }

  // Line vs Arrow Disambiguation:
  // If both are candidates, Arrow takes precedence if barb is present
  const hasArrow = candidates.find((c) => c.kind === "arrow")
  const hasLine = candidates.find((c) => c.kind === "line")
  if (hasArrow && hasLine) {
    top.kind = "arrow"
    top.activeShape = "ARROW"
    top.confidence = hasArrow.confidence
  }

  const activeShape: ActiveFourShape =
    top.kind === "ellipse"
      ? "ELLIPSE"
      : top.kind === "rectangle"
      ? "RECTANGLE"
      : top.kind === "line"
      ? "LINE"
      : top.kind === "arrow"
      ? "ARROW"
      : "UNKNOWN"

  return {
    recognized: true,
    kind: top.kind,
    activeShape,
    confidence: top.confidence,
    source: "geometry",
    candidates,
    bounds,
    metadata: top.metadata,
  }
}
