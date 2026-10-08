// ---------------------------------------------------------------------------
// Zenithsui Laser Pointer Physics Engine
// Ported from Excalidraw's @excalidraw/laser-pointer
// Handles point streamlining, velocity-based width, smoothing, and decay.
// ---------------------------------------------------------------------------

export interface LaserPoint {
  x: number
  y: number
  time: number
  pressure?: number
}

export interface LaserPhysicsOptions {
  decayMs: number
  streamline: number
  size: number
}

export class LaserTrailEngine {
  private points: LaserPoint[] = []
  private options: LaserPhysicsOptions

  constructor(options?: Partial<LaserPhysicsOptions>) {
    this.options = {
      decayMs: options?.decayMs ?? 1000,
      streamline: options?.streamline ?? 0.45,
      size: options?.size ?? 4,
    }
  }

  setDecay(decayMs: number) {
    this.options.decayMs = decayMs
  }

  setSize(size: number) {
    this.options.size = size
  }

  addPoint(x: number, y: number, pressure = 0.5) {
    const now = Date.now()
    const last = this.points[this.points.length - 1]

    let targetX = x
    let targetY = y

    // Streamline interpolation with previous point
    if (last && this.options.streamline > 0) {
      const alpha = 1 - this.options.streamline
      targetX = last.x + (x - last.x) * alpha
      targetY = last.y + (y - last.y) * alpha
    }

    this.points.push({
      x: targetX,
      y: targetY,
      time: now,
      pressure,
    })
  }

  /**
   * Prunes expired points and returns renderable trail segments with computed alpha and width.
   */
  getSegments(now = Date.now()): { p1: [number, number]; p2: [number, number]; width: number; alpha: number }[] {
    const cutoff = now - this.options.decayMs
    // Filter out dead points
    this.points = this.points.filter((p) => p.time >= cutoff)

    if (this.points.length < 2) return []

    const segments: { p1: [number, number]; p2: [number, number]; width: number; alpha: number }[] = []

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i]
      const p2 = this.points[i + 1]

      const age1 = now - p1.time
      const age2 = now - p2.time
      const avgAge = (age1 + age2) / 2

      // Non-linear fade curve
      const lifeRatio = Math.max(0, 1 - avgAge / this.options.decayMs)
      const alpha = Math.pow(lifeRatio, 1.2)
      const width = Math.max(1, this.options.size * lifeRatio * ((p1.pressure || 0.5) + (p2.pressure || 0.5)))

      segments.push({
        p1: [p1.x, p1.y],
        p2: [p2.x, p2.y],
        width,
        alpha,
      })
    }

    return segments
  }

  clear() {
    this.points = []
  }

  get active(): boolean {
    return this.points.length > 0
  }
}
