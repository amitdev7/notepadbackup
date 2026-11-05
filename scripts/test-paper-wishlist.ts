// ---------------------------------------------------------------------------
// Zenithsui Paper Wishlist Component Verification Suite
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import { getDef, searchUnifiedLibrary } from "../lib/library/registry.ts"
import {
  DEFAULT_WISHLIST_ITEMS,
  paperWishlistDef,
} from "../lib/library/defs-paper-wishlist.ts"

console.log("=== Testing Paper Wishlist Component ===")

// 1. Definition check
console.log("1. Checking component definition...")
const def = getDef("paper-wishlist")
assert(def, "paper-wishlist must be registered in the component registry")
assert.equal(def.kind, "paper-wishlist")
assert.equal(def.name, "Paper Wishlist")
assert.equal(def.category, "blocks")
assert.equal(def.interactive, true, "Must be flagged as interactive")
console.log("  ✓ Component definition is valid and registered")

// 2. Search check
console.log("2. Checking searchability...")
const found = searchUnifiedLibrary("wishlist")
assert(found.some((d) => d.kind === "paper-wishlist"), "Must be found by search query 'wishlist'")
const foundHoliday = searchUnifiedLibrary("bank holiday")
assert(foundHoliday.some((d) => d.kind === "paper-wishlist"), "Must be found by 'bank holiday'")
const foundChecklist = searchUnifiedLibrary("checklist")
assert(foundChecklist.some((d) => d.kind === "paper-wishlist"), "Must be found by 'checklist'")
console.log("  ✓ Searchable by 'wishlist', 'bank holiday', and 'checklist'")

// 3. Render primitives
console.log("3. Checking render output...")
const prims = def.render(def.defaults, def.size.w, def.size.h)
assert(Array.isArray(prims) && prims.length > 0, "Render must return primitives")

// Verify torn paper polygon
const paper = prims.find((p) => p.t === "poly" && "o" in p && p.o?.customFill === "#FCFAF6")
assert(paper, "Must render off-white stationery paper sheet with customFill")

// Verify stars
const stars = prims.filter((p) => p.t === "poly" && "o" in p && p.o?.customFill === "#FC883F")
assert(stars.length >= 2, "Must render two orange stars flanking title")

// Verify title text
const titleText = prims.filter((p) => p.t === "text" && "customColor" in p && p.customColor === "#FC883F")
assert(titleText.some((t) => t.t === "text" && t.text === "bank holiday"), "Must render 'bank holiday' in bold orange")
assert(titleText.some((t) => t.t === "text" && t.text === "wishlist"), "Must render 'wishlist' in bold orange")

// Verify dashed divider lines
const dashed = prims.filter((p) => p.t === "line" && "o" in p && p.o?.dashed === true)
assert(dashed.length >= 4, "Must render at least 4 horizontal dashed divider lines")

// Verify default items
const matchaText = prims.find((p) => p.t === "text" && p.text.includes("Matcha"))
assert(matchaText, "Must render 'Matcha & good' item text")
const girlsText = prims.find((p) => p.t === "text" && p.text.includes("girls"))
assert(girlsText, "Must render 'Day out with the girls' item text")
const hairText = prims.find((p) => p.t === "text" && p.text.includes("haircare"))
assert(hairText, "Must render 'Discover new haircare essentials' item text")

// 4. Custom props render
console.log("4. Checking custom props & details...")
const customPrims = def.render(
  {
    titleLine1: "summer vacation",
    titleLine2: "to-do list",
    accentColor: "emerald",
    items: [
      { id: "1", text: "Beach trip", subtext: "Pack sunscreen", done: true, icon: "sun" },
    ],
  },
  340,
  480
)
const customTitle = customPrims.find((p) => p.t === "text" && p.text === "summer vacation")
assert(customTitle, "Must support custom title")
const customItem = customPrims.find((p) => p.t === "text" && p.text === "Beach trip")
assert(customItem, "Must support custom items")

console.log("=== ALL PAPER WISHLIST TESTS PASSED! 🍵🛍️✨ ===")
