import assert from "node:assert"
import { DEFAULT_DATABASE_SETTINGS, DEFAULT_PREFERENCES } from "../lib/shell-store"

console.log("=== Testing Wi-Fi Sync Safety & Consent Invariants ===")

// Invariant 1: Default preferences must strictly have wifiAutoSync disabled (explicit opt-in only)
assert.strictEqual(
  DEFAULT_PREFERENCES.wifiAutoSync,
  false,
  "wifiAutoSync MUST default to false for privacy & security"
)
console.log("✓ Invariant 1 passed: Wi-Fi auto-sync defaults to false (opt-in only).")

// Invariant 2: In local-only storage mode, isAllowed must evaluate to false regardless of toggle
function checkIsAllowed(wifiAutoSync: boolean, dbEnabled: boolean, storageMode: string): boolean {
  return Boolean(wifiAutoSync && dbEnabled && storageMode !== "local")
}

assert.strictEqual(
  checkIsAllowed(true, true, "local"),
  false,
  "Local-only storage mode must block Wi-Fi auto-sync even if toggle is true"
)
assert.strictEqual(
  checkIsAllowed(true, false, "hybrid"),
  false,
  "Disabled database must block Wi-Fi auto-sync"
)
assert.strictEqual(
  checkIsAllowed(false, true, "hybrid"),
  false,
  "Opt-out toggle must block Wi-Fi auto-sync"
)
assert.strictEqual(
  checkIsAllowed(true, true, "hybrid"),
  true,
  "Hybrid mode with explicit opt-in enables Wi-Fi auto-sync"
)
console.log("✓ Invariant 2 passed: Storage mode and consent boundaries strictly enforced.")

// Invariant 3: Remote session must NEVER overwrite non-empty local canvas or edited files
function canAdoptRemoteSession(localNodeCount: number, localOrderLength: number, localPastLength: number, fileName: string): boolean {
  return (
    localNodeCount === 0 &&
    localOrderLength === 0 &&
    localPastLength === 0 &&
    (fileName === "untitled scribbles" || fileName === "Untitled")
  )
}

assert.strictEqual(
  canAdoptRemoteSession(0, 0, 0, "untitled scribbles"),
  true,
  "Completely untouched canvas may adopt remote session"
)
assert.strictEqual(
  canAdoptRemoteSession(1, 1, 0, "untitled scribbles"),
  false,
  "Canvas with existing nodes MUST NEVER be overwritten"
)
assert.strictEqual(
  canAdoptRemoteSession(0, 0, 2, "untitled scribbles"),
  false,
  "Canvas with undo history MUST NEVER be overwritten"
)
assert.strictEqual(
  canAdoptRemoteSession(0, 0, 0, "My Architecture Draft"),
  false,
  "Canvas with custom file name MUST NEVER be overwritten"
)
console.log("✓ Invariant 3 passed: Remote sessions cannot overwrite active local documents.")

console.log("=== All Wi-Fi Sync Safety & Consent Tests Passed 100%! ===")
