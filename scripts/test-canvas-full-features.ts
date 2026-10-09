// ---------------------------------------------------------------------------
// Zenithsui Excalidraw Full Integration & Feature Test Suite
// Tests all ported engines: conversion, charts, mermaid, libraries, laser, stats.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  isExcalidrawDocument,
  isExcalidrawClipboard,
  excalidrawToSquigNodes,
  squigNodesToExcalidraw,
  tryParseSpreadsheet,
  isMaybeSpreadsheet,
  renderBarChart,
  renderLineChart,
  renderRadarChart,
  isMaybeMermaidDefinition,
  parseMermaidToZenithsui,
  parseExcalidrawLibrary,
  LaserTrailEngine,
  computeCanvasStats,
} from "../lib/canvas-core/index.ts"
import type { ShapeNode, ArrowNode, TextNode, SquigNode } from "../lib/types.ts"

console.log("=== Running Zenithsui Excalidraw Full Integration Test Suite ===")

// 1. Excalidraw Document Detection & Conversion
console.log("\n-> 1. Testing Excalidraw Document Detection & Deserialization...")

const sampleExcalidrawDoc = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: [
    {
      id: "rect_1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 120,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "#a5d8ff",
      fillStyle: "hachure",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: ["grp_1"],
      frameId: null,
      roundness: { type: 3 },
      seed: 12345,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      link: null,
      locked: false,
    },
    {
      id: "diamond_1",
      type: "diamond",
      x: 350,
      y: 100,
      width: 140,
      height: 100,
      angle: 0,
      strokeColor: "#e03131",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 23456,
      version: 1,
      versionNonce: 2,
      isDeleted: false,
      boundElements: null,
      link: null,
      locked: true,
    },
    {
      id: "arrow_1",
      type: "arrow",
      x: 300,
      y: 160,
      width: 50,
      height: 0,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 34567,
      version: 1,
      versionNonce: 3,
      isDeleted: false,
      boundElements: null,
      link: null,
      locked: false,
      points: [[0, 0], [50, 0]],
      startBinding: { elementId: "rect_1", focus: 0, gap: 6 },
      endBinding: { elementId: "diamond_1", focus: 0, gap: 6 },
      endArrowhead: "arrow",
    },
    {
      id: "text_1",
      type: "text",
      x: 120,
      y: 130,
      width: 160,
      height: 30,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 45678,
      version: 1,
      versionNonce: 4,
      isDeleted: false,
      boundElements: null,
      link: "https://zenithsui.app",
      locked: false,
      text: "Hello Excalidraw Parity",
      fontSize: 18,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "top",
      baseline: 16,
      containerId: null,
      originalText: "Hello Excalidraw Parity",
    },
  ],
}

assert.equal(isExcalidrawDocument(sampleExcalidrawDoc), true, "Identified Excalidraw doc")
assert.equal(isExcalidrawClipboard({ type: "excalidraw/clipboard", elements: [] }), true, "Identified Excalidraw clipboard")

const { nodes, order } = excalidrawToSquigNodes(sampleExcalidrawDoc as any)
assert.equal(order.length, 4, "Converted 4 elements")

const rectNode = nodes["rect_1"] as ShapeNode
assert.equal(rectNode.type, "shape")
assert.equal(rectNode.shape, "rect")
assert.equal(rectNode.fill, "light")
assert.equal(rectNode.roundness, true)
assert.equal(rectNode.locked, false)
assert.deepEqual(rectNode.groupIds, ["grp_1"])

const diamondNode = nodes["diamond_1"] as ShapeNode
assert.equal(diamondNode.type, "shape")
assert.equal(diamondNode.shape, "diamond")
assert.equal(diamondNode.locked, true)

const arrowNode = nodes["arrow_1"] as ArrowNode
assert.equal(arrowNode.type, "arrow")
assert.equal(arrowNode.head, true)
assert.equal(arrowNode.startBinding?.elementId, "rect_1")
assert.equal(arrowNode.endBinding?.elementId, "diamond_1")

const textNode = nodes["text_1"] as TextNode
assert.equal(textNode.type, "text")
assert.equal(textNode.text, "Hello Excalidraw Parity")
assert.equal(textNode.align, "center")
assert.equal(textNode.link, "https://zenithsui.app")

console.log("✓ Excalidraw to Zenithsui deserialization verified.")

// 2. Bidirectional Serialization: Zenithsui to Excalidraw
console.log("\n-> 2. Testing Bidirectional Serialization (Zenithsui -> Excalidraw)...")
const exportedExcalDoc = squigNodesToExcalidraw(nodes, order, "my-test-drawing")
assert.equal(exportedExcalDoc.type, "excalidraw")
assert.equal(exportedExcalDoc.version, 2)
assert.equal(exportedExcalDoc.elements.length, 4)

const exportedRect = exportedExcalDoc.elements.find((e) => e.id === "rect_1")!
assert.equal(exportedRect.type, "rectangle")
assert.equal(exportedRect.x, 100)
assert.equal(exportedRect.width, 200)

const exportedArrow = exportedExcalDoc.elements.find((e) => e.id === "arrow_1") as any
assert.equal(exportedArrow.type, "arrow")
assert.equal(exportedArrow.startBinding?.elementId, "rect_1")
assert.equal(exportedArrow.endBinding?.elementId, "diamond_1")

console.log("✓ Zenithsui to Excalidraw serialization verified.")

// 3. Tabular Spreadsheet Parsing & Chart Generation
console.log("\n-> 3. Testing Spreadsheet Parser & Chart Engines...")

const sampleTsv = `Quarter\tRevenue\tExpenses
Q1\t100\t60
Q2\t150\t80
Q3\t220\t110
Q4\t300\t140`

assert.equal(isMaybeSpreadsheet(sampleTsv), true)
const parsedSheet = tryParseSpreadsheet(sampleTsv)
assert.equal(parsedSheet.ok, true)
if (parsedSheet.ok) {
  assert.equal(parsedSheet.data.series.length, 2)
  assert.equal(parsedSheet.data.series[0].title, "Revenue")
  assert.deepEqual(parsedSheet.data.series[0].values, [100, 150, 220, 300])
  assert.deepEqual(parsedSheet.data.labels, ["Q1", "Q2", "Q3", "Q4"])

  // Generate Bar Chart
  const barNodes = renderBarChart(parsedSheet.data, 200, 400)
  assert.ok(barNodes.length >= 8, `Bar chart generated ${barNodes.length} nodes`)
  const bars = barNodes.filter((n) => n.type === "shape" && (n as ShapeNode).shape === "rect")
  assert.equal(bars.length >= 8, true, "Generated 8 bars for 4 categories x 2 series")

  // Generate Line Chart
  const lineNodes = renderLineChart(parsedSheet.data, 200, 400)
  assert.ok(lineNodes.length >= 10, `Line chart generated ${lineNodes.length} nodes`)

  // Generate Radar Chart
  const radarNodes = renderRadarChart(parsedSheet.data, 300, 300)
  assert.ok(radarNodes.length >= 12, `Radar chart generated ${radarNodes.length} nodes`)
}

console.log("✓ Spreadsheet parser and Bar/Line/Radar chart engines verified.")

// 4. Mermaid Diagram Engine
console.log("\n-> 4. Testing Mermaid Diagram Conversion...")

const flowchartCode = `flowchart TD
  Client[Web Client] --> Gateway{API Gateway}
  Gateway -->|Auth| AuthService[Auth Service]
  Gateway -->|Doc| DocService[Doc Service]`

assert.equal(isMaybeMermaidDefinition(flowchartCode), true)
const mermaidResult = parseMermaidToZenithsui(flowchartCode, 100, 100)
assert.ok(mermaidResult.nodes.length >= 6, `Flowchart produced ${mermaidResult.nodes.length} nodes`)

const shapes = mermaidResult.nodes.filter((n) => n.type === "shape") as ShapeNode[]
assert.ok(shapes.some((s) => s.shape === "diamond"), "Contains diamond decision node")
assert.ok(shapes.some((s) => s.shape === "rect"), "Contains rectangle service nodes")

const arrows = mermaidResult.nodes.filter((n) => n.type === "arrow") as ArrowNode[]
assert.ok(arrows.length >= 3, "Contains connected arrows with bindings")
assert.ok(arrows.every((a) => a.startBinding && a.endBinding), "All arrows bound to nodes")

// Test Sequence Diagram
const seqCode = `sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice`

const seqResult = parseMermaidToZenithsui(seqCode, 100, 100)
assert.ok(seqResult.nodes.length >= 4, `Sequence diagram produced ${seqResult.nodes.length} nodes`)

console.log("✓ Mermaid diagram parsing and binding verified.")

// 5. Excalidraw Library (.excalidrawlib) Importer
console.log("\n-> 5. Testing Excalidraw Library (.excalidrawlib) Importer...")

const sampleLibJson = JSON.stringify({
  type: "excalidrawlib",
  version: 2,
  libraryItems: [
    {
      id: "asset_button",
      status: "published",
      name: "Glass Button",
      elements: [
        {
          id: "btn_bg",
          type: "rectangle",
          x: 500,
          y: 400,
          width: 120,
          height: 40,
          strokeColor: "#2563eb",
          backgroundColor: "#ffffff",
          fillStyle: "solid",
          strokeWidth: 2,
          isDeleted: false,
        },
      ],
    },
  ],
})

const libAssets = parseExcalidrawLibrary(sampleLibJson)
assert.equal(libAssets.length, 1, "Parsed 1 library item")
assert.equal(libAssets[0].name, "Glass Button")
assert.equal(libAssets[0].nodes[0].x, 0, "Coordinates normalized to origin 0")
assert.equal(libAssets[0].nodes[0].y, 0, "Coordinates normalized to origin 0")

console.log("✓ Excalidraw library parser verified.")

// 6. Laser Pointer Physics Engine
console.log("\n-> 6. Testing Laser Pointer Physics & Trail Decay...")

const laser = new LaserTrailEngine({ decayMs: 500, streamline: 0.5, size: 6 })
laser.addPoint(100, 100, 0.8)
laser.addPoint(150, 120, 0.7)
laser.addPoint(200, 150, 0.6)

const segmentsNow = laser.getSegments(Date.now())
assert.equal(segmentsNow.length, 2, "2 segments between 3 points")
assert.ok(segmentsNow[0].alpha > 0.5, "Alpha is high immediately after adding")
assert.ok(segmentsNow[0].width > 2, "Width is scaled by velocity/pressure")

// After decay duration
const segmentsExpired = laser.getSegments(Date.now() + 600)
assert.equal(segmentsExpired.length, 0, "Expired segments pruned correctly")

console.log("✓ Laser trail physics engine verified.")

// 7. Canvas Statistics Inspector
console.log("\n-> 7. Testing Canvas & Element Statistics Inspector...")

const stats = computeCanvasStats(nodes, order, ["rect_1", "diamond_1"])
assert.equal(stats.totalNodes, 4)
assert.equal(stats.selectedCount, 2)
assert.equal(stats.byType["shape"], 2)
assert.equal(stats.byType["arrow"], 1)
assert.equal(stats.byType["text"], 1)
assert.ok(stats.selectionBounds !== null)
assert.ok(stats.canvasBounds !== null)
assert.ok(stats.totalVertices > 0)

console.log("✓ Canvas statistics computation verified.")

console.log("\n============================================================")
console.log("ALL ZENITHSUI EXCALIDRAW FEATURE TESTS PASSED 100%!")
console.log("============================================================\n")
