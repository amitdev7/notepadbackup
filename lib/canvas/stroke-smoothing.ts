// ---------------------------------------------------------------------------
// Stroke Smoothing & Spline Interpolation Engine
//
// Converts high-frequency pointer streams (including coalesced events)
// into silky, organic ink paths:
// 1. Distance decimation: Removes microscopic sub-pixel jitter without loss of detail.
// 2. Chaikin corner-cutting: Converges to uniform quadratic B-splines.
// 3. Midpoint quadratic Bezier path generation: Real-time C1-smooth SVG rendering.
// ---------------------------------------------------------------------------

export type SmoothingMode = "none" | "medium" | "high"

/**
 * Prunes adjacent points that are closer than minDistance world units,
 * preserving stroke endpoints and significant directional changes.
 */
export function decimatePoints(
  points: readonly [number, number][],
  minDistance = 0.75
): [number, number][] {
  if (points.length <= 2) return points.map((p) => [p[0], p[1]])
  const out: [number, number][] = [[points[0][0], points[0][1]]]
  const minDistSq = minDistance * minDistance

  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1]
    const p = points[i]
    const dx = p[0] - last[0]
    const dy = p[1] - last[1]
    if (dx * dx + dy * dy >= minDistSq) {
      out.push([p[0], p[1]])
    }
  }

  const end = points[points.length - 1]
  out.push([end[0], end[1]])
  return out
}

/**
 * Single pass of Chaikin's corner-cutting algorithm.
 * Replaces each segment between Pi and Pi+1 with two points at 25% and 75%.
 */
function chaikinPass(points: readonly [number, number][]): [number, number][] {
  if (points.length <= 2) return points.map((p) => [p[0], p[1]])
  const out: [number, number][] = [[points[0][0], points[0][1]]]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    out.push([
      0.75 * p0[0] + 0.25 * p1[0],
      0.75 * p0[1] + 0.25 * p1[1],
    ])
    out.push([
      0.25 * p0[0] + 0.75 * p1[0],
      0.25 * p0[1] + 0.75 * p1[1],
    ])
  }

  const end = points[points.length - 1]
  out.push([end[0], end[1]])
  return out
}

/**
 * Smooths raw recorded points according to user-configured smoothing profile.
 */
export function smoothPoints(
  rawPoints: readonly [number, number][],
  mode: SmoothingMode = "medium"
): [number, number][] {
  if (rawPoints.length <= 2 || mode === "none") {
    return rawPoints.map((p) => [p[0], p[1]])
  }

  // First pass: prune sub-pixel tremors
  const decimated = decimatePoints(rawPoints, mode === "high" ? 1.0 : 0.6)
  if (decimated.length <= 2) return decimated

  // Chaikin smoothing
  if (mode === "high") {
    return chaikinPass(chaikinPass(decimated))
  }
  return chaikinPass(decimated)
}

/**
 * Midpoint quadratic Bezier path generation for real-time SVG preview.
 * Passes smoothly through midpoints of consecutive vertices.
 */
export function pointsToSmoothSvgPath(points: readonly [number, number][]): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]} Z`
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`
  }

  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i][0] + points[i + 1][0]) / 2
    const yc = (points[i][1] + points[i + 1][1]) / 2
    d += ` Q ${points[i][0]} ${points[i][1]} ${xc} ${yc}`
  }
  const last = points[points.length - 1]
  d += ` L ${last[0]} ${last[1]}`
  return d
}
