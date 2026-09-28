// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Local Deterministic Handwriting Classifier
// Recognizes A–Z, 0–9, multi-stroke characters, and single-stroke glyphs
// Using 2-way Point Cloud Template Distance Matching + Topological Rules
// ---------------------------------------------------------------------------

import type { CharacterCandidate, Point, StrokeFeatures } from "./types"
import {
  cleanStrokes,
  extractStrokeFeatures,
  resampleStroke,
} from "./preprocessing"
import { predictHandwritingCNN } from "./cnn-classifier"
import { evaluateSpecialistEnsemble } from "./specialists/specialist-ensemble"
import { evaluateLetterAGeometry } from "./letter-a-pipeline"

export interface NormalizedGlyph {
  strokes: Point[][]
  rawStrokes?: Point[][]
  allPoints: Point[]
  aspectRatio: number
  w: number
  h: number
  strokeCount: number
  features: StrokeFeatures
}

/**
 * Normalize stroke(s) to standard 100x100 space while preserving original aspect ratio
 */
export function normalizeGlyph(rawStrokes: Point[][]): NormalizedGlyph {
  const strokes = cleanStrokes(rawStrokes)
  const features = extractStrokeFeatures(strokes)
  const { x, y, w, h } = features

  const normStrokes: Point[][] = []
  for (const s of strokes) {
    const pts = resampleStroke(s, Math.max(16, Math.min(48, Math.round(s.length * 1.2))))
    const norm = pts.map(([px, py]) => [
      Math.max(0, Math.min(100, ((px - x) / Math.max(w, 1)) * 100)),
      Math.max(0, Math.min(100, ((py - y) / Math.max(h, 1)) * 100)),
    ] as Point)
    normStrokes.push(norm)
  }

  return {
    strokes: normStrokes,
    rawStrokes: strokes,
    allPoints: normStrokes.flat(),
    aspectRatio: features.aspectRatio,
    w,
    h,
    strokeCount: strokes.length,
    features,
  }
}

// ---------------------------------------------------------------------------
// Canonical Glyphs for Point Cloud Templates
// ---------------------------------------------------------------------------

function line(x1: number, y1: number, x2: number, y2: number, steps = 8): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
  }
  return pts
}

function arc(cx: number, cy: number, rx: number, ry: number, startAngle: number, endAngle: number, steps = 12): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const th = startAngle + (endAngle - startAngle) * (i / steps)
    pts.push([cx + rx * Math.cos(th), cy + ry * Math.sin(th)])
  }
  return pts
}

function buildCanonicalStrokes(char: string): Point[][] {
  const x = 0
  const y = 0
  const w = 40
  const h = 60
  const x2 = w
  const y2 = h
  const xm = w / 2
  const ym = h / 2

  switch (char.toUpperCase()) {
    case "A":
      return [
        line(x, y2, xm, y),
        line(xm, y, x2, y2),
        line(x + w * 0.2, ym + h * 0.1, x2 - w * 0.2, ym + h * 0.1),
      ]
    case "B":
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
        [...line(x, ym, xm, ym), ...arc(xm, y + h * 0.75, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)],
      ]
    case "C":
      return [arc(xm + w * 0.1, ym, w * 0.45, h * 0.48, -Math.PI * 0.75, Math.PI * 0.75)]
    case "D":
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, ym, w * 0.45, h * 0.48, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)],
      ]
    case "E":
      return [line(x, y, x, y2), line(x, y, x2, y), line(x, ym, x + w * 0.75, ym), line(x, y2, x2, y2)]
    case "F":
      return [line(x, y, x, y2), line(x, y, x2, y), line(x, ym, x + w * 0.75, ym)]
    case "G":
      return [
        [
          ...arc(xm + w * 0.1, ym, w * 0.45, h * 0.48, -Math.PI * 0.75, Math.PI * 0.6),
          ...line(x2, ym + h * 0.1, x2, ym),
          ...line(x2, ym, xm, ym),
        ],
      ]
    case "H":
      return [line(x, y, x, y2), line(x2, y, x2, y2), line(x, ym, x2, ym)]
    case "I":
      return [line(xm, y, xm, y2)]
    case "J":
      return [[...line(x2 - w * 0.2, y, x2 - w * 0.2, y2 - h * 0.25), ...arc(xm, y2 - h * 0.25, w * 0.35, h * 0.25, 0, Math.PI)]]
    case "K":
      return [line(x, y, x, y2), line(x2, y, x, ym), line(x, ym, x2, y2)]
    case "L":
      return [[...line(x, y, x, y2), ...line(x, y2, x2, y2)]]
    case "M":
      return [[...line(x, y2, x, y), ...line(x, y, xm, ym), ...line(xm, ym, x2, y), ...line(x2, y, x2, y2)]]
    case "N":
      return [line(x, y2, x, y), line(x, y, x2, y2), line(x2, y2, x2, y)]
    case "O":
      return [arc(xm, ym, w * 0.48, h * 0.48, 0, Math.PI * 2, 24)]
    case "P":
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
      ]
    case "Q":
      return [arc(xm, ym, w * 0.48, h * 0.48, 0, Math.PI * 2, 24), line(xm + w * 0.1, ym + h * 0.2, x2 + w * 0.1, y2 + h * 0.1)]
    case "R":
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
        line(x, ym, x2, y2),
      ]
    case "S":
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, 0, -Math.PI),
          ...arc(xm, y + h * 0.75, w * 0.45, h * 0.25, Math.PI, 0),
        ],
      ]
    case "T":
      return [line(x, y, x2, y), line(xm, y, xm, y2)]
    case "U":
      return [[...line(x, y, x, y2 - h * 0.3), ...arc(xm, y2 - h * 0.3, w * 0.45, h * 0.3, Math.PI, 0), ...line(x2, y2 - h * 0.3, x2, y)]]
    case "V":
      return [[...line(x, y, xm, y2), ...line(xm, y2, x2, y)]]
    case "W":
      return [[...line(x, y, x + w * 0.25, y2), ...line(x + w * 0.25, y2, xm, ym), ...line(xm, ym, x + w * 0.75, y2), ...line(x + w * 0.75, y2, x2, y)]]
    case "X":
      return [line(x, y, x2, y2), line(x2, y, x, y2)]
    case "Y":
      return [line(x, y, xm, ym), line(x2, y, xm, ym), line(xm, ym, xm, y2)]
    case "Z":
      return [[...line(x, y, x2, y), ...line(x2, y, x, y2), ...line(x, y2, x2, y2)]]
    case "0":
      return [arc(xm, ym, w * 0.45, h * 0.48, 0, Math.PI * 2, 24)]
    case "1":
      return [line(xm, y, xm, y2)]
    case "2":
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI, 0),
          ...line(x2, y + h * 0.25, x, y2),
          ...line(x, y2, x2, y2),
        ],
      ]
    case "3":
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI * 0.8, Math.PI * 0.5),
          ...arc(xm, y + h * 0.75, w * 0.45, h * 0.25, -Math.PI * 0.5, Math.PI * 0.8),
        ],
      ]
    case "4":
      return [
        [...line(x + w * 0.75, y, x, ym + h * 0.1), ...line(x, ym + h * 0.1, x2, ym + h * 0.1)],
        line(x + w * 0.75, y, x + w * 0.75, y2),
      ]
    case "5":
      return [
        line(x2, y, x, y),
        line(x, y, x, ym),
        arc(xm, ym + h * 0.25, w * 0.45, h * 0.25, -Math.PI * 0.8, Math.PI * 0.7),
      ]
    case "6":
      return [
        [
          ...arc(xm, y + h * 0.3, w * 0.45, h * 0.3, -Math.PI * 0.5, -Math.PI),
          ...line(x, y + h * 0.3, x, ym),
          ...arc(xm, ym + h * 0.22, w * 0.45, h * 0.26, -Math.PI, Math.PI),
        ],
      ]
    case "7":
      return [[...line(x, y, x2, y), ...line(x2, y, xm, y2)]]
    case "8":
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.38, h * 0.24, 0, Math.PI * 2, 16),
          ...arc(xm, y + h * 0.75, w * 0.45, h * 0.24, 0, Math.PI * 2, 16),
        ],
      ]
    case "9":
      return [
        [
          ...arc(xm, y + h * 0.28, w * 0.45, h * 0.26, 0, Math.PI * 2, 16),
          ...line(x2, y + h * 0.28, x2, y2 - h * 0.2),
          ...arc(xm, y2 - h * 0.2, w * 0.45, h * 0.2, 0, Math.PI * 0.8),
        ],
      ]
    default:
      return [line(x, y, x2, y2)]
  }
}

function sampleCloud(strokes: Point[][], numPoints = 32): Point[] {
  const allPts: Point[] = []
  const totalLength = strokes.reduce((sum, s) => {
    let l = 0
    for (let i = 0; i < s.length - 1; i++) l += Math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1])
    return sum + l
  }, 0)

  for (const s of strokes) {
    let strokeLen = 0
    for (let i = 0; i < s.length - 1; i++) strokeLen += Math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1])
    const count = Math.max(4, Math.round((strokeLen / Math.max(totalLength, 1)) * numPoints))
    allPts.push(...resampleStroke(s, count))
  }

  const xs = allPts.map((p) => p[0])
  const ys = allPts.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)

  return allPts.map((p) => [((p[0] - minX) / w) * 100, ((p[1] - minY) / h) * 100] as Point)
}

function cloudDistance(c1: Point[], c2: Point[]): number {
  let sum = 0
  for (const p1 of c1) {
    let minD = Infinity
    for (const p2 of c2) {
      const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1])
      if (d < minD) minD = d
    }
    sum += minD
  }
  for (const p2 of c2) {
    let minD = Infinity
    for (const p1 of c1) {
      const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1])
      if (d < minD) minD = d
    }
    sum += minD
  }
  return sum / (c1.length + c2.length)
}

// Precompute 32-point normalized templates for all 36 characters
const TEMPLATES: Record<string, Point[]> = {}
const ALL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")
for (const ch of ALL_CHARS) {
  TEMPLATES[ch] = sampleCloud(buildCanonicalStrokes(ch), 32)
}

// ---------------------------------------------------------------------------
// Character Classifier
// ---------------------------------------------------------------------------

/**
 * Score individual letters A–Z and digits 0–9
 */
export function scoreCharacter(glyph: NormalizedGlyph): CharacterCandidate[] {
  const candidates: CharacterCandidate[] = []
  const { strokes, allPoints, aspectRatio, features } = glyph
  const h = features.h
  const w = features.w

  if (allPoints.length < 4 || (w < 4 && h < 4)) {
    return []
  }

  const add = (text: string, conf: number) => {
    const roundedConf = Math.min(0.99, Number(conf.toFixed(3)))
    const existing = candidates.find((c) => c.text === text)
    if (existing) {
      existing.confidence = Math.max(existing.confidence, roundedConf)
    } else if (conf >= 0.55) {
      candidates.push({
        text,
        confidence: roundedConf,
        bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
        strokeIndices: strokes.map((_, idx) => idx),
        source: "local",
      })
    }
  }

  // Query CNN Handwriting Model
  try {
    const inputStrokes = glyph.rawStrokes && glyph.rawStrokes.length > 0 ? glyph.rawStrokes : strokes
    const cnnRes = predictHandwritingCNN(inputStrokes)
    if (cnnRes.topClass === "UNKNOWN" && cnnRes.confidence >= 0.85) {
      // High-confidence rejection of scribble
      return []
    }
    for (const c of cnnRes.candidates) {
      if (c.confidence >= 0.50) {
        add(c.className, c.confidence)
      }
    }
  } catch {
    // Fallback gracefully to template matching if CNN encounters error
  }

  // Query Specialist Letter/Digit Ensemble
  try {
    const inputStrokes = glyph.rawStrokes && glyph.rawStrokes.length > 0 ? glyph.rawStrokes : strokes
    const specRes = evaluateSpecialistEnsemble(inputStrokes)
    if (!specRes.isUnknown && specRes.topClass && (specRes.topFamily === "letter" || specRes.topFamily === "digit")) {
      add(specRes.topClass, specRes.calibratedConfidence)
    }
  } catch {
    // Specialist query fallback
  }

  // Handle single straight line edge cases (1 vs I)
  if (aspectRatio <= 0.38 && features.straightness >= 0.88) {
    add("1", 0.96)
    add("I", 0.95)
    candidates.sort((a, b) => b.confidence - a.confidence)
    return candidates
  }

  // Query point cloud sampled from glyph strokes
  const queryCloud = sampleCloud(strokes, 32)

  // Compute distance to all 36 character templates
  const scoredTemplates: { char: string; dist: number }[] = []
  for (const ch of ALL_CHARS) {
    const dist = cloudDistance(queryCloud, TEMPLATES[ch])
    scoredTemplates.push({ char: ch, dist })
  }
  scoredTemplates.sort((a, b) => a.dist - b.dist)

  for (const { char, dist } of scoredTemplates) {
    // Distance calibration: dist <= 2 is practically identical (0.95+), dist > 14 is rejected
    if (dist <= 14) {
      const conf = Math.max(0.55, Math.min(0.98, 1.0 - (dist / 32) * 0.9))
      add(char, conf)
    }
  }

  // Ambiguity pairing: if O is present with high score, ensure 0 is also present, and vice versa
  const oCand = candidates.find((c) => c.text === "O")
  const zeroCand = candidates.find((c) => c.text === "0")
  if (oCand && !zeroCand) {
    add("0", Math.max(0.85, oCand.confidence - 0.02))
  } else if (zeroCand && !oCand) {
    add("O", Math.max(0.85, zeroCand.confidence - 0.02))
  }

  // Ambiguity pairing: if I is present with high score, ensure 1 is also present, and vice versa
  const iCand = candidates.find((c) => c.text === "I")
  const oneCand = candidates.find((c) => c.text === "1")
  if (iCand && !oneCand) {
    add("1", Math.max(0.85, iCand.confidence - 0.02))
  } else if (oneCand && !iCand) {
    add("I", Math.max(0.85, oneCand.confidence - 0.02))
  }

  // Ambiguity pairing: S and 5
  const sCand = candidates.find((c) => c.text === "S")
  const fiveCand = candidates.find((c) => c.text === "5")
  if (sCand && !fiveCand && sCand.confidence >= 0.85) {
    add("5", Math.max(0.75, sCand.confidence - 0.08))
  } else if (fiveCand && !sCand && fiveCand.confidence >= 0.85) {
    add("S", Math.max(0.75, fiveCand.confidence - 0.08))
  }

  // Ambiguity pairing: Z and 2
  const zCand = candidates.find((c) => c.text === "Z")
  const twoCand = candidates.find((c) => c.text === "2")
  if (zCand && !twoCand && zCand.confidence >= 0.85) {
    add("2", Math.max(0.75, zCand.confidence - 0.08))
  } else if (twoCand && !zCand && twoCand.confidence >= 0.85) {
    add("Z", Math.max(0.75, twoCand.confidence - 0.08))
  }

  // Ambiguity pairing: B and 8
  const bCand = candidates.find((c) => c.text === "B")
  const eightCand = candidates.find((c) => c.text === "8")
  if (bCand && !eightCand && bCand.confidence >= 0.85) {
    add("8", Math.max(0.75, bCand.confidence - 0.08))
  } else if (eightCand && !bCand && eightCand.confidence >= 0.85) {
    add("B", Math.max(0.75, eightCand.confidence - 0.08))
  }

  // Ambiguity pairing: 8 vs 9 disambiguation
  // An 8 has self-intersection or two loops; a 9 has a top loop and an open descending tail at the bottom
  const updatedEightCand = candidates.find((c) => c.text === "8")
  const nineCand = candidates.find((c) => c.text === "9")
  const sixCand = candidates.find((c) => c.text === "6")
  if (updatedEightCand && nineCand && (!sixCand || nineCand.confidence > sixCand.confidence)) {
    const isNineTopologically =
      !features.hasSelfIntersection &&
      features.strokeCount === 1 &&
      Boolean(features.endPoint) &&
      features.endPoint[1] > features.y + features.h * 0.7 &&
      Boolean(features.startPoint) &&
      features.startPoint[1] > features.y + features.h * 0.15

    if (isNineTopologically) {
      nineCand.confidence = Math.max(nineCand.confidence, 0.95)
      updatedEightCand.confidence = Math.min(updatedEightCand.confidence, 0.65)
    }
  }

  // Deterministic Letter A geometric validation and disambiguation (against 4, triangle, H, etc.)
  const inputStrokesForA = glyph.rawStrokes && glyph.rawStrokes.length > 0 ? glyph.rawStrokes : strokes
  const aEval = evaluateLetterAGeometry(inputStrokesForA)
  if (aEval.isA) {
    add("A", aEval.confidence)
    const existingA = candidates.find((c) => c.text === "A")
    if (existingA) {
      existingA.confidence = Math.max(existingA.confidence, aEval.confidence)
    }
    // Deprecate confusable false positives (e.g. digit 4, H, triangle) when A is geometrically proven
    const fourCand = candidates.find((c) => c.text === "4")
    if (fourCand) fourCand.confidence = Math.min(fourCand.confidence, 0.35)
    const hCand = candidates.find((c) => c.text === "H")
    if (hCand) hCand.confidence = Math.min(hCand.confidence, 0.35)
  } else {
    // If not geometrically an A (e.g. triangle with bottom closure, inverted V with no crossbar, etc.)
    // remove accidental A candidate completely
    const aIdx = candidates.findIndex((c) => c.text === "A")
    if (aIdx >= 0) {
      candidates.splice(aIdx, 1)
    }
  }

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence)

  return candidates
}
