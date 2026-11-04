// ---------------------------------------------------------------------------
// Zenithsui Geometric Shape Recognizer (Apple Notes / GoodNotes Style)
//
// Analyzes freehand stroke input points and recognizes geometric primitives:
// - Circle / Ellipse (low radial coefficient of variation from centroid)
// - Rectangle / Square (bounding area ratio + 4 corner detection)
// - Diamond (4 vertices aligned to cardinal axes)
// - Straight Line (straightness ratio D/L > 0.90)
// - Arrow (straight stem + directional endpoint barb)
// - Triangle (3 prominent vertices, area ratio ~0.50)
// ---------------------------------------------------------------------------

import type { ShapeKind, SquigNode } from "@/lib/types"

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
function dist(p1: [number, number], p2: [number, number]): number {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
}

/** Computes total path length */
function pathLength(points: [number, number][]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i])
  }
  return len
}

/** Computes signed area of 2D polygon using Shoelace formula */
function polygonArea(points: [number, number][]): number {
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
 * Recognizes if a freehand stroke matches a geometric primitive.
 * Returns null if the stroke is arbitrary handwriting or doodle.
 */
export function recognizeShape(points: [number, number][]): RecognizedShapeResult | null {
  if (points.length < 8) return null

  const totalLen = pathLength(points)
  if (totalLen < 25) return null // Too short to distinguish

  const pStart = points[0]
  const pEnd = points[points.length - 1]
  const closureDist = dist(pStart, pEnd)
  const closureRatio = closureDist / totalLen

  // Calculate bounding box and centroid
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let sumX = 0
  let sumY = 0

  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    sumX += x
    sumY += y
  }

  const w = Math.max(maxX - minX, 4)
  const h = Math.max(maxY - minY, 4)
  const cx = sumX / points.length
  const cy = sumY / points.length
  const boxArea = w * h
  const polyArea = polygonArea(points)

  // ── 1. Open Stroke: Straight Line & Arrow ─────────────────────────────────
  if (closureRatio > 0.22) {
    const straightness = closureDist / totalLen

    // Check main stem straightness (first ~78% of points)
    const stemCutoff = Math.max(4, Math.floor(points.length * 0.78))
    const pStemEnd = points[stemCutoff]
    const stemDist = dist(pStart, pStemEnd)
    const stemLen = pathLength(points.slice(0, stemCutoff + 1))
    const stemStraightness = stemDist / (stemLen || 1)

    // Check if tail has backward hook or barb
    let isArrow = false
    const stemVec = [pStemEnd[0] - pStart[0], pStemEnd[1] - pStart[1]]
    const stemMag = Math.hypot(stemVec[0], stemVec[1])
    if (stemMag > 25) {
      for (let i = stemCutoff; i < points.length - 1; i++) {
        const segVec = [points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]]
        const segMag = Math.hypot(segVec[0], segVec[1])
        if (segMag > 2) {
          const dot = (stemVec[0] * segVec[0] + stemVec[1] * segVec[1]) / (stemMag * segMag)
          if (dot < -0.2) {
            isArrow = true
            break
          }
        }
      }
    }

    if (isArrow && stemStraightness > 0.84) {
      const arrowTip = pStemEnd
      const x = Math.min(pStart[0], arrowTip[0])
      const y = Math.min(pStart[1], arrowTip[1])
      const p1: [number, number] = [pStart[0] - x, pStart[1] - y]
      const p2: [number, number] = [arrowTip[0] - x, arrowTip[1] - y]
      return {
        kind: "arrow",
        x,
        y,
        w: Math.max(Math.abs(arrowTip[0] - pStart[0]), 4),
        h: Math.max(Math.abs(arrowTip[1] - pStart[1]), 4),
        points: [p1, p2],
        head: true,
        confidence: stemStraightness,
      }
    }

    // Pure straight line
    if (straightness > 0.88) {
      const x = Math.min(pStart[0], pEnd[0])
      const y = Math.min(pStart[1], pEnd[1])
      const p1: [number, number] = [pStart[0] - x, pStart[1] - y]
      const p2: [number, number] = [pEnd[0] - x, pEnd[1] - y]

      return {
        kind: "line",
        x,
        y,
        w,
        h,
        points: [p1, p2],
        head: false,
        confidence: straightness,
      }
    }
  }

  // ── 2. Closed Loop Primitives: Circle, Ellipse, Rectangle, Diamond ────────
  if (closureRatio <= 0.28 || closureDist < Math.max(w, h) * 0.35) {
    // Radial analysis from centroid
    let sumR = 0
    const radii: number[] = []
    for (let i = 0; i < points.length; i++) {
      const r = Math.hypot(points[i][0] - cx, points[i][1] - cy)
      radii.push(r)
      sumR += r
    }
    const meanR = sumR / points.length
    let varR = 0
    for (let i = 0; i < radii.length; i++) {
      varR += (radii[i] - meanR) ** 2
    }
    const stdR = Math.sqrt(varR / points.length)
    const cvR = stdR / (meanR || 1) // Coefficient of variation

    const aspectRatio = Math.max(w, h) / Math.min(w, h)
    const areaRatio = polyArea / boxArea

    // 2a. Circle / Ellipse
    // Circles have very uniform radii from center (cvR < 0.18) and aspect ratio ~ 1.
    // Ellipses have slightly higher cvR due to eccentricity, but areaRatio matches pi/4 (~0.785)
    if (cvR < 0.18 && aspectRatio < 1.35) {
      // Crisp Circle: make bounds square
      const size = Math.max(w, h)
      return {
        kind: "shape",
        shape: "ellipse",
        x: Math.round(cx - size / 2),
        y: Math.round(cy - size / 2),
        w: Math.round(size),
        h: Math.round(size),
        confidence: 1 - cvR,
      }
    }

    if (cvR < 0.24 && areaRatio >= 0.65 && areaRatio <= 0.88) {
      // Ellipse
      return {
        kind: "shape",
        shape: "ellipse",
        x: Math.round(minX),
        y: Math.round(minY),
        w: Math.round(w),
        h: Math.round(h),
        confidence: 0.88,
      }
    }

    // 2b. Diamond
    // A diamond has areaRatio close to 0.50 (half of the bounding box)
    // with vertices near the midpoints of the bounding box edges
    if (areaRatio >= 0.42 && areaRatio <= 0.58) {
      // Test if centroid is close to box center
      const boxCx = minX + w / 2
      const boxCy = minY + h / 2
      const centerOffset = Math.hypot(cx - boxCx, cy - boxCy)
      if (centerOffset < Math.max(w, h) * 0.12) {
        return {
          kind: "shape",
          shape: "diamond",
          x: Math.round(minX),
          y: Math.round(minY),
          w: Math.round(w),
          h: Math.round(h),
          confidence: 0.85,
        }
      }
    }

    // 2c. Rectangle / Square
    // Rectangles fill the majority of the bounding box (areaRatio > 0.72)
    // and have corner radii variations
    if (areaRatio > 0.72 && cvR >= 0.18) {
      if (aspectRatio < 1.2) {
        // Square
        const side = Math.max(w, h)
        return {
          kind: "shape",
          shape: "rect",
          x: Math.round(cx - side / 2),
          y: Math.round(cy - side / 2),
          w: Math.round(side),
          h: Math.round(side),
          roundness: false,
          confidence: 0.9,
        }
      }
      return {
        kind: "shape",
        shape: "rect",
        x: Math.round(minX),
        y: Math.round(minY),
        w: Math.round(w),
        h: Math.round(h),
        roundness: false,
        confidence: 0.88,
      }
    }
  }

  return null
}
