// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Preprocessing & Feature Extraction
// ---------------------------------------------------------------------------

import type { Point, StrokeFeatures } from "./types"

/** Minimum distance in px between consecutive points to filter micro-jitter */
const MIN_POINT_DISTANCE = 1.5

/**
 * Clean and filter raw stroke points:
 * 1. Remove duplicate or near-identical consecutive points (< 1.5px)
 * 2. Smooth minor jitter using running average
 */
export function cleanStroke(rawPoints: Point[]): Point[] {
  if (!rawPoints || rawPoints.length <= 1) return rawPoints || []

  // 1. Deduplicate consecutive identical points
  const deduplicated: Point[] = [rawPoints[0]]
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = deduplicated[deduplicated.length - 1]
    const curr = rawPoints[i]
    const dist = Math.hypot(curr[0] - prev[0], curr[1] - prev[1])
    if (dist >= MIN_POINT_DISTANCE) {
      deduplicated.push(curr)
    }
  }

  if (deduplicated.length <= 2) return deduplicated

  // 2. Light 3-point running average smoothing (preserves endpoints)
  // Only smooth if points are densely sampled (average spacing < 8px and length > 12)
  let totalLen = 0
  for (let i = 1; i < deduplicated.length; i++) {
    totalLen += Math.hypot(deduplicated[i][0] - deduplicated[i - 1][0], deduplicated[i][1] - deduplicated[i - 1][1])
  }
  const avgSpacing = totalLen / (deduplicated.length - 1)
  if (avgSpacing >= 8 || deduplicated.length <= 12) {
    return deduplicated
  }

  const smoothed: Point[] = [deduplicated[0]]
  for (let i = 1; i < deduplicated.length - 1; i++) {
    const p0 = deduplicated[i - 1]
    const p1 = deduplicated[i]
    const p2 = deduplicated[i + 1]
    smoothed.push([
      0.25 * p0[0] + 0.5 * p1[0] + 0.25 * p2[0],
      0.25 * p0[1] + 0.5 * p1[1] + 0.25 * p2[1],
    ])
  }
  smoothed.push(deduplicated[deduplicated.length - 1])

  return smoothed
}

/** Clean multiple strokes */
export function cleanStrokes(strokes: Point[][]): Point[][] {
  return strokes
    .map(cleanStroke)
    .filter((s) => s.length >= 2 || (s.length === 1 && strokes.length === 1))
}

/** Calculate total arc length of a stroke */
export function strokeArcLength(points: Point[]): number {
  if (points.length < 2) return 0
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return len
}

/** Resample points along the stroke to N equidistant points */
export function resampleStroke(points: Point[], n = 64): Point[] {
  if (points.length <= 2) return points
  const totalLen = strokeArcLength(points)
  if (totalLen <= 0.001) return points

  const interval = totalLen / (n - 1)
  const resampled: Point[] = [points[0]]
  let currentDist = 0
  let targetDist = interval
  let prev = points[0]

  for (let i = 1; i < points.length; i++) {
    const curr = points[i]
    const segLen = Math.hypot(curr[0] - prev[0], curr[1] - prev[1])
    if (segLen <= 0.0001) continue

    while (currentDist + segLen >= targetDist && resampled.length < n) {
      const t = (targetDist - currentDist) / segLen
      const nx = prev[0] + t * (curr[0] - prev[0])
      const ny = prev[1] + t * (curr[1] - prev[1])
      resampled.push([nx, ny])
      targetDist += interval
    }

    currentDist += segLen
    prev = curr
  }

  while (resampled.length < n) {
    resampled.push(points[points.length - 1])
  }

  return resampled
}

/**
 * Calculate 2D convex hull using Monotone Chain algorithm.
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length <= 2) return points
  const sorted = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))

  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const lower: Point[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: Point[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Calculate polygon area via Shoelace formula */
export function polygonArea(poly: Point[]): number {
  if (poly.length < 3) return 0
  let area = 0
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]
  }
  return Math.abs(area) / 2
}

/**
 * Detect corners and significant directional inflection points in stroke.
 * Angles below ~140° are candidate corners.
 */
export function findCorners(points: Point[], windowSize = 4, angleThreshold = 145): Point[] {
  const win = Math.max(1, Math.min(windowSize, Math.floor((points.length - 1) / 2)))
  if (points.length < win * 2 + 1) return []
  const corners: Point[] = []

  for (let i = win; i < points.length - win; i++) {
    const p0 = points[i - win]
    const p1 = points[i]
    const p2 = points[i + win]

    const v1x = p0[0] - p1[0]
    const v1y = p0[1] - p1[1]
    const v2x = p2[0] - p1[0]
    const v2y = p2[1] - p1[1]

    const l1 = Math.hypot(v1x, v1y)
    const l2 = Math.hypot(v2x, v2y)
    if (l1 < 2 || l2 < 2) continue

    const dot = (v1x * v2x + v1y * v2y) / (l1 * l2)
    const clampedDot = Math.max(-1, Math.min(1, dot))
    const angleDeg = (Math.acos(clampedDot) * 180) / Math.PI

    if (angleDeg < angleThreshold) {
      // Local minimum angle check
      corners.push(p1)
      i += windowSize // skip neighbor points to prevent duplicate corner markers
    }
  }

  return corners
}

/**
 * Check if two 2D segments (p1-p2 and p3-p4) intersect.
 */
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const ccw = (a: Point, b: Point, c: Point) =>
    (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  )
}

/**
 * Check if a stroke has self-intersection (excluding adjacent segments).
 */
export function checkSelfIntersection(points: Point[]): boolean {
  if (points.length < 5) return false
  const step = Math.max(1, Math.floor(points.length / 40))
  const sample: Point[] = []
  for (let i = 0; i < points.length; i += step) {
    sample.push(points[i])
  }

  for (let i = 0; i < sample.length - 2; i++) {
    for (let j = i + 2; j < sample.length - 1; j++) {
      if (i === 0 && j === sample.length - 2) continue // ignore near endpoints loop
      if (segmentsIntersect(sample[i], sample[i + 1], sample[j], sample[j + 1])) {
        return true
      }
    }
  }
  return false
}

/**
 * Extract comprehensive geometric & directional features from strokes.
 */
export function extractStrokeFeatures(rawStrokes: Point[][]): StrokeFeatures {
  const strokes = cleanStrokes(rawStrokes)
  const allPoints: Point[] = strokes.flat()

  if (allPoints.length === 0) {
    return {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      cx: 0,
      cy: 0,
      aspectRatio: 1,
      diagonal: 0,
      pointCount: 0,
      strokeCount: 0,
      totalLength: 0,
      endpointsDistance: 0,
      closureRatio: 1,
      straightness: 0,
      corners: [],
      cornerCount: 0,
      averageCurvature: 0,
      maxCurvature: 0,
      hullArea: 0,
      boxArea: 0,
      areaFillRatio: 0,
      circularity: 0,
      radialVariance: 1,
      startPoint: [0, 0],
      endPoint: [0, 0],
      hasSelfIntersection: false,
      inflectionPoints: [],
    }
  }

  const xs = allPoints.map((p) => p[0])
  const ys = allPoints.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const cx = minX + w / 2
  const cy = minY + h / 2
  const aspectRatio = w / h
  const diagonal = Math.hypot(w, h)

  let totalLength = 0
  for (const s of strokes) {
    totalLength += strokeArcLength(s)
  }

  const primaryStroke = strokes[0] || [[0, 0], [0, 0]]
  const startPoint = primaryStroke[0]
  const endPoint = primaryStroke[primaryStroke.length - 1]
  const endpointsDistance = Math.hypot(endPoint[0] - startPoint[0], endPoint[1] - startPoint[1])
  const closureRatio = endpointsDistance / Math.max(w, h, 1)
  const straightness = totalLength > 0 ? endpointsDistance / totalLength : 0

  const corners: Point[] = []
  for (const s of strokes) {
    corners.push(...findCorners(s))
  }

  // Radial variance from centroid
  const radii = allPoints.map((p) => Math.hypot(p[0] - cx, p[1] - cy))
  const meanRadius = radii.reduce((acc, r) => acc + r, 0) / (radii.length || 1)
  const variance =
    radii.reduce((acc, r) => acc + Math.pow(r - meanRadius, 2), 0) / (radii.length || 1)
  const stdDev = Math.sqrt(variance)
  const radialVariance = meanRadius > 0 ? stdDev / meanRadius : 1

  // Convex hull & areas
  const hull = convexHull(allPoints)
  const hullArea = polygonArea(hull)
  const boxArea = w * h
  const areaFillRatio = boxArea > 0 ? hullArea / boxArea : 0

  // Circularity metric: 4 * pi * Area / Perimeter^2
  const closedHull = hull.length > 2 ? [...hull, hull[0]] : hull
  const hullPerimeter = strokeArcLength(closedHull)
  const circularity =
    hullPerimeter > 0 ? (4 * Math.PI * hullArea) / (hullPerimeter * hullPerimeter) : 0

  const hasSelfIntersection = strokes.some(checkSelfIntersection)

  return {
    x: minX,
    y: minY,
    w,
    h,
    cx,
    cy,
    aspectRatio,
    diagonal,
    pointCount: allPoints.length,
    strokeCount: strokes.length,
    totalLength,
    endpointsDistance,
    closureRatio,
    straightness,
    corners,
    cornerCount: corners.length,
    averageCurvature: 0,
    maxCurvature: 0,
    hullArea,
    boxArea,
    areaFillRatio,
    circularity,
    radialVariance,
    startPoint,
    endPoint,
    hasSelfIntersection,
    inflectionPoints: corners,
  }
}
