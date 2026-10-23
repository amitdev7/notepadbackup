// ---------------------------------------------------------------------------
// Zenithsui Reliability Verification: Async Document Switching Race Prevention
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"

console.log("=== Starting Zenithsui Document Switching Race Prevention Verification ===")

// Simulate the monotonic token switching model implemented in lib/store.ts
class DocumentSwitchManager {
  private currentToken = 0
  public activeDocId: string | null = null

  async switchDocument(targetId: string, delayMs: number): Promise<boolean> {
    const token = ++this.currentToken

    // Simulate async IndexedDB / storage latency
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    // Token check: If a newer switch was initiated, drop this stale resolution
    if (token !== this.currentToken) {
      return false
    }

    this.activeDocId = targetId
    return true
  }
}

async function runTests() {
  const manager = new DocumentSwitchManager()

  // Scenario 1: User switches to Doc A (slow load, 60ms)
  // then immediately switches to Doc B (fast load, 10ms)
  const loadA = manager.switchDocument("doc_A", 60)
  const loadB = manager.switchDocument("doc_B", 10)

  const [resA, resB] = await Promise.all([loadA, loadB])

  assert.equal(resB, true, "Doc B (the latest requested document) must be applied")
  assert.equal(resA, false, "Doc A (the earlier, stale document) must be discarded")
  assert.equal(manager.activeDocId, "doc_B", "Active document must be Doc B")

  console.log("✓ Out-of-order async response correctly discarded")
  console.log("✓ Active document matches latest user intent ('doc_B')")

  // Scenario 2: Normal sequential load completes without race
  const loadC = await manager.switchDocument("doc_C", 5)
  assert.equal(loadC, true, "Sequential document load must succeed")
  assert.equal(manager.activeDocId, "doc_C")
  console.log("✓ Sequential document switch verified")

  console.log("============================================================")
  console.log("DOCUMENT SWITCHING RACE TESTS PASSED 100%!")
  console.log("============================================================")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
