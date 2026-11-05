import assert from "node:assert"
import { saveFile, readFile, readCanvasBackup } from "../lib/files"
import { useShellStore } from "../lib/shell-store"

console.log("--- 1. Testing Canvas Persistence & Backup Slot ---")
const testDoc = {
  id: "test-save-101",
  name: "My Critical Canvas",
  nodes: {
    "node-1": { id: "node-1", type: "shape", shape: "rect", x: 100, y: 100, w: 200, h: 100, seed: 1 } as any,
    "node-2": { id: "node-2", type: "text", text: "Important Note", x: 350, y: 100, w: 150, h: 50, seed: 2 } as any,
  },
  order: ["node-1", "node-2"],
  updatedAt: Date.now(),
}

// In Node environment mock localStorage if not present
if (typeof localStorage === "undefined") {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
  }
}

const files = saveFile(testDoc)
assert(files.length > 0, "File index should not be empty")
assert.strictEqual(files[0].id, "test-save-101")

// Verify read
const retrieved = readFile("test-save-101")
assert(retrieved !== null, "File should be retrieved from storage")
assert.strictEqual(retrieved?.order.length, 2, "Should have 2 nodes")

// Verify fail-safe backup slot
const backup = readCanvasBackup()
assert(backup !== null, "Backup slot must be populated")
assert.strictEqual(backup?.id, "test-save-101", "Backup must hold target doc id")
assert.strictEqual(backup?.order.length, 2, "Backup must contain all 2 nodes")
console.log("✓ Canvas saving & fail-safe backup slot verified successfully")

console.log("--- 2. Testing Live Collaboration Toggle & Defaults ---")
const shell = useShellStore.getState()
assert.strictEqual(shell.preferences.liveCollaborationEnabled, true, "Default must be enabled (true)")

// Test toggle to stop
useShellStore.getState().setLiveCollaborationEnabled(false)
assert.strictEqual(useShellStore.getState().preferences.liveCollaborationEnabled, false, "Must be disabled")

// Test toggle back to start
useShellStore.getState().toggleLiveCollaboration()
assert.strictEqual(useShellStore.getState().preferences.liveCollaborationEnabled, true, "Toggle must switch back to true")
console.log("✓ Live collaboration toggle verified successfully")

console.log("--- 3. Testing Library Center Positioning ---")
assert.strictEqual(shell.preferences.libraryPosition, "center", "Default library position must be center")
console.log("✓ Library center positioning verified successfully")

console.log("\nALL VERIFICATIONS PASSED!")
