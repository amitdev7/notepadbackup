// ---------------------------------------------------------------------------
// Zenithsui Laser Ribbon & Smoothing Engine
//
// Converts discrete high-frequency pointer samples into silky, continuous,
// tapered glowing laser trails:
// 1. Distance decimation: Filters sub-pixel tremors and eliminates bead accumulation.
// 2. Chaikin B-spline interpolation: Converges to C1-smooth curved trajectories.
// 3. Tapered ribbon polygon generation: Produces a single closed boundary mesh
//    with zero overlapping line caps, zero internal vertex dots, and organic taper.
// 4. Optical dual-layer glow: Luminous outer neon halo + bright white core.
// ---------------------------------------------------------------------------

export interface LaserPoint {
  x: number
  y: number
  t: number
}

export interface RibbonContour {
  left: { x: number; y: number }[]
  right: { x: number; y: number }[]
  head: { x: number; y: number; r: number }
  tail: { x: number; y: number; r: number }
}

export interface LaserRenderOptions {
  color: string
  durationMs: number
  width: number
  glowIntensity: "none" | "subtle" | "vibrant" | "neon"
  pulseDot: boolean
}

/**
 * Converts a hex color string into [r, g, b] triplet.
 */
export function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || "#EF4444").replace("#", "").trim()
  if (c.length === 3) c = c.split("").map((x) => x + x).join("")
  const num = parseInt(c, 16)
  if (Number.isNaN(num)) return [239, 68, 68]
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

/**
 * Prunes adjacent points that are closer than minDist pixels,
 * preventing mousemove event clustering and bead stacking.
 */
export function decimateLaserPoints(pts: readonly LaserPoint[], minDist = 2.5): LaserPoint[] {
  if (pts.length <= 2) return pts.map((p) => ({ ...p }))
  const out: LaserPoint[] = [{ ...pts[0] }]
  const minDistSq = minDist * minDist

  for (let i = 1; i < pts.length - 1; i++) {
    const last = out[out.length - 1]
    const p = pts[i]
    const dx = p.x - last.x
    const dy = p.y - last.y
    if (dx * dx + dy * dy >= minDistSq) {
      out.push({ ...p })
    }
  }

  out.push({ ...pts[pts.length - 1] })
  return out
}

/**
 * Chaikin corner-cutting algorithm.
 * Replaces each segment between Pi and Pi+1 with two points at 25% and 75%,
 * interpolating spatial coordinates and timestamps smoothly.
 */
export function smoothLaserPoints(pts: readonly LaserPoint[]): LaserPoint[] {
  if (pts.length <= 2) return pts.map((p) => ({ ...p }))
  const out: LaserPoint[] = [{ ...pts[0] }]

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]

    out.push({
      x: 0.75 * p0.x + 0.25 * p1.x,
      y: 0.75 * p0.y + 0.25 * p1.y,
      t: 0.75 * p0.t + 0.25 * p1.t,
    })
    out.push({
      x: 0.25 * p0.x + 0.75 * p1.x,
      y: 0.25 * p0.y + 0.75 * p1.y,
      t: 0.25 * p0.t + 0.75 * p1.t,
    })
  }

  out.push({ ...pts[pts.length - 1] })
  return out
}

/**
 * Computes a smooth, tapered ribbon contour around a smoothed spine of points.
 * Width smoothly tapers from full width at the newest head to zero at the oldest tail.
 */
export function computeLaserRibbon(
  pts: readonly LaserPoint[],
  baseWidth: number,
  trailLifetime: number,
  now: number
): RibbonContour | null {
  const n = pts.length
  if (n < 2) return null

  const left: { x: number; y: number }[] = []
  const right: { x: number; y: number }[] = []

  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const age = now - p.t
    const progress = Math.min(1, Math.max(0, age / trailLifetime))
    const life = 1 - progress

    // Smooth nonlinear width taper from tail to head
    const widthFactor = Math.sin((life * Math.PI) / 2)
    const halfWidth = Math.max(0.4, (baseWidth / 2) * widthFactor)

    // Compute tangent vector
    let dx = 0
    let dy = 0
    if (i === 0) {
      dx = pts[1].x - p.x
      dy = pts[1].y - p.y
    } else if (i === n - 1) {
      dx = p.x - pts[n - 2].x
      dy = p.y - pts[n - 2].y
    } else {
      dx = pts[i + 1].x - pts[i - 1].x
      dy = pts[i + 1].y - pts[i - 1].y
    }

    const len = Math.hypot(dx, dy)
    let nx = 0
    let ny = 1
    if (len > 1e-4) {
      nx = -dy / len
      ny = dx / len
    }

    left.push({
      x: p.x + nx * halfWidth,
      y: p.y + ny * halfWidth,
    })
    right.push({
      x: p.x - nx * halfWidth,
      y: p.y - ny * halfWidth,
    })
  }

  const headPoint = pts[n - 1]
  const tailPoint = pts[0]
  const headAge = now - headPoint.t
  const headLife = Math.max(0, 1 - headAge / trailLifetime)
  const tailAge = now - tailPoint.t
  const tailLife = Math.max(0, 1 - tailAge / trailLifetime)

  return {
    left,
    right,
    head: {
      x: headPoint.x,
      y: headPoint.y,
      r: Math.max(0.5, (baseWidth / 2) * Math.sin((headLife * Math.PI) / 2)),
    },
    tail: {
      x: tailPoint.x,
      y: tailPoint.y,
      r: Math.max(0.5, (baseWidth / 2) * Math.sin((tailLife * Math.PI) / 2)),
    },
  }
}

/**
 * Traces a closed 2D path around the ribbon contour using midpoint quadratic curves.
 * Guarantees zero overlapping internal line caps and a continuous seamless perimeter.
 */
export function traceRibbonPath(ctx: CanvasRenderingContext2D, ribbon: RibbonContour): void {
  const { left, right, head, tail } = ribbon
  const n = left.length
  if (n < 2) return

  ctx.beginPath()

  // 1. Begin at tail left edge
  ctx.moveTo(left[0].x, left[0].y)

  // 2. Trace left edge smoothly with midpoint quadratic curves
  for (let i = 0; i < n - 1; i++) {
    const pCurrent = left[i]
    const pNext = left[i + 1]
    const midX = (pCurrent.x + pNext.x) / 2
    const midY = (pCurrent.y + pNext.y) / 2
    ctx.quadraticCurveTo(pCurrent.x, pCurrent.y, midX, midY)
  }
  ctx.lineTo(left[n - 1].x, left[n - 1].y)

  // 3. Smooth rounded head cap around the pointer tip
  const normX = (left[n - 1].x - right[n - 1].x) / 2
  const normY = (left[n - 1].y - right[n - 1].y) / 2
  const radius = Math.hypot(normX, normY)
  const fwdX = radius > 1e-4 ? normY / radius : 0
  const fwdY = radius > 1e-4 ? -normX / radius : 0
  const kHead = 0.5522847 * radius
  ctx.bezierCurveTo(
    left[n - 1].x + fwdX * kHead,
    left[n - 1].y + fwdY * kHead,
    right[n - 1].x + fwdX * kHead,
    right[n - 1].y + fwdY * kHead,
    right[n - 1].x,
    right[n - 1].y
  )

  // 4. Trace right edge in reverse from head to tail with midpoint quadratic curves
  for (let i = n - 1; i > 0; i--) {
    const pCurrent = right[i]
    const pPrev = right[i - 1]
    const midX = (pCurrent.x + pPrev.x) / 2
    const midY = (pCurrent.y + pPrev.y) / 2
    ctx.quadraticCurveTo(pCurrent.x, pCurrent.y, midX, midY)
  }
  ctx.lineTo(right[0].x, right[0].y)

  // 5. Smooth rounded tail cap closing back to left[0]
  const tailNormX = (left[0].x - right[0].x) / 2
  const tailNormY = (left[0].y - right[0].y) / 2
  const tailRadius = Math.hypot(tailNormX, tailNormY)
  const bwdX = tailRadius > 1e-4 ? -tailNormY / tailRadius : 0
  const bwdY = tailRadius > 1e-4 ? tailNormX / tailRadius : 0
  const kTail = 0.5522847 * tailRadius
  ctx.bezierCurveTo(
    right[0].x + bwdX * kTail,
    right[0].y + bwdY * kTail,
    left[0].x + bwdX * kTail,
    left[0].y + bwdY * kTail,
    left[0].x,
    left[0].y
  )

  ctx.closePath()
}

/**
 * Renders the complete, dot-free, high-fidelity laser trail onto the canvas context.
 */
export function renderLaserTrail(
  ctx: CanvasRenderingContext2D,
  rawPoints: readonly LaserPoint[],
  settings: LaserRenderOptions,
  now = performance.now()
): void {
  const trailLifetime = settings.durationMs || 850
  const baseWidth = Math.max(3, settings.width || 6)
  const [r, g, b] = hexToRgb(settings.color || "#EF4444")
  const glowFactor =
    settings.glowIntensity === "none"
      ? 0
      : settings.glowIntensity === "subtle"
        ? 6
        : settings.glowIntensity === "neon"
          ? 22
          : 12

  // 1. Filter out expired points
  const activePoints = rawPoints.filter((p) => now - p.t < trailLifetime)
  if (activePoints.length === 0) return

  // Overall fade alpha as the entire stroke ages
  const newestAge = now - activePoints[activePoints.length - 1].t
  const overallAlpha = Math.max(0.05, Math.min(1, 1 - newestAge / trailLifetime))

  // 2. Single point: render crisp glowing laser dot
  if (activePoints.length === 1) {
    const p = activePoints[0]
    const dotRadius = Math.max(3, baseWidth * 0.6)

    ctx.save()
    ctx.beginPath()
    ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${overallAlpha * 0.95})`
    if (glowFactor > 0) {
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${overallAlpha * 0.95})`
      ctx.shadowBlur = glowFactor * 1.2
    }
    ctx.fill()

    ctx.beginPath()
    ctx.arc(p.x, p.y, dotRadius * 0.45, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${overallAlpha * 0.95})`
    ctx.shadowBlur = 0
    ctx.fill()
    ctx.restore()
    return
  }

  // 3. Multi-point trail: Decimate -> Smooth -> Ribbon Mesh
  const decimated = decimateLaserPoints(activePoints, 2.5)
  const smoothed = smoothLaserPoints(decimated)
  const outerRibbon = computeLaserRibbon(smoothed, baseWidth, trailLifetime, now)

  if (!outerRibbon) return

  ctx.save()

  // Layer 1: Outer Neon Ink Glow
  traceRibbonPath(ctx, outerRibbon)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${overallAlpha * 0.92})`
  if (glowFactor > 0) {
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${overallAlpha * 0.95})`
    ctx.shadowBlur = glowFactor
  } else {
    ctx.shadowBlur = 0
  }
  ctx.fill()

  // Layer 2: Inner Bright Hot Core (35% width, white tint)
  const innerRibbon = computeLaserRibbon(smoothed, baseWidth * 0.36, trailLifetime, now)
  if (innerRibbon) {
    traceRibbonPath(ctx, innerRibbon)
    ctx.fillStyle = `rgba(255, 255, 255, ${overallAlpha * 0.88})`
    ctx.shadowBlur = 0
    ctx.fill()
  }

  // Layer 3: Dynamic Pulse Dot at tip reticle (when active and enabled)
  if (settings.pulseDot && activePoints.length > 0) {
    const last = activePoints[activePoints.length - 1]
    const age = now - last.t
    if (age < 300) {
      const pulse = Math.sin(now * 0.012) * 0.12 + 0.88
      const tipRadius = Math.max(3.5, (baseWidth / 2) * 1.25 * pulse)

      ctx.beginPath()
      ctx.arc(last.x, last.y, tipRadius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${overallAlpha})`
      if (glowFactor > 0) {
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${overallAlpha})`
        ctx.shadowBlur = glowFactor * 1.4
      }
      ctx.fill()

      ctx.beginPath()
      ctx.arc(last.x, last.y, Math.max(1.5, tipRadius * 0.45), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${overallAlpha})`
      ctx.shadowBlur = 0
      ctx.fill()
    }
  }

  ctx.restore()
}
