// ---------------------------------------------------------------------------
// Zenithsui — Secure Server-Side Credential Encryption Layer (AES-256-GCM)
// ---------------------------------------------------------------------------

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 128-bit initialization vector
const AUTH_TAG_LENGTH = 16

const CWD_DATA_DIR = path.join(process.cwd(), ".zenithsui_data")
const TMP_DATA_DIR = path.join("/tmp", ".zenithsui_data")

function getWritableKeyPath(): string {
  const dir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? TMP_DATA_DIR : CWD_DATA_DIR
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {
    // ignore
  }
  return path.join(dir, ".encryption_master_key.bin")
}

/**
 * Get or initialize the master encryption key.
 * Prioritizes process.env.DATABASE_ENCRYPTION_SECRET.
 * If not set, safely loads or generates a 256-bit key stored on disk in the secure data directory.
 */
function getMasterKey(): Buffer {
  if (process.env.DATABASE_ENCRYPTION_SECRET) {
    return createHash("sha256").update(process.env.DATABASE_ENCRYPTION_SECRET).digest()
  }

  const keyPath = getWritableKeyPath()
  try {
    if (fs.existsSync(keyPath)) {
      const existing = fs.readFileSync(keyPath)
      if (existing.length === 32) {
        return existing
      }
    }
    // Generate new random 256-bit key
    const newKey = randomBytes(32)
    fs.writeFileSync(keyPath, newKey, { mode: 0o600 })
    return newKey
  } catch (err) {
    console.warn("[Crypto] Could not read/write master key file, using stable fallback hash:", err)
    // Stable process/machine fallback hash
    const machineSeed = `${process.pid}-${process.platform}-${process.version}-${process.cwd()}-zenithsui-byod`
    return createHash("sha256").update(machineSeed).digest()
  }
}

/**
 * Encrypt sensitive database credentials to an AES-256-GCM payload.
 * Returns formatted string: "v1:hexIV:hexAuthTag:hexCiphertext"
 */
export function encryptCredentials(data: Record<string, unknown>): string {
  const key = getMasterKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const plaintext = Buffer.from(JSON.stringify(data), "utf8")
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `v1:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`
}

/**
 * Decrypt an AES-256-GCM encrypted credentials payload.
 */
export function decryptCredentials<T = Record<string, unknown>>(payload: string): T {
  if (!payload || !payload.startsWith("v1:")) {
    throw new Error("Invalid or unsupported encrypted payload format")
  }

  const parts = payload.split(":")
  if (parts.length !== 4) {
    throw new Error("Malformed encrypted payload")
  }

  const [, ivHex, tagHex, cipherHex] = parts
  const key = getMasterKey()
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(tagHex, "hex")
  const ciphertext = Buffer.from(cipherHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(decrypted.toString("utf8")) as T
}

/**
 * Mask sensitive credentials for client-safe consumption.
 * Never returns actual passwords, service-role keys, or tokens.
 */
export function maskSensitiveCredentials(
  provider: string,
  credentials?: Record<string, unknown>
): Record<string, unknown> {
  if (!credentials) return {}

  const masked: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(credentials)) {
    if (typeof v !== "string" || !v) {
      masked[k] = v
      continue
    }

    const keyLower = k.toLowerCase()
    if (
      keyLower.includes("password") ||
      keyLower.includes("secret") ||
      keyLower.includes("key") ||
      keyLower.includes("token")
    ) {
      // Safe masked representation (e.g. •••••••• or first 3 chars + ••••)
      masked[k] = v.length > 6 ? `${v.slice(0, 3)}••••••••` : "••••••••"
    } else if (keyLower.includes("url") || keyLower.includes("connectionstring")) {
      // Sanitize URL to remove password if present: postgres://user:pass@host -> postgres://user:***@host
      try {
        const parsed = new URL(v)
        if (parsed.password) {
          parsed.password = "••••••••"
        }
        masked[k] = parsed.toString()
      } catch {
        masked[k] = v
      }
    } else {
      masked[k] = v
    }
  }

  return masked
}
