// ---------------------------------------------------------------------------
// Zen Mode & Custom Keybind Test Suite
// Verifies pure canvas preferences, keybind matching, event recording, and defaults.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  matchesKeybind,
  eventToKeybindSpec,
  kbd,
  ZEN_MODE_PRESETS,
} from "../lib/shortcuts.ts"
import {
  useShellStore,
  DEFAULT_PREFERENCES,
} from "../lib/shell-store.ts"

console.log("=== Starting Zen Mode & Custom Keybind Verification ===")

// 1. Defaults & Store Invariants
console.log("\n1. Store Defaults & Custom Preference Setters:")
assert.equal(
  DEFAULT_PREFERENCES.zenModeKeybind,
  "mod+\\",
  "DEFAULT_PREFERENCES.zenModeKeybind must default to 'mod+\\'"
)
assert.equal(
  DEFAULT_PREFERENCES.zenModeExitHint,
  true,
  "DEFAULT_PREFERENCES.zenModeExitHint must default to true"
)
console.log("  ✓ DEFAULT_PREFERENCES has correct zenModeKeybind and zenModeExitHint")

// Test store updater
useShellStore.getState().setZenModeKeybind("f11")
assert.equal(
  useShellStore.getState().preferences.zenModeKeybind,
  "f11",
  "setZenModeKeybind('f11') must update preferences.zenModeKeybind"
)
console.log("  ✓ setZenModeKeybind updates store preferences")

useShellStore.getState().setZenModeExitHint(false)
assert.equal(
  useShellStore.getState().preferences.zenModeExitHint,
  false,
  "setZenModeExitHint(false) must update preferences.zenModeExitHint"
)
console.log("  ✓ setZenModeExitHint updates store preferences")

// Reset to default
useShellStore.getState().setZenModeKeybind("mod+\\")
useShellStore.getState().setZenModeExitHint(true)
assert.equal(useShellStore.getState().preferences.zenModeKeybind, "mod+\\")
assert.equal(useShellStore.getState().preferences.zenModeExitHint, true)
console.log("  ✓ Reset to default verified")

// 2. Preset Integrity
console.log("\n2. Presets Integrity:")
assert.ok(Array.isArray(ZEN_MODE_PRESETS) && ZEN_MODE_PRESETS.length >= 5)
assert.ok(ZEN_MODE_PRESETS.some((p) => p.spec === "mod+\\"))
assert.ok(ZEN_MODE_PRESETS.some((p) => p.spec === "f11"))
assert.ok(ZEN_MODE_PRESETS.some((p) => p.spec === "z"))
assert.ok(ZEN_MODE_PRESETS.some((p) => p.spec === "alt+z"))
assert.ok(ZEN_MODE_PRESETS.some((p) => p.spec === "mod+h"))
assert.ok(ZEN_MODE_PRESETS.some((p) => p.spec === "mod+shift+f"))
console.log(`  ✓ All ${ZEN_MODE_PRESETS.length} presets valid`)

// 3. Keybind Matching Engine (matchesKeybind)
console.log("\n3. Keybind Matching Engine:")

// Synthetic KeyboardEvent helper
function makeKeyEvent(opts: {
  key?: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}): KeyboardEvent {
  return {
    key: opts.key ?? "",
    code: opts.code ?? "",
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    altKey: opts.altKey ?? false,
    shiftKey: opts.shiftKey ?? false,
  } as unknown as KeyboardEvent
}

// 3a. Default "mod+\"
const eModBackslash = makeKeyEvent({ key: "\\", code: "Backslash", ctrlKey: true })
assert.equal(matchesKeybind(eModBackslash, "mod+\\"), true, "Ctrl+\\ must match 'mod+\\' on non-Mac")
assert.equal(matchesKeybind(makeKeyEvent({ key: "\\", code: "Backslash" }), "mod+\\"), false, "Plain \\ must not match 'mod+\\'")

// 3b. "f11"
const eF11 = makeKeyEvent({ key: "F11", code: "F11" })
assert.equal(matchesKeybind(eF11, "f11"), true, "F11 must match 'f11'")
assert.equal(matchesKeybind(makeKeyEvent({ key: "F11", code: "F11", ctrlKey: true }), "f11"), false, "Ctrl+F11 must not match 'f11'")

// 3c. "z"
const eZ = makeKeyEvent({ key: "z", code: "KeyZ" })
assert.equal(matchesKeybind(eZ, "z"), true, "Single Z must match 'z'")
assert.equal(matchesKeybind(makeKeyEvent({ key: "z", code: "KeyZ", ctrlKey: true }), "z"), false, "Ctrl+Z must not match 'z'")

// 3d. "alt+z"
const eAltZ = makeKeyEvent({ key: "z", code: "KeyZ", altKey: true })
assert.equal(matchesKeybind(eAltZ, "alt+z"), true, "Alt+Z must match 'alt+z'")
assert.equal(matchesKeybind(makeKeyEvent({ key: "z", code: "KeyZ" }), "alt+z"), false, "Plain Z must not match 'alt+z'")

// 3e. "mod+shift+f"
const eModShiftF = makeKeyEvent({ key: "F", code: "KeyF", ctrlKey: true, shiftKey: true })
assert.equal(matchesKeybind(eModShiftF, "mod+shift+f"), true, "Ctrl+Shift+F must match 'mod+shift+f'")
assert.equal(matchesKeybind(makeKeyEvent({ key: "F", code: "KeyF", ctrlKey: true }), "mod+shift+f"), false, "Ctrl+F must not match 'mod+shift+f'")

// 3f. Edge Cases & Safety
assert.equal(matchesKeybind(eF11, ""), false, "Empty keybind string must return false")
assert.equal(matchesKeybind(eF11, "   "), false, "Whitespace keybind must return false")
console.log("  ✓ matchesKeybind correctly evaluates all modifier combinations and keys")

// 4. Keyboard Event Recording (eventToKeybindSpec)
console.log("\n4. Keyboard Event Recording Engine:")

// Modifier-only key presses should be ignored until primary key is pressed
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "Control" })), null)
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "Shift" })), null)
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "Alt" })), null)
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "Meta" })), null)
console.log("  ✓ Modifier-only presses return null during key recording")

// F11
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "F11", code: "F11" })), "f11")
// Single Z
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "z", code: "KeyZ" })), "z")
// Alt+Z
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "z", code: "KeyZ", altKey: true })), "alt+z")
// Ctrl+\ on PC
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "\\", code: "Backslash", ctrlKey: true })), "mod+\\")
// Ctrl+Shift+F on PC
assert.equal(eventToKeybindSpec(makeKeyEvent({ key: "F", code: "KeyF", ctrlKey: true, shiftKey: true })), "mod+shift+f")
console.log("  ✓ eventToKeybindSpec properly records single keys, function keys, and chord combinations")

// 5. Display Formatting (kbd)
console.log("\n5. Formatting for Display:")
assert.ok(typeof kbd("mod+\\") === "string" && kbd("mod+\\").length > 0)
assert.ok(typeof kbd("f11") === "string" && kbd("f11").length > 0)
assert.ok(typeof kbd("alt+z") === "string" && kbd("alt+z").length > 0)
console.log("  ✓ kbd() formats all specs properly across platforms")

console.log("\n============================================================")
console.log("ALL ZEN MODE & CUSTOM KEYBIND TESTS PASSED SUCCESSFULLY! 🎯")
console.log("============================================================")
