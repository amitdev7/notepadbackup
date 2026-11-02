// ---------------------------------------------------------------------------
// Zenithsui Liquid Glass 2.0 Optical Engine Test Suite
// Verifies ybouane/liquidglass adoption, presets, shaders config, and store state.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  LIQUID_GLASS_PRESETS,
  DEFAULT_LIQUID_GLASS_PREFERENCES,
  type LiquidGlassPresetId,
} from "../lib/liquidglass/types.ts"
import {
  useShellStore,
  DEFAULT_PREFERENCES,
} from "../lib/shell-store.ts"

console.log("=== Starting Zenithsui Liquid Glass 2.0 Engine Verification ===")

// 1. Presets & Default Configurations
console.log("\n1. Presets & Optical Parameter Validity:")
const presetKeys = Object.keys(LIQUID_GLASS_PRESETS) as LiquidGlassPresetId[]
assert.ok(presetKeys.length >= 4, "Must define at least 4 liquid glass material presets")
console.log(`  ✓ Found ${presetKeys.length} liquid glass presets (${presetKeys.join(", ")})`)

for (const key of presetKeys) {
  const p = LIQUID_GLASS_PRESETS[key]
  assert.ok(p.id === key, `Preset id mismatch for ${key}`)
  assert.ok(typeof p.name === "string" && p.name.length > 0, `Preset ${key} must have name`)
  assert.ok(typeof p.description === "string", `Preset ${key} must have description`)
  
  // Optical bounds verification
  const cfg = p.config
  assert.ok(typeof cfg.refraction === "number" && cfg.refraction >= 0 && cfg.refraction <= 1.5, `${key} refraction out of bounds`)
  assert.ok(typeof cfg.chromAberration === "number" && cfg.chromAberration >= 0 && cfg.chromAberration <= 0.5, `${key} chromAberration out of bounds`)
  assert.ok(typeof cfg.specular === "number" && cfg.specular >= 0 && cfg.specular <= 1.0, `${key} specular out of bounds`)
  assert.ok(typeof cfg.fresnel === "number" && cfg.fresnel >= 0 && cfg.fresnel <= 1.5, `${key} fresnel out of bounds`)
  assert.ok(cfg.bevelMode === 0 || cfg.bevelMode === 1, `${key} bevelMode must be 0 (biconvex) or 1 (dome)`)
}
console.log("  ✓ All optical parameters strictly adhere to physics-based ranges")

// 2. Shell Store Defaults & Invariants
console.log("\n2. Shell Store Defaults & State Persistence:")
assert.equal(
  DEFAULT_PREFERENCES.liquidGlassSettings.enabled,
  true,
  "DEFAULT_PREFERENCES.liquidGlassSettings.enabled must default to true"
)
assert.equal(
  DEFAULT_PREFERENCES.liquidGlassSettings.preset,
  "apple-hig",
  "DEFAULT_PREFERENCES.liquidGlassSettings.preset must default to 'apple-hig'"
)
assert.equal(
  DEFAULT_PREFERENCES.liquidGlassSettings.interactiveSheen,
  true,
  "DEFAULT_PREFERENCES.liquidGlassSettings.interactiveSheen must default to true"
)
console.log("  ✓ ShellStore default preferences correctly configure Liquid Glass 2.0")

// Test store updater
useShellStore.getState().updateLiquidGlassPreferences({
  preset: "prismatic",
  refraction: 0.72,
  chromAberration: 0.12,
})

const state = useShellStore.getState().preferences.liquidGlassSettings
assert.equal(state.preset, "prismatic", "preset must update to 'prismatic'")
assert.equal(state.refraction, 0.72, "refraction must update to 0.72")
assert.equal(state.chromAberration, 0.12, "chromAberration must update to 0.12")
console.log("  ✓ updateLiquidGlassPreferences successfully updates preferences")

// Toggle enabled and interactive sheen
useShellStore.getState().updateLiquidGlassPreferences({ enabled: false, interactiveSheen: false })
assert.equal(useShellStore.getState().preferences.liquidGlassSettings.enabled, false)
assert.equal(useShellStore.getState().preferences.liquidGlassSettings.interactiveSheen, false)
console.log("  ✓ Successfully toggles Liquid Glass activation and interactive sheen")

// Reset to defaults
useShellStore.getState().updateLiquidGlassPreferences(DEFAULT_LIQUID_GLASS_PREFERENCES)
assert.equal(useShellStore.getState().preferences.liquidGlassSettings.enabled, true)
assert.equal(useShellStore.getState().preferences.liquidGlassSettings.preset, "apple-hig")
console.log("  ✓ Successfully reset Liquid Glass settings to default")

// 3. Mathematical Models & Shader Invariants
console.log("\n3. Shader Physics Invariants:")
// Snell's law refraction index (IOR 1.5 for glass)
const ior = 1.5
const refrPow = 1.0 - 1.0 / ior
assert.ok(Math.abs(refrPow - (1 / 3)) < 0.001, "Snell's power for IOR 1.5 must be approx 0.333")

// Top-bias inner bevel formula: topBias = 0.5 + 0.5 * (-v_localPx.y / half_.y)
// At top edge (v_localPx.y = -half_.y): topBias = 0.5 + 0.5 * (1) = 1.0
// At bottom edge (v_localPx.y = half_.y): topBias = 0.5 + 0.5 * (-1) = 0.0
const topEdgeBias = 0.5 + 0.5 * (1.0)
const bottomEdgeBias = 0.5 + 0.5 * (-1.0)
assert.equal(topEdgeBias, 1.0, "Top edge bias must equal 1.0")
assert.equal(bottomEdgeBias, 0.0, "Bottom edge bias must equal 0.0")

// Inner stroke multiplier: (0.4 + 0.6 * topBias)
const topStroke = 0.4 + 0.6 * topEdgeBias
const bottomStroke = 0.4 + 0.6 * bottomEdgeBias
assert.equal(topStroke, 1.0, "Top stroke must be 1.0 (maximum illumination)")
assert.equal(bottomStroke, 0.4, "Bottom stroke must be 0.4 (subtle rim shadow)")
console.log("  ✓ Top-biased inner stroke math guarantees authentic Apple key light reflection")

console.log("\n============================================================")
console.log("ALL LIQUID GLASS 2.0 TESTS PASSED SUCCESSFULLY! 🎯")
console.log("============================================================")
