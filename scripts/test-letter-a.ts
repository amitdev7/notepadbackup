// ---------------------------------------------------------------------------
// Smart Sketch — Comprehensive Test Corpus for Letter "A"
// Tests recognition, stroke order invariance, handwriting variations,
// false-positive rejection, and editable TextNode lifecycle.
// ---------------------------------------------------------------------------

import { recognizeSketch } from "../lib/sketch-recognition/orchestrator.ts"
import { renderRecognizedNode } from "../lib/sketch-recognition/renderers.ts"
import { fitTextBox } from "../lib/canvas/text-reflow.ts"
import type { Point } from "../lib/sketch-recognition/types.ts"
import type { TextNode, SquigNode } from "../lib/types.ts"

let passed = 0
let failed = 0
const failureDetails: string[] = []

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${testName}`)
  } else {
    failed++
    const msg = `  ✗ ${testName}${detail ? `: ${detail}` : ""}`
    console.error(msg)
    failureDetails.push(msg)
  }
}

// ---------------------------------------------------------------------------
// Stroke Builders
// ---------------------------------------------------------------------------

function line(x1: number, y1: number, x2: number, y2: number, steps = 15): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
  }
  return pts
}

function computeBounds(strokes: Point[][]): { x: number; y: number; w: number; h: number } {
  const all = strokes.flat()
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    w: Math.max(maxX - minX, 1),
    h: Math.max(maxY - minY, 1),
  }
}

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------

async function runTests() {
  console.log("============================================================")
  console.log("   SMART SKETCH — LETTER 'A' RECOGNITION & LIFECYCLE SUITE   ")
  console.log("============================================================\n")

  // 1. Classic 3-Stroke A
  console.log("--- Category 1: Valid Letter A Variations ---")
  {
    // Left leg bottom-to-top, right leg top-to-bottom, crossbar left-to-right
    const strokes: Point[][] = [
      line(100, 200, 130, 100), // Left leg
      line(130, 100, 160, 200), // Right leg
      line(115, 155, 145, 155), // Crossbar
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "Classic 3-stroke A (up-down-bar)",
      `got recognized=${res.recognized}, kind=${res.kind}, text=${res.text}, conf=${res.confidence}`
    )
  }

  {
    // Left leg top-to-bottom, right leg top-to-bottom, crossbar
    const strokes: Point[][] = [
      line(130, 100, 100, 200),
      line(130, 100, 160, 200),
      line(115, 155, 145, 155),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "3-stroke A (apex-down-left, apex-down-right, crossbar)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Stroke order: Right leg, Left leg, Crossbar
    const strokes: Point[][] = [
      line(130, 100, 160, 200),
      line(100, 200, 130, 100),
      line(115, 155, 145, 155),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "3-stroke A drawn in reverse leg order",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // 2-stroke A: Inverted V (stroke 1), then crossbar (stroke 2)
    const invertedV = [...line(100, 200, 130, 100), ...line(130, 100, 160, 200)]
    const crossbar = line(115, 155, 145, 155)
    const strokes: Point[][] = [invertedV, crossbar]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "2-stroke A (continuous inverted V + crossbar)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // 2-stroke A: Left leg (stroke 1), then apex down right + crossbar back left (stroke 2)
    const leg1 = line(100, 200, 130, 100)
    const leg2AndBar = [...line(130, 100, 160, 200), ...line(160, 200, 115, 155)]
    const strokes: Point[][] = [leg1, leg2AndBar]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "2-stroke A (left leg + continuous right/crossbar)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // 1-stroke continuous A: Up to apex, down to right, loop back/across to left leg
    const stroke1: Point[] = [
      ...line(100, 200, 130, 100),
      ...line(130, 100, 160, 200),
      ...line(160, 200, 145, 155),
      ...line(145, 155, 115, 155),
    ]
    const strokes: Point[][] = [stroke1]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "1-stroke continuous A (single gesture up, down, cross)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Narrow A (aspect ratio ~ 0.45)
    const strokes: Point[][] = [
      line(100, 200, 118, 100),
      line(118, 100, 136, 200),
      line(109, 155, 127, 155),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "Narrow A (aspect ratio ~ 0.45)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Wide A (aspect ratio ~ 0.95)
    const strokes: Point[][] = [
      line(100, 200, 145, 100),
      line(145, 100, 190, 200),
      line(120, 155, 170, 155),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "Wide A (aspect ratio ~ 0.95)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Slanted A (tilted right by ~15 degrees)
    const strokes: Point[][] = [
      line(100, 200, 145, 100),
      line(145, 100, 175, 200),
      line(122, 155, 160, 155),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "Slanted A (tilted right)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Slightly open apex A (gap of 4px between top endpoints)
    const strokes: Point[][] = [
      line(100, 200, 128, 100),
      line(133, 100, 160, 200),
      line(116, 155, 146, 155),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "Slightly open apex A (small top gap)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Imperfect crossbar (slightly tilted, extending 3px past right leg)
    const strokes: Point[][] = [
      line(100, 200, 130, 100),
      line(130, 100, 160, 200),
      line(113, 158, 149, 152),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.recognized && (res.kind === "text" || res.text === "A") && (res.text === "A" || res.metadata?.text === "A"),
      "Imperfect crossbar (slightly tilted and overshooting)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  // 2. False Positives / Hard Negatives
  console.log("\n--- Category 2: False Positive Rejection ---")

  {
    // Closed Triangle in 1 stroke: must NOT be recognized as A!
    const tri1: Point[] = [
      ...line(100, 200, 130, 100),
      ...line(130, 100, 160, 200),
      ...line(160, 200, 100, 200),
    ]
    const b = computeBounds([tri1])
    const res = await recognizeSketch([tri1], b, false)
    assert(
      res.text !== "A" && (res.kind === "triangle" || res.kind !== "text"),
      "1-stroke closed triangle rejected as A (classified as triangle)",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Closed Triangle in 3 strokes: left, right, bottom base at y=200 (no mid crossbar!)
    const strokes: Point[][] = [
      line(100, 200, 130, 100),
      line(130, 100, 160, 200),
      line(100, 200, 160, 200),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.text !== "A" && (res.kind === "triangle" || res.kind !== "text"),
      "3-stroke closed triangle with bottom base rejected as A",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Inverted V / Caret / Lambda: 2 strokes, apex at top, NO crossbar!
    const strokes: Point[][] = [
      line(100, 200, 130, 100),
      line(130, 100, 160, 200),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.text !== "A",
      "Inverted V / Caret (no crossbar) rejected as A",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // V: apex at bottom, opening at top
    const strokes: Point[][] = [
      line(100, 100, 130, 200),
      line(130, 200, 160, 100),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.text !== "A",
      "V shape (apex down) rejected as A",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Letter H: two vertical legs and a crossbar
    const strokes: Point[][] = [
      line(100, 100, 100, 200),
      line(140, 100, 140, 200),
      line(100, 150, 140, 150),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.text !== "A",
      "Letter H (parallel vertical legs) rejected as A",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Digit 4: vertical right stem, angled left leg, horizontal bar
    const strokes: Point[][] = [
      [...line(130, 100, 100, 160), ...line(100, 160, 150, 160)],
      line(130, 100, 130, 200),
    ]
    const b = computeBounds(strokes)
    const res = await recognizeSketch(strokes, b, false)
    assert(
      res.text !== "A",
      "Digit 4 rejected as A",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  {
    // Random chaotic scribble
    const scribble: Point[] = [
      [10, 10], [50, 90], [15, 30], [80, 20], [30, 70], [90, 85], [10, 40], [70, 15]
    ]
    const b = computeBounds([scribble])
    const res = await recognizeSketch([scribble], b, false)
    assert(
      res.text !== "A",
      "Random scribble rejected as A",
      `got kind=${res.kind}, text=${res.text}`
    )
  }

  // 3. Editable TextNode Lifecycle & Production Readiness
  console.log("\n--- Category 3: Editable TextNode Lifecycle ---")

  {
    // Render recognized "A" into a TextNode
    const id = "test-node-a-1"
    const bounds = { x: 100, y: 150, w: 45, h: 60 }
    const style = { color: "#1e1e1e", stroke: "regular" as const, opacity: 1 }
    const metadata = { text: "A", fontSize: 42 }

    const node = renderRecognizedNode(id, "text", bounds, style, metadata) as TextNode
    assert(
      node.id === id && node.type === "text" && node.text === "A",
      "renderRecognizedNode produces a valid TextNode with text 'A'",
      `type=${node.type}, text=${node.text}`
    )
    assert(
      node.fontSize >= 16 && node.fontSize <= 64,
      "TextNode has appropriate fontSize scaled to drawn height",
      `fontSize=${node.fontSize}`
    )

    // Verify it is editable: user changes text from "A" to "Apple"
    const fitted = fitTextBox(node, "Apple")
    assert(
      fitted.text === "Apple" && (fitted.w || 0) > node.w,
      "TextNode can be edited and reflowed via fitTextBox",
      `fitted.w=${fitted.w}, node.w=${node.w}`
    )

    // Serialization / Deserialization check (Save / Load / Collab)
    const serialized = JSON.stringify(node)
    const deserialized = JSON.parse(serialized) as TextNode
    assert(
      deserialized.id === node.id &&
      deserialized.type === "text" &&
      deserialized.text === "A" &&
      deserialized.fontSize === node.fontSize,
      "TextNode round-trips correctly through JSON serialization (Save / Collab)",
      `deserialized=${JSON.stringify(deserialized)}`
    )
  }

  console.log("\n============================================================")
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log("============================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err)
  process.exit(1)
})
