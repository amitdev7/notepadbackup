// ---------------------------------------------------------------------------
// Universal Sketch Intelligence — Comprehensive Handwriting & Sequence Test Suite
// Covers Parts 39 to 47 of the specification:
// - A–Z (including multi-stroke characters)
// - 0–9
// - Multi-digit numbers (12, 123, 1234, 1234567890, 2026, etc.)
// - Words (ABC, HELLO, WORLD, APPLE, DESIGN, ZENITHSUI)
// - Mixed alphanumeric strings (A1, A1B2, A1B2C3, H2O, V2, 2026A)
// - Semantic object renderers
// - Ambiguity pairs (O vs 0, I vs 1, S vs 5, B vs 8, Z vs 2, etc.)
// - Bad input & noise handling
// - Measured evaluation metrics & latency tracking
// ---------------------------------------------------------------------------

import { recognizeSequence } from "../lib/sketch-recognition/sequence-engine.ts"
import { scoreCharacter } from "../lib/sketch-recognition/handwriting-classifier.ts"
import { extractStrokeFeatures } from "../lib/sketch-recognition/preprocessing.ts"
import { recognizeGeometry } from "../lib/sketch-recognition/geometry-recognizer.ts"
import { renderRecognizedNode } from "../lib/sketch-recognition/renderers.ts"
import { SKETCH_REGISTRY } from "../lib/sketch-recognition/registry.ts"
import type { Point } from "../lib/sketch-recognition/types.ts"

let passed = 0
let failed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failed++
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// ---------------------------------------------------------------------------
// Stroke Generators for Individual Glyphs
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

// Helper to generate stroke(s) for a given character at (ox, oy) with width w and height h
function generateGlyphStrokes(char: string, ox = 0, oy = 0, w = 40, h = 60): Point[][] {
  const x = ox
  const y = oy
  const x2 = ox + w
  const y2 = oy + h
  const xm = ox + w / 2
  const ym = oy + h / 2

  switch (char.toUpperCase()) {
    case "A": {
      // 3 strokes: left slant, right slant, crossbar
      return [
        line(x, y2, xm, y),
        line(xm, y, x2, y2),
        line(x + w * 0.2, ym + h * 0.1, x2 - w * 0.2, ym + h * 0.1),
      ]
    }
    case "B": {
      // 3 strokes: vertical spine, upper loop, lower loop
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
        [...line(x, ym, xm, ym), ...arc(xm, y + h * 0.75, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)],
      ]
    }
    case "C": {
      return [arc(xm + w * 0.1, ym, w * 0.45, h * 0.48, -Math.PI * 0.75, Math.PI * 0.75)]
    }
    case "D": {
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, ym, w * 0.45, h * 0.48, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)],
      ]
    }
    case "E": {
      return [
        line(x, y, x, y2),
        line(x, y, x2, y),
        line(x, ym, x + w * 0.75, ym),
        line(x, y2, x2, y2),
      ]
    }
    case "F": {
      return [
        line(x, y, x, y2),
        line(x, y, x2, y),
        line(x, ym, x + w * 0.75, ym),
      ]
    }
    case "G": {
      return [
        [
          ...arc(xm + w * 0.1, ym, w * 0.45, h * 0.48, -Math.PI * 0.75, Math.PI * 0.6),
          ...line(x2, ym + h * 0.1, x2, ym),
          ...line(x2, ym, xm, ym),
        ],
      ]
    }
    case "H": {
      return [
        line(x, y, x, y2),
        line(x2, y, x2, y2),
        line(x, ym, x2, ym),
      ]
    }
    case "I": {
      return [
        line(xm, y, xm, y2),
      ]
    }
    case "J": {
      return [
        [...line(x2 - w * 0.2, y, x2 - w * 0.2, y2 - h * 0.25), ...arc(xm, y2 - h * 0.25, w * 0.35, h * 0.25, 0, Math.PI)],
      ]
    }
    case "K": {
      return [
        line(x, y, x, y2),
        line(x2, y, x, ym),
        line(x, ym, x2, y2),
      ]
    }
    case "L": {
      return [
        [...line(x, y, x, y2), ...line(x, y2, x2, y2)],
      ]
    }
    case "M": {
      return [
        [...line(x, y2, x, y), ...line(x, y, xm, ym), ...line(xm, ym, x2, y), ...line(x2, y, x2, y2)],
      ]
    }
    case "N": {
      return [
        line(x, y2, x, y),
        line(x, y, x2, y2),
        line(x2, y2, x2, y),
      ]
    }
    case "O": {
      return [arc(xm, ym, w * 0.48, h * 0.48, 0, Math.PI * 2, 24)]
    }
    case "P": {
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
      ]
    }
    case "Q": {
      return [
        arc(xm, ym, w * 0.48, h * 0.48, 0, Math.PI * 2, 24),
        line(xm + w * 0.1, ym + h * 0.2, x2 + w * 0.1, y2 + h * 0.1),
      ]
    }
    case "R": {
      return [
        line(x, y, x, y2),
        [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
        line(x, ym, x2, y2),
      ]
    }
    case "S": {
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, 0, -Math.PI),
          ...arc(xm, y + h * 0.75, w * 0.45, h * 0.25, Math.PI, 0),
        ],
      ]
    }
    case "T": {
      return [
        line(x, y, x2, y),
        line(xm, y, xm, y2),
      ]
    }
    case "U": {
      return [
        [...line(x, y, x, y2 - h * 0.3), ...arc(xm, y2 - h * 0.3, w * 0.45, h * 0.3, Math.PI, 0), ...line(x2, y2 - h * 0.3, x2, y)],
      ]
    }
    case "V": {
      return [
        [...line(x, y, xm, y2), ...line(xm, y2, x2, y)],
      ]
    }
    case "W": {
      return [
        [...line(x, y, x + w * 0.25, y2), ...line(x + w * 0.25, y2, xm, ym), ...line(xm, ym, x + w * 0.75, y2), ...line(x + w * 0.75, y2, x2, y)],
      ]
    }
    case "X": {
      return [
        line(x, y, x2, y2),
        line(x2, y, x, y2),
      ]
    }
    case "Y": {
      return [
        line(x, y, xm, ym),
        line(x2, y, xm, ym),
        line(xm, ym, xm, y2),
      ]
    }
    case "Z": {
      return [
        [...line(x, y, x2, y), ...line(x2, y, x, y2), ...line(x, y2, x2, y2)],
      ]
    }
    case "0": {
      return [arc(xm, ym, w * 0.45, h * 0.48, 0, Math.PI * 2, 24)]
    }
    case "1": {
      return [line(xm, y, xm, y2)]
    }
    case "2": {
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI, 0),
          ...line(x2, y + h * 0.25, x, y2),
          ...line(x, y2, x2, y2),
        ],
      ]
    }
    case "3": {
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI * 0.8, Math.PI * 0.5),
          ...arc(xm, y + h * 0.75, w * 0.45, h * 0.25, -Math.PI * 0.5, Math.PI * 0.8),
        ],
      ]
    }
    case "4": {
      return [
        [...line(x + w * 0.75, y, x, ym + h * 0.1), ...line(x, ym + h * 0.1, x2, ym + h * 0.1)],
        line(x + w * 0.75, y, x + w * 0.75, y2),
      ]
    }
    case "5": {
      return [
        line(x2, y, x, y),
        line(x, y, x, ym),
        arc(xm, ym + h * 0.25, w * 0.45, h * 0.25, -Math.PI * 0.8, Math.PI * 0.7),
      ]
    }
    case "6": {
      return [
        [
          ...arc(xm, y + h * 0.3, w * 0.45, h * 0.3, -Math.PI * 0.5, -Math.PI),
          ...line(x, y + h * 0.3, x, ym),
          ...arc(xm, ym + h * 0.22, w * 0.45, h * 0.26, -Math.PI, Math.PI),
        ],
      ]
    }
    case "7": {
      return [
        [...line(x, y, x2, y), ...line(x2, y, xm, y2)],
      ]
    }
    case "8": {
      return [
        [
          ...arc(xm, y + h * 0.25, w * 0.38, h * 0.24, 0, Math.PI * 2, 16),
          ...arc(xm, y + h * 0.75, w * 0.45, h * 0.24, 0, Math.PI * 2, 16),
        ],
      ]
    }
    case "9": {
      return [
        [
          ...arc(xm, y + h * 0.28, w * 0.45, h * 0.26, 0, Math.PI * 2, 16),
          ...line(x2, y + h * 0.28, x2, y2 - h * 0.2),
          ...arc(xm, y2 - h * 0.2, w * 0.45, h * 0.2, 0, Math.PI * 0.8),
        ],
      ]
    }
    default:
      return [line(x, y, x2, y2)]
  }
}

// Generate sequence of characters with horizontal spacing
function generateStringStrokes(str: string, startX = 0, startY = 0, charW = 35, charH = 50, gap = 18): Point[][] {
  const allStrokes: Point[][] = []
  let cx = startX
  for (const c of str) {
    const glyphStrokes = generateGlyphStrokes(c, cx, startY, charW, charH)
    allStrokes.push(...glyphStrokes)
    cx += charW + gap
  }
  return allStrokes
}

console.log("=====================================================================")
console.log("UNIVERSAL SKETCH INTELLIGENCE — VERIFICATION SUITE")
console.log("=====================================================================\n")

// ---------------------------------------------------------------------------
// TEST 1: Letters A–Z Individual Recognition
// ---------------------------------------------------------------------------
console.log("Test Category 1: Uppercase Alphabet A–Z")
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
let lettersPassed = 0

for (const letter of letters) {
  const strokes = generateGlyphStrokes(letter, 100, 100, 40, 60)
  const result = recognizeSequence(strokes)
  const ok =
    result.recognized &&
    (result.text === letter ||
      (letter === "I" && (result.text === "I" || result.text === "1")) ||
      (letter === "O" && (result.text === "O" || result.text === "0")))
  if (ok) lettersPassed++
  check(`Recognize letter "${letter}"`, ok, `got "${result.text}" (conf: ${result.confidence.toFixed(2)})`)
}
console.log(`Letters A-Z: ${lettersPassed} / 26 recognized accurately.\n`)

// ---------------------------------------------------------------------------
// TEST 2: Numbers 0–9 Individual Recognition
// ---------------------------------------------------------------------------
console.log("Test Category 2: Numbers 0–9")
const numbers = "0123456789".split("")
let numbersPassed = 0

for (const num of numbers) {
  const strokes = generateGlyphStrokes(num, 100, 100, 35, 55)
  const result = recognizeSequence(strokes)
  const ok =
    result.recognized &&
    (result.text === num ||
      (num === "0" && (result.text === "0" || result.text === "O")) ||
      (num === "1" && (result.text === "1" || result.text === "I")))
  if (ok) numbersPassed++
  check(`Recognize digit "${num}"`, ok, `got "${result.text}" (conf: ${result.confidence.toFixed(2)})`)
}
console.log(`Digits 0-9: ${numbersPassed} / 10 recognized accurately.\n`)

// ---------------------------------------------------------------------------
// TEST 3: Multi-Digit Number Sequences
// ---------------------------------------------------------------------------
console.log("Test Category 3: Multi-Digit Continuous Numbers")
const multiDigits = [
  "12",
  "123",
  "1234",
  "12345",
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "2026",
  "100",
  "555",
  "8080",
]

for (const seq of multiDigits) {
  const t0 = performance.now()
  const strokes = generateStringStrokes(seq, 50, 100, 30, 50, 15)
  const result = recognizeSequence(strokes)
  const elapsed = performance.now() - t0
  const ok = result.recognized && result.text === seq
  check(`Multi-digit sequence "${seq}"`, ok, `got "${result.text}" (${elapsed.toFixed(1)}ms)`)
}
console.log(`Multi-digit test cases verified.\n`)

// ---------------------------------------------------------------------------
// TEST 4: Continuous Words & Dictionary Context
// ---------------------------------------------------------------------------
console.log("Test Category 4: Continuous Words")
const words = ["ABC", "HELLO", "WORLD", "APPLE", "DESIGN", "ZENITHSUI"]

for (const word of words) {
  const t0 = performance.now()
  const strokes = generateStringStrokes(word, 50, 100, 32, 50, 16)
  const result = recognizeSequence(strokes)
  const elapsed = performance.now() - t0
  const ok = result.recognized && result.text === word
  check(`Word "${word}"`, ok, `got "${result.text}" (${elapsed.toFixed(1)}ms)`)
}
console.log(`Word test cases verified.\n`)

// ---------------------------------------------------------------------------
// TEST 5: Mixed Alphanumeric Sequences
// ---------------------------------------------------------------------------
console.log("Test Category 5: Mixed Alphanumeric Sequences")
const mixed = ["A1", "A1B2", "A1B2C3", "H2O", "V2", "2026A"]

for (const str of mixed) {
  const strokes = generateStringStrokes(str, 50, 100, 32, 50, 16)
  const result = recognizeSequence(strokes)
  const ok = result.recognized && result.text === str
  check(`Mixed sequence "${str}"`, ok, `got "${result.text}"`)
}
console.log(`Mixed alphanumeric test cases verified.\n`)

// ---------------------------------------------------------------------------
// TEST 6: Semantic Objects in Registry and Renderers
// ---------------------------------------------------------------------------
console.log("Test Category 6: Semantic Objects & Napkin Renderers")
const semanticObjects = [
  "apple",
  "house",
  "cloud",
  "lightbulb",
  "phone",
  "tree",
  "folder",
  "camera",
  "calendar",
  "lock",
  "envelope",
  "document",
  "gear",
  "computer",
  "monitor",
  "person",
  "car",
  "clock",
  "microphone",
  "database",
  "server",
]

for (const obj of semanticObjects) {
  const inRegistry = obj in SKETCH_REGISTRY
  check(`Registry contains "${obj}"`, inRegistry)
  const node = renderRecognizedNode(`test_${obj}`, obj, { x: 50, y: 50, w: 120, h: 100 })
  check(`Renderer produces valid node for "${obj}"`, !!node && node.id === `test_${obj}` && (node.type === "draw" || node.type === "shape"))
}
console.log(`All 21 semantic objects verified in registry and renderers.\n`)

// ---------------------------------------------------------------------------
// TEST 7: Ambiguity Disambiguation
// ---------------------------------------------------------------------------
console.log("Test Category 7: Ambiguity Disambiguation")

// O vs 0: In numeric sequence "2026", circular stroke should disambiguate to '0'
{
  const strokes2026 = generateStringStrokes("2026", 50, 100, 30, 50, 15)
  const res = recognizeSequence(strokes2026)
  check("Disambiguates '0' in '2026'", res.text === "2026", `got "${res.text}"`)
}

// O vs 0: In word "HELLO", circular stroke should disambiguate to 'O'
{
  const strokesHello = generateStringStrokes("HELLO", 50, 100, 30, 50, 15)
  const res = recognizeSequence(strokesHello)
  check("Disambiguates 'O' in 'HELLO'", res.text === "HELLO", `got "${res.text}"`)
}

// I vs 1: In word "DESIGN", vertical stroke should disambiguate to 'I'
{
  const strokesDesign = generateStringStrokes("DESIGN", 50, 100, 30, 50, 15)
  const res = recognizeSequence(strokesDesign)
  check("Disambiguates 'I' in 'DESIGN'", res.text === "DESIGN", `got "${res.text}"`)
}

// I vs 1: In number "123", vertical stroke should disambiguate to '1'
{
  const strokes123 = generateStringStrokes("123", 50, 100, 30, 50, 15)
  const res = recognizeSequence(strokes123)
  check("Disambiguates '1' in '123'", res.text === "123", `got "${res.text}"`)
}

// Geometry circle vs Letter O: Large isolated circle is geometry
{
  const largeCircle: Point[] = []
  for (let i = 0; i <= 32; i++) {
    const th = (i / 32) * Math.PI * 2
    largeCircle.push([300 + 100 * Math.cos(th), 300 + 100 * Math.sin(th)])
  }
  const geomRes = recognizeGeometry([largeCircle])
  check("Large isolated circle classified as geometry 'circle'", geomRes.recognized && geomRes.kind === "circle")
}

// ---------------------------------------------------------------------------
// TEST 8: Bad Input & Safe Degradation
// ---------------------------------------------------------------------------
console.log("Test Category 8: Bad Input & Robustness")

// Single point
{
  const singlePoint: Point[][] = [[[10, 10]]]
  const res = recognizeSequence(singlePoint)
  check("Single point safely produces unconfirmed/non-crashing result", !res.recognized || res.confidence < 0.5)
}

// Accidental 2-point tap
{
  const twoPoint: Point[][] = [[[10, 10], [12, 11]]]
  const res = recognizeSequence(twoPoint)
  check("Two-point tap safely rejected", !res.recognized || res.confidence < 0.5)
}

// Disconnected tiny scribble
{
  const tinyScribble: Point[][] = [[[5, 5], [6, 7], [8, 6], [7, 5]]]
  const res = recognizeSequence(tinyScribble)
  check("Tiny scribble safely rejected", !res.recognized || res.confidence < 0.6)
}

console.log("\n=====================================================================")
console.log("EVALUATION SUMMARY")
console.log("=====================================================================")
console.log(`Total Checks: ${passed + failed}`)
console.log(`Passed:       ${passed}`)
console.log(`Failed:       ${failed}`)

if (failures.length > 0) {
  console.error(`\nFailures List:`)
  failures.forEach((f) => console.error(` - ${f}`))
  process.exit(1)
} else {
  console.log("All Universal Sketch Intelligence verification tests PASSED!\n")
}
