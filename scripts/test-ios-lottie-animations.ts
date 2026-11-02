// ---------------------------------------------------------------------------
// Zenithsui iOS & Lottie Animation Suite Test Suite
// Verifies adoption of airbnb/lottie-ios & v5tech/awesome-ios-animation
// dynamics, spring curves, micro-interactions, and layout invariants.
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

console.log("=== Starting Zenithsui iOS & Lottie Animation Suite Verification ===")

const globalsCssPath = path.resolve("app/globals.css")
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8")

// 1. Lottie & iOS Spring Physics Keyframes
console.log("\n1. Keyframe Definitions (airbnb/lottie-ios & awesome-ios-animation):")
const requiredKeyframes = [
  "lottie-spring-pop",
  "lottie-check-pop",
  "dot-spring-pop",
  "ios-pulse-halo",
  "ios-save-halo",
  "popover-spring-in",
  "modal-spring-in",
  "dock-slide-up",
  "topbar-slide-down",
]

for (const kf of requiredKeyframes) {
  assert.ok(globalsCss.includes(`@keyframes ${kf}`), `Missing @keyframes ${kf} in app/globals.css`)
  console.log(`  ✓ Found @keyframes ${kf}`)
}

// 2. Animation Utility Classes
console.log("\n2. Animation Utility Classes:")
const requiredClasses = [
  ".animate-lottie-bounce",
  ".animate-lottie-check",
  ".animate-ios-pulse-halo",
  ".animate-ios-save-halo",
  ".ios-bouncy-press",
  ".dock-active-dot",
  ".animate-dock-enter",
  ".animate-topbar-enter",
]

for (const cls of requiredClasses) {
  assert.ok(globalsCss.includes(cls), `Missing animation class ${cls} in app/globals.css`)
  console.log(`  ✓ Found animation class ${cls}`)
}

// 3. Layout Invariants & Position Safety
console.log("\n3. Layout Invariants & Position Safety:")
const topBarPath = path.resolve("components/shell/top-bar.tsx")
const bottomDockPath = path.resolve("components/shell/bottom-dock.tsx")
const topBarCode = fs.readFileSync(topBarPath, "utf-8")
const bottomDockCode = fs.readFileSync(bottomDockPath, "utf-8")

// TopBar must be anchored to top
assert.ok(
  topBarCode.includes("fixed top-[max(0.75rem,env(safe-area-inset-top))]"),
  "TopBar must be strictly anchored to top of screen"
)
console.log("  ✓ TopBar strictly anchored to top of screen with safe area inset")

// BottomDock must be anchored to bottom
assert.ok(
  bottomDockCode.includes("fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))]"),
  "BottomDock must be strictly anchored to bottom of screen"
)
console.log("  ✓ BottomDock strictly anchored to bottom of screen with safe area inset")

// BottomDock container must center horizontally
assert.ok(
  bottomDockCode.includes("inset-x-0 z-40 flex items-center justify-center"),
  "BottomDock must use flexbox horizontal centering"
)
console.log("  ✓ BottomDock uses flexbox horizontal centering")

// MagnifiedDockItem uses Lottie bounce and iOS press
assert.ok(
  bottomDockCode.includes("animate-lottie-bounce"),
  "BottomDock item must feature animate-lottie-bounce"
)
assert.ok(
  bottomDockCode.includes("ios-bouncy-press"),
  "BottomDock item must feature ios-bouncy-press tactile interaction"
)
console.log("  ✓ BottomDock items feature Lottie vector spring bounce and iOS tactile feedback")

// TopBar features Lottie check pop & iOS halo
assert.ok(
  topBarCode.includes("animate-lottie-check"),
  "TopBar must feature animate-lottie-check on document save"
)
assert.ok(
  topBarCode.includes("animate-ios-pulse-halo") || topBarCode.includes("animate-ios-save-halo"),
  "TopBar must feature iOS halo status indicators"
)
console.log("  ✓ TopBar features Lottie checkmark pop and iOS halo pulse dynamics")

// Apple glass pill must NOT override fixed positioning
assert.ok(
  !globalsCss.includes(".apple-glass-pill {\n  position: relative;"),
  "apple-glass-pill must not unilaterally force position: relative"
)
console.log("  ✓ .apple-glass-pill does not clobber fixed layout positioning")

console.log("\n============================================================")
console.log("ALL IOS & LOTTIE ANIMATION INVARIANTS PASSED SUCCESSFULLY! 🎯")
console.log("============================================================\n")
