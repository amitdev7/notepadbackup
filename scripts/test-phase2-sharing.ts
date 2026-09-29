// ---------------------------------------------------------------------------
// Zenithsui Phase 2 Cryptographic Sharing & Token Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-phase2-sharing.ts
// ---------------------------------------------------------------------------

import {
  generateShareToken,
  hashShareTokenSync,
  timingSafeEqualShare,
  hashSharePassword,
  verifySharePassword,
  isShareTokenExpired,
  isShareTokenValid,
} from "../lib/security/share-crypto.ts"

import {
  createShareSessionToken,
  verifyShareSessionToken,
  getShareSessionCookieName,
  SharePasswordRateLimiter,
} from "../lib/security/share-session.ts"

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
  console.log("Running Zenithsui Phase 2 Cryptographic Sharing tests...\n")

  // 1. 256-bit CSPRNG Token Generation
  const token1 = generateShareToken(32)
  const token2 = generateShareToken(32)

  check("Share token has 43 characters (256-bit base64url)", token1.length === 43)
  check("Share token is unique (no collisions)", token1 !== token2)
  check("Share token contains only URL-safe base64url characters", /^[A-Za-z0-9_-]+$/.test(token1))

  // 2. Token Hashing (SHA-256)
  const hash1 = hashShareTokenSync(token1)
  const hash1b = hashShareTokenSync(token1)
  const hash2 = hashShareTokenSync(token2)

  check("SHA-256 hash is 64 hex characters", hash1.length === 64 && /^[0-9a-f]{64}$/.test(hash1))
  check("SHA-256 hash is deterministic", hash1 === hash1b)
  check("Different tokens yield different hashes", hash1 !== hash2)

  // 3. Constant-Time Comparison
  check("timingSafeEqualShare returns true for identical hashes", timingSafeEqualShare(hash1, hash1b))
  check("timingSafeEqualShare returns false for different hashes", !timingSafeEqualShare(hash1, hash2))
  check("timingSafeEqualShare returns false for different lengths", !timingSafeEqualShare(hash1, hash1.slice(0, 32)))

  // 4. PBKDF2 Password Hashing & Verification
  const testPassword = "SuperSecretCanvasPassword!987"
  const wrongPassword = "WrongPassword123"

  const { hash: pwdHash, salt: pwdSalt } = await hashSharePassword(testPassword)
  check("Password hash is 64 hex characters (32 bytes)", pwdHash.length === 64 && /^[0-9a-f]{64}$/.test(pwdHash))
  check("Password salt is 64 hex characters (32 bytes)", pwdSalt.length === 64 && /^[0-9a-f]{64}$/.test(pwdSalt))

  const validMatch = await verifySharePassword(testPassword, pwdHash, pwdSalt)
  const invalidMatch = await verifySharePassword(wrongPassword, pwdHash, pwdSalt)

  check("Password verification succeeds for correct password", validMatch)
  check("Password verification fails for incorrect password", !invalidMatch)

  // 5. Expiration & Status Checks
  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString()
  const futureDate = new Date(Date.now() + 3600 * 1000).toISOString()

  check("isShareTokenExpired returns true for past date", isShareTokenExpired(pastDate))
  check("isShareTokenExpired returns false for future date", !isShareTokenExpired(futureDate))
  check("isShareTokenExpired returns false for null/undefined (never expires)", !isShareTokenExpired(null))

  const activeLink = { is_active: true, expires_at: futureDate, revoked_at: null, max_uses: 10, use_count: 2 }
  const expiredLink = { is_active: true, expires_at: pastDate, revoked_at: null, max_uses: 10, use_count: 2 }
  const revokedLink = { is_active: true, expires_at: futureDate, revoked_at: pastDate, max_uses: 10, use_count: 2 }
  const exhaustedLink = { is_active: true, expires_at: futureDate, revoked_at: null, max_uses: 5, use_count: 5 }

  check("Valid active link passes validation", isShareTokenValid(activeLink))
  check("Expired link fails validation", !isShareTokenValid(expiredLink))
  check("Revoked link fails validation", !isShareTokenValid(revokedLink))
  check("Max uses exhausted link fails validation", !isShareTokenValid(exhaustedLink))

  // 6. Share Session HMAC Signing
  const linkId = "link_uuid_abc_123"
  const sessionToken = await createShareSessionToken(linkId)
  check("Session token generated with link ID", sessionToken.length > 50)

  const sessionValid = await verifyShareSessionToken(sessionToken, linkId)
  const sessionInvalidLink = await verifyShareSessionToken(sessionToken, "other_link_id")
  check("Session token verifies for matching link ID", sessionValid)
  check("Session token fails for non-matching link ID", !sessionInvalidLink)

  const cookieName = getShareSessionCookieName(linkId)
  check("Cookie name follows convention", cookieName.startsWith("zs_share_pwd_"))

  // 7. Rate Limiter (Brute-force protection)
  const limiter = new SharePasswordRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 })
  const ip = "192.168.1.100"

  for (let i = 0; i < 4; i++) {
    const res = limiter.recordAttempt(ip, false)
    check(`Attempt ${i + 1} allowed`, res.allowed && res.remainingAttempts === 5 - (i + 1))
  }

  const fifthAttempt = limiter.recordAttempt(ip, false)
  check("5th attempt allowed with 0 remaining", fifthAttempt.allowed && fifthAttempt.remainingAttempts === 0)

  const blockedAttempt = limiter.recordAttempt(ip, false)
  check("6th attempt strictly blocked (rate limit exceeded)", !blockedAttempt.allowed && blockedAttempt.retryAfterSeconds > 0)

  limiter.reset(ip)
  const postReset = limiter.recordAttempt(ip, true)
  check("Attempt allowed after reset", postReset.allowed)

  console.log(`\nPhase 2 Sharing & Crypto: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
