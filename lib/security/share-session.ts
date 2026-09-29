// ---------------------------------------------------------------------------
// Zenithsui Share Link Password Verification Session & Rate Limiting
//
// Manages cryptographically signed session tokens and brute-force rate
// limiting for password-protected share links.
//
// Key Guarantees:
// 1. Session Persistence: Users who successfully enter a share link password
//    receive an HMAC-SHA256 signed session cookie (valid 24h) preventing
//    repetitive password prompts on that device.
// 2. Cryptographic Integrity: Pure WebCrypto (SubtleCrypto) HMAC-SHA256
//    signature generation and constant-time verification.
// 3. Brute-Force Rate Limiting: Sliding-window limiter enforcing maximum
//    5 failed attempts per 15-minute window per IP or share link identifier.
// 4. Zero External Dependencies: Runs natively in Node.js, Next.js Edge, and
//    browser environments.
// ---------------------------------------------------------------------------

// -- Configuration Constants ------------------------------------------------

/**
 * Standard lifetime for verified share session tokens (24 hours in milliseconds).
 */
export const SHARE_SESSION_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Maximum permitted failed password attempts before locking out the identifier.
 */
export const SHARE_PASSWORD_MAX_ATTEMPTS = 5

/**
 * Sliding window duration for share password brute-force limiting (15 minutes).
 */
export const SHARE_PASSWORD_WINDOW_MS = 15 * 60 * 1000

// -- Types & Interfaces -----------------------------------------------------

/**
 * Decoded payload stored within a signed share session token.
 */
export interface ShareSessionPayload {
  linkId: string
  exp: number
}

/**
 * Result returned by share password rate limiting operations.
 */
export interface SharePasswordRateLimitResult {
  allowed: boolean
  remainingAttempts: number
  retryAfterSeconds: number
}

/**
 * Options for configuring a SharePasswordRateLimiter instance.
 */
export interface SharePasswordRateLimiterOptions {
  maxAttempts?: number
  windowMs?: number
  nowProvider?: () => number
}

/**
 * Cookie options helper interface for setting session cookies.
 */
export interface ShareSessionCookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: "lax" | "strict" | "none"
  path: string
  maxAge: number
}

// -- Crypto & Encoding Helpers ----------------------------------------------

/**
 * Obtains the WebCrypto SubtleCrypto provider available in the current runtime.
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return crypto.subtle
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle
  }
  throw new Error("WebCrypto SubtleCrypto is not available in the current environment.")
}

/**
 * Encodes a Uint8Array into a URL-safe Base64 string without trailing padding.
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64url")
  }
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/**
 * Decodes a URL-safe Base64 string back into a Uint8Array.
 */
export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64Url, "base64url")
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = base64.length % 4
  if (pad === 2) {
    base64 += "=="
  } else if (pad === 3) {
    base64 += "="
  } else if (pad === 1) {
    throw new Error("Invalid base64url string length")
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Encodes a UTF-8 string to base64url.
 */
export function stringToBase64Url(str: string): string {
  const encoder = new TextEncoder()
  return uint8ArrayToBase64Url(encoder.encode(str))
}

/**
 * Decodes a base64url string to a UTF-8 string.
 */
export function base64UrlToString(base64Url: string): string {
  const bytes = base64UrlToUint8Array(base64Url)
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

/**
 * Constant-time string equality check to prevent timing analysis attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Resolves the signing secret from the optional argument or environment variables.
 */
function resolveSecretKey(secretKey?: string): string {
  if (secretKey && secretKey.trim().length > 0) {
    return secretKey.trim()
  }
  if (typeof process !== "undefined" && process?.env) {
    const envSecret =
      process.env.SHARE_SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.ZENITHSUI_GATEWAY_SECRET
    if (envSecret && envSecret.trim().length > 0) {
      return envSecret.trim()
    }
  }
  return "zenithsui-share-session-default-secret-salt-2026"
}

// -- Session Cookie Helper --------------------------------------------------

/**
 * Returns the cookie name used to store the verified password session token
 * for a specific share link ID.
 *
 * Pattern: `zs_share_pwd_${shareLinkId.slice(0, 8)}`
 */
export function getShareSessionCookieName(shareLinkId: string): string {
  if (typeof shareLinkId !== "string" || shareLinkId.trim().length === 0) {
    throw new TypeError("getShareSessionCookieName requires a valid shareLinkId string")
  }
  const cleanId = shareLinkId.trim()
  return `zs_share_pwd_${cleanId.slice(0, 8)}`
}

/**
 * Helper to construct standard cookie options for verified share sessions.
 */
export function getShareSessionCookieOptions(
  expiresInMs: number = SHARE_SESSION_DURATION_MS
): ShareSessionCookieOptions {
  return {
    httpOnly: true,
    secure: typeof process !== "undefined" && process.env?.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(expiresInMs / 1000),
  }
}

// -- Token Creation & Verification ------------------------------------------

/**
 * Creates an HMAC-SHA256 signed session token for a verified share link password.
 *
 * Payload: `{ linkId: shareLinkId, exp: Date.now() + 24 * 60 * 60 * 1000 }`
 * Format: `<base64url(payload)>.<base64url(hmac)>`
 *
 * @param shareLinkId ID of the share link that was unlocked
 * @param secretKey Optional HMAC signing secret (falls back to environment configuration)
 * @param expiresInMs Optional validity duration (defaults to 24 hours)
 */
export async function createShareSessionToken(
  shareLinkId: string,
  secretKey?: string,
  expiresInMs: number = SHARE_SESSION_DURATION_MS
): Promise<string> {
  if (typeof shareLinkId !== "string" || shareLinkId.trim().length === 0) {
    throw new TypeError("createShareSessionToken requires a valid shareLinkId string")
  }

  const now = Date.now()
  const payload: ShareSessionPayload = {
    linkId: shareLinkId.trim(),
    exp: now + expiresInMs,
  }

  const payloadJson = JSON.stringify(payload)
  const payloadB64 = stringToBase64Url(payloadJson)

  const resolvedSecret = resolveSecretKey(secretKey)
  const subtle = getSubtleCrypto()
  const encoder = new TextEncoder()
  const keyData = encoder.encode(resolvedSecret)

  const cryptoKey = await subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  )

  const signatureBuffer = await subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payloadB64)
  )

  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer))
  return `${payloadB64}.${signatureB64}`
}

/**
 * Verifies a share session token against a shareLinkId.
 *
 * Validates:
 * 1. Token structural format (`<payload>.<signature>`)
 * 2. HMAC-SHA256 cryptographic signature
 * 3. Link ID match (`payload.linkId === shareLinkId`)
 * 4. Token expiration (`payload.exp > Date.now()`)
 *
 * Returns `false` gracefully if validation fails or token is tampered with.
 *
 * @param token Encoded session token string
 * @param shareLinkId Target share link ID to verify against
 * @param secretKey Optional HMAC signing secret
 */
export async function verifyShareSessionToken(
  token: string,
  shareLinkId: string,
  secretKey?: string
): Promise<boolean> {
  if (
    typeof token !== "string" ||
    token.trim().length === 0 ||
    typeof shareLinkId !== "string" ||
    shareLinkId.trim().length === 0
  ) {
    return false
  }

  const cleanToken = token.trim()
  const cleanLinkId = shareLinkId.trim()

  const parts = cleanToken.split(".")
  if (parts.length !== 2) {
    return false
  }

  const [payloadB64, signatureB64] = parts
  if (!payloadB64 || !signatureB64) {
    return false
  }

  try {
    const resolvedSecret = resolveSecretKey(secretKey)
    const subtle = getSubtleCrypto()
    const encoder = new TextEncoder()
    const keyData = encoder.encode(resolvedSecret)

    const cryptoKey = await subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["verify"]
    )

    const signatureBytes = base64UrlToUint8Array(signatureB64)
    const isValidSignature = await subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes,
      encoder.encode(payloadB64)
    )

    if (!isValidSignature) {
      return false
    }

    const payloadJson = base64UrlToString(payloadB64)
    const payload = JSON.parse(payloadJson) as ShareSessionPayload

    if (!payload || typeof payload !== "object") {
      return false
    }

    if (typeof payload.linkId !== "string" || payload.linkId !== cleanLinkId) {
      return false
    }

    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return false
    }

    const now = Date.now()
    const expMs = payload.exp < 100_000_000_000 ? payload.exp * 1000 : payload.exp
    if (expMs <= now) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Extracts and parses the payload from a share session token without verifying its signature.
 * Useful for inspecting expiration or linkId for debugging or client-side telemetry.
 */
export function parseShareSessionToken(token: string): ShareSessionPayload | null {
  if (typeof token !== "string" || token.trim().length === 0) return null
  const parts = token.trim().split(".")
  if (parts.length !== 2) return null
  try {
    const json = base64UrlToString(parts[0])
    const payload = JSON.parse(json)
    if (
      payload &&
      typeof payload === "object" &&
      typeof payload.linkId === "string" &&
      typeof payload.exp === "number"
    ) {
      return payload as ShareSessionPayload
    }
    return null
  } catch {
    return null
  }
}

// -- Share Password Brute-Force Rate Limiting --------------------------------

/**
 * Sliding-window rate limiter for share link password attempts.
 * Policy: Max 5 failed attempts per 15-minute window per IP or share link ID.
 */
export class SharePasswordRateLimiter {
  private readonly maxAttempts: number
  private readonly windowMs: number
  private readonly nowProvider: () => number
  private readonly attempts = new Map<string, number[]>()

  constructor(options: SharePasswordRateLimiterOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? SHARE_PASSWORD_MAX_ATTEMPTS
    this.windowMs = options.windowMs ?? SHARE_PASSWORD_WINDOW_MS
    this.nowProvider = options.nowProvider ?? (() => Date.now())
  }

  /**
   * Inspects the current rate-limit state for an identifier without recording an attempt.
   */
  public checkLimit(identifier: string, customNow?: number): SharePasswordRateLimitResult {
    if (typeof identifier !== "string" || identifier.trim().length === 0) {
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds: 60 }
    }
    const key = identifier.trim()
    const now = customNow ?? this.nowProvider()

    const history = (this.attempts.get(key) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs
    )

    if (history.length >= this.maxAttempts) {
      const oldest = history[0]
      const resetMs = oldest + this.windowMs
      const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000))
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
      }
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - history.length,
      retryAfterSeconds: 0,
    }
  }

  /**
   * Alias for checkLimit matching the functional API.
   */
  public checkRateLimit(identifier: string, customNow?: number): SharePasswordRateLimitResult {
    return this.checkLimit(identifier, customNow)
  }

  /**
   * Records a password verification attempt for an identifier.
   *
   * - If success is true: Resets rate-limiting record for the identifier.
   * - If success is false: Records the failed timestamp in the sliding window.
   */
  public recordAttempt(
    identifier: string,
    success: boolean,
    customNow?: number
  ): SharePasswordRateLimitResult {
    if (typeof identifier !== "string" || identifier.trim().length === 0) {
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds: 60 }
    }
    const key = identifier.trim()
    const now = customNow ?? this.nowProvider()
    this.pruneOldEntries(now)

    // Successful attempt clears failed history
    if (success) {
      this.reset(key)
      return {
        allowed: true,
        remainingAttempts: this.maxAttempts,
        retryAfterSeconds: 0,
      }
    }

    // Failed attempt: filter active window
    const history = (this.attempts.get(key) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs
    )

    if (history.length >= this.maxAttempts) {
      const oldest = history[0]
      const resetMs = oldest + this.windowMs
      const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000))
      this.attempts.set(key, history)
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
      }
    }

    history.push(now)
    this.attempts.set(key, history)

    return {
      allowed: true,
      remainingAttempts: Math.max(0, this.maxAttempts - history.length),
      retryAfterSeconds: 0,
    }
  }

  /**
   * Resets rate-limiting record for an identifier (e.g. on successful password check or admin override).
   */
  public reset(identifier: string): void {
    if (typeof identifier === "string") {
      this.attempts.delete(identifier.trim())
    }
  }

  /**
   * Clears all stored rate limit history across all identifiers.
   */
  public clear(): void {
    this.attempts.clear()
  }

  /**
   * Returns whether the given identifier is currently locked out.
   */
  public isBlocked(identifier: string, customNow?: number): boolean {
    return !this.checkLimit(identifier, customNow).allowed
  }

  /**
   * Returns the count of remaining attempts for the given identifier.
   */
  public getRemainingAttempts(identifier: string, customNow?: number): number {
    return this.checkLimit(identifier, customNow).remainingAttempts
  }

  /**
   * Removes stale expired entries when the map exceeds a threshold.
   */
  private pruneOldEntries(now: number): void {
    if (this.attempts.size > 500) {
      for (const [key, history] of this.attempts.entries()) {
        const valid = history.filter((timestamp) => now - timestamp < this.windowMs)
        if (valid.length === 0) {
          this.attempts.delete(key)
        } else {
          this.attempts.set(key, valid)
        }
      }
    }
  }
}

// Global default singleton instance for share password rate limiting
export const sharePasswordRateLimiter = new SharePasswordRateLimiter()

/**
 * Checks current password rate limit state for an identifier without consuming an attempt.
 */
export function checkSharePasswordRateLimit(identifier: string): SharePasswordRateLimitResult {
  return sharePasswordRateLimiter.checkLimit(identifier)
}

/**
 * Records a password attempt for an identifier (IP or share link ID).
 *
 * @param identifier Client IP or share link ID
 * @param success True if password was correct (resets limiter), false if incorrect
 */
export function recordSharePasswordAttempt(
  identifier: string,
  success: boolean
): SharePasswordRateLimitResult {
  return sharePasswordRateLimiter.recordAttempt(identifier, success)
}

/**
 * Resets the password rate limit for an identifier.
 */
export function resetSharePasswordRateLimit(identifier: string): void {
  sharePasswordRateLimiter.reset(identifier)
}
