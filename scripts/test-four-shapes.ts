// ---------------------------------------------------------------------------
// Zenithsui — Four-Shape Recognition Test & Verification Suite
// Tests 100% accuracy on: ELLIPSE, RECTANGLE, LINE, ARROW
// Tests 0% false positives on: Hard Negative Suite (UNKNOWN)
// ---------------------------------------------------------------------------

import { recognizeGeometry } from "../lib/sketch-recognition/geometry-recognizer.ts"
import { recognizeSketch } from "../lib/sketch-recognition/orchestrator.ts"
import { renderRecognizedNode } from "../lib/sketch-recognition/renderers.ts"
import { SKETCH_REGISTRY, getSketchLabel } from "../lib/sketch-recognition/registry.ts"
import type { Point } from "../lib/sketch-recognition/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// ---------------------------------------------------------------------------
// Synthetic & Realistic Rough Stroke Generators
// ---------------------------------------------------------------------------

function addJitter(pts: Point[], amount = 2): Point[] {
  return pts.map(([x, y], idx) => {
    // Preserve endpoints
    if (idx === 0 || idx === pts.length - 1) return [x, y]
    const jx = (Math.sin(idx * 1.7) * amount)
    const jy = (Math.cos(idx * 2.3) * amount)
    return [Math.round(x + jx), Math.round(y + jy)]
  })
}

function makeEllipse(cx: number, cy: number, rx: number, ry: number, angle = 0, steps = 48): Point[] {
  const pts: Point[] = []
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2
    const u = rx * Math.cos(th)
    const v = ry * Math.sin(th)
    const x = cx + u * cosA - v * sinA
    const y = cy + u * sinA + v * cosA
    pts.push([Math.round(x), Math.round(y)])
  }
  return pts
}

function makeRectangle(x: number, y: number, w: number, h: number, stepsPerSide = 12): Point[] {
  const pts: Point[] = []
  // Top
  for (let i = 0; i < stepsPerSide; i++) pts.push([Math.round(x + (w * i) / stepsPerSide), y])
  // Right
  for (let i = 0; i < stepsPerSide; i++) pts.push([x + w, Math.round(y + (h * i) / stepsPerSide)])
  // Bottom
  for (let i = 0; i < stepsPerSide; i++) pts.push([Math.round(x + w - (w * i) / stepsPerSide), y + h])
  // Left & close
  for (let i = 0; i <= stepsPerSide; i++) pts.push([x, Math.round(y + h - (h * i) / stepsPerSide)])
  return pts
}

function makeRotatedRectangle(cx: number, cy: number, w: number, h: number, angle = 0.3): Point[] {
  const halfW = w / 2
  const halfH = h / 2
  const corners: Point[] = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
    [-halfW, -halfH],
  ]
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const pts: Point[] = []
  for (let c = 0; c < 4; c++) {
    const [x1, y1] = corners[c]
    const [x2, y2] = corners[c + 1]
    for (let i = 0; i < 10; i++) {
      const t = i / 10
      const lx = x1 + (x2 - x1) * t
      const ly = y1 + (y2 - y1) * t
      pts.push([Math.round(cx + lx * cosA - ly * sinA), Math.round(cy + lx * sinA + ly * cosA)])
    }
  }
  pts.push([Math.round(cx + corners[0][0] * cosA - corners[0][1] * sinA), Math.round(cy + corners[0][0] * sinA + corners[0][1] * cosA)])
  return pts
}

function makeLine(x1: number, y1: number, x2: number, y2: number, steps = 24): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t)])
  }
  return pts
}

function makeMultiStrokeArrow(x1: number, y1: number, x2: number, y2: number): Point[][] {
  const shaft = makeLine(x1, y1, x2, y2, 20)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  // Perpendicular
  const px = -uy
  const py = ux
  const headLen = Math.min(25, len * 0.3)
  const headWidth = headLen * 0.7

  // Arrowhead 'V' stroke
  const headStroke: Point[] = [
    [Math.round(x2 - ux * headLen + px * headWidth), Math.round(y2 - uy * headLen + py * headWidth)],
    [x2, y2],
    [Math.round(x2 - ux * headLen - px * headWidth), Math.round(y2 - uy * headLen - py * headWidth)],
  ]
  return [shaft, headStroke]
}

function makeSingleStrokeArrow(x1: number, y1: number, x2: number, y2: number): Point[] {
  const shaft = makeLine(x1, y1, x2, y2, 20)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const headLen = Math.min(22, len * 0.28)
  const headWidth = headLen * 0.65

  // Continues from tip into barb
  const barb: Point[] = [
    [x2, y2],
    [Math.round(x2 - ux * headLen + (-uy) * headWidth), Math.round(y2 - uy * headLen + ux * headWidth)],
  ]
  return [...shaft, ...barb]
}

// ---------------------------------------------------------------------------
// Main Verification Runner
// ---------------------------------------------------------------------------

async function runTests() {
  console.log("\n=======================================================")
  console.log("  Zenithsui Four-Shape Recognition Test Suite")
  console.log("=======================================================\n")

  // --- SECTION 1: ELLIPSE RECOGNITION (Phase 4) ---
  console.log("--- 1. Testing ELLIPSE Recognition ---")
  {
    // Circle
    const circle = addJitter(makeEllipse(200, 200, 60, 60), 2)
    const res1 = recognizeGeometry([circle])
    check("Rough Circle recognized as ELLIPSE", res1.recognized && res1.activeShape === "ELLIPSE", `got ${res1.activeShape}`)

    // Horizontal Oval
    const hOval = addJitter(makeEllipse(300, 150, 90, 45), 2.5)
    const res2 = recognizeGeometry([hOval])
    check("Horizontal Oval recognized as ELLIPSE", res2.recognized && res2.activeShape === "ELLIPSE", `got ${res2.activeShape}`)

    // Vertical Oval
    const vOval = addJitter(makeEllipse(150, 300, 40, 85), 2)
    const res3 = recognizeGeometry([vOval])
    check("Vertical Oval recognized as ELLIPSE", res3.recognized && res3.activeShape === "ELLIPSE", `got ${res3.activeShape}`)

    // Rotated Ellipse (45 deg)
    const rotOval = addJitter(makeEllipse(250, 250, 80, 40, Math.PI / 4), 2)
    const res4 = recognizeGeometry([rotOval])
    check("Rotated Ellipse recognized as ELLIPSE", res4.recognized && res4.activeShape === "ELLIPSE", `got ${res4.activeShape}`)
  }

  // --- SECTION 2: RECTANGLE RECOGNITION (Phase 5) ---
  console.log("\n--- 2. Testing RECTANGLE Recognition ---")
  {
    // Axis-aligned Rectangle
    const rect = addJitter(makeRectangle(100, 100, 160, 100), 2)
    const res1 = recognizeGeometry([rect])
    check("Rough Rectangle recognized as RECTANGLE", res1.recognized && res1.activeShape === "RECTANGLE", `got ${res1.activeShape}`)

    // Square
    const square = addJitter(makeRectangle(200, 200, 90, 90), 2)
    const res2 = recognizeGeometry([square])
    check("Square recognized as RECTANGLE", res2.recognized && res2.activeShape === "RECTANGLE", `got ${res2.activeShape}`)

    // Wide Box
    const wide = addJitter(makeRectangle(50, 50, 240, 60), 1.8)
    const res3 = recognizeGeometry([wide])
    check("Wide Box recognized as RECTANGLE", res3.recognized && res3.activeShape === "RECTANGLE", `got ${res3.activeShape}`)

    // Rotated Box
    const rotRect = addJitter(makeRotatedRectangle(200, 200, 120, 80, 0.35), 2)
    const res4 = recognizeGeometry([rotRect])
    check("Rotated Box recognized as RECTANGLE", res4.recognized && res4.activeShape === "RECTANGLE", `got ${res4.activeShape}`)

    // 4-Stroke Box
    const s1 = makeLine(50, 50, 150, 50)
    const s2 = makeLine(150, 50, 150, 120)
    const s3 = makeLine(150, 120, 50, 120)
    const s4 = makeLine(50, 120, 50, 50)
    const res5 = recognizeGeometry([s1, s2, s3, s4])
    check("4-stroke Box recognized as RECTANGLE", res5.recognized && res5.activeShape === "RECTANGLE", `got ${res5.activeShape}`)
  }

  // --- SECTION 3: LINE RECOGNITION (Phase 6) ---
  console.log("\n--- 3. Testing LINE Recognition ---")
  {
    // Horizontal Line
    const hLine = addJitter(makeLine(50, 100, 250, 100), 1.5)
    const res1 = recognizeGeometry([hLine])
    check("Horizontal Line recognized as LINE", res1.recognized && res1.activeShape === "LINE", `got ${res1.activeShape}`)

    // Vertical Line
    const vLine = addJitter(makeLine(100, 50, 100, 220), 1.5)
    const res2 = recognizeGeometry([vLine])
    check("Vertical Line recognized as LINE", res2.recognized && res2.activeShape === "LINE", `got ${res2.activeShape}`)

    // Diagonal Line
    const dLine = addJitter(makeLine(40, 40, 180, 190), 1.5)
    const res3 = recognizeGeometry([dLine])
    check("Diagonal Line recognized as LINE", res3.recognized && res3.activeShape === "LINE", `got ${res3.activeShape}`)
  }

  // --- SECTION 4: ARROW RECOGNITION (Phase 7) ---
  console.log("\n--- 4. Testing ARROW Recognition ---")
  {
    // Multi-stroke right arrow
    const rightArrow = makeMultiStrokeArrow(50, 100, 220, 100)
    const res1 = recognizeGeometry(rightArrow)
    check("Multi-stroke Right Arrow recognized as ARROW", res1.recognized && res1.activeShape === "ARROW", `got ${res1.activeShape}`)

    // Multi-stroke left arrow
    const leftArrow = makeMultiStrokeArrow(220, 100, 50, 100)
    const res2 = recognizeGeometry(leftArrow)
    check("Multi-stroke Left Arrow recognized as ARROW", res2.recognized && res2.activeShape === "ARROW", `got ${res2.activeShape}`)

    // Multi-stroke down arrow
    const downArrow = makeMultiStrokeArrow(100, 50, 100, 220)
    const res3 = recognizeGeometry(downArrow)
    check("Multi-stroke Down Arrow recognized as ARROW", res3.recognized && res3.activeShape === "ARROW", `got ${res3.activeShape}`)

    // Single-stroke arrow
    const singleArrow = makeSingleStrokeArrow(50, 50, 200, 120)
    const res4 = recognizeGeometry([singleArrow])
    check("Single-stroke Arrow recognized as ARROW", res4.recognized && res4.activeShape === "ARROW", `got ${res4.activeShape}`)
  }

  // --- SECTION 5: HARD NEGATIVE SUITE (Phase 13 & 14) ---
  console.log("\n--- 5. Testing HARD NEGATIVE SUITE (Mandatory UNKNOWN) ---")
  {
    // 1. Triangle
    const triPts: Point[] = [
      [50, 150], [100, 50], [150, 150], [50, 150]
    ]
    const resTri = recognizeGeometry([triPts])
    check("Triangle is rejected as UNKNOWN", !resTri.recognized && resTri.activeShape === "UNKNOWN", `got ${resTri.activeShape}`)

    // 2. Checkmark
    const checkPts: Point[] = [
      [50, 70], [70, 100], [120, 40]
    ]
    const resCheck = recognizeGeometry([checkPts])
    check("Checkmark is rejected as UNKNOWN", !resCheck.recognized && resCheck.activeShape === "UNKNOWN", `got ${resCheck.activeShape}`)

    // 3. X / Cross (2 diagonal intersecting strokes)
    const d1 = makeLine(50, 50, 150, 150)
    const d2 = makeLine(50, 150, 150, 50)
    const resX = recognizeGeometry([d1, d2])
    check("Cross / X is rejected as UNKNOWN", !resX.recognized && resX.activeShape === "UNKNOWN", `got ${resX.activeShape}`)

    // 4. Plus (+) (2 perpendicular intersecting strokes)
    const p1 = makeLine(50, 100, 150, 100)
    const p2 = makeLine(100, 50, 100, 150)
    const resPlus = recognizeGeometry([p1, p2])
    check("Plus is rejected as UNKNOWN", !resPlus.recognized && resPlus.activeShape === "UNKNOWN", `got ${resPlus.activeShape}`)

    // 5. Random Scribble (zigzag back and forth)
    const scribble: Point[] = []
    for (let i = 0; i < 40; i++) {
      scribble.push([100 + (i % 2 === 0 ? 50 : -50), 50 + i * 3])
    }
    const resScribble = recognizeGeometry([scribble])
    check("Scribble is rejected as UNKNOWN", !resScribble.recognized && resScribble.activeShape === "UNKNOWN", `got ${resScribble.activeShape}`)

    // 6. Incomplete / Open Rectangle (U-shape)
    const uShape = [
      ...makeLine(50, 50, 50, 150),
      ...makeLine(50, 150, 150, 150),
      ...makeLine(150, 150, 150, 50)
    ]
    const resU = recognizeGeometry([uShape])
    check("Open U-shape is rejected as UNKNOWN", !resU.recognized && resU.activeShape === "UNKNOWN", `got ${resU.activeShape}`)

    // 7. Micro noise / tiny click
    const microDot: Point[] = [[10, 10], [11, 10], [10, 11]]
    const resDot = recognizeGeometry([microDot])
    check("Micro dot click is rejected as UNKNOWN", !resDot.recognized && resDot.activeShape === "UNKNOWN", `got ${resDot.activeShape}`)

    // 8. Partial Ellipse / C-shape arc (only 180 degrees)
    const arc: Point[] = []
    for (let i = 0; i <= 20; i++) {
      const th = (i / 20) * Math.PI
      arc.push([100 + 50 * Math.cos(th), 100 + 50 * Math.sin(th)])
    }
    const resArc = recognizeGeometry([arc])
    check("Half-arc (C-shape) is rejected as UNKNOWN", !resArc.recognized && resArc.activeShape === "UNKNOWN", `got ${resArc.activeShape}`)
  }

  // --- SECTION 6: NATIVE ZENITHSUI NODE CONVERSION (Phase 15) ---
  console.log("\n--- 6. Testing Native Node Conversion ---")
  {
    // Ellipse -> ShapeNode with shape: "ellipse"
    const elNode = renderRecognizedNode("n1", "ellipse", { x: 10, y: 20, w: 80, h: 60 })
    check("ELLIPSE converts to ShapeNode ellipse", elNode.type === "shape" && (elNode as any).shape === "ellipse")

    // Rectangle -> ShapeNode with shape: "rect"
    const rectNode = renderRecognizedNode("n2", "rectangle", { x: 15, y: 25, w: 100, h: 70 })
    check("RECTANGLE converts to ShapeNode rect", rectNode.type === "shape" && (rectNode as any).shape === "rect")

    // Line -> ArrowNode with head: false
    const lineNode = renderRecognizedNode("n3", "line", { x: 0, y: 0, w: 100, h: 50 }, {}, { x1: 0, y1: 0, x2: 100, y2: 50 })
    check("LINE converts to ArrowNode with head: false", lineNode.type === "arrow" && (lineNode as any).head === false)

    // Arrow -> ArrowNode with head: true
    const arrowNode = renderRecognizedNode("n4", "arrow", { x: 0, y: 0, w: 120, h: 40 }, {}, { x1: 0, y1: 20, x2: 120, y2: 20 })
    check("ARROW converts to ArrowNode with head: true", arrowNode.type === "arrow" && (arrowNode as any).head === true)
  }

  // --- SECTION 7: REGISTRY AND LABELS (Phase 2) ---
  console.log("\n--- 7. Testing Registry & Labels ---")
  {
    check("Registry supports ellipse", "ellipse" in SKETCH_REGISTRY)
    check("Registry supports rectangle", "rectangle" in SKETCH_REGISTRY)
    check("Registry supports line", "line" in SKETCH_REGISTRY)
    check("Registry supports arrow", "arrow" in SKETCH_REGISTRY)
    check("Label for ellipse is 'Ellipse'", getSketchLabel("ellipse") === "Ellipse")
    check("Label for rectangle is 'Rectangle'", getSketchLabel("rectangle") === "Rectangle")
    check("Label for line is 'Line'", getSketchLabel("line") === "Line")
    check("Label for arrow is 'Arrow'", getSketchLabel("arrow") === "Arrow")
  }

  // --- SECTION 8: ORCHESTRATOR END-TO-END VERIFICATION ---
  console.log("\n--- 8. Testing Orchestrator recognizeSketch ---")
  {
    const circle = makeEllipse(100, 100, 40, 40)
    const orchRes = await recognizeSketch([circle], { x: 60, y: 60, w: 80, h: 80 })
    check("Orchestrator recognizes circle as ELLIPSE", orchRes.recognized && orchRes.activeShape === "ELLIPSE")

    const rect = makeRectangle(20, 20, 80, 50)
    const orchRect = await recognizeSketch([rect], { x: 20, y: 20, w: 80, h: 50 })
    check("Orchestrator recognizes box as RECTANGLE", orchRect.recognized && orchRect.activeShape === "RECTANGLE")

    const line = makeLine(10, 10, 100, 10)
    const orchLine = await recognizeSketch([line], { x: 10, y: 10, w: 90, h: 1 })
    check("Orchestrator recognizes stroke as LINE", orchLine.recognized && orchLine.activeShape === "LINE")

    const arrow = makeMultiStrokeArrow(10, 10, 120, 10)
    const orchArrow = await recognizeSketch(arrow, { x: 10, y: 0, w: 110, h: 20 })
    check("Orchestrator recognizes multi-stroke as ARROW", orchArrow.recognized && orchArrow.activeShape === "ARROW")

    const scribble: Point[] = [[0, 0], [10, 20], [0, 40], [10, 60], [0, 80]]
    const orchUnknown = await recognizeSketch([scribble], { x: 0, y: 0, w: 10, h: 80 })
    check("Orchestrator rejects scribble as UNKNOWN", !orchUnknown.recognized && orchUnknown.activeShape === "UNKNOWN")
  }

  // --- SECTION 9: PERFORMANCE & LATENCY BENCHMARK (Phase 11) ---
  console.log("\n--- 9. Benchmarking Recognition Latency ---")
  {
    const sample = makeRectangle(100, 100, 120, 80)
    const t0 = performance.now()
    const iterations = 500
    for (let i = 0; i < iterations; i++) {
      recognizeGeometry([sample])
    }
    const t1 = performance.now()
    const totalMs = t1 - t0
    const avgMs = totalMs / iterations
    console.log(`  Executed ${iterations} recognition cycles in ${totalMs.toFixed(2)}ms (avg: ${avgMs.toFixed(3)}ms per cycle)`)
    check("Average latency is strictly < 2ms", avgMs < 2.0, `${avgMs.toFixed(3)}ms`)
  }

  // --- FINAL REPORT ---
  console.log("\n=======================================================")
  console.log(`  TEST RESULTS: ${passed} passed, ${failures.length} failed`)
  console.log("=======================================================\n")

  if (failures.length > 0) {
    console.error("FAILURES:")
    for (const f of failures) {
      console.error(`  - ${f}`)
    }
    process.exit(1)
  } else {
    console.log("ALL FOUR-SHAPE RECOGNITION TESTS PASSED WITH 100% ACCURACY!\n")
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err)
  process.exit(1)
})
