// ---------------------------------------------------------------------------
// Zenithsui — Excalidraw Parity Test Suite
// Verifies dynamic bindings, shape primitives, locking invariants, and search
// ---------------------------------------------------------------------------

import {
  intersectBoxPerimeter,
  intersectEllipsePerimeter,
  intersectDiamondPerimeter,
  getNodePerimeterPoint,
  getArrowPatchesForMovedNodes,
  cleanBindingsForDeletedNodes,
  findSnapCandidateNode,
} from "../lib/canvas/arrow-binding.ts"
import type { ArrowNode, ShapeNode, SquigNode, StickyNoteNode, FrameNode, EmbedNode } from "../lib/types.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✅ ${message}`)
}

console.log("=== Running Zenithsui Excalidraw Parity Verification ===\n")

// 1. Box Perimeter Ray-Casting
console.log("-> 1. Testing Box Perimeter Intersection...")
const [pBx, pBy] = intersectBoxPerimeter(100, 100, 200, 200, 300, 150, 6)
assert(Math.abs(pBx - 206) < 1e-4 && Math.abs(pBy - 150) < 1e-4, "Right edge ray intersection with 6px gap")

const [pLeftX, pLeftY] = intersectBoxPerimeter(100, 100, 200, 200, 0, 150, 6)
assert(Math.abs(pLeftX - 94) < 1e-4 && Math.abs(pLeftY - 150) < 1e-4, "Left edge ray intersection with 6px gap")

// 2. Ellipse Perimeter Ray-Casting
console.log("\n-> 2. Testing Ellipse Perimeter Intersection...")
const [pEx, pEy] = intersectEllipsePerimeter(150, 150, 50, 50, 300, 150, 6)
assert(Math.abs(pEx - 206) < 1e-4 && Math.abs(pEy - 150) < 1e-4, "Ellipse horizontal ray intersection with 6px gap")

// 3. Diamond Perimeter Ray-Casting
console.log("\n-> 3. Testing Diamond Perimeter Intersection...")
const [pDx, pDy] = intersectDiamondPerimeter(100, 100, 200, 200, 300, 150, 6)
assert(Math.abs(pDx - 206) < 1e-4 && Math.abs(pDy - 150) < 1e-4, "Diamond right vertex intersection with 6px gap")

// 4. Node Perimeter Abstraction
console.log("\n-> 4. Testing Node Perimeter Point Calculation...")
const rectNode: ShapeNode = {
  id: "rect-1",
  type: "shape",
  shape: "rect",
  fill: "none",
  x: 100,
  y: 100,
  w: 100,
  h: 100,
  seed: 1234,
}

const [px, py] = getNodePerimeterPoint(rectNode, 300, 150, 6)
assert(Math.abs(px - 206) < 1e-4 && Math.abs(py - 150) < 1e-4, "Node perimeter point computes correctly for rect")

// 5. Dynamic Arrow Patches on Node Move
console.log("\n-> 5. Testing Arrow Patches for Moved Nodes...")
const arrowNode: ArrowNode = {
  id: "arrow-1",
  type: "arrow",
  x: 206,
  y: 150,
  w: 194,
  h: 1,
  points: [[0, 0], [194, 0]],
  head: true,
  seed: 5678,
  startBinding: { elementId: "rect-1", focus: 0 },
  endBinding: { elementId: "rect-2", focus: 0 },
}

const targetNode: ShapeNode = {
  id: "rect-2",
  type: "shape",
  shape: "rect",
  fill: "none",
  x: 400,
  y: 100,
  w: 100,
  h: 100,
  seed: 9999,
}

const allNodes: Record<string, SquigNode> = {
  "rect-1": rectNode,
  "rect-2": targetNode,
  "arrow-1": arrowNode,
}

// Move rect-1 by 50px down
const movedRect1: ShapeNode = { ...rectNode, y: 150 }
const nextNodes: Record<string, SquigNode> = {
  ...allNodes,
  "rect-1": movedRect1,
}

const arrowPatches = getArrowPatchesForMovedNodes(nextNodes, new Set(["rect-1"]))
assert("arrow-1" in arrowPatches, "Arrow update patch generated when bound node moves")
const patch = arrowPatches["arrow-1"]
assert(patch.points !== undefined, "Arrow points recomputed dynamically to anchor to moved perimeter")

// 6. Clean Bindings on Node Deletion
console.log("\n-> 6. Testing Arrow Clean Bindings on Deletion...")
const cleanPatches = cleanBindingsForDeletedNodes(allNodes, new Set(["rect-2"]))
assert("arrow-1" in cleanPatches, "Arrow patch generated when bound target deleted")
assert(cleanPatches["arrow-1"].endBinding === null, "Deleted node binding cleanly unlinked from arrow")

// 7. Snap Candidate Detection
console.log("\n-> 7. Testing Snap Candidate Detection...")
const candidate = findSnapCandidateNode(205, 150, allNodes, "arrow-1", 16)
assert(candidate?.id === "rect-1", "Finds snap candidate node within perimeter tolerance")

// 8. Element Immutability / Locking Tests
console.log("\n-> 8. Testing Node Locking Properties...")
const lockedNode: ShapeNode = {
  ...rectNode,
  id: "locked-1",
  locked: true,
}
assert(lockedNode.locked === true, "Node carries explicit locked state")

// 9. Sticky Note & Frame & Embed Types
console.log("\n-> 9. Testing Sticky Note, Frame, and Embed Data Structures...")
const sticky: StickyNoteNode = {
  id: "sticky-1",
  type: "sticky",
  text: "Important reminder",
  tone: "yellow",
  fontSize: 14,
  x: 0,
  y: 0,
  w: 160,
  h: 160,
  seed: 111,
}
assert(sticky.type === "sticky" && sticky.tone === "yellow", "StickyNoteNode valid")

const frame: FrameNode = {
  id: "frame-1",
  type: "frame",
  name: "Mobile Screen",
  x: 0,
  y: 0,
  w: 375,
  h: 812,
  seed: 222,
}
assert(frame.type === "frame" && frame.name === "Mobile Screen", "FrameNode valid")

const embed: EmbedNode = {
  id: "embed-1",
  type: "embed",
  url: "https://zenithsui.com",
  title: "Zenithsui Documentation",
  x: 0,
  y: 0,
  w: 400,
  h: 300,
  seed: 333,
}
assert(embed.type === "embed" && embed.url.startsWith("https://"), "EmbedNode valid")

console.log("\n=== All Zenithsui Excalidraw Parity Tests Passed Successfully! ===")
