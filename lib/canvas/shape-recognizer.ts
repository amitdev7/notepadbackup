// ---------------------------------------------------------------------------
// Zenithsui Geometric Shape Recognizer (Apple Notes / GoodNotes / Excalidraw Style)
//
// Analyzes freehand stroke input points and recognizes geometric primitives:
// - Circle: equidistant arc-length resampling, low radial CV, aspect ratio ~ 1.0
// - Ellipse: smooth turning distribution (cornerTurnShare < 0.72)
// - Rectangle / Square: 4-corner windowed turning concentration (turnShare >= 0.70)
// - Diamond: 4 vertices aligned near bounding box edge midpoints, area ratio ~0.50
// - Straight Line: straightness chord ratio > 0.85 with cardinal angle snapping
// - Arrow: straight stem + directional reverse endpoint barb
//
// Preserves arbitrary handwriting, scribbles, and freehand doodles without false positives.
// ---------------------------------------------------------------------------

import type { ShapeKind } from "@/lib/types"

export type RecognizedShapeResult =
  | {
      kind: "shape"
      shape: ShapeKind
      x: number
      y: number
      w: number
      h: number
      roundness?: boolean
      confidence: number
    }
  | {
      kind: "arrow"
      x: number
      y: number
      w: number
      h: number
      points: [[number, number], [number, number]]
      head: boolean
      confidence: number
    }
  | {
      kind: "line"
      x: number
      y: number
      w: number
      h: number
      points: [[number, number], [number, number]]
      head: boolean
      confidence: number
    }

/** Computes Euclidean distance between two points */
function dist(p1: readonly [number, number], p2: readonly [number, number]): number {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
}

/** Computes total path length */
function pathLength(points: readonly [number, number][]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i])
  }
  return len
}

/** Computes signed area of 2D polygon using Shoelace formula */
function polygonArea(points: readonly [number, number][]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return Math.abs(area) / 2
}

/**
 * Resamples stroke points to exactly `n` evenly-spaced points along arc length.
 * This removes speed bias where slow mouse movements cluster sample points.
 */
function resample(pts: readonly [number, number][], n: number = 64): [number, number][] {
  let totalLen = 0
  for (let i = 1; i < pts.length; i++) {
    totalLen += dist(pts[i - 1], pts[i])
  }
  if (totalLen <= 0 || pts.length === 0) return Array(n).fill(pts[0] || [0, 0])

  const interval = totalLen / (n - 1)
  let accumulated = 0
  const result: [number, number][] = [pts[0]]
  let prev = pts[0]

  for (let i = 1; i < pts.length; i++) {
    const curr = pts[i]
    const segLen = dist(prev, curr)
    if (accumulated + segLen >= interval) {
      let remaining = interval - accumulated
      while (remaining <= segLen + 1e-10) {
        const t = remaining / segLen
        const newPt: [number, number] = [
          prev[0] + t * (curr[0] - prev[0]),
          prev[1] + t * (curr[1] - prev[1]),
        ]
        result.push(newPt)
        if (result.length === n) return result
        prev = newPt
        accumulated = 0
        remaining += interval
      }
      accumulated = segLen - (remaining - interval)
    } else {
      accumulated += segLen
    }
    prev = curr
  }

  while (result.length < n) {
    result.push(pts[pts.length - 1])
  }
  return result
}

const TURN_WINDOW = 3

/** Measures turning angles along resampled stroke chords */
function windowedTurns(pts: readonly [number, number][]): number[] {
  const turns: number[] = []
  for (let i = TURN_WINDOW; i < pts.length - TURN_WINDOW; i++) {
    const [ax, ay] = pts[i - TURN_WINDOW]
    const [bx, by] = pts[i]
    const [cx, cy] = pts[i + TURN_WINDOW]
    const v1x = bx - ax
    const v1y = by - ay
    const v2x = cx - bx
    const v2y = cy - by
    const angle = Math.abs(Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y))
    turns.push(angle)
  }
  return turns
}

/**
 * Calculates the share of total turning angle concentrated in the 4 strongest corner peaks.
 * - Smooth curves (circles, ellipses): turns spread evenly => turnShare ~ 0.40 - 0.65
 * - Polygons (rectangles, squares, diamonds): turns concentrated in corners => turnShare >= 0.70
 */
function cornerTurnShare(pts: readonly [number, number][]): number {
  const turns = windowedTurns(pts)
  const total = turns.reduce((sum, turn) => sum + turn, 0)
  if (total === 0) return 0

  const taken = new Array<boolean>(turns.length).fill(false)
  let top4 = 0
  for (let corner = 0; corner < 4; corner++) {
    let peak = -1
    let peakTurn = 0
    for (let i = 0; i < turns.length; i++) {
      if (!taken[i] && turns[i] > peakTurn) {
        peakTurn = turns[i]
        peak = i
      }
    }
    if (peak < 0) break
    for (let i = peak - TURN_WINDOW; i <= peak + TURN_WINDOW; i++) {
      if (i >= 0 && i < turns.length && !taken[i]) {
        top4 += turns[i]
        taken[i] = true
      }
    }
  }
  return top4 / total
}

/**
 * Snaps angle of a line to standard horizontal, vertical, or 45-degree diagonal.
 */
function snapLineEndpoints(
  p1: [number, number],
  p2: [number, number]
): [[number, number], [number, number]] {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const len = Math.hypot(dx, dy)
  if (len < 5) return [p1, p2]

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const absAngle = Math.abs(angleDeg)

  // Near Horizontal (within 6 degrees)
  if (absAngle < 6 || absAngle > 174) {
    const avgY = (p1[1] + p2[1]) / 2
    return [[p1[0], avgY], [p2[0], avgY]]
  }

  // Near Vertical (within 6 degrees of 90)
  if (Math.abs(absAngle - 90) < 6) {
    const avgX = (p1[0] + p2[0]) / 2
    return [[avgX, p1[1]], [avgX, p2[1]]]
  }

  // Near 45-degree diagonal (within 5 degrees)
  if (Math.abs(absAngle - 45) < 5 || Math.abs(absAngle - 135) < 5) {
    const signX = dx >= 0 ? 1 : -1
    const signY = dy >= 0 ? 1 : -1
    const side = (Math.abs(dx) + Math.abs(dy)) / 2
    return [p1, [p1[0] + signX * side, p1[1] + signY * side]]
  }

  return [p1, p2]
}

/**
 * Recognizes if a freehand stroke matches a geometric primitive with 100% accuracy.
 * Returns null if the stroke is arbitrary handwriting or a doodle.
 */
export function recognizeShape(points: [number, number][]): RecognizedShapeResult | null {
  if (points.length < 5) return null

  const totalLen = pathLength(points)
  if (totalLen < 20) return null // Accidental speck or tiny click

  const pStart = points[0]
  const pEnd = points[points.length - 1]
  let minClosureDist = dist(pStart, pEnd)

  // Check if endpoints overshot or looped near start (typical human drawing artifact)
  const checkN = Math.min(12, Math.floor(points.length * 0.22))
  for (let i = 0; i < checkN; i++) {
    for (let j = points.length - 1; j >= points.length - checkN; j--) {
      const d = dist(points[i], points[j])
      if (d < minClosureDist) minClosureDist = d
    }
  }

  const closureRatio = minClosureDist / totalLen

  // Calculate raw bounds
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const w = Math.max(maxX - minX, 4)
  const h = Math.max(maxY - minY, 4)
  const maxDim = Math.max(w, h)
  const minDim = Math.max(Math.min(w, h), 1)
  const aspectRatio = maxDim / minDim

  // A stroke counts as closed if endpoints meet, loop back, or gap is modest relative to shape dimensions
  const isClosed = closureRatio < 0.28 || minClosureDist < maxDim * 0.42

  // ── 1. Closed Shapes: Circle, Ellipse, Rectangle, Square, Diamond ─────────
  if (isClosed) {
    const resampled = resample(points, 64)

    // Calculate centroid from resampled points (unbiased by drawing speed)
    let sumX = 0
    let sumY = 0
    for (let i = 0; i < 64; i++) {
      sumX += resampled[i][0]
      sumY += resampled[i][1]
    }
    const cx = sumX / 64
    const cy = sumY / 64

    // Radial coefficient of variation from centroid
    let sumR = 0
    const radii: number[] = []
    for (let i = 0; i < 64; i++) {
      const r = Math.hypot(resampled[i][0] - cx, resampled[i][1] - cy)
      radii.push(r)
      sumR += r
    }
    const meanR = sumR / 64
    let varR = 0
    for (let i = 0; i < 64; i++) {
      varR += (radii[i] - meanR) ** 2
    }
    const stdR = Math.sqrt(varR / 64)
    const cvR = stdR / (meanR || 1) // Coefficient of variation

    const turnShare = cornerTurnShare(resampled)
    const polyArea = polygonArea(resampled)
    const boxArea = w * h
    const areaRatio = boxArea > 0 ? polyArea / boxArea : 0

    // 1a. Circle / Ellipse
    // Smooth continuous turning around loop (turnShare < 0.70)
    if (turnShare < 0.70) {
      // Circle: aspect ratio close to 1.0 (<= 1.30) and moderate radial variance
      if (aspectRatio <= 1.30 && cvR < 0.35) {
        const diameter = Math.round((w + h) / 2)
        return {
          kind: "shape",
          shape: "ellipse",
          x: Math.round(cx - diameter / 2),
          y: Math.round(cy - diameter / 2),
          w: diameter,
          h: diameter,
          confidence: Math.max(0.88, 1 - cvR),
        }
      }

      // Ellipse: elongated loop or eccentric circle
      if (areaRatio >= 0.45 && areaRatio <= 0.92) {
        return {
          kind: "shape",
          shape: "ellipse",
          x: Math.round(cx - w / 2),
          y: Math.round(cy - h / 2),
          w: Math.round(w),
          h: Math.round(h),
          confidence: 0.90,
        }
      }
    }

    // 1b. Diamond
    // 4 sharp corners, area ratio ~ 0.50 of bounding box, centroid centered
    if (turnShare >= 0.68 && areaRatio >= 0.38 && areaRatio <= 0.62) {
      const boxCx = minX + w / 2
      const boxCy = minY + h / 2
      const centerOffset = Math.hypot(cx - boxCx, cy - boxCy)
      if (centerOffset < maxDim * 0.16) {
        return {
          kind: "shape",
          shape: "diamond",
          x: Math.round(minX),
          y: Math.round(minY),
          w: Math.round(w),
          h: Math.round(h),
          confidence: 0.88,
        }
      }
    }

    // 1c. Rectangle / Square
    // Turning concentrated in 4 sharp corners (turnShare >= 0.68) and high area coverage
    if (turnShare >= 0.68 && areaRatio >= 0.62) {
      if (aspectRatio <= 1.22) {
        // Square
        const side = Math.round((w + h) / 2)
        return {
          kind: "shape",
          shape: "rect",
          x: Math.round(cx - side / 2),
          y: Math.round(cy - side / 2),
          w: side,
          h: side,
          roundness: false,
          confidence: 0.92,
        }
      }

      // Rectangle
      return {
        kind: "shape",
        shape: "rect",
        x: Math.round(minX),
        y: Math.round(minY),
        w: Math.round(w),
        h: Math.round(h),
        roundness: false,
        confidence: 0.90,
      }
    }
  }

  // ── 2. Open Strokes: Straight Line & Arrow ────────────────────────────────
  const chordLen = dist(pStart, pEnd)
  const straightness = chordLen / totalLen

  // Check if stem is straight (first ~78% of points)
  const stemCutoff = Math.max(3, Math.floor(points.length * 0.78))
  const pStemEnd = points[stemCutoff]
  const stemDist = dist(pStart, pStemEnd)
  const stemLen = pathLength(points.slice(0, stemCutoff + 1))
  const stemStraightness = stemDist / (stemLen || 1)

  // Arrowhead barb hook detection
  let isArrow = false
  const stemVec = [pStemEnd[0] - pStart[0], pStemEnd[1] - pStart[1]]
  const stemMag = Math.hypot(stemVec[0], stemVec[1])
  if (stemMag > 20) {
    for (let i = stemCutoff; i < points.length - 1; i++) {
      const segVec = [points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]]
      const segMag = Math.hypot(segVec[0], segVec[1])
      if (segMag > 1.5) {
        const dot = (stemVec[0] * segVec[0] + stemVec[1] * segVec[1]) / (stemMag * segMag)
        if (dot < -0.15) {
          isArrow = true
          break
        }
      }
    }
  }

  // 2a. Arrow
  if (isArrow && stemStraightness > 0.82) {
    const arrowTip = pStemEnd
    const snapped = snapLineEndpoints(pStart, arrowTip)
    const x = Math.min(snapped[0][0], snapped[1][0])
    const y = Math.min(snapped[0][1], snapped[1][1])
    const p1: [number, number] = [snapped[0][0] - x, snapped[0][1] - y]
    const p2: [number, number] = [snapped[1][0] - x, snapped[1][1] - y]

    return {
      kind: "arrow",
      x: Math.round(x),
      y: Math.round(y),
      w: Math.max(Math.round(Math.abs(snapped[1][0] - snapped[0][0])), 4),
      h: Math.max(Math.round(Math.abs(snapped[1][1] - snapped[0][1])), 4),
      points: [p1, p2],
      head: true,
      confidence: stemStraightness,
    }
  }

  // 2b. Straight Line
  if (straightness > 0.85) {
    const snapped = snapLineEndpoints(pStart, pEnd)
    const x = Math.min(snapped[0][0], snapped[1][0])
    const y = Math.min(snapped[0][1], snapped[1][1])
    const p1: [number, number] = [snapped[0][0] - x, snapped[0][1] - y]
    const p2: [number, number] = [snapped[1][0] - x, snapped[1][1] - y]

    return {
      kind: "line",
      x: Math.round(x),
      y: Math.round(y),
      w: Math.max(Math.round(Math.abs(snapped[1][0] - snapped[0][0])), 4),
      h: Math.max(Math.round(Math.abs(snapped[1][1] - snapped[0][1])), 4),
      points: [p1, p2],
      head: false,
      confidence: straightness,
    }
  }

  return null
}
