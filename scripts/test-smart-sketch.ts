// ---------------------------------------------------------------------------
// Smart Sketch Recognition Tests
// ---------------------------------------------------------------------------

import {
  resampleStroke,
  strokeArcLength,
  extractStrokeFeatures,
} from "../lib/sketch-recognition/preprocessing.ts"
import { recognizeGeometry } from "../lib/sketch-recognition/geometry-recognizer.ts"
import { renderRecognizedNode } from "../lib/sketch-recognition/renderers.ts"
import { SKETCH_REGISTRY } from "../lib/sketch-recognition/registry.ts"
import type { Point } from "../lib/sketch-recognition/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
}

// ---------------------------------------------------------------------------
// Stroke generators for testing
// ---------------------------------------------------------------------------

function makeCircle(cx: number, cy: number, r: number, steps = 36): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2
    pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)])
  }
  return pts
}

function makeRectangle(x: number, y: number, w: number, h: number): Point[] {
  const pts: Point[] = []
  const segs = 10
  // Top
  for (let i = 0; i < segs; i++) pts.push([x + (w * i) / segs, y])
  // Right
  for (let i = 0; i < segs; i++) pts.push([x + w, y + (h * i) / segs])
  // Bottom
  for (let i = 0; i < segs; i++) pts.push([x + w - (w * i) / segs, y + h])
  // Left
  for (let i = 0; i <= segs; i++) pts.push([x, y + h - (h * i) / segs])
  return pts
}

function makeTriangle(x: number, y: number, w: number, h: number): Point[] {
  const pts: Point[] = []
  const segs = 10
  // Bottom-left to top-center
  for (let i = 0; i < segs; i++) pts.push([x + (w / 2) * (i / segs), y + h - h * (i / segs)])
  // Top-center to bottom-right
  for (let i = 0; i < segs; i++) pts.push([x + w / 2 + (w / 2) * (i / segs), y + h * (i / segs)])
  // Bottom-right to bottom-left
  for (let i = 0; i <= segs; i++) pts.push([x + w - w * (i / segs), y + h])
  return pts
}

function makeStraightLine(x1: number, y1: number, x2: number, y2: number, steps = 20): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
  }
  return pts
}

function makeArrowWithHead(x1: number, y1: number, x2: number, y2: number): Point[] {
  const shaft = makeStraightLine(x1, y1, x2, y2, 20)
  // Arrowhead barb
  const b1: Point[] = [
    [x2 - 15, y2 - 10],
    [x2, y2],
    [x2 - 15, y2 + 10],
  ]
  return [...shaft, ...b1]
}

function makeCheckmark(x: number, y: number, w: number, h: number): Point[] {
  const p1 = makeStraightLine(x, y + h * 0.5, x + w * 0.35, y + h, 10)
  const p2 = makeStraightLine(x + w * 0.35, y + h, x + w, y, 15)
  return [...p1, ...p2]
}

function makePlus(x: number, y: number, w: number, h: number): Point[][] {
  const hLine = makeStraightLine(x, y + h / 2, x + w, y + h / 2, 10)
  const vLine = makeStraightLine(x + w / 2, y, x + w / 2, y + h, 10)
  return [hLine, vLine]
}

function makeCross(x: number, y: number, w: number, h: number): Point[][] {
  const d1 = makeStraightLine(x, y, x + w, y + h, 10)
  const d2 = makeStraightLine(x, y + h, x + w, y, 10)
  return [d1, d2]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log("Running Smart Sketch Recognition Tests...\n")

// 1. Geometry Utilities
{
  const line = makeStraightLine(0, 0, 100, 0, 10)
  const len = strokeArcLength(line)
  check("strokeArcLength straight line is ~100", Math.abs(len - 100) < 0.1, `got ${len}`)

  const resampled = resampleStroke(line, 32)
  check("resampleStroke produces requested count", resampled.length === 32, `got ${resampled.length}`)
  const resampledLen = strokeArcLength(resampled)
  check("resampled length preserves path length", Math.abs(resampledLen - 100) < 1, `got ${resampledLen}`)
}

// 2. Stroke Feature Extraction
{
  const circlePts = makeCircle(100, 100, 50)
  const circleFeats = extractStrokeFeatures([circlePts])
  check("circle closureRatio is small", circleFeats.closureRatio < 0.2, `got ${circleFeats.closureRatio}`)
  check("circle aspectRatio is near 1", Math.abs(circleFeats.aspectRatio - 1) < 0.15, `got ${circleFeats.aspectRatio}`)
  check("circle circularity is high", circleFeats.circularity > 0.8, `got ${circleFeats.circularity}`)

  const rectPts = makeRectangle(50, 50, 100, 60)
  const rectFeats = extractStrokeFeatures([rectPts])
  check("rectangle closureRatio is small", rectFeats.closureRatio < 0.2, `got ${rectFeats.closureRatio}`)
  check("rectangle cornerCount is around 4", rectFeats.cornerCount >= 3 && rectFeats.cornerCount <= 6, `got ${rectFeats.cornerCount}`)

  const straightLinePts = makeStraightLine(0, 0, 200, 0)
  const lineFeats = extractStrokeFeatures([straightLinePts])
  check("straight line closureRatio is high", lineFeats.closureRatio > 0.8, `got ${lineFeats.closureRatio}`)
  check("straight line straightness is near 1", lineFeats.straightness > 0.95, `got ${lineFeats.straightness}`)
}

// 3. Geometric Classification
{
  // Circle
  // Circle -> Ellipse
  const circle = makeCircle(200, 200, 60)
  const circleRes = recognizeGeometry([circle])
  check("Classifies circle as ellipse", circleRes.recognized && (circleRes.kind === "ellipse" || circleRes.kind === "circle"), `got ${circleRes.kind} (${circleRes.confidence})`)

  // Rectangle
  const rect = makeRectangle(100, 100, 160, 100)
  const rectRes = recognizeGeometry([rect])
  check("Classifies rectangle", rectRes.recognized && rectRes.kind === "rectangle", `got ${rectRes.kind} (${rectRes.confidence})`)

  // Straight line
  const line = makeStraightLine(100, 100, 300, 100)
  const lineRes = recognizeGeometry([line])
  check("Classifies line", lineRes.recognized && lineRes.kind === "line", `got ${lineRes.kind} (${lineRes.confidence})`)

  // Arrow
  const arrow = makeArrowWithHead(50, 100, 200, 100)
  const arrowRes = recognizeGeometry([arrow])
  check("Classifies arrow", arrowRes.recognized && arrowRes.kind === "arrow", `got ${arrowRes.kind} (${arrowRes.confidence})`)

  // Triangle -> Mandatory UNKNOWN
  const tri = makeTriangle(50, 50, 120, 100)
  const triRes = recognizeGeometry([tri])
  check("Rejects triangle as UNKNOWN", !triRes.recognized && triRes.activeShape === "UNKNOWN", `got ${triRes.activeShape}`)

  // Checkmark -> Mandatory UNKNOWN
  const checkmark = makeCheckmark(50, 50, 60, 50)
  const checkRes = recognizeGeometry([checkmark])
  check("Rejects checkmark as UNKNOWN", !checkRes.recognized && checkRes.activeShape === "UNKNOWN", `got ${checkRes.activeShape}`)

  // Plus -> Mandatory UNKNOWN
  const plusStrokes = makePlus(100, 100, 80, 80)
  const plusRes = recognizeGeometry(plusStrokes)
  check("Rejects plus as UNKNOWN", !plusRes.recognized && plusRes.activeShape === "UNKNOWN", `got ${plusRes.activeShape}`)

  // Cross / X -> Mandatory UNKNOWN
  const crossStrokes = makeCross(100, 100, 80, 80)
  const crossRes = recognizeGeometry(crossStrokes)
  check("Rejects cross as UNKNOWN", !crossRes.recognized && crossRes.activeShape === "UNKNOWN", `got ${crossRes.activeShape}`)
}

// 4. Registry & Renderers
{
  check("Registry strictly exposes four shapes", "ellipse" in SKETCH_REGISTRY && "rectangle" in SKETCH_REGISTRY && "line" in SKETCH_REGISTRY && "arrow" in SKETCH_REGISTRY)

  // Render Circle -> ShapeNode
  const circleNode = renderRecognizedNode("node_1", "circle", { x: 10, y: 20, w: 80, h: 80 })
  check("Circle renders to shape ellipse", circleNode.type === "shape" && (circleNode as any).shape === "ellipse")
  check("Circle preserves node ID and position", circleNode.id === "node_1" && circleNode.x === 10 && circleNode.y === 20)

  // Render Rectangle -> ShapeNode
  const rectNode = renderRecognizedNode("node_2", "rectangle", { x: 30, y: 40, w: 100, h: 60 })
  check("Rectangle renders to shape rect", rectNode.type === "shape" && (rectNode as any).shape === "rect")

  // Render Line -> ArrowNode with head: false
  const lineNode = renderRecognizedNode("node_line", "line", { x: 0, y: 0, w: 150, h: 50 }, undefined, {
    x1: 0,
    y1: 25,
    x2: 150,
    y2: 25,
  })
  check("Line renders to arrow type without head", lineNode.type === "arrow" && (lineNode as any).head === false)

  // Render Arrow -> ArrowNode with head: true
  const arrowNode = renderRecognizedNode("node_3", "arrow", { x: 0, y: 0, w: 150, h: 50 }, undefined, {
    direction: "right",
    startPoint: [0, 25],
    endPoint: [150, 25],
  })
  check("Arrow renders to arrow type with head", arrowNode.type === "arrow" && (arrowNode as any).head === true)
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Passed: ${passed}`)
if (failures.length > 0) {
  console.error(`Failures (${failures.length}):`)
  failures.forEach((f) => console.error(`  - ${f}`))
  process.exit(1)
} else {
  console.log("All Smart Sketch tests passed cleanly!\n")
}
