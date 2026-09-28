// ---------------------------------------------------------------------------
// Smart Sketch — Specialized Pipeline & Geometric Intelligence for Letter "A"
// Provides deterministic, robust geometric analysis, false-positive rejection,
// and boundary disambiguation for uppercase handwritten "A".
// ---------------------------------------------------------------------------

import type { Bounds, Point, StrokeFeatures } from "./types"
import { cleanStrokes } from "./preprocessing"

export interface LetterAEvaluation {
  isA: boolean
  confidence: number
  reason: string
  hasApexConvergence: boolean
  hasOpenBottomLegs: boolean
  hasMidCrossbar: boolean
  hasBottomClosure: boolean
  strokeCount: number
}

/**
 * Detect whether strokes form a horizontal crossbar in the middle band.
 */
export function detectLetterACrossbar(
  strokes: Point[][],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { found: boolean; relY: number; span: number; type: string } {
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const cx = minX + w / 2

  // 1. Separate stroke (classic 3-stroke or 2-stroke A)
  for (const s of strokes) {
    if (s.length >= 2) {
      const xs = s.map((p) => p[0])
      const ys = s.map((p) => p[1])
      const minSegX = Math.min(...xs)
      const maxSegX = Math.max(...xs)
      const minSegY = Math.min(...ys)
      const maxSegY = Math.max(...ys)

      const dx = maxSegX - minSegX
      const dy = maxSegY - minSegY
      const midY = (minSegY + maxSegY) / 2
      const relY = (midY - minY) / h

      // Crossbar must reside in vertical middle band [0.28 * h, 0.80 * h]
      if (relY >= 0.28 && relY <= 0.80) {
        // Must bridge across the central column or connect near center
        const bridgesCenter = minSegX <= cx + w * 0.12 && maxSegX >= cx - w * 0.12
        // Must be predominantly horizontal
        const isHorizontal = dx >= w * 0.18 && dy <= h * 0.35

        if (bridgesCenter && isHorizontal) {
          return { found: true, relY, span: dx, type: "separate_stroke" }
        }
      }
    }
  }

  // 2. Subsegment within a continuous stroke (1-stroke A or continuous 2-stroke A)
  for (const s of strokes) {
    if (s.length < 4) continue
    for (let i = 0; i < s.length - 1; i++) {
      for (let j = i + 2; j < s.length; j++) {
        const sub = s.slice(i, j + 1)
        const xs = sub.map((p) => p[0])
        const ys = sub.map((p) => p[1])
        const minSegX = Math.min(...xs)
        const maxSegX = Math.max(...xs)
        const minSegY = Math.min(...ys)
        const maxSegY = Math.max(...ys)

        const dx = maxSegX - minSegX
        const dy = maxSegY - minSegY
        const midY = (minSegY + maxSegY) / 2
        const relY = (midY - minY) / h

        if (relY >= 0.28 && relY <= 0.82) {
          const bridgesCenter = minSegX <= cx - w * 0.03 && maxSegX >= cx + w * 0.03
          const isHorizontal = dx >= w * 0.18 && dy <= h * 0.32
          if (bridgesCenter && isHorizontal) {
            return { found: true, relY, span: dx, type: "subsegment" }
          }
        }
      }
    }
  }

  return { found: false, relY: 0, span: 0, type: "none" }
}

/**
 * Detect whether strokes form a bottom base closing the bottom (Triangle indicator).
 */
export function detectBottomBase(
  strokes: Point[][],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { found: boolean; relY: number; span: number } {
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const cx = minX + w / 2

  // Separate stroke along bottom
  for (const s of strokes) {
    if (s.length >= 2) {
      const xs = s.map((p) => p[0])
      const ys = s.map((p) => p[1])
      const minSegX = Math.min(...xs)
      const maxSegX = Math.max(...xs)
      const minSegY = Math.min(...ys)
      const maxSegY = Math.max(...ys)

      const dx = maxSegX - minSegX
      const dy = maxSegY - minSegY
      const midY = (minSegY + maxSegY) / 2
      const relY = (midY - minY) / h

      if (
        relY >= 0.78 &&
        minSegX <= cx - w * 0.10 &&
        maxSegX >= cx + w * 0.10 &&
        dx >= w * 0.38 &&
        dy <= h * 0.24
      ) {
        return { found: true, relY, span: dx }
      }
    }
  }

  // Subsegment along bottom
  for (const s of strokes) {
    if (s.length < 4) continue
    for (let i = 0; i < s.length - 1; i++) {
      for (let j = i + 2; j < s.length; j++) {
        const sub = s.slice(i, j + 1)
        const xs = sub.map((p) => p[0])
        const ys = sub.map((p) => p[1])
        const minSegX = Math.min(...xs)
        const maxSegX = Math.max(...xs)
        const minSegY = Math.min(...ys)
        const maxSegY = Math.max(...ys)

        const dx = maxSegX - minSegX
        const dy = maxSegY - minSegY
        const midY = (minSegY + maxSegY) / 2
        const relY = (midY - minY) / h

        if (
          relY >= 0.78 &&
          minSegX <= cx - w * 0.10 &&
          maxSegX >= cx + w * 0.10 &&
          dx >= w * 0.38 &&
          dy <= h * 0.24
        ) {
          return { found: true, relY, span: dx }
        }
      }
    }
  }

  return { found: false, relY: 0, span: 0 }
}

/**
 * Check whether drawing has a circular head loop characteristic of stick-figure person.
 */
export function hasCircularHead(strokes: Point[][], minY: number, maxY: number): boolean {
  const h = maxY - minY
  const headCutoff = minY + h * 0.38

  for (const s of strokes) {
    const headPts = s.filter((p) => p[1] <= headCutoff)
    if (headPts.length >= 6) {
      const xs = headPts.map((p) => p[0])
      const ys = headPts.map((p) => p[1])
      const hw = Math.max(...xs) - Math.min(...xs)
      const hh = Math.max(...ys) - Math.min(...ys)
      if (hw >= 6 && hh >= 6) {
        const ar = hw / hh
        const start = headPts[0]
        const end = headPts[headPts.length - 1]
        const closure = Math.hypot(end[0] - start[0], end[1] - start[1]) / Math.max(hw, hh)
        if (ar >= 0.65 && ar <= 1.55 && closure <= 0.35) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Comprehensive geometric evaluation for Letter "A".
 */
export function evaluateLetterAGeometry(rawStrokes: Point[][]): LetterAEvaluation {
  const strokes = cleanStrokes(rawStrokes)
  const allPts = strokes.flat()

  if (allPts.length < 4) {
    return {
      isA: false,
      confidence: 0,
      reason: "Too few points",
      hasApexConvergence: false,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }

  const xs = allPts.map((p) => p[0])
  const ys = allPts.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const aspectRatio = w / h

  // 1. Aspect Ratio check: A is typically taller than it is wide, or slightly wide (0.32 to 1.35)
  if (aspectRatio < 0.30 || aspectRatio > 1.40) {
    return {
      isA: false,
      confidence: 0,
      reason: `Aspect ratio ${aspectRatio.toFixed(2)} outside valid range [0.30, 1.40]`,
      hasApexConvergence: false,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }

  // 2. Stroke count check: 1 to 3 strokes
  if (strokes.length > 3) {
    return {
      isA: false,
      confidence: 0,
      reason: `Stroke count ${strokes.length} exceeds max of 3`,
      hasApexConvergence: false,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }

  // 3. Top Apex Convergence (upper 28% of height)
  const topCutoff = minY + h * 0.28
  const topPts = allPts.filter((p) => p[1] <= topCutoff)
  if (topPts.length === 0) {
    return {
      isA: false,
      confidence: 0,
      reason: "No points near apex",
      hasApexConvergence: false,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }
  const topXs = topPts.map((p) => p[0])
  const topSpan = Math.max(...topXs) - Math.min(...topXs)
  const topSpanRatio = topSpan / w

  // Converging apex: top width should be significantly narrower than total width (< 0.46)
  const hasApexConvergence = topSpanRatio <= 0.46
  if (!hasApexConvergence) {
    return {
      isA: false,
      confidence: 0,
      reason: `Top does not converge into apex (topSpanRatio=${topSpanRatio.toFixed(2)})`,
      hasApexConvergence: false,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }

  // 4. Bottom Legs Spread (lower 26% of height)
  const bottomCutoff = maxY - h * 0.26
  const bottomPts = allPts.filter((p) => p[1] >= bottomCutoff)
  if (bottomPts.length < 2) {
    return {
      isA: false,
      confidence: 0,
      reason: "No points in bottom leg zone",
      hasApexConvergence,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }
  const bottomXs = bottomPts.map((p) => p[0])
  const minBottomX = Math.min(...bottomXs)
  const maxBottomX = Math.max(...bottomXs)
  const bottomSpan = maxBottomX - minBottomX
  const bottomSpanRatio = bottomSpan / w

  const hasLeftLeg = minBottomX <= minX + w * 0.38
  const hasRightLeg = maxBottomX >= maxX - w * 0.38
  const hasOpenBottomLegs = hasLeftLeg && hasRightLeg && bottomSpanRatio >= 0.48

  if (!hasOpenBottomLegs) {
    return {
      isA: false,
      confidence: 0,
      reason: "Bottom legs do not span both sides of letter",
      hasApexConvergence,
      hasOpenBottomLegs: false,
      hasMidCrossbar: false,
      hasBottomClosure: false,
      strokeCount: strokes.length,
    }
  }

  // 5. Bottom closure check (Triangle indicator)
  const bottomBase = detectBottomBase(strokes, minX, maxX, minY, maxY)
  const hasBottomClosure = bottomBase.found

  // 6. Crossbar check
  const crossbar = detectLetterACrossbar(strokes, minX, maxX, minY, maxY)
  const hasMidCrossbar = crossbar.found

  // Disambiguate against Triangle:
  if (hasBottomClosure && !hasMidCrossbar) {
    return {
      isA: false,
      confidence: 0,
      reason: "Closed bottom base with no mid-crossbar (Triangle)",
      hasApexConvergence,
      hasOpenBottomLegs,
      hasMidCrossbar: false,
      hasBottomClosure: true,
      strokeCount: strokes.length,
    }
  }

  // Disambiguate against Inverted V / Caret / Lambda:
  if (!hasMidCrossbar) {
    return {
      isA: false,
      confidence: 0,
      reason: "Missing horizontal mid-crossbar",
      hasApexConvergence,
      hasOpenBottomLegs,
      hasMidCrossbar: false,
      hasBottomClosure,
      strokeCount: strokes.length,
    }
  }

  // Disambiguate against Stick-Figure Person:
  if (hasCircularHead(strokes, minY, maxY)) {
    return {
      isA: false,
      confidence: 0,
      reason: "Has circular head (Stick-figure person)",
      hasApexConvergence,
      hasOpenBottomLegs,
      hasMidCrossbar,
      hasBottomClosure,
      strokeCount: strokes.length,
    }
  }

  // Compute calibrated confidence based on geometric quality
  const apexBonus = 1 - Math.min(1, topSpanRatio / 0.46)
  const legBonus = Math.min(1, bottomSpanRatio / 0.70)
  const crossbarBonus = Math.min(1, crossbar.span / (w * 0.35))
  const rawScore = 0.4 * apexBonus + 0.3 * legBonus + 0.3 * crossbarBonus
  const confidence = Math.min(0.98, 0.88 + rawScore * 0.10)

  return {
    isA: true,
    confidence: Number(confidence.toFixed(3)),
    reason: "Valid Letter A geometry",
    hasApexConvergence,
    hasOpenBottomLegs,
    hasMidCrossbar,
    hasBottomClosure,
    strokeCount: strokes.length,
  }
}
