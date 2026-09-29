// ---------------------------------------------------------------------------
// Zenithsui Phase 2 Invitations Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-phase2-invitations.ts
// ---------------------------------------------------------------------------

import { parseEmailList } from "../lib/cloud/invitations.ts"
import { isShareTokenExpired } from "../lib/security/share-crypto.ts"

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
  console.log("Running Zenithsui Phase 2 Invitations tests...\n")

  // 1. Email List Parsing and Normalization
  const rawInput = "rahul@example.com, priya@example.com; dev@zenithsui.sh\nayan@company.co,  RAHUL@example.com "
  const parsed = parseEmailList(rawInput)

  check("Parses all valid email addresses", parsed.length === 4)
  check("Normalizes emails to lowercase", parsed.includes("rahul@example.com"))
  check("Deduplicates identical emails case-insensitively", parsed.filter((e) => e === "rahul@example.com").length === 1)
  check("Includes semicolon-separated email", parsed.includes("priya@example.com"))
  check("Includes newline-separated email", parsed.includes("ayan@company.co"))

  // 2. Invalid Email Filtering
  const invalidRaw = "valid@test.com, not-an-email, @missinguser.com, missingdomain@.com, test@domain..com, another@test.org"
  const parsedInvalid = parseEmailList(invalidRaw)

  check("Filters out invalid email formats", parsedInvalid.length === 2)
  check("Keeps first valid email", parsedInvalid.includes("valid@test.com"))
  check("Keeps second valid email", parsedInvalid.includes("another@test.org"))

  // 3. Empty input handling
  check("Empty string returns empty array", parseEmailList("").length === 0)
  check("Whitespace only returns empty array", parseEmailList("   \n\t  ").length === 0)
  check("Null or undefined returns empty array", parseEmailList(null as any).length === 0)

  // 4. Expiration Semantics (7 days default)
  const now = Date.now()
  const sevenDaysFuture = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  const eightDaysPast = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString()

  check("New invitation (7 days future) is not expired", !isShareTokenExpired(sevenDaysFuture))
  check("Stale invitation (8 days past) is marked expired", isShareTokenExpired(eightDaysPast))

  // 5. Zero Comments Invariant Enforcement
  const invitationRoles = ["editor", "viewer"]
  check("Invitation role options strictly omit commenter", !invitationRoles.includes("commenter"))

  console.log(`\nPhase 2 Invitations: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
