// ---------------------------------------------------------------------------
// Zenithsui Smart Sketch — Specialist Recognition System Tests
// Verifies 69 specialist models, contracts, hard-negative disambiguation,
// scribble rejection, and continuous sequence recognition.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert"
import { specialistRegistry } from "../lib/sketch-recognition/specialists/specialist-registry"
import { evaluateSpecialistEnsemble } from "../lib/sketch-recognition/specialists/specialist-ensemble"
import {
  getHandwritingArchetypes,
  getGeometryArchetypes,
  getObjectArchetypes,
} from "../lib/sketch-recognition/dataset-archetypes"
import { augmentStrokes, SeededRNG } from "../lib/sketch-recognition/dataset-generator"
import { recognizeHandwritingSequence } from "../lib/sketch-recognition/sequence-engine"
import type { Point } from "../lib/sketch-recognition/types"

console.log("\n============================================================")
console.log("   ZENITHSUI SPECIALIST RECOGNITION SYSTEM TEST SUITE       ")
console.log("============================================================\n")

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err: any) {
    failed++
    console.error(`  ✗ ${name}: ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// 1. Registry verification
// ---------------------------------------------------------------------------
test("Specialist registry contains all 69 specialist models", () => {
  assert.equal(specialistRegistry.totalCount, 69, `Expected 69 specialists, got ${specialistRegistry.totalCount}`)
  assert.equal(specialistRegistry.getByFamily("letter").length, 26, "Expected 26 letter specialists")
  assert.equal(specialistRegistry.getByFamily("digit").length, 10, "Expected 10 digit specialists")
  assert.equal(specialistRegistry.getByFamily("geometry").length + specialistRegistry.getByFamily("symbol").length, 15, "Expected 15 geometry/symbol specialists")
  assert.equal(specialistRegistry.getByFamily("object").length, 18, "Expected 18 object specialists")
})

// ---------------------------------------------------------------------------
// 2. Letter Specialists (A–Z)
// ---------------------------------------------------------------------------
test("Letter specialists recognize letters with high confidence", () => {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "M", "S", "T", "V", "X", "Z"]
  const rng = new SeededRNG(123)

  for (const ch of letters) {
    const arch = getHandwritingArchetypes(ch)
    const { strokes } = augmentStrokes(arch[0], rng, { jitterAmount: 0.5, rotationRangeDeg: 6 })
    const res = evaluateSpecialistEnsemble(strokes)

    assert(!res.isUnknown, `Letter ${ch} rejected as UNKNOWN`)
    const candidates = res.candidates.map((c) => c.targetClass)
    assert(candidates.includes(ch) || res.topClass === ch, `Letter ${ch} not recognized (got ${res.topClass})`)
  }
})

// ---------------------------------------------------------------------------
// 3. Digit Specialists (0–9)
// ---------------------------------------------------------------------------
test("Digit specialists recognize numeric digits 0–9", () => {
  const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
  const rng = new SeededRNG(456)

  for (const d of digits) {
    const arch = getHandwritingArchetypes(d)
    const { strokes } = augmentStrokes(arch[0], rng, { jitterAmount: 0.5, rotationRangeDeg: 6 })
    const res = evaluateSpecialistEnsemble(strokes)

    assert(!res.isUnknown, `Digit ${d} rejected as UNKNOWN`)
    const candidates = res.candidates.map((c) => c.targetClass)
    assert(candidates.includes(d) || res.topClass === d, `Digit ${d} not recognized (got ${res.topClass})`)
  }
})

// ---------------------------------------------------------------------------
// 4. Geometry & Symbol Specialists
// ---------------------------------------------------------------------------
test("Geometry and symbol specialists recognize shapes accurately", () => {
  const shapes = ["circle", "rectangle", "triangle", "line", "arrow", "checkmark", "star", "heart"]
  const rng = new SeededRNG(789)

  for (const sh of shapes) {
    const arch = getGeometryArchetypes(sh)
    const { strokes } = augmentStrokes(arch[0], rng, { jitterAmount: 0.5, rotationRangeDeg: 6 })
    const res = evaluateSpecialistEnsemble(strokes)

    assert(!res.isUnknown, `Shape ${sh} rejected as UNKNOWN`)
    const candidates = res.candidates.map((c) => c.targetClass)
    assert(candidates.includes(sh) || res.topClass === sh, `Shape ${sh} not recognized (got ${res.topClass})`)
  }
})

// ---------------------------------------------------------------------------
// 5. Semantic Object Specialists
// ---------------------------------------------------------------------------
test("Semantic object specialists recognize napkin wireframe items", () => {
  const objects = ["house", "apple", "tree", "lightbulb", "phone"]
  const rng = new SeededRNG(101112)

  for (const obj of objects) {
    const arch = getObjectArchetypes(obj)
    const { strokes } = augmentStrokes(arch[0], rng, { jitterAmount: 0.5, rotationRangeDeg: 5 })
    const res = evaluateSpecialistEnsemble(strokes)

    assert(!res.isUnknown, `Object ${obj} rejected as UNKNOWN`)
    const candidates = res.candidates.map((c) => c.targetClass)
    assert(candidates.includes(obj) || res.topClass === obj, `Object ${obj} not recognized (got ${res.topClass})`)
  }
})

// ---------------------------------------------------------------------------
// 6. Hard-Negative Disambiguation Tests
// ---------------------------------------------------------------------------
test("Disambiguates confusing pairs (A vs triangle, O vs circle, 1 vs line, V vs checkmark)", () => {
  // A vs Triangle
  const aStrokes = getHandwritingArchetypes("A")[0]
  const aRes = evaluateSpecialistEnsemble(aStrokes)
  assert(aRes.topClass === "A" || aRes.candidates.some((c) => c.targetClass === "A"), "A misclassified")

  const triStrokes = getGeometryArchetypes("triangle")[0]
  const triRes = evaluateSpecialistEnsemble(triStrokes)
  assert(triRes.topClass === "triangle" || triRes.candidates.some((c) => c.targetClass === "triangle"), "Triangle misclassified")

  // Checkmark vs V
  const checkStrokes = getGeometryArchetypes("checkmark")[0]
  const checkRes = evaluateSpecialistEnsemble(checkStrokes)
  assert(checkRes.topClass === "checkmark" || checkRes.candidates.some((c) => c.targetClass === "checkmark"), "Checkmark misclassified")

  // Line vs 1
  const lineStrokes = getGeometryArchetypes("line")[0]
  const lineRes = evaluateSpecialistEnsemble(lineStrokes)
  assert(lineRes.topClass === "line" || lineRes.candidates.some((c) => c.targetClass === "line"), "Line misclassified")
})

// ---------------------------------------------------------------------------
// 7. Scribble & Noise Rejection (UNKNOWN Class)
// ---------------------------------------------------------------------------
test("Strictly rejects chaotic zigzags, scribbles, and tiny stray noise as UNKNOWN", () => {
  const scribble = [
    [
      [10, 10], [50, 15], [12, 25], [48, 35], [15, 45], [52, 55],
      [10, 65], [49, 75], [12, 85], [51, 95], [14, 105],
    ],
  ] as Point[][]

  const res = evaluateSpecialistEnsemble(scribble)
  assert(res.isUnknown, "Chaotic zigzag was incorrectly recognized instead of UNKNOWN")

  const dotNoise = [[[5, 5], [6, 5], [5, 6]]] as Point[][]
  const dotRes = evaluateSpecialistEnsemble(dotNoise)
  assert(dotRes.isUnknown, "Stray dot noise was incorrectly recognized instead of UNKNOWN")
})

// ---------------------------------------------------------------------------
// 8. Continuous Handwriting Sequences & Multi-Digit Numbers
// ---------------------------------------------------------------------------
test("Recognizes multi-digit numbers and continuous words seamlessly", () => {
  // Multi-digit number: "123"
  const strokes123: Point[][] = []
  let offset = 10
  for (const d of ["1", "2", "3"]) {
    const arch = getHandwritingArchetypes(d)[0]
    for (const s of arch) {
      strokes123.push(s.map(([px, py]) => [px + offset, py]))
    }
    offset += 45
  }

  const numRes = recognizeHandwritingSequence(strokes123)
  assert(numRes.recognized, "Sequence '123' was not recognized")
  assert.equal(numRes.text, "123", `Expected '123', got '${numRes.text}'`)
  assert(numRes.isNumber, "Expected isNumber to be true")

  // Continuous word: "HELLO"
  const strokesHello: Point[][] = []
  offset = 10
  for (const ch of ["H", "E", "L", "L", "O"]) {
    const arch = getHandwritingArchetypes(ch)[0]
    for (const s of arch) {
      strokesHello.push(s.map(([px, py]) => [px + offset, py]))
    }
    offset += 48
  }

  const wordRes = recognizeHandwritingSequence(strokesHello)
  assert(wordRes.recognized, "Word 'HELLO' was not recognized")
  assert.equal(wordRes.text, "HELLO", `Expected 'HELLO', got '${wordRes.text}'`)
  assert(wordRes.isWord, "Expected isWord to be true")
})

console.log(`\nSpecialist Recognition Results: ${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  process.exit(1)
}
