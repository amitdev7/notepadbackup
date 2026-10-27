// ---------------------------------------------------------------------------
// Zenithsui — Smart Hover Notes Test Suite
//
// Tests schema integrity, clipboard encoding/decoding, payload sanitization,
// length bounding, and node cloning for universal hover annotations.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import type { ShapeNode, ArrowNode, HoverNote } from "@/lib/types"
import { validateSecureNode } from "@/lib/security/sanitize"
import { validNode } from "@/lib/clipboard-payload"

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
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  points: [[0, 0], [100, 50]],
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

// Test 3: Clipboard validation and clamping
console.log("\n-> 3. Testing clipboard sanitization and length limits...")
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

// Test 4: Security sanitizer defensively handles non-object hover note
console.log("\n-> 4. Testing security sanitizer rejection of invalid hover note shapes...")
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

// Test 5: Disabled hover note preservation
console.log("\n-> 5. Testing disabled hover note toggle preservation...")
const disabledNote: HoverNote = {
  enabled: false,
  title: "Draft Note",
  body: "Under construction",
}
const shapeWithDisabledNote: ShapeNode = {
  ...shapeWithNote,
  id: "shape_2",
  hoverNote: disabledNote,
}
const sanitizedDisabled = validateSecureNode(shapeWithDisabledNote)
assert.equal(sanitizedDisabled?.hoverNote?.enabled, false, "Disabled flag must be preserved")
assert.equal(sanitizedDisabled?.hoverNote?.title, "Draft Note")
console.log("✓ Disabled hover notes remain persistent without losing text.")

console.log("\n============================================================")
console.log("ALL ZENITHSUI SMART HOVER NOTE TESTS PASSED 100%!")
console.log("============================================================")
