// ---------------------------------------------------------------------------
// Smart Sketch Recognition — CNN Stroke Rasterizer
// High-quality deterministic anti-aliased stroke rasterization for CNN input
// Converts vector strokes Point[][] to a normalized [1, 32, 32] grayscale tensor
// ---------------------------------------------------------------------------

import type { Point } from "./types"

export const CNN_INPUT_SIZE = 32
export const CNN_CHANNELS = 1

export interface RasterizedTensor {
  data: Float32Array
  width: number
  height: number
  channels: number
}

/**
 * Computes the minimum distance from point (px, py) to line segment (x1, y1)-(x2, y2).
 */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
  if (l2 === 0) return Math.hypot(px - x1, py - y1)

  // Projection scalar clamped to segment [0, 1]
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2))
  const projX = x1 + t * (x2 - x1)
  const projY = y1 + t * (y2 - y1)
  return Math.hypot(px - projX, py - projY)
}

/**
 * Deterministically rasterizes vector strokes into an anti-aliased 32x32 grayscale tensor.
 *
 * Steps:
 * 1. Calculate tight bounding box of raw strokes.
 * 2. Center and scale into [padding, size - padding] preserving aspect ratio.
 * 3. Render anti-aliased strokes with smooth distance falloff.
 * 4. Output Float32Array with values in [0.0, 1.0] (1.0 = stroke, 0.0 = background).
 */
export function rasterizeStrokesToTensor(
  rawStrokes: Point[][],
  targetSize = CNN_INPUT_SIZE,
  strokeWidth = 2.2,
  paddingRatio = 0.14
): RasterizedTensor {
  const tensor = new Float32Array(targetSize * targetSize)

  // Filter empty or single-point strokes if possible
  const validStrokes = rawStrokes.filter((s) => s && s.length > 0)
  if (validStrokes.length === 0) {
    return { data: tensor, width: targetSize, height: targetSize, channels: 1 }
  }

  // 1. Compute bounds
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const stroke of validStrokes) {
    for (const [x, y] of stroke) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const rawW = Math.max(maxX - minX, 1)
  const rawH = Math.max(maxY - minY, 1)

  // 2. Center and fit inside canvas with padding
  const padding = targetSize * paddingRatio
  const availableSpace = targetSize - padding * 2
  const scale = Math.min(availableSpace / rawW, availableSpace / rawH)

  const scaledW = rawW * scale
  const scaledH = rawH * scale
  const offsetX = padding + (availableSpace - scaledW) / 2
  const offsetY = padding + (availableSpace - scaledH) / 2

  // Transform strokes to target canvas coordinates
  const canvasStrokes: Point[][] = validStrokes.map((stroke) =>
    stroke.map(([x, y]) => [
      offsetX + (x - minX) * scale,
      offsetY + (y - minY) * scale,
    ] as Point)
  )

  const radius = strokeWidth / 2
  const halfFeather = 0.75
  const maxInfluenceDist = radius + halfFeather

  // 3. For each pixel, compute distance to all stroke segments and accumulate intensity
  for (let py = 0; py < targetSize; py++) {
    const cy = py + 0.5
    for (let px = 0; px < targetSize; px++) {
      const cx = px + 0.5
      let minDist = Infinity

      for (const stroke of canvasStrokes) {
        if (stroke.length === 1) {
          const d = Math.hypot(cx - stroke[0][0], cy - stroke[0][1])
          if (d < minDist) minDist = d
          continue
        }

        for (let i = 0; i < stroke.length - 1; i++) {
          const p1 = stroke[i]
          const p2 = stroke[i + 1]

          // Fast AABB rejection
          const segMinX = Math.min(p1[0], p2[0]) - maxInfluenceDist
          const segMaxX = Math.max(p1[0], p2[0]) + maxInfluenceDist
          const segMinY = Math.min(p1[1], p2[1]) - maxInfluenceDist
          const segMaxY = Math.max(p1[1], p2[1]) + maxInfluenceDist

          if (cx < segMinX || cx > segMaxX || cy < segMinY || cy > segMaxY) {
            continue
          }

          const d = distToSegment(cx, cy, p1[0], p1[1], p2[0], p2[1])
          if (d < minDist) minDist = d
        }
      }

      // Smooth anti-aliased edge: 1.0 inside stroke radius, decaying to 0.0 outside
      if (minDist <= radius) {
        tensor[py * targetSize + px] = 1.0
      } else if (minDist < maxInfluenceDist) {
        const falloff = 1.0 - (minDist - radius) / halfFeather
        tensor[py * targetSize + px] = Math.max(0, Math.min(1, falloff))
      }
    }
  }

  return {
    data: tensor,
    width: targetSize,
    height: targetSize,
    channels: 1,
  }
}

/**
 * Convenience helper returning raw 32x32 Float32Array tensor
 */
export function rasterizeStrokesTo32x32(rawStrokes: Point[][]): Float32Array {
  return rasterizeStrokesToTensor(rawStrokes, 32).data
}

