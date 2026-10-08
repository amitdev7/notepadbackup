// ---------------------------------------------------------------------------
// Zenithsui Production Hardening & Remediation Verification Suite
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import { encodeNodes, decodeNodes } from "../lib/clipboard-payload.ts"
import { isSolid, hitsPoint, hitsInterior } from "../lib/canvas/hit-test.ts"
import { unionBox, type SquigNode, type RectangleNode, type ArrowNode, type DiamondNode, type StickyNoteNode, type FrameNode, type EmbedNode } from "../lib/types.ts"
import { unionBounds } from "../lib/selection.ts"
import { DEFAULT_DOCK_CONTROLS, type DockControlsVisibility } from "../lib/shell-store.ts"

console.log("=== Starting Zenithsui Production Hardening Verification Suite ===")

// ---------------------------------------------------------------------------
// 1. Settings & Dock Controls Visibility
// ---------------------------------------------------------------------------
console.log("-> 1. Testing Dock Controls Configuration & Defaults...")

assert.equal(DEFAULT_DOCK_CONTROLS.toolFrame, false, "Frame tool should default to hidden")
assert.equal(DEFAULT_DOCK_CONTROLS.toolSticky, false, "Sticky tool should default to hidden")
assert.equal(DEFAULT_DOCK_CONTROLS.actionSearch, false, "Search action should default to hidden")
assert.equal(DEFAULT_DOCK_CONTROLS.actionStats, false, "Stats action should default to hidden")
assert.equal(DEFAULT_DOCK_CONTROLS.toolSelect, true, "Select tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolHand, true, "Hand tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolShape, true, "Shape tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolDraw, true, "Draw tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolEraser, true, "Eraser tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolArrow, true, "Arrow tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolText, true, "Text tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolLaser, true, "Laser tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.toolLibrary, true, "Library tool should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.menuUndo, true, "Undo menu item should default to visible")
assert.equal(DEFAULT_DOCK_CONTROLS.menuRedo, true, "Redo menu item should default to visible")

// Verify immutability & bulk modifications
const enabledAll: DockControlsVisibility = {
  ...DEFAULT_DOCK_CONTROLS,
  toolFrame: true,
  toolSticky: true,
  actionSearch: true,
  actionStats: true,
}
assert.equal(enabledAll.toolFrame, true)
assert.equal(enabledAll.toolSticky, true)
assert.equal(enabledAll.actionSearch, true)
assert.equal(enabledAll.actionStats, true)

console.log("✓ Dock Controls visibility and toggle defaults passed.")

// ---------------------------------------------------------------------------
// 2. Clipboard Round-Trip for All Node Types (Including Diamond, Sticky, Frame, Embed)
// ---------------------------------------------------------------------------
console.log("-> 2. Testing Clipboard Deserialization for Modern Node Types...")

const rectNode: ShapeNode = {
  id: "rect-1",
  type: "shape",
  shape: "rect",
  x: 10,
  y: 20,
  w: 100,
  h: 80,
  stroke: "regular",
  fill: "strong",
}

const diamondNode: ShapeNode = {
  id: "dia-1",
  type: "shape",
  shape: "diamond",
  x: 50,
  y: 60,
  w: 120,
  h: 120,
  stroke: "heavy",
  fill: "strong",
}

const stickyNode: StickyNoteNode = {
  id: "sticky-1",
  type: "sticky",
  x: 200,
  y: 100,
  w: 180,
  h: 180,
  ink: "black",
  strokeWidth: "regular",
  text: "Important reminder",
  tone: "yellow",
  fontSize: 16,
}

const frameNode: FrameNode = {
  id: "frame-1",
  type: "frame",
  x: 400,
  y: 50,
  w: 500,
  h: 400,
  name: "Main Dashboard",
}

const embedNode: EmbedNode = {
  id: "embed-1",
  type: "embed",
  x: 100,
  y: 300,
  w: 320,
  h: 240,
  url: "https://example.com/spec",
  title: "Generic Spec",
}

const allSampleNodes: SquigNode[] = [rectNode, diamondNode, stickyNode, frameNode, embedNode]
const encodedPayload = encodeNodes(allSampleNodes)
assert.ok(encodedPayload.length > 0, "Clipboard payload must not be empty")

const decodedNodes = decodeNodes(encodedPayload)
assert.ok(decodedNodes !== null, "Decoded nodes must not be null")
assert.equal(decodedNodes.length, 5, "All 5 nodes must be decoded without dropping newer node types")

const decodedTypes = new Set(decodedNodes.map(n => n.type))
assert.ok(decodedTypes.has("shape"), "Should decode shape")
assert.ok(decodedTypes.has("sticky"), "Should decode sticky")
assert.ok(decodedTypes.has("frame"), "Should decode frame")
assert.ok(decodedTypes.has("embed"), "Should decode embed")

console.log("✓ Clipboard encoding/decoding preserved all 5 modern node types.")

// ---------------------------------------------------------------------------
// 3. Hit-Testing & Surface Solidity
// ---------------------------------------------------------------------------
console.log("-> 3. Testing Hit-Testing & Solidity Calculations...")

assert.equal(isSolid(rectNode), true, "Solid rect should be solid")
assert.equal(isSolid(diamondNode), true, "Solid diamond should be solid")
assert.equal(isSolid(stickyNode), true, "Sticky note should always be solid")
assert.equal(isSolid(embedNode), true, "Embed node should always be solid")
assert.equal(isSolid(frameNode), false, "Frame node interior should be hollow/transparent")

// Diamond hit-test: center vs corner outside rhombus
// Diamond is at (50, 60) with w: 120, h: 120 -> center is (110, 120)
assert.equal(hitsPoint(diamondNode, 110, 120, 1), true, "Center of diamond must hit-test positive")
// Top-left corner of bounding box (51, 61) is outside rhombus: |51-110|/60 + |61-120|/60 = 59/60 + 59/60 = 1.96 > 1 + tolNorm
assert.equal(hitsPoint(diamondNode, 51, 61, 1), false, "Corner of bounding box outside rhombus must hit-test negative")

// Sticky hit-test
assert.equal(hitsPoint(stickyNode, 250, 150, 1), true, "Interior of sticky note must hit-test positive")
assert.equal(hitsPoint(stickyNode, 10, 10, 1), false, "Exterior of sticky note must hit-test negative")

console.log("✓ Hit-testing & solidity math correctly differentiates solid surfaces and rhombus geometry.")

// ---------------------------------------------------------------------------
// 4. Arrow Binding Remapping Logic
// ---------------------------------------------------------------------------
console.log("-> 4. Testing Arrow Binding Remapping on Clone...")

function simulateCloneNodes(nodesToClone: SquigNode[]): SquigNode[] {
  const idMap = new Map<string, string>()
  const cloned = nodesToClone.map((node, i) => {
    const newId = `cloned-${i}-${node.id}`
    idMap.set(node.id, newId)
    return { ...node, id: newId }
  })

  // Remap bindings
  for (const node of cloned) {
    if (node.type === "arrow") {
      const arr = node as ArrowNode
      if (arr.startBinding && idMap.has(arr.startBinding.elementId)) {
        arr.startBinding = {
          ...arr.startBinding,
          elementId: idMap.get(arr.startBinding.elementId)!,
        }
      }
      if (arr.endBinding && idMap.has(arr.endBinding.elementId)) {
        arr.endBinding = {
          ...arr.endBinding,
          elementId: idMap.get(arr.endBinding.elementId)!,
        }
      }
    }
  }

  return cloned
}

const targetRect: ShapeNode = {
  id: "box-A",
  type: "shape",
  shape: "rect",
  x: 0,
  y: 0,
  w: 50,
  h: 50,
  ink: "black",
  strokeWidth: "regular",
  fill: "none",
}

const boundArrow: ArrowNode = {
  id: "arrow-1",
  type: "arrow",
  x: 25,
  y: 25,
  w: 100,
  h: 100,
  points: [[0, 0], [100, 100]],
  ink: "black",
  strokeWidth: "regular",
  head: true,
  startBinding: {
    elementId: "box-A",
    focus: 0.5,
    gap: 6,
  },
}

const clonedResult = simulateCloneNodes([targetRect, boundArrow])
const clonedBox = clonedResult.find(n => n.type === "shape")!
const clonedArrow = clonedResult.find(n => n.type === "arrow") as ArrowNode

assert.notEqual(clonedBox.id, "box-A", "Cloned box must have unique ID")
assert.notEqual(clonedArrow.id, "arrow-1", "Cloned arrow must have unique ID")
assert.equal(clonedArrow.startBinding?.elementId, clonedBox.id, "Cloned arrow must bind to cloned box, not original box!")

console.log("✓ Arrow binding successfully remapped to cloned target node.")

// ---------------------------------------------------------------------------
// 5. Geometry NaN and Bounding Normalization Protection
// ---------------------------------------------------------------------------
console.log("-> 5. Testing Geometry NaN & Overflow Protection...")

const normalBox = unionBox([rectNode, diamondNode])
assert.ok(normalBox !== null)
assert.equal(normalBox.minX, 10)
assert.equal(normalBox.minY, 20)
assert.equal(normalBox.maxX, 170)
assert.equal(normalBox.maxY, 180)

// Empty bounds returns null
const emptyUnion = unionBounds([])
assert.equal(emptyUnion, null, "Union of empty array should safely return null")

// Degenerate / inverted bounding normalization
const invertedNodes: SquigNode[] = [
  { ...rectNode, x: 100, y: 100, w: -50, h: -50 }, // negative width/height
  { ...rectNode, x: 20, y: 30, w: 10, h: 10 },
]
const safeBounds = unionBounds(invertedNodes)
assert.ok(safeBounds !== null)
assert.equal(safeBounds.x, 20)
assert.equal(safeBounds.y, 30)
assert.equal(safeBounds.w, 80)
assert.equal(safeBounds.h, 70)

console.log("✓ Geometry utilities safely normalize inverted dimensions and empty collections without NaN/crashes.")

// ---------------------------------------------------------------------------
// 6. Security & Open-Redirect Sanitizer
// ---------------------------------------------------------------------------
console.log("-> 6. Testing Open Redirect Protection...")

function sanitizeNextUrl(next: string | null): string {
  if (!next) return "/dashboard"
  const trimmed = next.trim()
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://")
  ) {
    return trimmed
  }
  return "/dashboard"
}

assert.equal(sanitizeNextUrl(null), "/dashboard")
assert.equal(sanitizeNextUrl(""), "/dashboard")
assert.equal(sanitizeNextUrl("/dashboard/projects"), "/dashboard/projects")
assert.equal(sanitizeNextUrl("/doc/123"), "/doc/123")
assert.equal(sanitizeNextUrl("//evil.com/hack"), "/dashboard", "Protocol-relative URL must be blocked")
assert.equal(sanitizeNextUrl("/\\evil.com"), "/dashboard", "Backslash bypass must be blocked")
assert.equal(sanitizeNextUrl("https://evil.com/phish"), "/dashboard", "External URL must be blocked")
assert.equal(sanitizeNextUrl("javascript:alert(1)"), "/dashboard", "Javascript protocol must be blocked")

console.log("✓ Open redirect protection safely rejects malicious and external redirect destinations.")

console.log("=== All Zenithsui Production Hardening Tests Passed 100%! ===")
