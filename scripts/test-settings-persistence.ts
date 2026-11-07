// ---------------------------------------------------------------------------
// Zenithsui Settings & State Persistence Comprehensive Verification
// ---------------------------------------------------------------------------

import assert from "node:assert"
import { useShellStore, DEFAULT_PREFERENCES } from "../lib/shell-store"
import { useSquig } from "../lib/store"
import { loadPrefs, savePrefs } from "../lib/files"

console.log("=== Starting Zenithsui Settings Persistence Verification ===")

// Mock localStorage environment
const storage: Record<string, string> = {}
;(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => {
      storage[key] = String(val)
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      for (const k of Object.keys(storage)) delete storage[k]
    },
  },
}
;(globalThis as any).localStorage = (globalThis as any).window.localStorage

// 1. Verify MiniMap toggle writes to localStorage and persists
console.log("\n1. Testing MiniMap Toggle & Close Persistence:")
useShellStore.setState({
  miniMapOpen: true,
  preferences: { ...DEFAULT_PREFERENCES, showMiniMap: true },
})

useShellStore.getState().toggleMiniMap()
assert.strictEqual(useShellStore.getState().miniMapOpen, false, "miniMapOpen is false after toggle")
assert.strictEqual(useShellStore.getState().preferences.showMiniMap, false, "preferences.showMiniMap is false")

const rawShellPrefs = storage["zenithsui:shell_prefs"]
assert.ok(rawShellPrefs, "zenithsui:shell_prefs is saved in localStorage")
const parsedShellPrefs = JSON.parse(rawShellPrefs)
assert.strictEqual(parsedShellPrefs.showMiniMap, false, "saved showMiniMap is false in localStorage")
console.log("  ✓ Toggling MiniMap off writes showMiniMap: false to localStorage")

// 2. Verify MiniMap Collapsed persistence
console.log("\n2. Testing MiniMap Collapsed State Persistence:")
useShellStore.getState().setMiniMapCollapsed(true)
assert.strictEqual(useShellStore.getState().preferences.miniMapCollapsed, true, "miniMapCollapsed is true in state")
const parsedAfterCollapse = JSON.parse(storage["zenithsui:shell_prefs"])
assert.strictEqual(parsedAfterCollapse.miniMapCollapsed, true, "saved miniMapCollapsed is true in localStorage")
console.log("  ✓ Collapsing MiniMap writes miniMapCollapsed: true to localStorage")

// 3. Verify Canvas Look & Grid persistence via store actions
console.log("\n3. Testing Canvas Look (Grid, Paper, ContextRow, Theme, Font) Persistence:")
useSquig.getState().setGrid(false)
let prefs = loadPrefs()
assert.strictEqual(prefs.look.grid, false, "loadPrefs() returns look.grid: false after setGrid(false)")

useSquig.getState().setGrid(true)
prefs = loadPrefs()
assert.strictEqual(prefs.look.grid, true, "loadPrefs() returns look.grid: true after setGrid(true)")

useSquig.getState().setContextRow(false)
prefs = loadPrefs()
assert.strictEqual(prefs.contextRow, false, "loadPrefs() returns contextRow: false after setContextRow(false)")

useSquig.getState().setPaper("shaded")
prefs = loadPrefs()
assert.strictEqual(prefs.look.paper, "shaded", "loadPrefs() returns look.paper: 'shaded'")

useSquig.getState().setTheme("apple")
prefs = loadPrefs()
assert.strictEqual(prefs.look.theme, "apple", "loadPrefs() returns look.theme: 'apple'")

useSquig.getState().setFont("sans")
prefs = loadPrefs()
assert.strictEqual(prefs.look.font, "sans", "loadPrefs() returns look.font: 'sans'")
console.log("  ✓ Canvas Look and ContextRow actions immediately update and persist to zenithsui:prefs")

// 4. Verify Preset & Visibility Sync
console.log("\n4. Testing Visibility Presets & Customizer Sync:")
useShellStore.getState().setAllVisibility(false)
assert.strictEqual(useShellStore.getState().miniMapOpen, false, "setAllVisibility(false) sets miniMapOpen: false")
assert.strictEqual(useShellStore.getState().preferences.showMiniMap, false, "setAllVisibility(false) sets showMiniMap: false")

useShellStore.getState().applyVisibilityPreset("studio")
assert.strictEqual(useShellStore.getState().miniMapOpen, true, "applyVisibilityPreset('studio') sets miniMapOpen: true")
assert.strictEqual(useShellStore.getState().preferences.showMiniMap, true, "applyVisibilityPreset('studio') sets showMiniMap: true")

useShellStore.getState().applyVisibilityPreset("presenter")
assert.strictEqual(useShellStore.getState().miniMapOpen, false, "applyVisibilityPreset('presenter') sets miniMapOpen: false")
assert.strictEqual(useShellStore.getState().preferences.showMiniMap, false, "applyVisibilityPreset('presenter') sets showMiniMap: false")
console.log("  ✓ Visibility presets and customizer actions keep miniMapOpen and showMiniMap synchronized")

console.log("\n============================================================")
console.log("ALL SETTINGS PERSISTENCE TESTS PASSED SUCCESSFULLY! 🎯")
console.log("============================================================")
