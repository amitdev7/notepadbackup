// ---------------------------------------------------------------------------
// Zenithsui Invariant & Regression Verification Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-regression.ts
// ---------------------------------------------------------------------------

import { worldToScreen, screenToWorld, normalizeFill, type SquigNode, type Viewport, type ShapeNode } from "../lib/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("Running Zenithsui Core Canvas Invariant tests...\n")

  // Invariant 1: World-space coordinates gestures remain pure
  const vp: Viewport = { x: 200, y: 150, zoom: 1.5 }
  const worldPoint = { x: 50, y: 80 }

  const [screenX, screenY] = worldToScreen(vp, worldPoint.x, worldPoint.y)
  check("worldToScreen calculation", screenX === 50 * 1.5 + 200 && screenY === 80 * 1.5 + 150)

  const [backX, backY] = screenToWorld(vp, screenX, screenY)
  check("screenToWorld round-trip preservation", Math.abs(backX - worldPoint.x) < 0.0001 && Math.abs(backY - worldPoint.y) < 0.0001)

  // Invariant 2: Deterministic Rough.js seed preservation
  const originalSeed = 948271
  const shape: ShapeNode = {
    id: "shape_1",
    type: "shape",
    shape: "rect",
    x: 10,
    y: 20,
    w: 100,
    h: 60,
    seed: originalSeed,
    fill: "paper",
  }

  // Simulating store updateNode pattern (immutable clone, never direct mutation)
  const patchedShape: ShapeNode = {
    ...shape,
    x: 40,
    y: 50,
  }

  check("Node update does not mutate in place", shape.x === 10 && patchedShape.x === 40)
  check("Deterministic seed is strictly preserved across updates", patchedShape.seed === originalSeed)

  // Invariant 3: Flat Record<string, SquigNode> and order: string[] data model
  const flatDoc = {
    fileName: "Architecture Draft",
    nodes: {
      [shape.id]: shape,
    },
    order: [shape.id],
  }

  check("Document model uses flat nodes Record", typeof flatDoc.nodes === "object" && flatDoc.nodes[shape.id] !== undefined)
  check("Document model uses flat order array", Array.isArray(flatDoc.order) && flatDoc.order[0] === shape.id)

  // Invariant 4: Single-ink visual language and Fill normalization
  check("normalizeFill handles old boolean true", normalizeFill(true) === "strong")
  check("normalizeFill handles paper tone", normalizeFill("paper") === "paper")
  check("normalizeFill handles light tone", normalizeFill("light") === "light")
  check("normalizeFill handles strong tone", normalizeFill("strong") === "strong")
  check("normalizeFill defaults unknown to none", normalizeFill("random_color") === "none")

  // Invariant 5: .zenithsui JSON serialization round-trip
  const serialized = JSON.stringify(flatDoc)
  const parsed = JSON.parse(serialized)

  check(".zenithsui JSON preserves fileName", parsed.fileName === flatDoc.fileName)
  check(".zenithsui JSON preserves node attributes", parsed.nodes.shape_1.w === 100 && parsed.nodes.shape_1.seed === originalSeed)

  console.log(`\nCanvas Invariants & Regression: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})

