// ---------------------------------------------------------------------------
// Zenithsui Share Cryptography & Token Verification Module
//
// Zero-dependency cryptographic primitives for public, password-protected,
// and time-limited document sharing links.
//
// Guarantees:
// 1. Token Generation: 256-bit cryptographically secure random bytes via
//    CSPRNG, URL-safe Base64url encoded without padding (43 characters).
// 2. Token Hashing: Standard SHA-256 digests in lowercase hex (async WebCrypto
//    and sync Node.js / universal fallback).
// 3. Constant-Time Verification: Timing-attack resistant comparisons for hashes
//    and authentication tokens.
// 4. Password Protection: PBKDF2-HMAC-SHA256 with 100,000 iterations, 32-byte salt,
//    and 32-byte key output.
// 5. Expiration & Status Checks: UTC-based expiration and revocation validity.
// ---------------------------------------------------------------------------

// Detect and bind node:crypto in Node.js environments
let nodeCrypto: typeof import("node:crypto") | null = null
try {
  if (typeof process !== "undefined" && process.versions?.node) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nodeCrypto = typeof require === "function" ? require("node:crypto") : null
  }
} catch {
  // Ignored in non-Node (browser/edge) environments
}

// -- Interfaces & Types -----------------------------------------------------

export interface SharePasswordHashResult {
  hash: string
  salt: string
}

export interface ShareLinkStatus {
  expires_at?: string | Date | null
  revoked_at?: string | Date | null
  is_active?: boolean
  max_uses?: number | null
  use_count?: number | null
}

// -- Hex & Base64url Utilities ----------------------------------------------

const BASE64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

/**
 * Encodes a Uint8Array into URL-safe Base64url without padding (RFC 4648 §5).
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64url")
  }

  let result = ""
  const len = bytes.length
  let i = 0
  while (i < len) {
    const b0 = bytes[i++]
    const b1 = i < len ? bytes[i++] : -1
    const b2 = i < len ? bytes[i++] : -1

    result += BASE64URL_CHARS[b0 >> 2]
    if (b1 !== -1) {
      result += BASE64URL_CHARS[((b0 & 3) << 4) | (b1 >> 4)]
      if (b2 !== -1) {
        result += BASE64URL_CHARS[((b1 & 15) << 2) | (b2 >> 6)]
        result += BASE64URL_CHARS[b2 & 63]
      } else {
        result += BASE64URL_CHARS[(b1 & 15) << 2]
      }
    } else {
      result += BASE64URL_CHARS[(b0 & 3) << 4]
    }
  }
  return result
}

/**
 * Converts a Uint8Array into a lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

/**
 * Converts a hex string into a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new TypeError("Invalid hex string")
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// -- Pure JS Synchronous SHA-256 Fallback -----------------------------------

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function sha256SyncFallback(str: string): string {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c < 0x80) {
      bytes.push(c)
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    } else {
      i++
      c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      )
    }
  }

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while ((bytes.length + 8) % 64 !== 0) {
    bytes.push(0)
  }

  const highBits = Math.floor(bitLen / 0x100000000)
  const lowBits = bitLen >>> 0
  bytes.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  )

  const w = new Uint32Array(64)
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4
      w[i] =
        (bytes[idx] << 24) |
        (bytes[idx + 1] << 16) |
        (bytes[idx + 2] << 8) |
        bytes[idx + 3]
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3)
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7))
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0
      const S0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10))
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  const toHex = (n: number) => n.toString(16).padStart(8, "0")
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)
}

// -- 1. Token Generation ----------------------------------------------------

/**
 * Generates cryptographically secure random bytes using CSPRNG
 * and returns a URL-safe Base64url encoded string without padding.
 *
 * For the default 32 bytes (256 bits), returns exactly 43 characters.
 */
export function generateShareToken(byteLength = 32): string {
  if (typeof byteLength !== "number" || byteLength <= 0 || !Number.isFinite(byteLength)) {
    throw new TypeError("byteLength must be a positive finite number")
  }

  const bytes = new Uint8Array(byteLength)
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else if (nodeCrypto && typeof nodeCrypto.randomFillSync === "function") {
    nodeCrypto.randomFillSync(bytes)
  } else {
    throw new Error("Cryptographic random generator is unavailable in current runtime")
  }

  return bytesToBase64Url(bytes)
}

// -- 2. Token Hashing -------------------------------------------------------

/**
 * Computes SHA-256 hash in 64-character lowercase hex format using WebCrypto.
 */
export async function hashShareToken(token: string): Promise<string> {
  if (typeof token !== "string") {
    throw new TypeError("hashShareToken requires a string token argument")
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const digestBuffer = await globalThis.crypto.subtle.digest("SHA-256", data)
  return bytesToHex(new Uint8Array(digestBuffer))
}

/**
 * Computes SHA-256 hash in 64-character lowercase hex format synchronously,
 * using Node's crypto.createHash('sha256') if available, or universal fallback.
 */
export function hashShareTokenSync(token: string): string {
  if (typeof token !== "string") {
    throw new TypeError("hashShareTokenSync requires a string token argument")
  }
  if (nodeCrypto && typeof nodeCrypto.createHash === "function") {
    return nodeCrypto.createHash("sha256").update(token, "utf8").digest("hex")
  }
  return sha256SyncFallback(token)
}

// -- 3. Constant-Time Verification ------------------------------------------

/**
 * Constant-time comparison of two strings to prevent timing side-channel attacks.
 * Suitable for token hashes, shared secrets, and passwords.
 */
export function timingSafeEqualShare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false
  }

  const lenA = a.length
  const lenB = b.length
  let mismatch = lenA ^ lenB
  const maxLen = Math.max(lenA, lenB)

  for (let i = 0; i < maxLen; i++) {
    const charA = i < lenA ? a.charCodeAt(i) : 0
    const charB = i < lenB ? b.charCodeAt(i) : 0
    mismatch |= charA ^ charB
  }

  return mismatch === 0
}

// -- 4. Password Hashing (PBKDF2) -------------------------------------------

/**
 * Hashes a share password using WebCrypto PBKDF2 with HMAC-SHA256,
 * 100,000 iterations, 32-byte salt, and 32-byte (256-bit) key output.
 *
 * Returns hex strings for both the hash and salt.
 */
export async function hashSharePassword(
  password: string,
  saltHex?: string
): Promise<SharePasswordHashResult> {
  if (typeof password !== "string") {
    throw new TypeError("hashSharePassword requires a string password")
  }

  let saltBytes: Uint8Array
  if (saltHex !== undefined) {
    if (typeof saltHex !== "string") {
      throw new TypeError("saltHex must be a hex string when provided")
    }
    saltBytes = hexToBytes(saltHex)
  } else {
    saltBytes = new Uint8Array(32)
    if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(saltBytes)
    } else if (nodeCrypto && typeof nodeCrypto.randomFillSync === "function") {
      nodeCrypto.randomFillSync(saltBytes)
    } else {
      throw new Error("Cryptographic random generator is unavailable in current runtime")
    }
  }

  const encoder = new TextEncoder()
  const passwordKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  )

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations: 100_000,
      hash: "SHA-256",
    },
    passwordKey,
    256 // 32 bytes * 8 bits = 256 bits output
  )

  return {
    hash: bytesToHex(new Uint8Array(derivedBits)),
    salt: bytesToHex(saltBytes),
  }
}

/**
 * Recomputes PBKDF2 hash using the provided salt and verifies against
 * expectedHash using constant-time comparison.
 */
export async function verifySharePassword(
  password: string,
  expectedHash: string,
  saltHex: string
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    typeof expectedHash !== "string" ||
    typeof saltHex !== "string"
  ) {
    return false
  }

  try {
    const { hash } = await hashSharePassword(password, saltHex)
    return timingSafeEqualShare(hash.toLowerCase(), expectedHash.toLowerCase())
  } catch {
    return false
  }
}

// -- 5. Expiration & Status Checks ------------------------------------------

/**
 * Determines whether a given expiration timestamp has passed compared against
 * current UTC time (Date.now()).
 *
 * If expiresAt is null or undefined, returns false (never expires).
 */
export function isShareTokenExpired(expiresAt: string | Date | null | undefined): boolean {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") {
    return false
  }

  const expTime = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime()
  if (Number.isNaN(expTime)) {
    return true
  }

  return expTime <= Date.now()
}

/**
 * Verifies if a share link status record is currently valid:
 * - is_active must not be false
 * - revoked_at must be absent or not yet reached
 * - expires_at must not be expired
 * - use_count must be strictly below max_uses (if specified)
 */
export function isShareTokenValid(link: ShareLinkStatus | null | undefined): boolean {
  if (!link || typeof link !== "object") {
    return false
  }

  // 1. Explicit deactivation flag
  if (link.is_active === false) {
    return false
  }

  // 2. Revocation status check
  if (link.revoked_at !== null && link.revoked_at !== undefined && link.revoked_at !== "") {
    const revokedTime =
      link.revoked_at instanceof Date
        ? link.revoked_at.getTime()
        : new Date(link.revoked_at).getTime()
    if (Number.isNaN(revokedTime) || revokedTime <= Date.now()) {
      return false
    }
  }

  // 3. Expiration date check
  if (isShareTokenExpired(link.expires_at)) {
    return false
  }

  // 4. Maximum usage enforcement
  if (
    link.max_uses !== null &&
    link.max_uses !== undefined &&
    typeof link.max_uses === "number" &&
    !Number.isNaN(link.max_uses) &&
    link.max_uses >= 0
  ) {
    const useCount =
      typeof link.use_count === "number" && !Number.isNaN(link.use_count) ? link.use_count : 0
    if (useCount >= link.max_uses) {
      return false
    }
  }

  return true
}
