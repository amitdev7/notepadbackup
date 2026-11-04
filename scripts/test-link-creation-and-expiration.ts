// ---------------------------------------------------------------------------
// Zenithsui Verification: Share Link Creation, Max 7-Day Auto-Cleanup & Collaboration
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  createShareLink,
  resolveShareToken,
  cleanupExpiredShareLinksAndStorage,
  saveSharedDocumentMemory,
  getSharedDocumentMemory,
  MAX_SHARE_EXPIRATION_SECONDS,
} from "../lib/cloud/sharing"

async function runTests() {
  console.log("▶ Test 1: Verify MAX_SHARE_EXPIRATION_SECONDS invariant...")
  assert.equal(
    MAX_SHARE_EXPIRATION_SECONDS,
    604800,
    "Strict max expiration must be exactly 7 days (604,800 seconds)"
  )
  console.log("  ✔ Max expiration constant is exactly 604,800s (7 days)")

  console.log("▶ Test 2: In-memory document saving & retrieval...")
  const testDocId = "doc_test_12345"
  const testDoc = {
    id: testDocId,
    name: "Collaboration Test Canvas",
    document_json: { nodes: {}, order: [] },
  }
  saveSharedDocumentMemory(testDoc)
  const retrieved = getSharedDocumentMemory(testDocId)
  assert.ok(retrieved, "Retrieved doc should exist")
  assert.equal(retrieved.name, "Collaboration Test Canvas")
  console.log("  ✔ In-memory document caching works seamlessly")

  console.log("▶ Test 3: Create share link with 7-day max clamping...")
  // Attempt to pass 30 days (2,592,000s)
  const excessiveDuration = 30 * 24 * 3600
  const linkResult = await createShareLink({
    documentId: testDocId,
    userId: "guest_user_1",
    permission: "edit",
    expiresInSeconds: excessiveDuration,
  })

  assert.ok(linkResult.rawToken, "Raw token must be generated")
  assert.ok(linkResult.shareUrl.startsWith("/share/"), "Share URL must point to /share/[token]")
  assert.ok(linkResult.link.expires_at, "Expiration date must be defined")

  const expiresTime = new Date(linkResult.link.expires_at).getTime()
  const now = Date.now()
  const durationSeconds = Math.round((expiresTime - now) / 1000)

  // Must not exceed 7 days (604,800s + minor clock drift margin)
  assert.ok(
    durationSeconds <= 604800 + 5,
    `Duration ${durationSeconds}s must be clamped to max 7 days (604800s)`
  )
  console.log(`  ✔ Requested 30 days was strictly clamped to 7 days (${durationSeconds}s)`)

  console.log("▶ Test 4: Resolve share token without password...")
  const resolved = await resolveShareToken(linkResult.rawToken)
  assert.equal(resolved.valid, true, "Share token must resolve to valid")
  assert.equal(resolved.permission, "edit", "Permission must match 'edit'")
  assert.equal(resolved.documentId, testDocId, "Resolved documentId must match")
  assert.ok(resolved.document, "Document data must be loaded")
  console.log("  ✔ Share token successfully resolved")

  console.log("▶ Test 5: Storage auto-cleanup of expired links...")
  // Artificially expire the link in memory
  const store = (globalThis as any).__zenithsuiShareStore
  assert.ok(store, "Store must exist")
  const linkRecord = store.links.get(linkResult.link.token_hash)
  assert.ok(linkRecord, "Link record must exist in store")

  // Set expiration to 10 seconds in the past
  linkRecord.expires_at = new Date(Date.now() - 10000).toISOString()

  // Run cleanup
  const cleanupRes = await cleanupExpiredShareLinksAndStorage()
  assert.ok(cleanupRes.removedLinks >= 1, "Cleanup must remove at least 1 expired link")
  assert.equal(store.links.has(linkResult.link.token_hash), false, "Expired link must be purged from memory")

  // Resolving should now fail
  const resolveExpired = await resolveShareToken(linkResult.rawToken)
  assert.equal(resolveExpired.valid, false, "Expired token must resolve as invalid")
  console.log("  ✔ Expired links and storage automatically purged to conserve space")

  console.log("\n✅ ALL SHARE & 7-DAY EXPIRATION TESTS PASSED SUCCESSFULLY!")
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})
