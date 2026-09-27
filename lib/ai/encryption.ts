// ---------------------------------------------------------------------------
// Zenith AI — Server-Side AES-256-GCM Encryption & Key Derivation Service
// ---------------------------------------------------------------------------

import crypto from "crypto"

// Master secret for encrypting BYOK credentials at rest on the server.
// Uses process.env.ZENITHSUI_SECRET_KEY, process.env.ENCRYPTION_KEY, or a persistent fallback.
const MASTER_SECRET =
  process.env.ZENITHSUI_SECRET_KEY ||
  process.env.ENCRYPTION_KEY ||
  process.env.NEXTAUTH_SECRET ||
  "zenithsui_production_vault_secret_key_2026_aes256"

// Derive a 32-byte key using SHA-256
const ENCRYPTION_KEY = crypto.createHash("sha256").update(MASTER_SECRET).digest()
const ALGORITHM = "aes-256-gcm"

export interface EncryptedPayload {
  iv: string // hex
  ciphertext: string // hex
  tag: string // hex
}

export class SecretEncryptionService {
  /**
   * Encrypts plaintext string using AES-256-GCM.
   * Returns an EncryptedPayload containing hex-encoded IV, ciphertext, and authentication tag.
   */
  static encrypt(plaintext: string): EncryptedPayload {
    if (!plaintext) {
      throw new Error("Cannot encrypt empty payload.")
    }

    const iv = crypto.randomBytes(12) // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

    let ciphertext = cipher.update(plaintext, "utf8", "hex")
    ciphertext += cipher.final("hex")

    const tag = cipher.getAuthTag().toString("hex")

    return {
      iv: iv.toString("hex"),
      ciphertext,
      tag,
    }
  }

  /**
   * Decrypts an EncryptedPayload using AES-256-GCM.
   * Verifies authentication tag to guarantee ciphertext integrity.
   */
  static decrypt(payload: EncryptedPayload): string {
    if (!payload.iv || !payload.ciphertext || !payload.tag) {
      throw new Error("Invalid encrypted payload structure.")
    }

    const iv = Buffer.from(payload.iv, "hex")
    const tag = Buffer.from(payload.tag, "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(payload.ciphertext, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  }

  /**
   * Serializes an EncryptedPayload to a single compact storage string.
   */
  static serialize(payload: EncryptedPayload): string {
    return `${payload.iv}:${payload.tag}:${payload.ciphertext}`
  }

  /**
   * Deserializes a compact storage string back to EncryptedPayload.
   */
  static deserialize(serialized: string): EncryptedPayload {
    const parts = serialized.split(":")
    if (parts.length !== 3) {
      throw new Error("Malformed encrypted string format.")
    }
    return {
      iv: parts[0],
      tag: parts[1],
      ciphertext: parts[2],
    }
  }

  /**
   * Helper to encrypt directly to serialized string.
   */
  static encryptToString(plaintext: string): string {
    return this.serialize(this.encrypt(plaintext))
  }

  /**
   * Helper to decrypt directly from serialized string.
   */
  static decryptFromString(serialized: string): string {
    return this.decrypt(this.deserialize(serialized))
  }
}
