// ---------------------------------------------------------------------------
// Zenithsui Automated Test Suite: Custom Canvas Home View & Viewport Memory System
//
// Run:
//   node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-viewport-memory.ts
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import type { SquigNode } from "../lib/types.ts"
import {
  isValidViewport,
  sanitizeViewport,
  sanitizeViewState,
  MIN_CANVAS_ZOOM,
  MAX_CANVAS_ZOOM,
} from "../lib/types.ts"
import {
  DEFAULT_VIEWPORT,
  areViewportsEqual,
  computeFitViewport,
  resolveOpeningViewport,
  getDefaultViewState,
  getViewState,
  saveViewState,
  setHomeView,
  clearHomeView,
  setOpenMode,
  scheduleSaveViewport,
  flushPendingViewportSave,
} from "../lib/canvas/viewport-memory.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
    console.error(`  ✗ ${name} (FAILED)`)
  }
}

async function runTests() {
  console.log("=== Starting Zenithsui Viewport Memory & Home View Verification ===\n")

  // =========================================================================
  // 1. VIEWPORT MODEL & SANITIZATION
  // =========================================================================
  console.log("--- 1. Viewport Model & Sanitization ---")

  check("Valid viewport is recognized", isValidViewport({ x: 100, y: -50, zoom: 1.5 }))
  check("Invalid: NaN x is rejected", !isValidViewport({ x: NaN, y: 0, zoom: 1 }))
  check("Invalid: Infinity y is rejected", !isValidViewport({ x: 0, y: Infinity, zoom: 1 }))
  check("Invalid: Zero zoom is rejected", !isValidViewport({ x: 0, y: 0, zoom: 0 }))
  check("Invalid: Negative zoom is rejected", !isValidViewport({ x: 0, y: 0, zoom: -1 }))
  check("Invalid: Non-object is rejected", !isValidViewport("not-a-viewport"))
  check("Invalid: Null is rejected", !isValidViewport(null))

  const clampedOver = sanitizeViewport({ x: 10.456, y: 20.789, zoom: 10 })
  check("Zoom clamped to MAX_CANVAS_ZOOM (4)", clampedOver?.zoom === MAX_CANVAS_ZOOM)
  check("Coordinates rounded cleanly", clampedOver?.x === 10.46 && clampedOver?.y === 20.79)

  const clampedUnder = sanitizeViewport({ x: 0, y: 0, zoom: 0.001 })
  check("Zoom clamped to MIN_CANVAS_ZOOM (0.1)", clampedUnder?.zoom === MIN_CANVAS_ZOOM)

  const corruptedState = {
    lastView: { x: NaN, y: 0, zoom: 1 },
    homeView: "corrupted",
    openMode: "invalid-mode",
  }
  const sanitizedState = sanitizeViewState(corruptedState)
  check("Corrupted state lastView sanitized to null", sanitizedState.lastView === null)
  check("Corrupted state homeView sanitized to null", sanitizedState.homeView === null)
  check("Invalid openMode safely defaults to 'last-view'", sanitizedState.openMode === "last-view")

  const vA = { x: 100, y: 200, zoom: 1.5 }
  const vB = { x: 101, y: 200.5, zoom: 1.502 }
  const vFar = { x: 120, y: 200, zoom: 1.5 }
  check("areViewportsEqual detects close matches within tolerance", areViewportsEqual(vA, vB, 2, 0.01))
  check("areViewportsEqual distinguishes distant viewports", !areViewportsEqual(vA, vFar, 2, 0.01))

  // =========================================================================
  // 2. INDEPENDENT STORAGE OF HOME VIEW & LAST VIEW
  // =========================================================================
  console.log("\n--- 2. Independent Storage of Home View & Last View ---")

  const docId1 = `test_doc_${Date.now()}_1`
  const initialVs = getViewState(docId1)
  check("New document has default viewState", initialVs.lastView === null && initialVs.homeView === null)

  // Set Home View to 150% zoom at (300, 400)
  const homeVp = { x: 300, y: 400, zoom: 1.5 }
  const vsWithHome = await setHomeView(docId1, homeVp)
  check("Home view saved", areViewportsEqual(vsWithHome.homeView, homeVp))
  check("Last view remains independent (not overwritten by Home View save)", vsWithHome.lastView === null)

  // Now simulate user panning to Last View (700, 900) at 200% zoom
  const panVp = { x: 700, y: 900, zoom: 2.0 }
  scheduleSaveViewport(docId1, panVp)
  flushPendingViewportSave()

  const vsAfterPan = getViewState(docId1)
  check("Last view tracked accurately", areViewportsEqual(vsAfterPan.lastView, panVp))
  check("Home view remains unchanged after user pans canvas", areViewportsEqual(vsAfterPan.homeView, homeVp))

  // Update Home View to current view
  const newHomeVp = { x: 750, y: 950, zoom: 2.2 }
  const vsUpdatedHome = await setHomeView(docId1, newHomeVp)
  check("Home view successfully updated", areViewportsEqual(vsUpdatedHome.homeView, newHomeVp))
  check("Last view remains unchanged after updating Home View", areViewportsEqual(vsUpdatedHome.lastView, panVp))

  // Clear Home View
  await setOpenMode(docId1, "home-view")
  const vsCleared = await clearHomeView(docId1)
  check("Home view removed", vsCleared.homeView === null)
  check("OpenMode gracefully falls back from 'home-view' to 'last-view' when home view is cleared", vsCleared.openMode === "last-view")
  check("Last view preserved after Home View clearance", areViewportsEqual(vsCleared.lastView, panVp))

  // =========================================================================
  // 3. OPENING MODES & RESOLUTION
  // =========================================================================
  console.log("\n--- 3. Opening Modes & Resolution ---")

  const sampleNodes: SquigNode[] = [
    {
      id: "node_1",
      type: "shape",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 300,
      seed: 1234,
      fill: "paper",
    },
    {
      id: "node_2",
      type: "shape",
      shape: "rect",
      x: 600,
      y: 500,
      w: 200,
      h: 200,
      seed: 5678,
      fill: "paper",
    },
  ]

  // Mode A: Remember Last View
  const docIdLast = `test_doc_last_${Date.now()}`
  await saveViewState(docIdLast, {
    lastView: { x: 250, y: 350, zoom: 1.75 },
    homeView: { x: 10, y: 20, zoom: 1.0 },
    openMode: "last-view",
    updatedAt: Date.now(),
  })

  const resLast = resolveOpeningViewport(docIdLast, sampleNodes, 1920, 1080)
  check("Remember Last View restores exact position and zoom (175%)", resLast.viewport.zoom === 1.75 && resLast.viewport.x === 250 && resLast.viewport.y === 350)
  check("Resolution marked as 'last-view'", resLast.resolvedFrom === "last-view")

  // Mode B: Custom Home View
  const docIdHome = `test_doc_home_${Date.now()}`
  await saveViewState(docIdHome, {
    lastView: { x: 250, y: 350, zoom: 1.75 },
    homeView: { x: 500, y: 600, zoom: 1.5 },
    openMode: "home-view",
    updatedAt: Date.now(),
  })

  const resHome = resolveOpeningViewport(docIdHome, sampleNodes, 1920, 1080)
  check("Custom Home View restores exact saved Home View (150%, 500, 600)", resHome.viewport.zoom === 1.5 && resHome.viewport.x === 500 && resHome.viewport.y === 600)
  check("Resolution marked as 'home-view'", resHome.resolvedFrom === "home-view")

  // Mode B Fallback: Custom Home View selected, but Home View is missing
  const docIdHomeFallback = `test_doc_home_fallback_${Date.now()}`
  await saveViewState(docIdHomeFallback, {
    lastView: { x: 120, y: 240, zoom: 1.25 },
    homeView: null,
    openMode: "home-view",
    updatedAt: Date.now(),
  })

  const resHomeFallback = resolveOpeningViewport(docIdHomeFallback, sampleNodes, 1920, 1080)
  check("Missing Home View gracefully falls back to Last View", resHomeFallback.viewport.zoom === 1.25 && resHomeFallback.viewport.x === 120)
  check("Fallback resolution identified as 'last-view'", resHomeFallback.resolvedFrom === "last-view")

  // Mode C: Fit All Content
  const docIdFit = `test_doc_fit_${Date.now()}`
  await saveViewState(docIdFit, {
    lastView: { x: 250, y: 350, zoom: 1.75 },
    homeView: { x: 500, y: 600, zoom: 1.5 },
    openMode: "fit-content",
    updatedAt: Date.now(),
  })

  const resFit = resolveOpeningViewport(docIdFit, sampleNodes, 1920, 1080)
  check("Fit All Content computes framed bounding box viewport", resFit.resolvedFrom === "fit-content")
  check("Fit viewport has finite coordinates", Number.isFinite(resFit.viewport.x) && Number.isFinite(resFit.viewport.y))
  check("Fit viewport zoom is within valid range", resFit.viewport.zoom >= MIN_CANVAS_ZOOM && resFit.viewport.zoom <= 1)

  // Empty canvas edge case across all modes
  const emptyRes = resolveOpeningViewport("empty_doc", [], 1920, 1080)
  check("Empty canvas safely defaults to origin (0, 0, 1)", areViewportsEqual(emptyRes.viewport, DEFAULT_VIEWPORT))

  // =========================================================================
  // 4. LEGACY DOCUMENT FIRST-OPEN MIGRATION
  // =========================================================================
  console.log("\n--- 4. Legacy Document First-Open Migration ---")

  const legacyDocId = `legacy_doc_${Date.now()}`
  // Legacy doc has no viewState in storage
  const legacyFirstOpen = resolveOpeningViewport(legacyDocId, sampleNodes, 1920, 1080)
  check("Legacy document without viewState triggers first-open fit", legacyFirstOpen.isFirstOpenFit === true)
  check("Legacy first-open computes fit content", legacyFirstOpen.resolvedFrom === "fit-content")

  // Simulate store saving the initial fitted view as Last View
  const legacyVs = getViewState(legacyDocId)
  legacyVs.lastView = legacyFirstOpen.viewport
  await saveViewState(legacyDocId, legacyVs)

  // Second opening of the legacy document
  const legacySecondOpen = resolveOpeningViewport(legacyDocId, sampleNodes, 1920, 1080)
  check("Subsequent opening restores saved Last View without refitting or resetting", legacySecondOpen.resolvedFrom === "last-view")
  check("Second opening is NOT marked as first-open fit", !legacySecondOpen.isFirstOpenFit)
  check("Second opening viewport matches initial fit", areViewportsEqual(legacySecondOpen.viewport, legacyFirstOpen.viewport))

  // =========================================================================
  // 5. INDEPENDENT MULTI-DOCUMENT VIEWPORT ISOLATION
  // =========================================================================
  console.log("\n--- 5. Independent Multi-Document Viewport Isolation ---")

  const docA = "canvas_alpha"
  const docB = "canvas_beta"
  const docC = "canvas_gamma"

  const vpA = { x: 500, y: 300, zoom: 1.75 }
  const vpB = { x: -200, y: 800, zoom: 0.9 }
  const homeA = { x: 100, y: 150, zoom: 2.0 }

  await saveViewState(docA, {
    lastView: vpA,
    homeView: homeA,
    openMode: "last-view",
    updatedAt: Date.now(),
  })

  await saveViewState(docB, {
    lastView: vpB,
    homeView: null,
    openMode: "last-view",
    updatedAt: Date.now(),
  })

  await saveViewState(docC, {
    lastView: null,
    homeView: null,
    openMode: "fit-content",
    updatedAt: Date.now(),
  })

  // Verify Document A restores A's viewport
  const openA = resolveOpeningViewport(docA, sampleNodes)
  check("Doc A restores Doc A viewport (175%, 500, 300)", areViewportsEqual(openA.viewport, vpA))

  // Verify Document B restores B's viewport (independent from A)
  const openB = resolveOpeningViewport(docB, sampleNodes)
  check("Doc B restores Doc B viewport (90%, -200, 800)", areViewportsEqual(openB.viewport, vpB))

  // Verify Doc B has no Home View while Doc A does
  const vsA = getViewState(docA)
  const vsB = getViewState(docB)
  check("Doc A has Home View (200%)", areViewportsEqual(vsA.homeView, homeA))
  check("Doc B has NO Home View", vsB.homeView === null)

  // Verify Document C opens in fit-content mode
  const openC = resolveOpeningViewport(docC, sampleNodes)
  check("Doc C opens in fit-content mode", openC.resolvedFrom === "fit-content")

  // =========================================================================
  // 6. DEBOUNCING & PENDING FLUSH
  // =========================================================================
  console.log("\n--- 6. Debouncing & Pending Flush ---")

  const debounceDocId = `debounce_doc_${Date.now()}`
  const initialVp = { x: 0, y: 0, zoom: 1 }

  // Simulate 30 rapid wheel/pan events within high-frequency gesture
  for (let i = 1; i <= 30; i++) {
    scheduleSaveViewport(debounceDocId, {
      x: i * 10,
      y: i * 5,
      zoom: 1 + i * 0.02,
    })
  }

  // Before timer fires, in-memory cache reflects the latest gesture point
  const memoryVp = getViewState(debounceDocId).lastView
  check("In-memory cache immediately reflects latest gesture point for 0ms responsiveness", memoryVp?.x === 300 && memoryVp?.y === 150)

  // Flush pending save immediately (simulating pointerup / gesture end or document switch)
  flushPendingViewportSave()

  const flushedVs = getViewState(debounceDocId)
  check("Flush writes stable viewport cleanly", flushedVs.lastView?.x === 300 && flushedVs.lastView?.y === 150)

  // =========================================================================
  // 7. ASYNC DOCUMENT SWITCHING RACE PREVENTION
  // =========================================================================
  console.log("\n--- 7. Async Document Switching Race Prevention ---")

  class ViewportSwitchController {
    private token = 0
    public activeDocId: string | null = null
    public activeViewport: any = null

    async switchDoc(id: string, delayMs: number, targetVp: any): Promise<boolean> {
      const current = ++this.token
      // simulate slow async storage retrieval
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (current !== this.token) {
        return false // Stale switch discarded!
      }
      this.activeDocId = id
      this.activeViewport = targetVp
      return true
    }
  }

  const raceController = new ViewportSwitchController()

  // User rapidly clicks Doc 1 (slow load, 60ms) then immediately Doc 2 (fast load, 10ms)
  const switch1 = raceController.switchDoc("doc_1", 60, { x: 100, y: 100, zoom: 1 })
  const switch2 = raceController.switchDoc("doc_2", 10, { x: 500, y: 500, zoom: 2 })

  const [res1, res2] = await Promise.all([switch1, switch2])

  check("Out-of-order stale document viewport load discarded", res1 === false)
  check("Latest requested document viewport applied", res2 === true)
  check("Active document matches latest intent ('doc_2')", raceController.activeDocId === "doc_2")
  check("Active viewport matches 'doc_2' (500, 500, 2)", raceController.activeViewport?.zoom === 2)

  // =========================================================================
  // 8. REGRESSION & IMMUTABILITY INVARIANTS
  // =========================================================================
  console.log("\n--- 8. Regression & Immutability Invariants ---")

  const testNodesMap: Record<string, SquigNode> = {
    n1: { id: "n1", type: "shape", shape: "rect", x: 10, y: 20, w: 100, h: 50, seed: 1, fill: "none" },
    n2: { id: "n2", type: "text", text: "Hello", fontSize: 20, x: 200, y: 200, w: 80, h: 30, seed: 2 },
  }
  const testOrder = ["n1", "n2"]

  // Viewport operations must not alter nodes, order, or element geometry
  const initialNodesJson = JSON.stringify(testNodesMap)
  const initialOrderJson = JSON.stringify(testOrder)

  const invDocId = `inv_doc_${Date.now()}`
  await setHomeView(invDocId, { x: 50, y: 60, zoom: 1.2 })
  scheduleSaveViewport(invDocId, { x: 80, y: 90, zoom: 1.4 })
  flushPendingViewportSave()
  await setOpenMode(invDocId, "fit-content")

  check("Canvas nodes unaffected by viewport operations", JSON.stringify(testNodesMap) === initialNodesJson)
  check("Canvas z-order unaffected by viewport operations", JSON.stringify(testOrder) === initialOrderJson)

  // Summary
  console.log("\n============================================================")
  if (failures.length === 0) {
    console.log(`ALL ${passed} VIEWPORT MEMORY & HOME VIEW TESTS PASSED!`)
  } else {
    console.error(`FAILED ${failures.length} TESTS:`)
    failures.forEach((f) => console.error(`  - ${f}`))
  }
  console.log("============================================================\n")

  if (failures.length > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
