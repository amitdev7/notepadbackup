// ---------------------------------------------------------------------------
// Security, password hashing, and token validation for shared pages.
//
// Rules:
//   - Never store or transmit plaintext passwords.
//   - Use standard PBKDF2/HMAC crypto with unique salt per document.
//   - Strict limit of 3 failed password attempts per session/file.
//   - Signed HMAC edit tokens containing document ID and expiration.
// ---------------------------------------------------------------------------

import crypto from "node:crypto"

// In production a missing secret must fail loudly at USE time instead of
// signing tokens with a key every deployment shares. Local dev keeps the
// fallback. Lazy (not module scope) so `next build` never evaluates it.
let TOKEN_SECRET_CACHE: string | null = null
function getTokenSecret(): string {
  if (TOKEN_SECRET_CACHE) return TOKEN_SECRET_CACHE
  const fromEnv = process.env.ZENITHSUI_SECRET_KEY
  if (fromEnv) {
    TOKEN_SECRET_CACHE = fromEnv
    return TOKEN_SECRET_CACHE
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[security] ZENITHSUI_SECRET_KEY is required in production — set it in Vercel Project Settings → Environment Variables."
    )
  }
  TOKEN_SECRET_CACHE = "zenithsui-super-secret-salt-and-hmac-key-2026"
  return TOKEN_SECRET_CACHE
}
const MAX_FAILED_ATTEMPTS = 3
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes lockout after 3 failed attempts

interface AttemptRecord {
  count: number
  lastAttemptAt: number
  lockedUntil?: number
}

// In-memory tracking for failed attempts per session and file.
// Key format: `${sessionId}:${fileId}`
const attemptStore = new Map<string, AttemptRecord>()

/**
 * Hash a password securely with PBKDF2 and a cryptographic salt.
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, finalSalt, 10000, 32, "sha256").toString("hex")
  return { hash, salt: finalSalt }
}

/**
 * Verify a plain password against a stored salt and hash.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"))
  } catch {
    return false
  }
}

/**
 * Create a tamper-proof HMAC signed edit token.
 */
export function createEditToken(dbId: string, fileId: string, role: "editor" | "owner" = "editor"): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  const payload = `${dbId}:${fileId}:${role}:${expiresAt}`
  const signature = crypto.createHmac("sha256", getTokenSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}:${signature}`).toString("base64url")
}

/**
 * Verify an HMAC signed edit token.
 */
export function verifyEditToken(token: string, dbId: string, fileId: string): { valid: boolean; role?: "editor" | "owner" } {
  if (!token) return { valid: false }
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8")
    const parts = raw.split(":")
    if (parts.length !== 5) return { valid: false }
    const [tokenDbId, tokenFileId, role, expiresAtStr, signature] = parts
    if (tokenDbId !== dbId || tokenFileId !== fileId) return { valid: false }
    const expiresAt = parseInt(expiresAtStr, 10)
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return { valid: false }

    const payload = `${tokenDbId}:${tokenFileId}:${role}:${expiresAtStr}`
    const expectedSig = crypto.createHmac("sha256", getTokenSecret()).update(payload).digest("hex")
    if (crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
      return { valid: true, role: role as "editor" | "owner" }
    }
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

/**
 * Check if the session is currently locked out from attempting passwords on this file.
 */
export function getAttemptStatus(sessionId: string, fileId: string): { locked: boolean; attemptsLeft: number; count: number } {
  const key = `${sessionId}:${fileId}`
  const record = attemptStore.get(key)
  if (!record) {
    return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, count: 0 }
  }

  // Check if lockout has expired
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return { locked: true, attemptsLeft: 0, count: record.count }
  }

  // Lockout expired, reset count
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    attemptStore.delete(key)
    return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, count: 0 }
  }

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - record.count)
  return { locked: record.count >= MAX_FAILED_ATTEMPTS, attemptsLeft, count: record.count }
}

/**
 * Record a password attempt. Returns whether further attempts are allowed and how many remain.
 */
export function recordPasswordAttempt(
  sessionId: string,
  fileId: string,
  success: boolean
): { success: boolean; locked: boolean; attemptsLeft: number } {
  const key = `${sessionId}:${fileId}`
  if (success) {
    // Reset failed attempts on success
    attemptStore.delete(key)
    return { success: true, locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS }
  }

  const record = attemptStore.get(key) || { count: 0, lastAttemptAt: Date.now() }
  record.count += 1
  record.lastAttemptAt = Date.now()

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS
    attemptStore.set(key, record)
    return { success: false, locked: true, attemptsLeft: 0 }
  }

  attemptStore.set(key, record)
  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - record.count)
  return { success: false, locked: false, attemptsLeft }
}
