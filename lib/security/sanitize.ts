// ---------------------------------------------------------------------------
// Zenithsui Security Hardening, Input Sanitization, and Validation Gateway
//
// Defense-in-depth controls for incoming payloads across Cloud (Supabase),
// LAN (Gateway daemon), peer pairing, and clipboard/file boundaries.
//
// Non-negotiable security guarantees:
// 1. Strict geometry verification: Rejects NaN, Infinity, and non-numeric
//    coordinates, seeds, dimensions, and vectors.
// 2. Script injection mitigation: Rejects executable script tags, inline event
//    attributes, dangerous embeds, and javascript:/data:text/html URI schemes
//    in text and link fields.
// 3. Trusted image scheme enforcement: Restricts image sources strictly to
//    safe `data:image/` payloads and local `asset://` references. Remote network
//    URLs (http/https/ftp) and script schemes are strictly turned away.
// 4. Cryptographic integrity: WebCrypto SHA-256 for token hashing and constant-time
//    token comparisons.
// 5. Pairing brute-force protection: Sliding-window rate limiter enforcing max
//    5 attempts per 60s per client identifier.
// 6. Zero frontend trust: Client-asserted permission claims are ignored;
//    backend validation must authorize every mutation.
// ---------------------------------------------------------------------------

import type {
  ArrowNode,
  ComponentNode,
  DrawNode,
  ImageNode,
  ShapeNode,
  SquigNode,
  TextNode,
} from "../types"
import { normalizeFill } from "../types"

// -- Types & Interfaces -----------------------------------------------------

export type DocumentRole = "owner" | "editor" | "viewer"
export type PermissionAction = "read" | "write" | "admin" | "delete"

export interface BackendAuthContext {
  userId: string
  verifiedRole: DocumentRole
  docId: string
  authenticatedVia: "supabase_session" | "gateway_secret" | "peer_pairing"
}

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  retryAfterSeconds: number
  resetMs: number
}

export interface RateLimiterOptions {
  maxAttempts?: number
  windowMs?: number
  nowProvider?: () => number
}

export class SecurityPermissionError extends Error {
  public readonly code: string
  public readonly status: number

  constructor(message: string, code = "ERR_UNAUTHORIZED_MUTATION", status = 403) {
    super(message)
    this.name = "SecurityPermissionError"
    this.code = code
    this.status = status
    Object.setPrototypeOf(this, SecurityPermissionError.prototype)
  }
}

// -- Primitive Type and Number Checkers -------------------------------------

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v)
}

function isString(v: unknown): v is string {
  return typeof v === "string"
}

/** Check if any arbitrary data structure contains NaN or Infinity values */
export function hasNonFiniteNumber(obj: unknown, depth = 0): boolean {
  if (depth > 12) return false
  if (typeof obj === "number") {
    return Number.isNaN(obj) || !Number.isFinite(obj)
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasNonFiniteNumber(item, depth + 1)) return true
    }
    return false
  }
  if (obj !== null && typeof obj === "object") {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      if (hasNonFiniteNumber(val, depth + 1)) return true
    }
    return false
  }
  return false
}

// -- Script Injection & Safe Link Detection ---------------------------------

// Detect dangerous script tags, embeds, objects, iframes, and XML/HTML event handlers
const SCRIPT_TAG_PATTERN = /<\s*\/?\s*script\b[^>]*>/i
const DANGEROUS_HTML_TAGS = /<\s*(?:iframe|object|embed|applet|meta|link|base|form|input)\b/i
const INLINE_EVENT_HANDLER = /<[a-zA-Z0-9_-]+(?:\s+[^>]*)?\s+on[a-zA-Z]+\s*=/i
const DATA_SCRIPT_PATTERN = /^\s*data:\s*text\/(?:html|javascript|xml)/i

/**
 * Returns true if a string contains executable script injection vectors,
 * dangerous HTML elements, or pseudo-schemes.
 */
export function hasScriptInjection(val: string): boolean {
  if (!val || typeof val !== "string") return false

  // 1. Script tags, e.g. <script> or </script>
  if (SCRIPT_TAG_PATTERN.test(val)) return true

  // 2. Dangerous HTML tags that can execute or load untrusted resources
  if (DANGEROUS_HTML_TAGS.test(val)) return true

  // 3. Inline HTML event handlers like <img src=x onerror=...>, <svg onload=...>
  if (INLINE_EVENT_HANDLER.test(val)) return true

  // 4. Executable data URLs (e.g. data:text/html,<script>...)
  if (DATA_SCRIPT_PATTERN.test(val)) return true

  // 5. De-obfuscate and test for javascript: or vbscript: URIs
  // Strips ASCII control characters, whitespace, and null bytes to defeat evasion
  const cleaned = val.replace(/[\x00-\x1f\x7f\s]+/g, "").toLowerCase()
  if (cleaned.startsWith("javascript:") || cleaned.startsWith("vbscript:")) {
    return true
  }

  // Also check for encoded HTML entity variations (e.g. &#106;avascript:)
  const decodedEntity = val
    .replace(/&#(?:x0*([0-9a-fA-F]+)|0*([0-9]+));?/g, (_, hex, dec) =>
      String.fromCharCode(hex ? parseInt(hex, 16) : parseInt(dec, 10))
    )
    .replace(/[\x00-\x1f\x7f\s]+/g, "")
    .toLowerCase()

  if (decodedEntity.startsWith("javascript:") || decodedEntity.startsWith("vbscript:")) {
    return true
  }

  return false
}

/**
 * Verifies that a link URL in a text node points to a safe web destination,
 * internal canvas anchor, or contact protocol, strictly forbidding javascript:
 * or untrusted executable schemes.
 */
export function isSafeLink(link: string): boolean {
  if (!link || typeof link !== "string") return false
  const trimmed = link.trim()
  if (!trimmed) return false

  // Disallow any script injections or dangerous tags
  if (hasScriptInjection(trimmed)) return false

  // Internal canvas references and relative paths
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return true

  // Safe external web and communication protocols
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return true
  }

  return false
}

// -- Image URL Scheme Policy ------------------------------------------------

/**
 * Validates image sources: strictly permits only safe `data:image/` raster payloads
 * or local/LAN `asset://` references.
 */
export function isTrustedImageSrc(src: string): boolean {
  if (!src || typeof src !== "string") return false
  const trimmed = src.trim()

  // 1. data:image/ scheme
  if (/^data:image\//i.test(trimmed)) {
    // If it's SVG data, verify it carries no embedded scripts or event handlers
    if (/^data:image\/svg\+xml/i.test(trimmed)) {
      try {
        const decoded = decodeURIComponent(trimmed)
        if (hasScriptInjection(decoded)) return false
      } catch {
        // Malformed URI encoding in svg data URI
        return false
      }
    }
    return true
  }

  // 2. asset:// scheme (e.g. asset://uploads/uuid or asset://local-peer/asset-id)
  // Must be safe alphanumeric path without directory traversal or control characters
  if (/^asset:\/\/[a-zA-Z0-9_\-\.\/]+$/i.test(trimmed)) {
    // Prohibit directory traversal in asset references
    if (trimmed.includes("..") || trimmed.includes("//", 8)) return false
    return true
  }

  // All other schemes (http://, https://, file://, ftp://, javascript:) are rejected
  return false
}

// -- Strict Node Validation -------------------------------------------------

const KNOWN_NODE_TYPES = new Set(["component", "shape", "draw", "text", "arrow", "image"])

function validatePoints(v: unknown): v is [number, number][] {
  if (!Array.isArray(v) || v.length === 0) return false
  for (const pt of v) {
    if (!Array.isArray(pt) || pt.length !== 2) return false
    if (!isFiniteNumber(pt[0]) || !isFiniteNumber(pt[1])) return false
  }
  return true
}

/**
 * Enhanced validation gate extending `validNode` from `lib/clipboard-payload.ts`.
 *
 * Strictly validates incoming cloud and LAN payloads:
 * - Rejects NaN, Infinity, and non-numeric geometry or seeds.
 * - Rejects script injections in text and link fields.
 * - Enforces trusted image URL schemes (only `data:image/` or `asset://`).
 * - Validates component props for finite numbers and lack of script injection.
 *
 * Returns a sanitized SquigNode, or null if the payload is untrusted / invalid.
 */
export function validateSecureNode(v: unknown): SquigNode | null {
  if (!v || typeof v !== "object") return null
  const n = v as Record<string, unknown>

  // Type validation
  if (!isString(n.type) || !KNOWN_NODE_TYPES.has(n.type)) return null

  // Geometric coordinates & dimensions: NaN or Infinity strictly rejected
  if (!isFiniteNumber(n.x) || !isFiniteNumber(n.y) || !isFiniteNumber(n.w) || !isFiniteNumber(n.h)) {
    return null
  }

  // Seed validation: If supplied, must be a finite number; NaN or Infinity strictly rejected
  if (n.seed !== undefined && !isFiniteNumber(n.seed)) {
    return null
  }

  // Group membership validation
  if (n.groupIds !== undefined) {
    if (!Array.isArray(n.groupIds) || !n.groupIds.every(isString)) return null
  }

  // Node-type specific validation
  switch (n.type) {
    case "component": {
      if (!isString(n.kind) || !n.props || typeof n.props !== "object" || Array.isArray(n.props)) {
        return null
      }
      // Check props for NaN / Infinity
      if (hasNonFiniteNumber(n.props)) return null

      // Check props for script injection in string values
      for (const [key, val] of Object.entries(n.props as Record<string, unknown>)) {
        if (typeof val === "string" && hasScriptInjection(val)) {
          return null
        }
        if (key.startsWith("on") && typeof val === "string") {
          return null
        }
      }
      break
    }

    case "shape": {
      if (n.shape !== "rect" && n.shape !== "ellipse") return null
      break
    }

    case "draw": {
      if (!validatePoints(n.points)) return null
      break
    }

    case "arrow": {
      if (!validatePoints(n.points) || n.points.length !== 2) return null
      break
    }

    case "text": {
      if (!isString(n.text) || !isFiniteNumber(n.fontSize) || n.fontSize <= 0) {
        return null
      }
      // Rejects script injection in text field
      if (hasScriptInjection(n.text)) return null

      // Rejects script injection and untrusted schemes in link field
      if (n.link !== undefined) {
        if (!isString(n.link)) return null
        if (!isSafeLink(n.link)) return null
      }
      break
    }

    case "image": {
      if (!isString(n.src)) return null
      // Enforce trusted image schemes: only data:image/ or asset://
      if (!isTrustedImageSrc(n.src)) return null

      // If natural dimensions exist, they must be finite numbers
      if (n.naturalW !== undefined && (!isFiniteNumber(n.naturalW) || n.naturalW <= 0)) {
        return null
      }
      if (n.naturalH !== undefined && (!isFiniteNumber(n.naturalH) || n.naturalH <= 0)) {
        return null
      }
      break
    }
  }

  // Return sanitized node instance
  const sanitized: SquigNode = {
    ...(n as unknown as SquigNode),
    id: isString(n.id) && n.id.trim().length > 0 ? n.id.trim() : "node",
    seed: isFiniteNumber(n.seed) ? n.seed : 1,
    w: Math.max(0, n.w as number),
    h: Math.max(0, n.h as number),
  }

  if (sanitized.type === "shape") {
    sanitized.fill = normalizeFill((n as ShapeNode).fill)
  }

  return sanitized
}

/**
 * Validates and sanitizes a complete document payload received from Cloud or LAN.
 */
export function validateIncomingDocumentPayload(payload: unknown): {
  fileName: string
  nodes: Record<string, SquigNode>
  order: string[]
} | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>

  // Sanitize filename: Strip path traversal, illegal filename chars, and control codes
  let fileName = "Untitled"
  if (isString(p.fileName) && p.fileName.trim()) {
    fileName = p.fileName
      .trim()
      .replace(/\.{2,}/g, "_")
      .replace(/[\/\\:*?"<>|\x00-\x1f\x7f]/g, "_")
      .slice(0, 100)
    if (!fileName) fileName = "Untitled"
  }

  // Validate nodes map or list
  const cleanNodes: Record<string, SquigNode> = {}
  if (p.nodes && typeof p.nodes === "object") {
    const entries = Array.isArray(p.nodes)
      ? p.nodes.map((item) => [item?.id ?? "", item])
      : Object.entries(p.nodes as Record<string, unknown>)

    for (const [id, raw] of entries) {
      const valid = validateSecureNode(raw)
      if (valid) {
        cleanNodes[valid.id] = valid
      }
    }
  }

  // Validate order array, maintaining uniqueness and consistency with clean nodes
  const seen = new Set<string>()
  const cleanOrder: string[] = []
  if (Array.isArray(p.order)) {
    for (const id of p.order) {
      if (isString(id) && cleanNodes[id] && !seen.has(id)) {
        seen.add(id)
        cleanOrder.push(id)
      }
    }
  }

  // Any validated node omitted from order is appended
  for (const id of Object.keys(cleanNodes)) {
    if (!seen.has(id)) {
      seen.add(id)
      cleanOrder.push(id)
    }
  }

  return {
    fileName,
    nodes: cleanNodes,
    order: cleanOrder,
  }
}

export const sanitizeDocumentPayload = validateIncomingDocumentPayload

// -- WebCrypto SHA-256 Token Hashing Helpers ---------------------------------

/**
 * Hashes an authentication token, pairing secret, or session identifier using
 * the standard WebCrypto SHA-256 digest. Returns a 64-character lowercase hex string.
 */
export async function hashToken(token: string): Promise<string> {
  if (typeof token !== "string") {
    throw new TypeError("hashToken requires a string token argument")
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const digestBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(digestBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Constant-time string equality check to prevent timing analysis attacks on
 * cryptographic tokens and hashes.
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
 * Verifies a plaintext token against an expected SHA-256 hex digest using
 * constant-time comparison.
 */
export async function verifyTokenHash(token: string, expectedHashHex: string): Promise<boolean> {
  if (typeof token !== "string" || typeof expectedHashHex !== "string") {
    return false
  }
  const actualHash = await hashToken(token)
  return timingSafeEqual(actualHash.toLowerCase(), expectedHashHex.toLowerCase())
}

/**
 * Generates a cryptographically secure random token string using WebCrypto.
 */
export function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// -- Pairing Code Brute-Force Rate Limiter -----------------------------------

/**
 * Sliding-window rate limiter for pairing code brute-force protection.
 * Default policy: Maximum 5 attempts per 60-second window.
 */
export class PairingRateLimiter {
  private readonly maxAttempts: number
  private readonly windowMs: number
  private readonly nowProvider: () => number
  private readonly attempts = new Map<string, number[]>()

  constructor(options: RateLimiterOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 5
    this.windowMs = options.windowMs ?? 60_000
    this.nowProvider = options.nowProvider ?? (() => Date.now())
  }

  /**
   * Consumes an attempt for the specified key (e.g. client IP or device ID).
   */
  public recordAttempt(key: string, customNow?: number): RateLimitResult {
    const now = customNow ?? this.nowProvider()
    this.pruneOldEntries(now)

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
        resetMs,
      }
    }

    history.push(now)
    this.attempts.set(key, history)
    const resetMs = history[0] + this.windowMs

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - history.length,
      retryAfterSeconds: 0,
      resetMs,
    }
  }

  /**
   * Inspects current rate-limit state without recording an attempt.
   */
  public checkLimit(key: string, customNow?: number): RateLimitResult {
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
        resetMs,
      }
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - history.length,
      retryAfterSeconds: 0,
      resetMs: history.length > 0 ? history[0] + this.windowMs : now + this.windowMs,
    }
  }

  /**
   * Resets rate-limiting record for an identifier (e.g. on successful pairing).
   */
  public reset(key: string): void {
    this.attempts.delete(key)
  }

  /**
   * Clears all stored rate limit history.
   */
  public clear(): void {
    this.attempts.clear()
  }

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

// Global pairing rate limiter instance with default 5 attempts / 60s
export const pairingRateLimiter = new PairingRateLimiter({
  maxAttempts: 5,
  windowMs: 60_000,
})

export function checkPairingRateLimit(identifier: string): RateLimitResult {
  return pairingRateLimiter.checkLimit(identifier)
}

export function recordPairingAttempt(identifier: string): RateLimitResult {
  return pairingRateLimiter.recordAttempt(identifier)
}

export function resetPairingRateLimit(identifier: string): void {
  pairingRateLimiter.reset(identifier)
}

// -- Backend Permission Enforcement ----------------------------------------

const ROLE_PERMISSIONS: Record<DocumentRole, ReadonlySet<PermissionAction>> = {
  viewer: new Set(["read"]),
  editor: new Set(["read", "write"]),
  owner: new Set(["read", "write", "admin", "delete"]),
}

/**
 * Verifies whether a role is authorized for a specific action.
 */
export function hasBackendPermission(
  role: DocumentRole | null | undefined,
  action: PermissionAction
): boolean {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role]
  return permissions ? permissions.has(action) : false
}

/**
 * Asserts that the authenticated backend context possesses the required permission.
 * Throws SecurityPermissionError if unauthorized.
 */
export function assertBackendPermission(
  role: DocumentRole | null | undefined,
  action: PermissionAction,
  contextMessage?: string
): void {
  if (!hasBackendPermission(role, action)) {
    throw new SecurityPermissionError(
      `Permission denied: Action '${action}' is not permitted for verified role '${role ?? "none"}'. ${contextMessage ?? ""}`.trim()
    )
  }
}

/**
 * Validates and strictly enforces backend authorization on an incoming mutation.
 *
 * Rules:
 * 1. Client-supplied role attributes in `payload` are completely IGNORED and discarded.
 * 2. Only the server-verified role in `context.verifiedRole` is checked.
 * 3. If the verified role is 'viewer' (or lacks 'write' permission), mutation is rejected.
 * 4. Payloads are strictly sanitized: NaN, Infinity, script injections, and untrusted
 *    image schemes are stripped or rejected.
 */
export function enforceBackendDocumentMutation(
  payload: unknown,
  context: BackendAuthContext
): { fileName: string; nodes: Record<string, SquigNode>; order: string[] } {
  if (!context || !context.verifiedRole) {
    throw new SecurityPermissionError("Authentication required: Missing verified backend context")
  }

  // Backend authorization enforcement: Must have write permission to mutate nodes
  assertBackendPermission(
    context.verifiedRole,
    "write",
    `User '${context.userId}' attempted mutation on doc '${context.docId}'.`
  )

  // Validate and sanitize the payload contents
  const validated = validateIncomingDocumentPayload(payload)
  if (!validated) {
    throw new SecurityPermissionError("Invalid document payload format or corrupted data", "ERR_INVALID_PAYLOAD", 400)
  }

  return validated
}
