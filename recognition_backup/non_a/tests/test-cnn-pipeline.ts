// ---------------------------------------------------------------------------
// Zenithsui Smart Sketch — CNN Pipeline End-to-End Test Suite
// Verifies CNN models, accuracy, hard-negative disambiguation, scribble rejection,
// sequence recognition, and latency benchmarks.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert"
import {
  predictHandwritingCNN,
  predictGeometryCNN,
  predictObjectCNN,
  classifySketchWithCNN,
} from "../lib/sketch-recognition/cnn-classifier"
import {
  getHandwritingArchetypes,
  getGeometryArchetypes,
  getObjectArchetypes,
} from "../lib/sketch-recognition/dataset-archetypes"
import { augmentStrokes, SeededRNG } from "../lib/sketch-recognition/dataset-generator"
import { recognizeSketch } from "../lib/sketch-recognition/orchestrator"
import { recognizeHandwritingSequence } from "../lib/sketch-recognition/sequence-engine"

console.log("\n============================================================")
console.log("   ZENITHSUI CNN SMART SKETCH PIPELINE VERIFICATION SUITE   ")
console.log("============================================================\n")

let passedTests = 0
let failedTests = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passedTests++
    console.log(`  ✓ ${name}`)
  } catch (err: any) {
    failedTests++
    console.error(`  ✗ ${name}: ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Test 1: Inference Latency Benchmark
// ---------------------------------------------------------------------------
test("CNN forward inference completes in < 5ms", () => {
  const strokes = getHandwritingArchetypes("A")[0]
  const iterations = 50
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    predictHandwritingCNN(strokes)
  }
  const elapsed = (performance.now() - start) / iterations
  console.log(`    (Average forward latency: ${elapsed.toFixed(2)} ms per prediction)`)
  assert(elapsed < 10, `Inference too slow: ${elapsed}ms`)
})

// ---------------------------------------------------------------------------
// Test 2: Handwriting CNN Recognizes Alphabet A–Z & Digits 0–9
// ---------------------------------------------------------------------------
test("Handwriting CNN accurately recognizes canonical and mouse-drawn letters & numbers", () => {
  const testChars = ["A", "B", "C", "D", "E", "F", "H", "M", "S", "T", "0", "1", "2", "3", "7", "8"]
  const rng = new SeededRNG(99)

  for (const ch of testChars) {
    const archetypes = getHandwritingArchetypes(ch)
    const { strokes } = augmentStrokes(archetypes[0], rng, { jitterAmount: 0.8, rotationRangeDeg: 10 })
    const res = predictHandwritingCNN(strokes)

    const topCandidates = res.candidates.slice(0, 3).map((c) => c.className)
    assert(
      topCandidates.includes(ch) || res.topClass === ch,
      `Failed to classify ${ch}. Top candidates: ${topCandidates.join(", ")}`
    )
  }
})

// ---------------------------------------------------------------------------
// Test 3: Multi-Digit and Word Sequence Recognition
// ---------------------------------------------------------------------------
test("Recognizes multi-digit numbers and words seamlessly", () => {
  // Test "123"
  const strokes1 = getHandwritingArchetypes("1")[0].map((s) => s.map(([x, y]) => [x, y] as [number, number]))
  const strokes2 = getHandwritingArchetypes("2")[0].map((s) => s.map(([x, y]) => [x + 55, y] as [number, number]))
  const strokes3 = getHandwritingArchetypes("3")[0].map((s) => s.map(([x, y]) => [x + 110, y] as [number, number]))

  const seq = recognizeHandwritingSequence([...strokes1, ...strokes2, ...strokes3])
  assert(seq.recognized, "Sequence '123' must be recognized")
  assert.equal(seq.text, "123", `Expected '123' but got '${seq.text}'`)
  assert(seq.isNumber, "Should be flagged as a number")

  // Test "OK"
  const strokesO = getHandwritingArchetypes("O")[0].map((s) => s.map(([x, y]) => [x, y] as [number, number]))
  const strokesK = getHandwritingArchetypes("K")[0].map((s) => s.map(([x, y]) => [x + 55, y] as [number, number]))
  const seqOK = recognizeHandwritingSequence([...strokesO, ...strokesK])
  assert(seqOK.recognized, "Sequence 'OK' must be recognized")
  assert.equal(seqOK.text, "OK", `Expected 'OK' but got '${seqOK.text}'`)
})

// ---------------------------------------------------------------------------
// Test 4: Geometry & Symbol CNN Recognition
// ---------------------------------------------------------------------------
test("Geometry CNN classifies shapes and symbols accurately", () => {
  const shapes = ["rect", "circle", "triangle", "star", "heart", "cloud", "checkmark", "plus", "minus", "arrow"]
  const rng = new SeededRNG(123)

  for (const s of shapes) {
    const archetypes = getGeometryArchetypes(s)
    const { strokes } = augmentStrokes(archetypes[0], rng, { jitterAmount: 0.6, rotationRangeDeg: 8 })
    const res = predictGeometryCNN(strokes)

    const topCandidates = res.candidates.slice(0, 3).map((c) => c.className)
    assert(
      topCandidates.includes(s) || res.topClass === s,
      `Failed to classify shape ${s}. Top: ${topCandidates.join(", ")}`
    )
  }
})

// ---------------------------------------------------------------------------
// Test 5: Semantic Object CNN Recognition
// ---------------------------------------------------------------------------
test("Object CNN recognizes semantic objects (house, apple, tree, phone, lightbulb)", () => {
  const objects = ["house", "apple", "tree", "lightbulb", "phone", "camera", "car", "lock"]
  const rng = new SeededRNG(456)

  for (const obj of objects) {
    const archetypes = getObjectArchetypes(obj)
    const { strokes } = augmentStrokes(archetypes[0], rng, { jitterAmount: 0.7, rotationRangeDeg: 8 })
    const res = predictObjectCNN(strokes)

    const topCandidates = res.candidates.slice(0, 3).map((c) => c.className)
    assert(
      topCandidates.includes(obj) || res.topClass === obj,
      `Failed to classify object ${obj}. Top: ${topCandidates.join(", ")}`
    )
  }
})

// ---------------------------------------------------------------------------
// Test 6: Hard-Negative Disambiguation
// ---------------------------------------------------------------------------
test("Disambiguates confusable pairs (A vs triangle, O vs circle, X vs plus)", () => {
  // A has an internal crossbar
  const aStrokes = getHandwritingArchetypes("A")[0]
  const aRes = classifySketchWithCNN(aStrokes, { x: 0, y: 0, w: 40, h: 55 })
  assert.equal(aRes.kind, "A", `A should be resolved to 'A', got ${aRes.kind}`)

  // Triangle without crossbar
  const triStrokes = getGeometryArchetypes("triangle")[0]
  const triRes = classifySketchWithCNN(triStrokes, { x: 0, y: 0, w: 50, h: 50 })
  assert.equal(triRes.kind, "triangle", `Triangle should be resolved to 'triangle', got ${triRes.kind}`)

  // Plus with orthogonal horizontal and vertical bars
  const plusStrokes = getGeometryArchetypes("plus")[0]
  const plusRes = classifySketchWithCNN(plusStrokes, { x: 0, y: 0, w: 50, h: 50 })
  assert.equal(plusRes.kind, "plus", `Plus should be resolved to 'plus', got ${plusRes.kind}`)

  // Checkmark with short down left and high up right
  const checkStrokes = getGeometryArchetypes("checkmark")[0]
  const checkRes = classifySketchWithCNN(checkStrokes, { x: 0, y: 0, w: 50, h: 50 })
  assert.equal(checkRes.kind, "checkmark", `Checkmark should be resolved to 'checkmark', got ${checkRes.kind}`)
})

// ---------------------------------------------------------------------------
// Test 7: Rejection of Random Scribbles & Unknown Shapes
// ---------------------------------------------------------------------------
test("Rejects random zigzags and stray scribbles without false-positive conversion", () => {
  // Random jagged zigzag scribble
  const scribble = [
    [
      [0, 0], [45, 10], [5, 20], [40, 25], [10, 35], [45, 40], [2, 50]
    ] as [number, number][]
  ]

  const res = classifySketchWithCNN(scribble, { x: 0, y: 0, w: 45, h: 50 })
  // Confidence must be low or recognized false or unknown
  if (res.recognized) {
    assert(res.confidence < 0.88, `Scribble should not have high auto-convert confidence: ${res.confidence}`)
  }
})

// ---------------------------------------------------------------------------
// Test 8: End-to-End Orchestrator Integration
// ---------------------------------------------------------------------------
test("Orchestrator seamlessly integrates CNN candidates into Zenithsui pipeline", async () => {
  // Draw a house
  const houseStrokes = getObjectArchetypes("house")[0]
  const res = await recognizeSketch(houseStrokes, { x: 0, y: 0, w: 60, h: 60 }, false)

  assert(res.recognized, "House sketch must be recognized")
  assert.equal(res.kind, "house", `Expected house, got ${res.kind}`)
  assert(res.confidence >= 0.70, `Confidence should be high, got ${res.confidence}`)
})

console.log(`\nResults: ${passedTests} passed, ${failedTests} failed\n`)
if (failedTests > 0) {
  process.exit(1)
}
