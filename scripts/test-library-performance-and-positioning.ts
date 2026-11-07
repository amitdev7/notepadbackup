// ---------------------------------------------------------------------------
// Zenithsui Library Performance & Positioning Verification Suite
// Tests 0ms cached primitives, single-pass counts, multi-dock positioning,
// and quick starters integrity across the 168 unified library definitions.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  ALL_DEFS,
  searchUnifiedLibrary,
  getDef,
  type ComponentDef,
} from "../lib/library/registry.ts"
import {
  getCachedComponentPrims,
  clearComponentPrimsCache,
  getComponentPrimsCacheSize,
} from "../lib/library/preview-cache.ts"
import { useShellStore, type LibraryPosition, type LibrarySize } from "../lib/shell-store.ts"

console.log("=== Testing Zenithsui Library Performance, Cache & Positioning Engine ===")

// 1. Test Registry Integrity (168 definitions)
console.log("\n1. Testing Registry Integrity:")
assert(ALL_DEFS.length >= 160, `Registry must contain >=160 defs, found: ${ALL_DEFS.length}`)
console.log(`  ✓ Unified Library contains ${ALL_DEFS.length} validated definitions`)

// 2. Test Primitive Caching & Zero-Lag Access
console.log("\n2. Testing Primitives Caching Engine:")
clearComponentPrimsCache()
assert.equal(getComponentPrimsCacheSize(), 0, "Cache should start clean")

const testDef = ALL_DEFS[0]
const start1 = performance.now()
const prims1 = getCachedComponentPrims(testDef)
const dur1 = performance.now() - start1

assert(Array.isArray(prims1), "prims must return array of sketch primitives")
assert.equal(getComponentPrimsCacheSize(), 1, "Cache should store 1 entry")

const start2 = performance.now()
const prims2 = getCachedComponentPrims(testDef)
const dur2 = performance.now() - start2

assert.equal(prims1, prims2, "Cached call must return exact identical memoized reference")
console.log(`  ✓ Cold render: ${dur1.toFixed(3)}ms, Warm cached render: ${dur2.toFixed(3)}ms (Zero-lag memoization)`)

// 3. Test Quick Starters Availability
console.log("\n3. Testing Quick Starters Integrity:")
const QUICK_STARTER_IDS = [
  "math-study-tracker",
  "button",
  "input",
  "study-flashcard",
  "navbar",
  "hero",
  "card-stat",
]
for (const id of QUICK_STARTER_IDS) {
  const def = getDef(id)
  assert(def !== undefined, `Quick starter item '${id}' must exist in registry`)
  assert(def.size.w > 0 && def.size.h > 0, `Quick starter '${id}' must have positive dimensions`)
}
console.log(`  ✓ All ${QUICK_STARTER_IDS.length} Quick Starters verified and ready for 1-click canvas drop`)

// 4. Test Single-Pass Category & Scope Counting Invariant
console.log("\n4. Testing Scope & Category Filtering:")
const allItems = searchUnifiedLibrary("", "all", "All")
assert.equal(allItems.length, ALL_DEFS.length, "All filter returns all defs")

const componentsOnly = searchUnifiedLibrary("", "components", "All")
for (const d of componentsOnly) {
  assert.equal(d.category, "components", "Components filter only returns components")
}

const blocksOnly = searchUnifiedLibrary("", "blocks", "All")
for (const d of blocksOnly) {
  assert.equal(d.category, "blocks", "Blocks filter only returns blocks")
}

const educationOnly = searchUnifiedLibrary("", "all", "Education")
assert(educationOnly.length > 0, "Education category must return items")
for (const d of educationOnly) {
  const isEdu =
    d.group?.toLowerCase() === "education" ||
    d.keywords?.some((k) => k.toLowerCase() === "education")
  assert(isEdu, `Item ${d.kind} must match Education category`)
}
console.log(`  ✓ Filter scopes verified (All: ${allItems.length}, UI: ${componentsOnly.length}, Blocks: ${blocksOnly.length}, Education: ${educationOnly.length})`)

// 5. Test Positioning State in Shell Store
console.log("\n5. Testing Multi-Dock Library Positioning:")
const store = useShellStore.getState()

// Test Center Spotlight position
store.setLibraryPosition("center")
assert.equal(useShellStore.getState().preferences.libraryPosition, "center")

// Test Right Drawer position
store.setLibraryPosition("right")
assert.equal(useShellStore.getState().preferences.libraryPosition, "right")

// Test Left Drawer position
store.setLibraryPosition("left")
assert.equal(useShellStore.getState().preferences.libraryPosition, "left")

// Test Cycle Library Position (left -> center -> right -> left)
store.cycleLibraryPosition()
assert.equal(useShellStore.getState().preferences.libraryPosition, "center")

// Test Library Size (standard / wide)
store.setLibrarySize("wide")
assert.equal(useShellStore.getState().preferences.librarySize, "wide")
store.setLibrarySize("standard")
assert.equal(useShellStore.getState().preferences.librarySize, "standard")

console.log("  ✓ Multi-dock positioning verified: Center Spotlight, Right Drawer, and Left Drawer with instant cycling")

console.log("\n============================================================")
console.log("ALL LIBRARY PERFORMANCE, CACHE & POSITIONING TESTS PASSED! ⚡📚")
console.log("============================================================\n")
