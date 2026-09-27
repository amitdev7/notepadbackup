// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Fast Local Deterministic Recognizer
// ---------------------------------------------------------------------------

import type {
  Point,
  RecognitionCandidate,
  RecognitionResult,
  StrokeFeatures,
} from "./types"
import {
  cleanStrokes,
  extractStrokeFeatures,
  segmentsIntersect,
} from "./preprocessing"
import { evaluateLetterAGeometry } from "./letter-a-pipeline"

/**
 * Recognize a straight line
 */
function testLine(features: StrokeFeatures): RecognitionCandidate | null {
  if (features.strokeCount !== 1) return null
  if (features.pointCount < 2) return null
  if (features.diagonal < 14) return null

  // Line must have high straightness (endpoints distance / total arc length)
  // For mouse drawings, allow slight wiggles down to 0.88
  if (features.straightness >= 0.88 && features.closureRatio > 0.5) {
    const conf = Math.min(
      0.98,
      Math.max(0.7, 0.75 + (features.straightness - 0.88) * 2.0)
    )
    return {
      kind: "line",
      confidence: conf,
      source: "geometry",
      metadata: {
        x1: features.startPoint[0],
        y1: features.startPoint[1],
        x2: features.endPoint[0],
        y2: features.endPoint[1],
      },
    }
  }

  return null
}

/**
 * Recognize an arrow (either 1 stroke with head barb or 2-3 strokes: shaft + arrowhead)
 */
function testArrow(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  const strokes = cleanStrokes(rawStrokes)
  if (strokes.length === 0) return null

  // Case 1: Two strokes (shaft + arrowhead)
  if (strokes.length === 2) {
    const s1 = strokes[0]
    const s2 = strokes[1]
    const f1 = extractStrokeFeatures([s1])
    const f2 = extractStrokeFeatures([s2])

    // One should be a relatively straight shaft, one should be a smaller arrowhead V
    let shaft = f1
    let head = f2

    if (f2.totalLength > f1.totalLength) {
      shaft = f2
      head = f1
    }

    if (
      shaft.straightness >= 0.84 &&
      head.totalLength < shaft.totalLength * 0.7 &&
      head.totalLength >= 8
    ) {
      // Check if arrowhead is near one of the shaft's endpoints
      const distStart = Math.hypot(
        head.cx - shaft.startPoint[0],
        head.cy - shaft.startPoint[1]
      )
      const distEnd = Math.hypot(
        head.cx - shaft.endPoint[0],
        head.cy - shaft.endPoint[1]
      )
      const shaftLen = shaft.totalLength

      if (distEnd <= shaftLen * 0.35 || distStart <= shaftLen * 0.35) {
        const isForward = distEnd <= distStart
        const startPt = isForward ? shaft.startPoint : shaft.endPoint
        const endPt = isForward ? shaft.endPoint : shaft.startPoint
        return {
          kind: "arrow",
          confidence: 0.94,
          source: "geometry",
          metadata: {
            x1: startPt[0],
            y1: startPt[1],
            x2: endPt[0],
            y2: endPt[1],
          },
        }
      }
    }
  }

  // Case 2: Single stroke arrow (shaft drawn first, followed by an acute tip turn)
  if (strokes.length === 1 && features.diagonal >= 20) {
    const pts = strokes[0]
    if (pts.length >= 6) {
      const n = pts.length
      // Test forward arrow (shaft first, head at end)
      for (const ratio of [0.65, 0.7, 0.75, 0.8, 0.85]) {
        const headIdx = Math.floor(n * ratio)
        const shaftSlice = pts.slice(0, headIdx)
        const headSlice = pts.slice(headIdx)
        if (shaftSlice.length >= 3 && headSlice.length >= 2) {
          const fShaft = extractStrokeFeatures([shaftSlice])
          const fHead = extractStrokeFeatures([headSlice])
          const shaftStraight = fShaft.straightness >= 0.82
          const hasHeadHook =
            fHead.corners.length >= 1 ||
            fHead.straightness < 0.88 ||
            fHead.maxCurvature > 0.5 ||
            Math.hypot(headSlice[headSlice.length - 1][0] - shaftSlice[shaftSlice.length - 1][0], headSlice[headSlice.length - 1][1] - shaftSlice[shaftSlice.length - 1][1]) < fShaft.totalLength * 0.4
          if (shaftStraight && hasHeadHook) {
            return {
              kind: "arrow",
              confidence: 0.92,
              source: "geometry",
              metadata: {
                x1: fShaft.startPoint[0],
                y1: fShaft.startPoint[1],
                x2: fShaft.endPoint[0],
                y2: fShaft.endPoint[1],
              },
            }
          }
        }
      }
    }
  }

  // Case 3: Three strokes (shaft + 2 head barbs)
  if (strokes.length === 3) {
    const lengths = strokes.map((s) => extractStrokeFeatures([s]).totalLength)
    const maxLenIdx = lengths.indexOf(Math.max(...lengths))
    const shaftStroke = strokes[maxLenIdx]
    const fShaft = extractStrokeFeatures([shaftStroke])
    const barbStrokes = strokes.filter((_, idx) => idx !== maxLenIdx)
    if (fShaft.straightness >= 0.82) {
      const nearCount = barbStrokes.filter((b) => {
        const fb = extractStrokeFeatures([b])
        const d = Math.min(
          Math.hypot(fb.cx - fShaft.startPoint[0], fb.cy - fShaft.startPoint[1]),
          Math.hypot(fb.cx - fShaft.endPoint[0], fb.cy - fShaft.endPoint[1])
        )
        return d <= fShaft.totalLength * 0.45
      }).length
      if (nearCount === 2) {
        return {
          kind: "arrow",
          confidence: 0.95,
          source: "geometry",
          metadata: {
            x1: fShaft.startPoint[0],
            y1: fShaft.startPoint[1],
            x2: fShaft.endPoint[0],
            y2: fShaft.endPoint[1],
          },
        }
      }
    }
  }

  return null
}

/**
 * Recognize a checkmark (very forgiving for mouse drawings)
 */
function testCheckmark(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  const strokes = cleanStrokes(rawStrokes)
  if (strokes.length !== 1 && strokes.length !== 2) return null

  // Case 1: Single stroke checkmark (down-stroke, corner, up-stroke)
  if (strokes.length === 1) {
    const pts = strokes[0]
    if (pts.length < 5) return null

    // Find the lowest Y point (trough)
    let lowestIdx = 0
    let lowestY = pts[0][1]
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][1] > lowestY) {
        lowestY = pts[i][1]
        lowestIdx = i
      }
    }

    // Lowest point should not be start or end (must have trough in between 15% and 75%)
    const ratio = lowestIdx / pts.length
    if (ratio >= 0.15 && ratio <= 0.75) {
      const start = pts[0]
      const trough = pts[lowestIdx]
      const end = pts[pts.length - 1]

      // Start must be higher than trough (start.y < trough.y)
      // End must be higher than trough (end.y < trough.y)
      const startDrop = trough[1] - start[1]
      const endRise = trough[1] - end[1]

      // Check horizontal progression: start is left of trough, end is right of trough
      const startToTroughX = trough[0] - start[0]
      const troughToEndX = end[0] - trough[0]

      if (
        startDrop >= features.h * 0.25 &&
        endRise >= features.h * 0.4 &&
        startToTroughX >= -10 &&
        troughToEndX >= features.w * 0.35
      ) {
        // High confidence checkmark
        const conf = endRise > startDrop ? 0.95 : 0.88
        return {
          kind: "checkmark",
          confidence: conf,
          source: "geometry",
          metadata: {
            start,
            trough,
            end,
          },
        }
      }
    }
  }

  // Case 2: 2 strokes (short downward stroke, followed by longer upward stroke)
  if (strokes.length === 2) {
    const s1 = strokes[0]
    const s2 = strokes[1]
    if (s1.length >= 2 && s2.length >= 2) {
      const p1Start = s1[0]
      const p1End = s1[s1.length - 1]
      const p2Start = s2[0]
      const p2End = s2[s2.length - 1]

      const isDownward1 = p1End[1] > p1Start[1]
      const isUpward2 = p2End[1] < p2Start[1]
      const gap = Math.hypot(p1End[0] - p2Start[0], p1End[1] - p2Start[1])

      if (
        isDownward1 &&
        isUpward2 &&
        gap <= features.diagonal * 0.35 &&
        p2End[0] > p1Start[0]
      ) {
        return {
          kind: "checkmark",
          confidence: 0.92,
          source: "geometry",
        }
      }
    }
  }

  return null
}

/**
 * Recognize an X / Cross
 */
function testX(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  const strokes = cleanStrokes(rawStrokes)

  // Case 1: Two separate diagonal strokes crossing each other
  if (strokes.length === 2) {
    const s1 = strokes[0]
    const s2 = strokes[1]
    const f1 = extractStrokeFeatures([s1])
    const f2 = extractStrokeFeatures([s2])

    if (f1.straightness >= 0.78 && f2.straightness >= 0.78) {
      const p1 = s1[0]
      const p2 = s1[s1.length - 1]
      const p3 = s2[0]
      const p4 = s2[s2.length - 1]

      const dx1 = Math.abs(p2[0] - p1[0])
      const dy1 = Math.abs(p2[1] - p1[1])
      const dx2 = Math.abs(p4[0] - p3[0])
      const dy2 = Math.abs(p4[1] - p3[1])

      const s1Horiz = dx1 > dy1 * 1.4
      const s1Vert = dy1 > dx1 * 1.4
      const s2Horiz = dx2 > dy2 * 1.4
      const s2Vert = dy2 > dx2 * 1.4

      // If one is horizontal and other is vertical, that's a Plus, not an X!
      if ((s1Horiz && s2Vert) || (s1Vert && s2Horiz)) {
        return null
      }

      if (segmentsIntersect(p1, p2, p3, p4)) {
        return {
          kind: "x",
          confidence: 0.93,
          source: "geometry",
        }
      }
    }
  }

  // Case 2: Single stroke self-intersecting X
  if (strokes.length === 1 && features.hasSelfIntersection) {
    if (
      features.cornerCount >= 1 &&
      features.aspectRatio >= 0.6 &&
      features.aspectRatio <= 1.6
    ) {
      return {
        kind: "x",
        confidence: 0.88,
        source: "geometry",
      }
    }
  }

  return null
}

/**
 * Recognize a Plus (+)
 */
function testPlus(
  rawStrokes: Point[][],
  _features: StrokeFeatures
): RecognitionCandidate | null {
  const strokes = cleanStrokes(rawStrokes)
  if (strokes.length !== 2) return null

  const s1 = strokes[0]
  const s2 = strokes[1]
  const f1 = extractStrokeFeatures([s1])
  const f2 = extractStrokeFeatures([s2])

  if (f1.straightness < 0.8 || f2.straightness < 0.8) return null

  const p1 = s1[0]
  const p2 = s1[s1.length - 1]
  const p3 = s2[0]
  const p4 = s2[s2.length - 1]

  if (!segmentsIntersect(p1, p2, p3, p4)) return null

  // One should be horizontal-ish (|dx| > |dy| * 1.5) and one vertical-ish (|dy| > |dx| * 1.5)
  const dx1 = Math.abs(p2[0] - p1[0])
  const dy1 = Math.abs(p2[1] - p1[1])
  const dx2 = Math.abs(p4[0] - p3[0])
  const dy2 = Math.abs(p4[1] - p3[1])

  const s1Horiz = dx1 > dy1 * 1.4
  const s1Vert = dy1 > dx1 * 1.4
  const s2Horiz = dx2 > dy2 * 1.4
  const s2Vert = dy2 > dx2 * 1.4

  if ((s1Horiz && s2Vert) || (s1Vert && s2Horiz)) {
    return {
      kind: "plus",
      confidence: 0.96,
      source: "geometry",
    }
  }

  return null
}

/**
 * Recognize a Circle or Ellipse
 */
function testCircleOrEllipse(features: StrokeFeatures): RecognitionCandidate | null {
  if (features.strokeCount !== 1) return null
  if (features.pointCount < 10) return null
  if (features.diagonal < 18) return null

  // Must be reasonably closed (endpoints distance small relative to size)
  if (features.closureRatio > 0.42) return null

  // If it has 3+ corners and high area fill, it is a rectangle or polygon, not an ellipse
  if (features.cornerCount >= 3 && features.areaFillRatio > 0.80) return null
  if (features.areaFillRatio > 0.88) return null // Ellipse area ratio cannot exceed PI/4 (~0.785)

  // Circularity and radial variance checks
  // For mouse drawings, allow radial variance up to 0.30
  if (features.radialVariance > 0.35) return null
  if (features.areaFillRatio < 0.52) return null

  // Circle: aspect ratio close to 1 (0.75 .. 1.33)
  if (
    features.aspectRatio >= 0.75 &&
    features.aspectRatio <= 1.33 &&
    features.circularity >= 0.62
  ) {
    const conf = Math.min(
      0.98,
      Math.max(
        0.75,
        0.95 - features.radialVariance * 0.8 - Math.abs(features.aspectRatio - 1) * 0.2
      )
    )
    return {
      kind: "circle",
      confidence: conf,
      source: "geometry",
    }
  }

  // Ellipse: aspect ratio stretched (< 0.75 or > 1.33)
  if (
    (features.aspectRatio < 0.75 || features.aspectRatio > 1.33) &&
    features.circularity >= 0.45
  ) {
    const conf = Math.min(0.95, Math.max(0.72, 0.92 - features.radialVariance * 0.8))
    return {
      kind: "ellipse",
      confidence: conf,
      source: "geometry",
    }
  }

  return null
}

/**
 * Recognize a Rectangle / Box
 */
function testRectangle(features: StrokeFeatures): RecognitionCandidate | null {
  if (features.strokeCount !== 1 && features.strokeCount !== 4) return null
  if (features.diagonal < 18) return null

  // If 1 stroke, must be reasonably closed
  if (features.strokeCount === 1 && features.closureRatio > 0.4) return null

  // A rectangle covers a high proportion of its bounding box (areaFillRatio >= 0.75)
  // And has lower circularity than a circle (circularity <= 0.86)
  if (features.areaFillRatio >= 0.72 && features.circularity <= 0.88) {
    // Check corner count: typically 3 to 5 corners detected for a rectangle
    const cornerBonus =
      features.cornerCount >= 3 && features.cornerCount <= 5 ? 0.10 : 0
    const conf = Math.min(
      0.98,
      Math.max(
        0.75,
        0.86 + (features.areaFillRatio - 0.72) * 0.5 + cornerBonus
      )
    )
    return {
      kind: "rectangle",
      confidence: conf,
      source: "geometry",
    }
  }

  return null
}

/**
 * Recognize a Triangle
 */
function testTriangle(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  if (features.strokeCount !== 1 && features.strokeCount !== 3) return null
  if (features.diagonal < 18) return null

  // Ensure it is not a handwritten Letter A
  const aEval = evaluateLetterAGeometry(rawStrokes)
  if (aEval.isA) return null

  if (features.strokeCount === 1 && features.closureRatio > 0.4) return null

  // A triangle's convex hull fills about ~0.42 to 0.65 of its bounding box
  if (features.areaFillRatio >= 0.38 && features.areaFillRatio <= 0.68) {
    // For 3-stroke triangle, must have bottom closure or corner closure
    if (features.strokeCount === 3 && !aEval.hasBottomClosure && features.closureRatio > 0.35) {
      return null
    }

    // Triangles usually have ~3 corners detected
    const isThreeCorners = features.cornerCount === 3
    const conf = isThreeCorners ? 0.94 : 0.86
    return {
      kind: "triangle",
      confidence: conf,
      source: "geometry",
    }
  }

  return null
}

/**
 * Recognize a Star
 */
function testStar(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  const strokes = cleanStrokes(rawStrokes)
  if (strokes.length !== 1 && strokes.length !== 2) return null
  if (features.diagonal < 20) return null

  // A 5-pointed star typically has high corner count (>= 5) or multiple self-intersections
  if (
    (features.cornerCount >= 5 || features.hasSelfIntersection) &&
    features.aspectRatio >= 0.7 &&
    features.aspectRatio <= 1.4 &&
    features.areaFillRatio >= 0.4 &&
    features.areaFillRatio <= 0.75
  ) {
    return {
      kind: "star",
      confidence: 0.88,
      source: "geometry",
    }
  }

  return null
}

/**
 * Recognize a Heart
 */
function testHeart(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  if (features.diagonal < 20) return null
  if (features.aspectRatio < 0.65 || features.aspectRatio > 1.6) return null

  // A heart has a top cleft and a bottom point
  // The bottom center is the lowest Y point
  const allPts = cleanStrokes(rawStrokes).flat()
  if (allPts.length < 12) return null

  // Find lowest point (bottom cusp)
  let lowestIdx = 0
  let lowestY = allPts[0][1]
  for (let i = 1; i < allPts.length; i++) {
    if (allPts[i][1] > lowestY) {
      lowestY = allPts[i][1]
      lowestIdx = i
    }
  }

  const lowestPt = allPts[lowestIdx]
  const bottomDistFromCenterX = Math.abs(lowestPt[0] - features.cx)

  // Lowest point should be near horizontal center
  if (bottomDistFromCenterX <= features.w * 0.28) {
    // Check if top has a dip (points near top center dip lower than top peaks)
    const topPts = allPts.filter((p) => p[1] < features.cy)
    if (topPts.length >= 6 && features.areaFillRatio >= 0.48 && features.areaFillRatio <= 0.82) {
      return {
        kind: "heart",
        confidence: 0.86,
        source: "geometry",
      }
    }
  }

  return null
}

/**
 * Recognize a Cloud
 */
function testCloud(features: StrokeFeatures): RecognitionCandidate | null {
  if (features.strokeCount !== 1) return null
  if (features.diagonal < 24) return null
  if (features.closureRatio > 0.4) return null

  // Clouds are wide, have bumpy perimeter (high corner count > 6), and area fill ratio ~0.6-0.85
  if (
    features.aspectRatio >= 1.2 &&
    features.aspectRatio <= 2.6 &&
    features.cornerCount >= 5 &&
    features.areaFillRatio >= 0.55 &&
    features.areaFillRatio <= 0.85
  ) {
    return {
      kind: "cloud",
      confidence: 0.85,
      source: "geometry",
    }
  }

  return null
}

/**
 * Recognize a House (triangle roof on top of rectangular body)
 */
function testHouse(
  rawStrokes: Point[][],
  features: StrokeFeatures
): RecognitionCandidate | null {
  const strokes = cleanStrokes(rawStrokes)
  if (features.diagonal < 28) return null

  // Case 1: 2 strokes (roof + body)
  if (strokes.length === 2) {
    const f1 = extractStrokeFeatures([strokes[0]])
    const f2 = extractStrokeFeatures([strokes[1]])

    const roof = f1.cy < f2.cy ? f1 : f2
    const body = f1.cy < f2.cy ? f2 : f1

    if (
      roof.areaFillRatio <= 0.65 &&
      body.areaFillRatio >= 0.68 &&
      roof.y <= body.y + 10
    ) {
      return {
        kind: "house",
        confidence: 0.91,
        source: "geometry",
      }
    }
  }

  // Case 2: 1 stroke house outline (5-corner polygon)
  if (strokes.length === 1 && features.closureRatio <= 0.35) {
    if (
      features.cornerCount >= 4 &&
      features.cornerCount <= 6 &&
      features.aspectRatio >= 0.7 &&
      features.aspectRatio <= 1.4 &&
      features.areaFillRatio >= 0.6 &&
      features.areaFillRatio <= 0.85
    ) {
      return {
        kind: "house",
        confidence: 0.86,
        source: "geometry",
      }
    }
  }

  return null
}

/**
 * Main Deterministic Recognition Entrypoint.
 * Evaluates all fast local recognizers and returns ranked candidates.
 */
export function recognizeGeometry(rawStrokes: Point[][]): RecognitionResult {
  const strokes = cleanStrokes(rawStrokes)
  const features = extractStrokeFeatures(strokes)

  const bounds = {
    x: features.x,
    y: features.y,
    w: features.w,
    h: features.h,
  }

  // If drawing is a tiny dot or accidental click, do not recognize
  if (features.diagonal < 8 || features.pointCount < 3) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "geometry",
      bounds,
    }
  }

  const candidates: RecognitionCandidate[] = []

  // Run individual tests
  const lineRes = testLine(features)
  if (lineRes) candidates.push(lineRes)

  const arrowRes = testArrow(rawStrokes, features)
  if (arrowRes) candidates.push(arrowRes)

  const checkmarkRes = testCheckmark(rawStrokes, features)
  if (checkmarkRes) candidates.push(checkmarkRes)

  const xRes = testX(rawStrokes, features)
  if (xRes) candidates.push(xRes)

  const plusRes = testPlus(rawStrokes, features)
  if (plusRes) candidates.push(plusRes)

  const circleRes = testCircleOrEllipse(features)
  if (circleRes) candidates.push(circleRes)

  const rectRes = testRectangle(features)
  if (rectRes) candidates.push(rectRes)

  const triRes = testTriangle(rawStrokes, features)
  if (triRes) candidates.push(triRes)

  const starRes = testStar(rawStrokes, features)
  if (starRes) candidates.push(starRes)

  const heartRes = testHeart(rawStrokes, features)
  if (heartRes) candidates.push(heartRes)

  const cloudRes = testCloud(features)
  if (cloudRes) candidates.push(cloudRes)

  const houseRes = testHouse(rawStrokes, features)
  if (houseRes) candidates.push(houseRes)

  if (candidates.length === 0) {
    return {
      recognized: false,
      kind: null,
      confidence: 0,
      source: "geometry",
      bounds,
    }
  }

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence)
  const top = candidates[0]

  return {
    recognized: top.confidence >= 0.6,
    kind: top.kind,
    confidence: top.confidence,
    source: "geometry",
    candidates,
    bounds,
    metadata: top.metadata,
  }
}
