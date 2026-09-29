// ---------------------------------------------------------------------------
// Zenithsui Phase 2 Public Publishing & Slug Verification Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-phase2-public.ts
// ---------------------------------------------------------------------------

import { slugify, isValidSlug, isReservedSlug, generateUniqueSlug } from "../lib/slug.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("Running Zenithsui Phase 2 Public Publishing tests...\n")

  // 1. Slugification
  check("slugify converts spaces to hyphens", slugify("Landing Page Wireframe") === "landing-page-wireframe")
  check("slugify handles uppercase and punctuation", slugify("Hello, World! #2026") === "hello-world-2026")
  check("slugify trims hyphens from ends", slugify("---test-slug---") === "test-slug")
  check("slugify collapses multiple hyphens", slugify("a    b----c") === "a-b-c")
  check("slugify normalizes accents", slugify("Café & Crème") === "cafe-creme")

  // 2. Slug Validation
  check("Valid slug passes", isValidSlug("landing-page-v2"))
  check("Too short slug (<3 chars) fails", !isValidSlug("ab"))
  check("Slug with uppercase fails", !isValidSlug("Landing-Page"))
  check("Slug starting with hyphen fails", !isValidSlug("-landing-page"))
  check("Slug ending with hyphen fails", !isValidSlug("landing-page-"))
  check("Slug with special characters fails", !isValidSlug("landing_page!"))

  // 3. Reserved Slugs
  check("admin is reserved", isReservedSlug("admin"))
  check("api is reserved", isReservedSlug("api"))
  check("share is reserved", isReservedSlug("share"))
  check("p is reserved", isReservedSlug("p"))
  check("invite is reserved", isReservedSlug("invite"))
  check("dashboard is reserved", isReservedSlug("dashboard"))
  check("Regular document title is not reserved", !isReservedSlug("mobile-dashboard-concept"))

  // 4. Unique Slug Generation
  const uniqueFromReserved = generateUniqueSlug("admin")
  check("Reserved slug gets unique suffix", uniqueFromReserved.startsWith("admin-") && uniqueFromReserved.length > 6)
  check("Generated slug passes validation", isValidSlug(uniqueFromReserved))

  const existing = ["landing-page", "landing-page-2"]
  const collisionSlug = generateUniqueSlug("landing-page", existing)
  check("Collision with existing slugs gets random suffix", collisionSlug.startsWith("landing-page-") && !existing.includes(collisionSlug))

  console.log(`\nPhase 2 Public Publishing: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
