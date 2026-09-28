// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Orchestrator
// Coordinates local geometric recognition, handwriting sequence recognition,
// contextual disambiguation, and AI fallback
// ---------------------------------------------------------------------------

import type { Point, RecognitionCandidate, RecognitionResult } from "./types"
import { CONFIDENCE_THRESHOLDS } from "./types"
import { extractStrokeFeatures, cleanStrokes } from "./preprocessing"
import { recognizeGeometry } from "./geometry-recognizer"
import { recognizeHandwritingSequence } from "./sequence-engine"
import { rankAndCalibrateCandidates } from "./confidence-calibrator"
import { recognizeWithAI } from "./ai-recognizer"
import { classifySketchWithCNN } from "./cnn-classifier"
import { evaluateSpecialistEnsemble } from "./specialists/specialist-ensemble"
import { evaluateLetterAGeometry } from "./letter-a-pipeline"

/**
 * Main sketch recognition orchestrator.
 * 1. Evaluates local geometry (< 2ms)
 * 2. Evaluates local handwriting sequence (words, numbers, single characters)
 * 3. Applies shape vs handwriting disambiguation rules
 * 4. Calls AI fallback for complex sketches or low confidence
 * 5. Returns calibrated result with ranked candidates
 */
export async function recognizeSketch(
  rawStrokes: Point[][],
  bounds: { x: number; y: number; w: number; h: number },
  allowAI = true
): Promise<RecognitionResult> {
  const strokes = cleanStrokes(rawStrokes)
  const features = extractStrokeFeatures(strokes)

  // Trivial strokes (tiny click, dot, or empty)
  if (features.pointCount < 4 || (features.w < 6 && features.h < 6)) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      calibratedConfidence: 0,
      source: "geometry",
      bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
    }
  }

  const candidates: RecognitionCandidate[] = []

  // --- STAGE 1: LOCAL SEQUENCE & HANDWRITING EVALUATION ---
  const hwResult = recognizeHandwritingSequence(strokes)

  const isMultiChar =
    hwResult.recognized &&
    hwResult.text.length >= 2 &&
    (hwResult.isWord || hwResult.isNumber || hwResult.isAlphanumeric || hwResult.mode !== "single_char")

  if (isMultiChar) {
    candidates.push({
      kind: "text",
      mode: "handwriting",
      confidence: hwResult.confidence,
      source: "local",
      text: hwResult.text,
      characters: hwResult.characters,
      metadata: {
        text: hwResult.text,
        fontSize: Math.max(16, Math.min(64, Math.round(features.h * 0.75))),
      },
    })
  }

  // --- STAGE 2: LOCAL GEOMETRIC RECOGNITION ---
  const geomResult = recognizeGeometry(strokes)
  if (geomResult.recognized && geomResult.kind) {
    candidates.push({
      kind: geomResult.kind,
      mode: "geometry",
      confidence: geomResult.confidence,
      source: "geometry",
      metadata: geomResult.metadata,
    })
  }

  // If single character was recognized by handwriting
  if (hwResult.recognized && hwResult.text.length === 1 && !isMultiChar) {
    const ch = hwResult.text

    // Disambiguation:
    // 1. Circle vs 'O' / '0'
    const hasCircle = geomResult.kind === "circle"
    if (hasCircle && (ch === "O" || ch === "0")) {
      if (features.w > 45 && features.h > 45 && features.circularity >= 0.75) {
        // High confidence circle: prefer circle, keep O as secondary
        candidates.push({
          kind: "text",
          mode: "handwriting",
          confidence: Math.min(0.78, hwResult.confidence),
          source: "local",
          text: ch,
          metadata: { text: ch },
        })
      } else {
        // Smaller or taller: add handwriting candidate
        candidates.push({
          kind: "text",
          mode: "handwriting",
          confidence: hwResult.confidence,
          source: "local",
          text: ch,
          metadata: { text: ch },
        })
      }
    }
    // 2. Triangle vs 'A'
    else if (geomResult.kind === "triangle" && ch === "A") {
      const aEval = evaluateLetterAGeometry(strokes)
      if (aEval.isA) {
        candidates.push({
          kind: "text",
          mode: "handwriting",
          confidence: Math.max(0.95, aEval.confidence),
          source: "local",
          text: "A",
          metadata: { text: "A" },
        })
      }
    }
    // 3. Line vs '1' / 'I'
    else if (geomResult.kind === "line" && (ch === "1" || ch === "I")) {
      const isVertical = features.aspectRatio <= 0.45
      if (isVertical && features.h <= 70) {
        candidates.push({
          kind: "text",
          mode: "handwriting",
          confidence: hwResult.confidence,
          source: "local",
          text: ch,
          metadata: { text: ch },
        })
      } else {
        // Long or horizontal line: prefer geometry line
        candidates.push({
          kind: "text",
          mode: "handwriting",
          confidence: 0.65,
          source: "local",
          text: ch,
          metadata: { text: ch },
        })
      }
    }
    // 4. Checkmark vs 'V'
    else if (geomResult.kind === "checkmark" && ch === "V") {
      // Asymmetric -> checkmark, symmetric -> V
      candidates.push({
        kind: "text",
        mode: "handwriting",
        confidence: 0.75,
        source: "local",
        text: "V",
        metadata: { text: "V" },
      })
    } else {
      candidates.push({
        kind: "text",
        mode: "handwriting",
        confidence: hwResult.confidence,
        source: "local",
        text: ch,
        metadata: { text: ch },
      })
    }
  }

  // --- STAGE 2.5: CNN MULTI-HEAD INFERENCE (SEMANTIC OBJECTS, SYMBOLS & GEOMETRY) ---
  try {
    const cnnResult = classifySketchWithCNN(strokes, bounds)
    if (cnnResult.recognized && cnnResult.kind) {
      const isObj = [
        "house", "apple", "tree", "lightbulb", "phone", "computer", "camera",
        "folder", "document", "envelope", "lock", "calendar", "gear",
        "person", "car", "clock", "database", "server"
      ].includes(cnnResult.kind)

      const isSymbol = ["star", "heart", "cloud", "checkmark", "plus", "minus", "arrow", "x"].includes(cnnResult.kind)

      if (isObj) {
        candidates.push({
          kind: cnnResult.kind,
          mode: "object",
          confidence: cnnResult.confidence,
          source: "cnn" as any,
          metadata: cnnResult.metadata,
        })
      } else if (isSymbol) {
        const existing = candidates.find((c) => c.kind === cnnResult.kind)
        if (existing) {
          existing.confidence = Math.max(existing.confidence, cnnResult.confidence)
        } else {
          candidates.push({
            kind: cnnResult.kind,
            mode: "geometry",
            confidence: cnnResult.confidence,
            source: "cnn" as any,
            metadata: cnnResult.metadata,
          })
        }
      }
    }
  } catch {
    // CNN error ignored, proceed with available candidates
  }

  // --- STAGE 2.6: SPECIALIST MODEL ENSEMBLE ARBITRATION ---
  try {
    const specRes = evaluateSpecialistEnsemble(strokes)
    if (specRes.recognized && specRes.topClass && !specRes.isUnknown) {
      const topClass = specRes.topClass
      const isLetter = specRes.topFamily === "letter"
      const isDigit = specRes.topFamily === "digit"
      const isObj = specRes.topFamily === "object"
      const isGeom = specRes.topFamily === "geometry" || specRes.topFamily === "symbol"

      if (isLetter || isDigit) {
        const existing = candidates.find((c) => c.kind === "text" && c.text === topClass)
        if (existing) {
          existing.confidence = Math.max(existing.confidence, specRes.calibratedConfidence)
        } else {
          candidates.push({
            kind: "text",
            mode: "handwriting",
            confidence: specRes.calibratedConfidence,
            source: "specialist" as any,
            text: topClass,
            metadata: { text: topClass },
          })
        }
      } else if (isObj) {
        const existing = candidates.find((c) => c.kind === topClass)
        if (existing) {
          existing.confidence = Math.max(existing.confidence, specRes.calibratedConfidence)
        } else {
          candidates.push({
            kind: topClass,
            mode: "object",
            confidence: specRes.calibratedConfidence,
            source: "specialist" as any,
            metadata: { objectType: topClass, bounds },
          })
        }
      } else if (isGeom) {
        const existing = candidates.find((c) => c.kind === topClass)
        if (existing) {
          existing.confidence = Math.max(existing.confidence, specRes.calibratedConfidence)
        } else {
          candidates.push({
            kind: topClass,
            mode: "geometry",
            confidence: specRes.calibratedConfidence,
            source: "specialist" as any,
            metadata: { shapeType: topClass, bounds },
          })
        }
      }
    }
  } catch {
    // Specialist ensemble error ignored
  }

  // Evaluate top local confidence
  const topLocalConf = candidates.length
    ? Math.max(...candidates.map((c) => c.confidence))
    : 0

  // --- STAGE 3: AI FALLBACK ---
  // Trigger AI if:
  // - Top local confidence is below AUTO_CONVERT threshold (< 0.88)
  // - Sketch is non-trivial (>= 8 points)
  // - AI is allowed
  if (allowAI && topLocalConf < CONFIDENCE_THRESHOLDS.AUTO_CONVERT && features.pointCount >= 8) {
    try {
      const aiResult = await recognizeWithAI(strokes, bounds)
      if (aiResult.recognized) {
        if (aiResult.mode === "handwriting" || aiResult.text) {
          candidates.push({
            kind: "text",
            mode: "handwriting",
            confidence: aiResult.confidence,
            source: "ai",
            text: aiResult.text,
            metadata: { text: aiResult.text },
          })
        } else if (aiResult.kind) {
          candidates.push({
            kind: aiResult.kind,
            mode: "object",
            confidence: aiResult.confidence,
            source: "ai",
          })
        }
      }
    } catch {
      // AI fallback error ignored, proceed with local candidates
    }
  }

  // --- STAGE 3.5: LETTER 'A' DETERMINISTIC ARBITRATION ---
  const aEval = evaluateLetterAGeometry(strokes)
  if (aEval.isA) {
    const existingA = candidates.find((c) => c.kind === "text" && c.text === "A")
    if (existingA) {
      existingA.confidence = Math.max(existingA.confidence, aEval.confidence)
    } else {
      candidates.push({
        kind: "text",
        mode: "handwriting",
        confidence: aEval.confidence,
        source: "local",
        text: "A",
        characters: [
          {
            text: "A",
            confidence: aEval.confidence,
            bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
            strokeIndices: strokes.map((_, idx) => idx),
            source: "local",
          },
        ],
        metadata: {
          text: "A",
          letterAGeometry: true,
          fontSize: Math.max(16, Math.min(64, Math.round(features.h * 0.85))),
        },
      })
    }
    // Suppress confusable digits/shapes when Letter A is geometrically proven
    for (const c of candidates) {
      if (c.kind === "text" && (c.text === "4" || c.text === "H" || c.text === "V")) {
        c.confidence = Math.min(c.confidence, 0.35)
      } else if (c.kind === "triangle") {
        c.confidence = Math.min(c.confidence, 0.40)
      }
    }
  } else {
    // If geometrically NOT an A, remove any accidental A candidate
    const aCandidates = candidates.filter((c) => c.kind === "text" && c.text === "A")
    for (const ac of aCandidates) {
      const idx = candidates.indexOf(ac)
      if (idx >= 0) candidates.splice(idx, 1)
    }
  }

  // --- ISOLATION DIRECTIVE: Active handwriting recognition is isolated to uppercase 'A' only ---
  // Non-A character classes (B–Z, 0–9) are preserved safely in recognition_backup/non_a/
  // and must NOT be produced by the active recognition pipeline.
  const activeCandidates = candidates.filter((c) => {
    if (c.kind === "text") {
      return c.text === "A"
    }
    return true
  })

  // --- STAGE 4: RANKING & CONFIDENCE CALIBRATION ---
  return rankAndCalibrateCandidates(activeCandidates, features, {
    isSequence: isMultiChar,
    sequenceLength: hwResult.text.length,
    isDictionaryWord: hwResult.isWord,
    isMultiDigitNumber: hwResult.isNumber,
  })
}
