// ---------------------------------------------------------------------------
// Test Suite: Math Study Tracker Library Component Verification
// ---------------------------------------------------------------------------

import { getDef, ALL_DEFS } from "../lib/library/registry"
import {
  mathStudyTrackerDef,
  DEFAULT_TRACKER_COLUMNS,
  DEFAULT_TRACKER_CHAPTERS,
} from "../lib/library/defs-math-study-tracker"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`)
    process.exit(1)
  }
}

console.log("🧪 Testing Math Study Tracker Library Component...\n")

// 1. Registry presence
const registered = getDef("math-study-tracker")
assert(Boolean(registered), "math-study-tracker must be registered in component registry")
assert(registered?.kind === "math-study-tracker", "Registered kind must be 'math-study-tracker'")
assert(registered?.interactive === true, "Component must be flagged as interactive: true")
assert(registered?.category === "blocks", "Category must be 'blocks'")
assert(registered?.group === "Education", "Group must be 'Education'")
console.log("✅ 1. Registered properly in component registry (kind, group, interactive)")

// 2. Default dimensions and metadata
assert(registered?.size.w === 520, "Default width must be 520")
assert(registered?.size.h === 560, "Default height must be 560")
assert(registered?.keywords?.includes("math") === true, "Must include 'math' keyword")
assert(registered?.keywords?.includes("study") === true, "Must include 'study' keyword")
assert(registered?.keywords?.includes("tracker") === true, "Must include 'tracker' keyword")
console.log("✅ 2. Default dimensions and searchable keywords verified")

// 3. Default columns & chapters matching reference image
assert(DEFAULT_TRACKER_COLUMNS.length === 4, "Must have exactly 4 columns")
assert(DEFAULT_TRACKER_COLUMNS[0].title === "NCERT", "Col 1 must be NCERT")
assert(DEFAULT_TRACKER_COLUMNS[1].title === "Ushank" && DEFAULT_TRACKER_COLUMNS[1].subtitle === "Sir", "Col 2 must be Ushank Sir")
assert(DEFAULT_TRACKER_COLUMNS[2].title === "Shobhit" && DEFAULT_TRACKER_COLUMNS[2].subtitle === "Sir", "Col 3 must be Shobhit Sir")
assert(DEFAULT_TRACKER_COLUMNS[3].title === "NCERT" && DEFAULT_TRACKER_COLUMNS[3].subtitle === "Exemplar", "Col 4 must be NCERT Exemplar")
console.log("✅ 3. Columns verified (NCERT, Ushank Sir, Shobhit Sir, NCERT Exemplar)")

assert(DEFAULT_TRACKER_CHAPTERS.length === 5, "Must have 5 default Class 10 Math chapters")
assert(DEFAULT_TRACKER_CHAPTERS[0].number === "01" && DEFAULT_TRACKER_CHAPTERS[0].name.includes("Statistics"), "Ch 1 must be Statistics")
assert(DEFAULT_TRACKER_CHAPTERS[1].number === "02" && DEFAULT_TRACKER_CHAPTERS[1].name.includes("Surface Areas"), "Ch 2 must be Surface Areas and Volumes")
assert(DEFAULT_TRACKER_CHAPTERS[2].number === "03" && DEFAULT_TRACKER_CHAPTERS[2].name.includes("Trigonometry"), "Ch 3 must be Trigonometry")
assert(DEFAULT_TRACKER_CHAPTERS[3].number === "04" && DEFAULT_TRACKER_CHAPTERS[3].name.includes("Circles"), "Ch 4 must be Areas Related to Circles")
assert(DEFAULT_TRACKER_CHAPTERS[4].number === "05" && DEFAULT_TRACKER_CHAPTERS[4].name.includes("Circles"), "Ch 5 must be Circles")
console.log("✅ 4. 5 Class 10 Math chapters verified")

// 4. Vector render() output validation
const prims = mathStudyTrackerDef.render(mathStudyTrackerDef.defaults, 520, 560)
assert(Array.isArray(prims) && prims.length > 20, "Vector render() must emit valid primitives")

const hasPaperPoly = prims.some(p => p.t === "poly" && p.pts.length > 20)
assert(hasPaperPoly, "Must render torn deckle paper polygon")

const hasPaperclip = prims.some(p => p.t === "line" && p.o?.customStroke === "#64748B")
assert(hasPaperclip, "Must render metallic paperclip wire lines")

const hasOrangeStars = prims.some(p => p.t === "poly" && p.o?.customStroke === "#FC883F")
assert(hasOrangeStars, "Must render sketched orange stars")

const hasTitle = prims.some(p => p.t === "text" && p.text === "math study tracker")
assert(hasTitle, "Must render title 'math study tracker'")

const hasHeader = prims.some(p => p.t === "text" && p.text === "CHAPTERS")
assert(hasHeader, "Must render 'CHAPTERS' header")

const hasBoxes = prims.filter(p => p.t === "rect" && p.w === 28 && p.h === 28)
assert(hasBoxes.length === 20, `Must render 20 checkboxes (5 chapters * 4 columns), got ${hasBoxes.length}`)

const hasCircleIcons = prims.filter(p => p.t === "ellipse" && p.w === 44 && p.h === 44)
assert(hasCircleIcons.length === 5, `Must render 5 circular math icon frames, got ${hasCircleIcons.length}`)

console.log("✅ 5. Vector render() primitives verified (paper poly, clip, stars, title, table, 20 checkboxes, 5 circle icons)")

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")
