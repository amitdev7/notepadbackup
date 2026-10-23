// ---------------------------------------------------------------------------
// Zenithsui Security & Privacy Verification: Wi-Fi Auto-Sync Explicit Consent
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import { useShellStore } from "../lib/shell-store.ts"

console.log("=== Starting Zenithsui Wi-Fi Auto-Sync Consent Verification ===")

const prefs = useShellStore.getState().preferences

// 1. Invariant: Wi-Fi auto-sync defaults to false (explicit consent required)
assert.equal(
  prefs.wifiAutoSync,
  false,
  "Wi-Fi auto sync must be disabled by default until user explicitly enables it in settings"
)
console.log("✓ Wi-Fi auto-sync defaults to disabled (explicit consent required)")

// 2. Toggling preferences updates shell store cleanly
useShellStore.getState().updatePreferences({ wifiAutoSync: true })
assert.equal(
  useShellStore.getState().preferences.wifiAutoSync,
  true,
  "User opt-in must correctly enable wifiAutoSync"
)
console.log("✓ User opt-in correctly activates wifiAutoSync")

// 3. Reset back to safe default
useShellStore.getState().updatePreferences({ wifiAutoSync: false })
assert.equal(
  useShellStore.getState().preferences.wifiAutoSync,
  false,
  "Safe default preserved"
)
console.log("✓ Resetting to safe default verified")

console.log("============================================================")
console.log("ALL WI-FI AUTO-SYNC CONSENT TESTS PASSED 100%!")
console.log("============================================================")
