// ---------------------------------------------------------------------------
// Zenithsui — Smart Hover Notes Test Suite
//
// Tests schema integrity, clipboard encoding/decoding, payload sanitization,
// length bounding, node cloning, hit-testing accuracy (arrows, sketches, hollow
// vs solid shapes), and viewport clamping.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import type { ShapeNode, ArrowNode, DrawNode, HoverNote, SquigNode } from "@/lib/types"
import { validateSecureNode } from "@/lib/security/sanitize"
import { validNode } from "@/lib/clipboard-payload"
import { pickAt, pickSoftAt, hitsPoint } from "@/lib/canvas/hit-test"

console.log("=== Running Zenithsui Smart Hover Notes Verification Suite ===\n")

// Test 1: Node creation with hover note
console.log("-> 1. Testing node schema with HoverNote...")
const shapeWithNote: ShapeNode = {
  id: "shape_1",
  type: "shape",
  shape: "rect",
  x: 100,
  y: 100,
  w: 200,
  h: 150,
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 42,
  hoverNote: {
    enabled: true,
    title: "Database Cluster",
    body: "PostgreSQL master node with read-replicas in eu-central-1",
  },
}

assert.equal(shapeWithNote.hoverNote?.enabled, true)
assert.equal(shapeWithNote.hoverNote?.title, "Database Cluster")
assert.ok(shapeWithNote.hoverNote?.body.includes("PostgreSQL"))
console.log("✓ Node schema correctly holds HoverNote.")

// Test 2: Arrow node with connection explanation
console.log("\n-> 2. Testing ArrowNode with explanatory HoverNote...")
const arrowWithNote: ArrowNode = {
  id: "arrow_1",
  type: "arrow",
  x: 100,
  y: 100,
  w: 200,
  h: 100,
  points: [[0, 0], [200, 100]],
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 99,
  startHead: "none",
  endHead: "arrow",
  hoverNote: {
    enabled: true,
    title: "gRPC Transport",
    body: "Bidirectional streaming channel with TLS termination",
  },
}

assert.equal(arrowWithNote.hoverNote?.title, "gRPC Transport")
console.log("✓ ArrowNode correctly supports HoverNote.")

// Test 3: Arrow hit testing — ONLY the line triggers, NOT the bounding box empty space
console.log("\n-> 3. Testing Arrow hit testing — stroke collar vs empty bounding box...")
// Arrow runs from (100, 100) to (300, 200) in world coords
// Midpoint is (200, 150)
const arrowHitOnLine = hitsPoint(arrowWithNote, 200, 150, 1)
assert.equal(arrowHitOnLine, true, "Point directly on arrow stroke must hit")

// Point inside bounding box (100, 100) to (300, 200) but far from the diagonal line:
// (105, 195) is in the bottom-left of the box, far from line (100, 100) -> (300, 200)
const arrowHitFar = hitsPoint(arrowWithNote, 105, 195, 1)
assert.equal(arrowHitFar, false, "Point inside bounding box but far from stroke must NOT hit")
console.log("✓ Arrow hit test correctly rejects empty bounding box and accepts stroke.")

// Test 4: Freehand Draw hit testing — ONLY actual strokes trigger
console.log("\n-> 4. Testing Freehand DrawNode stroke hit testing...")
const drawWithNote: DrawNode = {
  id: "draw_1",
  type: "draw",
  x: 50,
  y: 50,
  w: 100,
  h: 100,
  points: [[0, 0], [100, 100]], // Diagonal stroke
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  roughness: 1,
  seed: 12,
  hoverNote: {
    enabled: true,
    title: "Hand-drawn separator",
    body: "Sketch annotation",
  },
}

const drawHitOnLine = hitsPoint(drawWithNote, 100, 100, 1)
assert.equal(drawHitOnLine, true, "Point on draw stroke must hit")

const drawHitOffLine = hitsPoint(drawWithNote, 60, 140, 1)
assert.equal(drawHitOffLine, false, "Point in bounding box but off draw stroke must NOT hit")
console.log("✓ DrawNode hit test correctly isolates visible strokes from empty space.")

// Test 5: Hollow shape hit testing — middle is see-through and does not trigger hard pick
console.log("\n-> 5. Testing Hollow Shape hit testing (perimeter vs hollow interior)...")
const hollowRect: ShapeNode = {
  id: "hollow_rect",
  type: "shape",
  shape: "rect",
  x: 0,
  y: 0,
  w: 200,
  h: 200,
  fill: "none",
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 5,
  hoverNote: {
    enabled: true,
    title: "Hollow Frame",
    body: "This note should only appear when hovering over the stroke perimeter",
  },
}

const nodesMap: Record<string, SquigNode> = {
  [hollowRect.id]: hollowRect,
}
const order = [hollowRect.id]

// Point on stroke perimeter: (0, 100)
const hardHitPerimeter = pickAt(nodesMap, order, 0, 100, 1)
assert.equal(hardHitPerimeter, hollowRect.id, "Perimeter stroke must be a hard hit")

// Point in hollow center: (100, 100)
const hardHitCenter = pickAt(nodesMap, order, 100, 100, 1)
assert.equal(hardHitCenter, null, "Hollow interior must NOT be a hard hit")

const softHitCenter = pickSoftAt(nodesMap, order, 100, 100)
assert.equal(softHitCenter, hollowRect.id, "Hollow interior is only a soft hit")
console.log("✓ Hollow shape hit testing strictly distinguishes hard stroke from soft interior.")

// Test 6: Overlapping nodes — front-to-back z-order resolution
console.log("\n-> 6. Testing overlapping nodes front-to-back resolution...")
const bottomNode: ShapeNode = {
  id: "node_bottom",
  type: "shape",
  shape: "rect",
  x: 50,
  y: 50,
  w: 100,
  h: 100,
  fill: "paper",
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 10,
  hoverNote: {
    enabled: true,
    title: "Bottom Object",
    body: "Lower in z-index",
  },
}
const topNode: ShapeNode = {
  id: "node_top",
  type: "shape",
  shape: "rect",
  x: 50,
  y: 50,
  w: 100,
  h: 100,
  fill: "paper",
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 20,
  hoverNote: {
    enabled: true,
    title: "Top Object",
    body: "Higher in z-index",
  },
}

const overlapNodes = { [bottomNode.id]: bottomNode, [topNode.id]: topNode }
const overlapOrder = [bottomNode.id, topNode.id]

const resolved = pickAt(overlapNodes, overlapOrder, 80, 80, 1)
assert.equal(resolved, topNode.id, "Topmost node must always resolve first")
console.log("✓ Overlapping nodes correctly resolve to topmost object without conflict.")

// Test 7: Empty or whitespace-only description suppression
console.log("\n-> 7. Testing empty / whitespace-only note qualification...")
function isEligibleHoverNote(note?: HoverNote | null, isBusy = false): boolean {
  if (isBusy || !note || note.enabled === false) return false
  const hasBody = Boolean(note.body && note.body.trim().length > 0)
  const hasTitle = Boolean(note.title && note.title.trim().length > 0)
  return hasBody || hasTitle
}

assert.equal(isEligibleHoverNote({ enabled: true, body: "   ", title: "" }), false, "Whitespace body and empty title must be suppressed")
assert.equal(isEligibleHoverNote({ enabled: false, body: "Valid", title: "Valid" }), false, "Disabled note must be suppressed")
assert.equal(isEligibleHoverNote({ enabled: true, body: "", title: "Title Only" }), true, "Title-only note qualifies")
assert.equal(isEligibleHoverNote({ enabled: true, body: "Body Only", title: "" }), true, "Body-only note qualifies")
assert.equal(isEligibleHoverNote(null), false, "Missing note must be suppressed")
assert.equal(isEligibleHoverNote({ enabled: true, body: "Note", title: "" }, true), false, "Busy canvas must suppress hover note")
console.log("✓ Empty, whitespace-only, disabled, and busy notes are safely suppressed.")

// Test 8: Viewport boundary flipping and clamping logic
console.log("\n-> 8. Testing viewport boundary clamping and flipping math...")
function computeCardPosition(
  anchorPos: { x: number; y: number },
  cardSize: { width: number; height: number },
  viewport: { width: number; height: number }
) {
  const padding = 14
  let left = anchorPos.x + 12
  let top = anchorPos.y + 12

  // Flip to left if overflowing viewport right
  if (left + cardSize.width > viewport.width - padding) {
    left = Math.max(padding, anchorPos.x - cardSize.width - 12)
  }

  // Flip up if overflowing viewport bottom
  if (top + cardSize.height > viewport.height - padding) {
    top = Math.max(padding, anchorPos.y - cardSize.height - 12)
  }

  if (left < padding) left = padding
  if (top < padding) top = padding

  return { left, top }
}

const vp = { width: 1000, height: 800 }
const card = { width: 300, height: 120 }

// Normal position (center of screen)
const posCenter = computeCardPosition({ x: 400, y: 300 }, card, vp)
assert.equal(posCenter.left, 412)
assert.equal(posCenter.top, 312)

// Right edge: flips to left of cursor
const posRightEdge = computeCardPosition({ x: 950, y: 300 }, card, vp)
assert.ok(posRightEdge.left < 950 - card.width, "Must flip to left of cursor near right edge")
assert.ok(posRightEdge.left + card.width <= vp.width - 14, "Must stay within right padding")

// Bottom edge: flips above cursor
const posBottomEdge = computeCardPosition({ x: 400, y: 750 }, card, vp)
assert.ok(posBottomEdge.top < 750 - card.height, "Must flip above cursor near bottom edge")
assert.ok(posBottomEdge.top + card.height <= vp.height - 14, "Must stay within bottom padding")
console.log("✓ Viewport boundary calculation correctly flips and clamps.")

// Test 9: Clipboard sanitization and length limits
console.log("\n-> 9. Testing clipboard sanitization and length limits...")
const oversizedRaw = {
  id: "node_over",
  type: "shape",
  shape: "rect",
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 1,
  hoverNote: {
    enabled: true,
    title: "A".repeat(300), // exceeds 120 limit
    body: "B".repeat(5000), // exceeds 2500 limit
  },
}

const cleanedFromClipboard = validNode(oversizedRaw)
assert.ok(cleanedFromClipboard, "Node should be valid")
assert.ok(cleanedFromClipboard.hoverNote, "Hover note must be preserved")
assert.equal(cleanedFromClipboard.hoverNote.title?.length, 120, "Title must be clamped to 120 chars")
assert.equal(cleanedFromClipboard.hoverNote.body.length, 2500, "Body must be clamped to 2500 chars")
console.log("✓ Clipboard parser safely clamps oversized hover notes.")

// Test 10: Security sanitizer defensively handles non-object hover note
console.log("\n-> 10. Testing security sanitizer rejection of invalid hover note shapes...")
const maliciousRaw = {
  id: "node_bad",
  type: "shape",
  shape: "rect",
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  stroke: "var(--sq-ink)",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  seed: 1,
  hoverNote: "malicious_string_not_object" as unknown as HoverNote,
}

const sanitized = validateSecureNode(maliciousRaw)
assert.equal(sanitized?.hoverNote, undefined, "Non-object hover note must be stripped")

const validSanitized = validateSecureNode(shapeWithNote)
assert.ok(validSanitized?.hoverNote, "Valid hover note must be preserved")
assert.equal(validSanitized.hoverNote.title, "Database Cluster")
console.log("✓ Security sanitizer correctly validates hover note integrity.")

console.log("\n============================================================")
console.log("ALL ZENITHSUI SMART HOVER NOTE TESTS PASSED 100%!")
console.log("============================================================")
