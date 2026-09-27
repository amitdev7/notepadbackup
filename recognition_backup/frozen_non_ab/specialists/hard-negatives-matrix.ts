// ---------------------------------------------------------------------------
// Specialist Sketch Recognition — Hard Negatives Matrix & Boundary Tests
// Explicitly maps every recognition class to its hardest visual competitors.
// ---------------------------------------------------------------------------

import type { NormalizedDrawingInput } from "./types"

export const HARD_NEGATIVES_MAP: Record<string, string[]> = {
  // Letters A–Z
  A: ["triangle", "V", "H", "arrow", "4", "person"],
  B: ["8", "R", "P", "3", "E"],
  C: ["circle", "O", "0", "G", "U"],
  D: ["O", "0", "P", "B", "triangle"],
  E: ["F", "B", "3", "rectangle"],
  F: ["E", "T", "P", "7"],
  G: ["6", "C", "O", "0"],
  H: ["A", "N", "M", "rectangle", "4"],
  I: ["1", "line", "vertical_line", "T", "L"],
  J: ["I", "1", "U", "L"],
  K: ["X", "R", "H", "plus"],
  L: ["1", "I", "checkmark", "rectangle"],
  M: ["N", "W", "H", "triangle"],
  N: ["M", "H", "Z", "U", "V"],
  O: ["circle", "0", "ellipse", "D", "Q"],
  P: ["R", "B", "D", "9"],
  Q: ["O", "0", "circle", "9"],
  R: ["P", "B", "K", "A"],
  S: ["5", "8", "Z", "scribble"],
  T: ["7", "I", "1", "plus"],
  U: ["V", "O", "0", "C", "J"],
  V: ["U", "checkmark", "Y", "triangle", "7"],
  W: ["M", "V", "U"],
  X: ["plus", "multiplication", "K", "Y"],
  Y: ["V", "X", "T", "7"],
  Z: ["2", "7", "S", "angular_scribble"],

  // Digits 0–9
  "0": ["O", "circle", "ellipse", "8", "D"],
  "1": ["I", "line", "vertical_line", "7", "L"],
  "2": ["Z", "7", "S", "R"],
  "3": ["8", "B", "E", "scribble"],
  "4": ["9", "A", "H", "cross"],
  "5": ["S", "6", "8", "scribble"],
  "6": ["G", "C", "B", "0"],
  "7": ["1", "T", "Z", "line", "V"],
  "8": ["B", "0", "S", "3"],
  "9": ["P", "4", "0", "g", "q"],

  // Geometry & Symbols
  line: ["1", "I", "minus", "arrow"],
  horizontal_line: ["minus", "underscore", "line"],
  vertical_line: ["1", "I", "pipe", "line"],
  rectangle: ["square", "D", "O", "rounded_rectangle"],
  square: ["rectangle", "box"],
  circle: ["O", "0", "C", "ellipse", "apple"],
  ellipse: ["circle", "O", "0"],
  rounded_rectangle: ["rectangle", "square"],
  triangle: ["A", "arrow", "V", "house"],
  arrow: ["line", "triangle", "checkmark"],
  checkmark: ["V", "line", "L", "1"],
  x: ["plus", "multiplication", "X", "K"],
  plus: ["x", "cross", "T", "X"],
  minus: ["line", "horizontal_line"],
  star: ["scribble", "asterisk"],
  heart: ["apple", "cloud", "circle"],
  cloud: ["tree", "heart", "scribble"],

  // Semantic Objects
  apple: ["circle", "heart", "lightbulb"],
  house: ["rectangle", "triangle", "arrow"],
  tree: ["cloud", "lightbulb", "umbrella"],
  lightbulb: ["apple", "tree", "circle"],
  phone: ["rectangle", "rounded_rectangle", "monitor"],
  computer: ["rectangle", "phone", "monitor"],
  camera: ["rectangle", "phone"],
  folder: ["rectangle", "document"],
  document: ["rectangle", "folder"],
  envelope: ["rectangle", "card"],
  lock: ["circle", "rectangle"],
  calendar: ["rectangle", "table"],
  gear: ["circle", "star"],
  person: ["arrow", "stick_figure"],
  car: ["rectangle", "truck"],
  clock: ["circle", "O", "0"],
  database: ["server", "cylinder"],
  server: ["database", "rectangle"],
}

/**
 * Discriminator functions for the most critical confusing pairs.
 * Evaluates geometric features to resolve ambiguities.
 */
export interface PairDisambiguation {
  favoredClass: string
  confidenceDelta: number
  reason: string
}

export function disambiguateConfusablePair(
  classA: string,
  classB: string,
  input: NormalizedDrawingInput
): PairDisambiguation | null {
  const { features, rawStrokes } = input
  const pair = [classA, classB].sort().join(":")

  // 1. A vs Triangle
  if (pair === "A:triangle") {
    // Look for mid-horizontal crossbar
    const hasMidBar =
      rawStrokes.length >= 2 ||
      features.corners.some((c) => Math.abs(c[1] - features.cy) < features.h * 0.22)
    if (hasMidBar) {
      return { favoredClass: "A", confidenceDelta: 0.25, reason: "Horizontal crossbar detected" }
    } else {
      return { favoredClass: "triangle", confidenceDelta: 0.2, reason: "Hollow enclosed triangular shape" }
    }
  }

  // 2. O vs 0 vs Circle
  if (pair === "0:O" || pair === "0:circle" || pair === "O:circle") {
    if (features.w > 50 && features.h > 50 && features.circularity >= 0.72) {
      return { favoredClass: "circle", confidenceDelta: 0.22, reason: "Large isotropic circular shape" }
    }
    if (features.aspectRatio <= 0.65) {
      return { favoredClass: "0", confidenceDelta: 0.18, reason: "Tall narrow aspect ratio favors digit 0" }
    }
    return { favoredClass: "O", confidenceDelta: 0.12, reason: "Default letter O interpretation" }
  }

  // 3. 1 vs I vs Line
  if (pair === "1:I" || pair === "1:line" || pair === "I:line") {
    if (features.w > 70 && features.straightness >= 0.9) {
      return { favoredClass: "line", confidenceDelta: 0.3, reason: "Extended straight span favors line" }
    }
    if (rawStrokes.length >= 2) {
      return { favoredClass: "1", confidenceDelta: 0.2, reason: "Multiple strokes or flag favors digit 1" }
    }
    return { favoredClass: "1", confidenceDelta: 0.05, reason: "Single vertical stroke" }
  }

  // 4. S vs 5
  if (pair === "5:S") {
    const hasSharpCorner = features.corners.some(
      (c) => c[1] < features.y + features.h * 0.35 && c[0] > features.x + features.w * 0.5
    )
    if (rawStrokes.length >= 2 || hasSharpCorner) {
      return { favoredClass: "5", confidenceDelta: 0.22, reason: "Sharp top angle/separate stroke favors 5" }
    }
    return { favoredClass: "S", confidenceDelta: 0.15, reason: "Continuous smooth curvature favors S" }
  }

  // 5. B vs 8
  if (pair === "8:B") {
    const hasLeftSpine = features.corners.some(
      (c) => Math.abs(c[0] - features.x) < features.w * 0.15
    ) && rawStrokes.length >= 2
    if (hasLeftSpine) {
      return { favoredClass: "B", confidenceDelta: 0.25, reason: "Left vertical spine favors B" }
    }
    return { favoredClass: "8", confidenceDelta: 0.2, reason: "Continuous crossing loop favors 8" }
  }

  // 6. 2 vs Z
  if (pair === "2:Z") {
    const hasTopCurve = features.averageCurvature > 0.08
    if (hasTopCurve) {
      return { favoredClass: "2", confidenceDelta: 0.2, reason: "Rounded top curve favors 2" }
    }
    return { favoredClass: "Z", confidenceDelta: 0.2, reason: "Sharp zig-zag angles favor Z" }
  }

  // 7. G vs 6
  if (pair === "6:G") {
    if (features.closureRatio < 0.25) {
      return { favoredClass: "6", confidenceDelta: 0.25, reason: "Closed bottom loop favors 6" }
    }
    return { favoredClass: "G", confidenceDelta: 0.2, reason: "Open circular arc with inward bar favors G" }
  }

  // 8. V vs Checkmark
  if (pair === "V:checkmark") {
    if (rawStrokes.length === 1 && rawStrokes[0].length >= 3) {
      const pts = rawStrokes[0]
      const lowestPtIdx = pts.reduce((lowest, pt, idx) => (pt[1] > pts[lowest][1] ? idx : lowest), 0)
      const leftLegLen = lowestPtIdx
      const rightLegLen = pts.length - lowestPtIdx
      if (rightLegLen > leftLegLen * 1.6) {
        return { favoredClass: "checkmark", confidenceDelta: 0.3, reason: "Asymmetrical legs favor checkmark" }
      }
    }
    return { favoredClass: "V", confidenceDelta: 0.15, reason: "Symmetrical apex favors V" }
  }

  // 9. X vs Plus
  if (pair === "plus:x" || pair === "X:plus") {
    if (rawStrokes.length === 2) {
      const s1 = rawStrokes[0]
      const dx1 = Math.abs(s1[s1.length - 1][0] - s1[0][0])
      const dy1 = Math.abs(s1[s1.length - 1][1] - s1[0][1])
      const isOrthogonal =
        (dx1 < features.w * 0.25 && dy1 > features.h * 0.6) ||
        (dy1 < features.h * 0.25 && dx1 > features.w * 0.6)
      if (isOrthogonal) {
        return { favoredClass: "plus", confidenceDelta: 0.28, reason: "Orthogonal vertical/horizontal strokes favor plus" }
      }
    }
    return { favoredClass: "x", confidenceDelta: 0.2, reason: "Diagonal crossing strokes favor x" }
  }

  // 10. C vs Circle
  if (pair === "C:circle") {
    if (features.closureRatio < 0.22) {
      return { favoredClass: "circle", confidenceDelta: 0.3, reason: "Closed loop favors circle" }
    }
    return { favoredClass: "C", confidenceDelta: 0.25, reason: "Open arc with wide gap favors C" }
  }

  return null
}
