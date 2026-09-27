// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Client AI Fallback Recognizer
// ---------------------------------------------------------------------------

import type { Point, RecognitionResult } from "./types"
import { cleanStrokes, extractStrokeFeatures } from "./preprocessing"
import { SKETCH_REGISTRY, isSupportedSketchKind } from "./registry"

/**
 * Render strokes to a small offscreen canvas thumbnail (128x128)
 * for compact, high-speed vision recognition.
 */
function renderStrokesToThumbnail(strokes: Point[][], w: number, h: number): string | null {
  if (typeof document === "undefined") return null

  try {
    const canvas = document.createElement("canvas")
    const size = 128
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // White background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)

    // Calculate scale and translation to fit within 104x104 (with 12px padding)
    const padding = 12
    const targetArea = size - padding * 2
    const scale = Math.min(targetArea / Math.max(w, 1), targetArea / Math.max(h, 1))

    const offsetX = (size - w * scale) / 2
    const offsetY = (size - h * scale) / 2

    ctx.strokeStyle = "#1e1e1e"
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (const stroke of strokes) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(offsetX + stroke[0][0] * scale, offsetY + stroke[0][1] * scale)
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(offsetX + stroke[i][0] * scale, offsetY + stroke[i][1] * scale)
      }
      ctx.stroke()
    }

    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}

/**
 * Call AI sketch recognition endpoint with fallback and timeout.
 */
export async function recognizeWithAI(
  rawStrokes: Point[][],
  bounds: { x: number; y: number; w: number; h: number }
): Promise<RecognitionResult> {
  const strokes = cleanStrokes(rawStrokes)
  const features = extractStrokeFeatures(strokes)

  // Avoid querying AI on tiny clicks or micro dots
  if (features.diagonal < 14 || features.pointCount < 6) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "ai",
      bounds,
    }
  }

  // Normalize stroke coordinates relative to bounds (0..w, 0..h)
  const normalizedStrokes = strokes.map((s) =>
    s.map(([px, py]) => [Math.round(px - bounds.x), Math.round(py - bounds.y)] as Point)
  )

  const thumbnailBase64 = renderStrokesToThumbnail(normalizedStrokes, bounds.w, bounds.h)

  const strokeSummary = {
    strokeCount: features.strokeCount,
    pointCount: features.pointCount,
    aspectRatio: Number(features.aspectRatio.toFixed(2)),
    cornerCount: features.cornerCount,
    circularity: Number(features.circularity.toFixed(2)),
    areaFillRatio: Number(features.areaFillRatio.toFixed(2)),
    hasSelfIntersection: features.hasSelfIntersection,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const res = await fetch("/api/ai/sketch-recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: thumbnailBase64,
        strokeSummary,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return {
        recognized: false,
        kind: null,
        confidence: 0,
        source: "ai",
        bounds,
      }
    }

    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return {
        recognized: false,
        kind: null,
        confidence: 0,
        source: "ai",
        bounds,
      }
    }

    if (data && data.recognized) {
      if (data.mode === "handwriting" || data.text) {
        const recognizedText = (data.text || data.kind || "").trim()
        if (recognizedText) {
          return {
            recognized: true,
            kind: "text",
            mode: "handwriting",
            text: recognizedText,
            confidence: data.confidence || 0.88,
            source: "ai",
            bounds,
            metadata: { text: recognizedText },
          }
        }
      }

      if (data.kind && (data.kind in SKETCH_REGISTRY || isSupportedSketchKind(data.kind))) {
        return {
          recognized: true,
          kind: data.kind,
          mode: data.mode || "object",
          confidence: data.confidence || 0.85,
          source: "ai",
          bounds,
        }
      }
    }

    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "ai",
      bounds,
    }
  } catch (_err) {
    // Graceful silent fallback
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "ai",
      bounds,
    }
  }
}
