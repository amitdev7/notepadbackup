// ---------------------------------------------------------------------------
// Zenithsui Offline Sync Queue & Conflict Resolution Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-sync.ts
// ---------------------------------------------------------------------------

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// 1. Backoff calculation test
function calculateBackoff(retryCount: number): number {
  const base = 1000
  const max = 30000
  const exponential = Math.min(base * Math.pow(2, retryCount), max)
  return exponential
}

// 2. Coalescing logic simulation
interface MutationItem {
  docId: string
  baseRevision: number
  payload: { name?: string; text?: string }
}

function coalesceMutations(existing: MutationItem[], incoming: MutationItem): MutationItem[] {
  const idx = existing.findIndex((m) => m.docId === incoming.docId)
  if (idx >= 0) {
    const updated = [...existing]
    updated[idx] = {
      ...updated[idx],
      // CRITICAL: Preserve original baseRevision!
      baseRevision: updated[idx].baseRevision,
      payload: { ...updated[idx].payload, ...incoming.payload },
    }
    return updated
  }
  return [...existing, incoming]
}

// 3. 3-Way Save as Copy Resolution algorithm test
function resolveConflictSaveAsCopy(
  originalDocId: string,
  docName: string,
  localNodes: Record<string, unknown>,
  serverNodes: Record<string, unknown>,
  serverRevision: number
) {
  // Branch A: create new copy document with local edits
  const copyDoc = {
    id: `doc_${Date.now()}_copy`,
    name: `${docName} (My Copy)`,
    nodes: localNodes,
    revision: 1,
  }

  // Branch B: apply server nodes to original document
  const originalDoc = {
    id: originalDocId,
    name: docName,
    nodes: serverNodes,
    revision: serverRevision,
  }

  return { copyDoc, originalDoc }
}

async function runTests() {
  console.log("Running Zenithsui Offline Sync & Conflict tests...\n")

  // Test 1: Exponential backoff
  check("Retry 0 backoff is 1000ms", calculateBackoff(0) === 1000)
  check("Retry 1 backoff is 2000ms", calculateBackoff(1) === 2000)
  check("Retry 2 backoff is 4000ms", calculateBackoff(2) === 4000)
  check("Retry 5 backoff is 30000ms (capped at max)", calculateBackoff(5) === 30000)

  // Test 2: Mutation coalescing preserves original baseRevision
  const initialQueue: MutationItem[] = [
    { docId: "doc_1", baseRevision: 10, payload: { name: "Version 1", text: "A" } },
  ]

  const update1: MutationItem = {
    docId: "doc_1",
    baseRevision: 11, // Even if client thinks base is 11 now
    payload: { text: "AB" },
  }

  const coalesced1 = coalesceMutations(initialQueue, update1)
  check("Coalescing preserves initial baseRevision = 10", coalesced1[0].baseRevision === 10)
  check("Coalescing updates payload to AB", coalesced1[0].payload.text === "AB")
  check("Coalesced queue length remains 1", coalesced1.length === 1)

  const update2: MutationItem = {
    docId: "doc_1",
    baseRevision: 12,
    payload: { text: "ABC", name: "Renamed Drawing" },
  }

  const coalesced2 = coalesceMutations(coalesced1, update2)
  check("Coalesced again: baseRevision still 10", coalesced2[0].baseRevision === 10)
  check("Payload text is ABC", coalesced2[0].payload.text === "ABC")
  check("Payload name updated to Renamed Drawing", coalesced2[0].payload.name === "Renamed Drawing")

  // Test 3: 3-Way Fork / Save-As-Copy resolution ensures zero data loss
  const localNodes = { node_1: { x: 100, y: 100 } }
  const serverNodes = { node_1: { x: 200, y: 200 }, node_2: { x: 300, y: 300 } }

  const resolution = resolveConflictSaveAsCopy("doc_1", "Project Blueprint", localNodes, serverNodes, 15)

  check("Resolution generates copy with user edits", resolution.copyDoc.name === "Project Blueprint (My Copy)")
  check("Copy document has local node positions", (resolution.copyDoc.nodes as any).node_1.x === 100)
  check("Original document accepts server nodes without losing cloud data", (resolution.originalDoc.nodes as any).node_2.x === 300)
  check("Original document revision updated to server revision 15", resolution.originalDoc.revision === 15)

  console.log(`\nSync & Conflict: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})

