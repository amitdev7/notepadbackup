import assert from "node:assert"

console.log("=== Testing Document Switching Generation Token Invariant ===")

// Test monotonic file switch generation token logic
let fileSwitchToken = 0

function simulateDocumentSwitch(fileId: string, delayMs: number): Promise<{ id: string; applied: boolean }> {
  const token = ++fileSwitchToken
  return new Promise((resolve) => {
    setTimeout(() => {
      // If a newer switch occurred while this was resolving, token !== fileSwitchToken
      if (token !== fileSwitchToken) {
        resolve({ id: fileId, applied: false })
      } else {
        resolve({ id: fileId, applied: true })
      }
    }, delayMs)
  })
}

async function runTest() {
  // Scenario: User clicks Doc A (which is slow, e.g. 50ms), but immediately clicks Doc B (faster, 10ms)
  const pA = simulateDocumentSwitch("doc_A_slow", 50)
  const pB = simulateDocumentSwitch("doc_B_fast", 10)

  const [resA, resB] = await Promise.all([pA, pB])

  assert.strictEqual(resA.applied, false, "Stale Doc A load must be safely discarded")
  assert.strictEqual(resB.applied, true, "Most recent Doc B load must be accepted")
  console.log("✓ Invariant passed: Stale out-of-order document resolutions are discarded.")
  console.log("=== All Document Switching Race Tests Passed 100%! ===")
}

runTest()
