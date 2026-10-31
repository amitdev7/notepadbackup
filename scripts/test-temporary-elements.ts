// ---------------------------------------------------------------------------
// Zenithsui Automated Test Suite: Temporary Elements & Automatic Expiration Engine
//
// Run:
//   node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-temporary-elements.ts
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  EXPIRATION_PRESETS,
  type ExpirationMetadata,
  type ExpiredElementRecord,
  type SquigNode,
} from "../lib/types.ts"
import {
  DEFAULT_TEMPORARY_PREFERENCES,
  type TemporaryElementsPreferences,
} from "../lib/shell-store.ts"
import {
  formatRemainingTime,
  getExpirationUrgency,
  formatDurationLabel,
  getNodePreviewLabel,
  isNodeExpired,
} from "../lib/canvas/expiration-manager.ts"
import { sanitizeNodeExpiration } from "../lib/security/sanitize.ts"
import {
  saveExpiredRecords,
  listExpiredRecords,
  getExpiredRecord,
  deleteExpiredRecord,
  clearExpiredRecords,
  getSynchronousExpiredCount,
  subscribeExpiredArchive,
} from "../lib/storage/expired-archive.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
    console.error(`  ✗ ${name} (FAILED)${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("=== Starting Zenithsui Temporary Elements & Automatic Expiration Engine Verification ===\n")

  // =========================================================================
  // 1. PRESETS & DEFAULT PREFERENCES
  // =========================================================================
  console.log("1. Presets & Default Preferences:")

  check("Provides comprehensive range of presets from 10s to 7d", (
    EXPIRATION_PRESETS.length >= 15 &&
    EXPIRATION_PRESETS[0].label === "10 seconds" &&
    EXPIRATION_PRESETS[0].value === 10_000 &&
    EXPIRATION_PRESETS[4].label === "5 minutes" &&
    EXPIRATION_PRESETS[4].value === 5 * 60 * 1000 &&
    EXPIRATION_PRESETS[EXPIRATION_PRESETS.length - 1].label === "7 days" &&
    EXPIRATION_PRESETS[EXPIRATION_PRESETS.length - 1].value === 7 * 86400 * 1000
  ))

  check("Default preferences initialize with safe defaults", (
    DEFAULT_TEMPORARY_PREFERENCES.temporaryMode === false &&
    DEFAULT_TEMPORARY_PREFERENCES.defaultDurationMs === 5 * 60 * 1000 &&
    DEFAULT_TEMPORARY_PREFERENCES.showCountdown === true &&
    DEFAULT_TEMPORARY_PREFERENCES.disappearingAnimation === true &&
    DEFAULT_TEMPORARY_PREFERENCES.expiringSoonSeconds === 60 &&
    DEFAULT_TEMPORARY_PREFERENCES.archiveRetention === "indefinite"
  ))

  // =========================================================================
  // 2. TIME FORMATTING & LABELS
  // =========================================================================
  console.log("\n2. Time Formatting & Duration Labels:")

  const baseNow = 1_700_000_000_000

  check("Formats remaining time correctly across scales", (
    formatRemainingTime(baseNow + 5 * 86400 * 1000 + 3600 * 1000, baseNow) === "5d 1h" &&
    formatRemainingTime(baseNow + 3600 * 1000 + 120 * 1000, baseNow) === "1h 2m" &&
    formatRemainingTime(baseNow + 125 * 1000, baseNow) === "2:05" &&
    formatRemainingTime(baseNow + 9 * 1000, baseNow) === "0:09" &&
    formatRemainingTime(baseNow, baseNow) === "Expired" &&
    formatRemainingTime(baseNow - 500, baseNow) === "Expired"
  ))

  check("Formats duration labels nicely for UI display", (
    formatDurationLabel(10_000) === "10s" &&
    formatDurationLabel(5 * 60_000) === "5m" &&
    formatDurationLabel(2 * 3600_000) === "2h" &&
    formatDurationLabel(3 * 86400_000) === "3d"
  ))

  // =========================================================================
  // 3. URGENCY THRESHOLDS & EXPIRATION CHECK
  // =========================================================================
  console.log("\n3. Urgency Thresholds & Node Expiration:")

  check("Normal urgency when remaining time > warning threshold", (
    getExpirationUrgency(baseNow + 120_000, baseNow) === "normal"
  ))

  check("Warning urgency when remaining time <= warning threshold", (
    getExpirationUrgency(baseNow + 45_000, baseNow) === "soon" &&
    getExpirationUrgency(baseNow + 60_000, baseNow) === "soon"
  ))

  check("Critical urgency when remaining time <= 10 seconds", (
    getExpirationUrgency(baseNow + 10_000, baseNow) === "imminent" &&
    getExpirationUrgency(baseNow + 5_000, baseNow) === "imminent" &&
    getExpirationUrgency(baseNow + 1_000, baseNow) === "imminent"
  ))

  check("Expired urgency when remaining time <= 0", (
    getExpirationUrgency(baseNow, baseNow) === "expired" &&
    getExpirationUrgency(baseNow - 100, baseNow) === "expired"
  ))

  const activeNode: SquigNode = {
    id: "node-active",
    type: "text",
    x: 0,
    y: 0,
    w: 100,
    h: 50,
    rotation: 0,
    color: "#000",
    text: "Active text",
    font: "sans",
    fontSize: 16,
    align: "left",
    valign: "top",
    expiration: {
      expiresAt: baseNow + 60_000,
      createdAt: baseNow,
    },
  }

  const expiredNode: SquigNode = {
    ...activeNode,
    id: "node-expired",
    expiration: {
      expiresAt: baseNow - 1000,
      createdAt: baseNow - 61_000,
    },
  }

  const permanentNode: SquigNode = {
    ...activeNode,
    id: "node-permanent",
    expiration: undefined,
  }

  check("Accurately detects whether a node is expired or permanent", (
    isNodeExpired(activeNode, baseNow) === false &&
    isNodeExpired(expiredNode, baseNow) === true &&
    isNodeExpired(permanentNode, baseNow) === false
  ))

  check("Generates clean preview labels for various element types", (
    getNodePreviewLabel(activeNode) === "Active text" &&
    getNodePreviewLabel({ ...activeNode, text: "" }) === "Empty Text" &&
    getNodePreviewLabel({ id: "shape-1", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 50, rotation: 0, color: "#000", fill: "none" } as any) === "Rectangle Shape"
  ))

  // =========================================================================
  // 4. SECURITY & SANITIZATION
  // =========================================================================
  console.log("\n4. Security & Expiration Sanitization:")

  const validMeta: ExpirationMetadata = {
    expiresAt: Date.now() + 60_000,
    createdAt: Date.now(),
    durationMs: 60_000,
    showCountdown: true,
  }

  check("Sanitizes and preserves valid expiration metadata", (
    sanitizeNodeExpiration(validMeta) !== undefined &&
    sanitizeNodeExpiration(validMeta)?.expiresAt === validMeta.expiresAt &&
    sanitizeNodeExpiration(validMeta)?.showCountdown === true
  ))

  check("Strips undefined expiration", (
    sanitizeNodeExpiration(undefined) === undefined
  ))

  check("Clamps and rejects NaN or invalid epoch timestamps", (
    sanitizeNodeExpiration({ expiresAt: NaN, createdAt: Date.now() } as any) === undefined &&
    sanitizeNodeExpiration({ expiresAt: "invalid", createdAt: Date.now() } as any) === undefined &&
    sanitizeNodeExpiration({ expiresAt: -500, createdAt: Date.now() }) === undefined
  ))

  // =========================================================================
  // 5. EXPIRED ELEMENTS ARCHIVE & LOCAL-FIRST PERSISTENCE
  // =========================================================================
  console.log("\n5. Expired Elements Archive & Persistence:")

  await clearExpiredRecords()
  check("Archive starts empty after clear", getSynchronousExpiredCount() === 0)

  let subscriberNotified = false
  const unsubscribe = subscribeExpiredArchive(() => {
    subscriberNotified = true
  })

  const dummySnapshot: SquigNode = {
    id: "temp-node-1",
    type: "text",
    x: 100,
    y: 100,
    w: 200,
    h: 50,
    rotation: 0,
    color: "#000000",
    text: "Temporary Note Sample",
    font: "sans",
    fontSize: 16,
    align: "left",
    valign: "top",
    expiration: {
      expiresAt: Date.now() - 100,
      createdAt: Date.now() - 300_000,
      durationMs: 300_000,
      showCountdown: true,
    },
  }

  const record: ExpiredElementRecord = {
    archiveId: "arch_1",
    documentId: "doc_test_1",
    originalNodeId: dummySnapshot.id,
    nodeSnapshot: dummySnapshot,
    originalOrderIndex: 0,
    archivedAt: Date.now(),
    expiresAt: dummySnapshot.expiration!.expiresAt,
    createdAt: dummySnapshot.expiration!.createdAt,
    elementType: dummySnapshot.type,
    previewLabel: "Temporary Note Sample",
  }

  await saveExpiredRecords([record])

  check("Saves expired record and updates synchronous count", getSynchronousExpiredCount() === 1)
  check("Notifies archive change subscribers", subscriberNotified === true)
  unsubscribe()

  const retrieved = await getExpiredRecord("arch_1")
  check("Retrieves exact record by archiveId", (
    retrieved !== null &&
    retrieved.archiveId === "arch_1" &&
    retrieved.originalNodeId === "temp-node-1" &&
    (retrieved.nodeSnapshot as any).text === "Temporary Note Sample"
  ))

  const docList = await listExpiredRecords("doc_test_1")
  check("Filters records by documentId", (
    docList.length === 1 &&
    docList[0].documentId === "doc_test_1"
  ))

  const otherDocList = await listExpiredRecords("doc_other")
  check("Returns empty array for unmatched documentId", otherDocList.length === 0)

  // =========================================================================
  // 6. ARCHIVE DELETION & CLEANUP
  // =========================================================================
  console.log("\n6. Archive Deletion & Cleanup:")

  await deleteExpiredRecord("arch_1")
  check("Deletes specific record by archiveId", (
    getSynchronousExpiredCount() === 0 &&
    (await getExpiredRecord("arch_1")) === null
  ))

  const multiRecords: ExpiredElementRecord[] = [
    {
      archiveId: "arch_2",
      documentId: "doc_a",
      originalNodeId: "temp-2",
      nodeSnapshot: { ...dummySnapshot, id: "temp-2" },
      originalOrderIndex: 0,
      archivedAt: Date.now() - 2000,
      expiresAt: Date.now() - 1000,
      createdAt: Date.now() - 5000,
      elementType: "text",
      previewLabel: "Temp 2",
    },
    {
      archiveId: "arch_3",
      documentId: "doc_b",
      originalNodeId: "temp-3",
      nodeSnapshot: { ...dummySnapshot, id: "temp-3" },
      originalOrderIndex: 1,
      archivedAt: Date.now() - 1000,
      expiresAt: Date.now() - 500,
      createdAt: Date.now() - 4000,
      elementType: "text",
      previewLabel: "Temp 3",
    },
  ]

  await saveExpiredRecords(multiRecords)
  check("Saves batch of multiple expired elements", getSynchronousExpiredCount() === 2)

  await clearExpiredRecords("doc_a")
  check("Clears records scoped to specific documentId only", (
    getSynchronousExpiredCount() === 1 &&
    (await listExpiredRecords("doc_b")).length === 1
  ))

  await clearExpiredRecords()
  check("Clears entire archive completely", getSynchronousExpiredCount() === 0)

  // =========================================================================
  // 7. SUMMARY
  // =========================================================================
  console.log("\n=== Test Results ===")
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failures.length}`)

  if (failures.length > 0) {
    console.error("\nFailed Tests:")
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  } else {
    console.log("\n✓ All Temporary Elements & Automatic Expiration Engine tests passed successfully!")
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
