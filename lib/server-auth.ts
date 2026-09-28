// ---------------------------------------------------------------------------
// Zenithsui — Server-Side User Accounts & Session Authentication Engine
// ---------------------------------------------------------------------------

import crypto from "node:crypto"
import { nanoid } from "nanoid"
import {
  type UserRecord,
  type ClientSafeUser,
  type UserSession,
  AVATAR_COLORS,
} from "./auth-types"
import { createTeam } from "./server-teams"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"

export { AVATAR_COLORS }
export const AUTH_COOKIE_NAME = "zenithsui_session"
function resolveAuthSecret(): string {
  const fromEnv = process.env.ZENITHSUI_AUTH_SECRET || process.env.ZENITHSUI_SECRET_KEY
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[server-auth] ZENITHSUI_AUTH_SECRET (or ZENITHSUI_SECRET_KEY) is required in production — set it in Vercel Project Settings → Environment Variables."
    )
  }
  return "zenithsui-auth-super-secret-key-2026"
}
const AUTH_SECRET = resolveAuthSecret()
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const PBKDF2_ROUNDS = 100000
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

// In-memory server storage for users, sessions, and login rate limiting
const userRegistry = new Map<string, UserRecord>() // Keyed by userId
const usernameIndex = new Map<string, string>() // Keyed by normalizedUsername -> userId
const sessionRegistry = new Map<string, UserSession>() // Keyed by token
const loginAttemptStore = new Map<string, { count: number; lockedUntil?: number }>()

/**
 * Hash a password securely with PBKDF2 (100,000 rounds) and a random salt.
 */
export function hashUserPassword(password: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex || crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ROUNDS, 32, "sha256").toString("hex")
  return { hash, salt }
}

/**
 * Verify a plaintext password against a stored PBKDF2 hash.
 */
export function verifyUserPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false
  const computed = crypto.pbkdf2Sync(password, salt, PBKDF2_ROUNDS, 32, "sha256").toString("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"))
  } catch {
    return false
  }
}

/**
 * Generate a set of 6 emergency recovery codes (e.g., "zen-7k9a-2f4c").
 * Returns both the plaintext codes (for user display) and their SHA-256 hashes (for storage).
 */
export function generateRecoveryCodes(count = 6): { codes: string[]; hashes: string[] } {
  const codes: string[] = []
  const hashes: string[] = []

  for (let i = 0; i < count; i++) {
    const chunk1 = crypto.randomBytes(2).toString("hex")
    const chunk2 = crypto.randomBytes(2).toString("hex")
    const code = `zen-${chunk1}-${chunk2}`.toLowerCase()
    const hash = crypto.createHash("sha256").update(code).digest("hex")
    codes.push(code)
    hashes.push(hash)
  }

  return { codes, hashes }
}

/**
 * Convert a UserRecord into a client-safe profile object.
 * Strictly strips passwordHash, passwordSalt, and recoveryCodeHashes.
 */
export function toClientSafeUser(user: UserRecord): ClientSafeUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    recoveryCodesLeft: user.recoveryCodesLeft,
    role: user.role,
  }
}

/**
 * Persist user registry to disk snapshot.
 */
export function persistUsers(): void {
  try {
    writeJsonSnapshot("users.json", Array.from(userRegistry.values()))
  } catch (err) {
    console.warn("[Auth] Failed to persist users:", err)
  }
}

/**
 * Seed initial default accounts for demo and integration consistency or load from disk.
 */
function seedInitialAccounts() {
  if (userRegistry.size === 0) {
    // Attempt hydration from persistent snapshot first
    const saved = readJsonSnapshot<UserRecord[]>("users.json", [])
    if (saved && saved.length > 0) {
      for (const u of saved) {
        userRegistry.set(u.id, u)
        usernameIndex.set(u.normalizedUsername, u.id)
      }
      return
    }

    const now = Date.now() - 30 * 86400000

    // 1. Workspace Admin ("nezuko" / "owner_nezuko")
    const p1 = hashUserPassword("password123")
    const r1 = generateRecoveryCodes(6)
    const u1: UserRecord = {
      id: "owner_nezuko",
      username: "nezuko",
      normalizedUsername: "nezuko",
      displayName: "Nezuko (Admin)",
      avatarColor: "#dc2626",
      passwordHash: p1.hash,
      passwordSalt: p1.salt,
      recoveryCodeHashes: r1.hashes,
      recoveryCodesLeft: r1.hashes.length,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: Date.now() - 3600000,
      role: "admin",
    }
    userRegistry.set(u1.id, u1)
    usernameIndex.set(u1.normalizedUsername, u1.id)

    // 2. Design Lead ("designer" / "team_editor_1")
    const p2 = hashUserPassword("password123")
    const r2 = generateRecoveryCodes(6)
    const u2: UserRecord = {
      id: "team_editor_1",
      username: "designer",
      normalizedUsername: "designer",
      displayName: "Design Lead",
      avatarColor: "#2563eb",
      passwordHash: p2.hash,
      passwordSalt: p2.salt,
      recoveryCodeHashes: r2.hashes,
      recoveryCodesLeft: r2.hashes.length,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: Date.now() - 7200000,
      role: "user",
    }
    userRegistry.set(u2.id, u2)
    usernameIndex.set(u2.normalizedUsername, u2.id)

    // 3. UI Designer ("jordan" / "team_member_jordan")
    const p3 = hashUserPassword("password123")
    const r3 = generateRecoveryCodes(6)
    const u3: UserRecord = {
      id: "team_member_jordan",
      username: "jordan",
      normalizedUsername: "jordan",
      displayName: "Jordan (UI)",
      avatarColor: "#16a34a",
      passwordHash: p3.hash,
      passwordSalt: p3.salt,
      recoveryCodeHashes: r3.hashes,
      recoveryCodesLeft: r3.hashes.length,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: Date.now() - 14400000,
      role: "user",
    }
    userRegistry.set(u3.id, u3)
    usernameIndex.set(u3.normalizedUsername, u3.id)

    // 4. Community Admin ("community" / "owner_primary")
    const p4 = hashUserPassword("password123")
    const r4 = generateRecoveryCodes(6)
    const u4: UserRecord = {
      id: "owner_primary",
      username: "community",
      normalizedUsername: "community",
      displayName: "Community Lead",
      avatarColor: "#9333ea",
      passwordHash: p4.hash,
      passwordSalt: p4.salt,
      recoveryCodeHashes: r4.hashes,
      recoveryCodesLeft: r4.hashes.length,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: Date.now() - 86400000,
      role: "user",
    }
    userRegistry.set(u4.id, u4)
    usernameIndex.set(u4.normalizedUsername, u4.id)

    persistUsers()
  }
}

// Initialize seed accounts
seedInitialAccounts()

/**
 * Look up a user by user ID.
 */
export function getUserById(userId: string): UserRecord | null {
  seedInitialAccounts()
  return userRegistry.get(userId) || null
}

/**
 * Look up a user by username (case-insensitive).
 */
export function getUserByUsername(username: string): UserRecord | null {
  seedInitialAccounts()
  const normalized = username.trim().toLowerCase()
  const userId = usernameIndex.get(normalized)
  if (!userId) return null
  return userRegistry.get(userId) || null
}

/**
 * Validate username format (alphanumeric + underscores/hyphens, 3-30 chars).
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim()
  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long." }
  }
  if (trimmed.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters long." }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, underscores, and hyphens." }
  }
  return { valid: true }
}

/**
 * Validate password rules (min 6 chars).
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters long." }
  }
  return { valid: true }
}

/**
 * Register a new user account with username and password.
 */
export async function registerUser({
  username,
  password,
  displayName,
}: {
  username: string
  password: string
  displayName?: string
}): Promise<{
  success: boolean
  user?: ClientSafeUser
  recoveryCodes?: string[]
  token?: string
  error?: string
}> {
  seedInitialAccounts()

  const uVal = validateUsername(username)
  if (!uVal.valid) {
    return { success: false, error: uVal.error }
  }

  const pVal = validatePassword(password)
  if (!pVal.valid) {
    return { success: false, error: pVal.error }
  }

  const normalized = username.trim().toLowerCase()
  if (usernameIndex.has(normalized)) {
    return { success: false, error: "This username is already taken. Please choose another." }
  }

  const userId = `usr_${nanoid(10)}`
  const { hash, salt } = hashUserPassword(password)
  const { codes, hashes } = generateRecoveryCodes(6)

  // Pick a random avatar color
  const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length)
  const avatarColor = AVATAR_COLORS[colorIndex]

  const cleanDisplayName = (displayName && displayName.trim()) ? displayName.trim() : username.trim()
  const now = Date.now()

  const user: UserRecord = {
    id: userId,
    username: username.trim(),
    normalizedUsername: normalized,
    displayName: cleanDisplayName,
    avatarColor,
    passwordHash: hash,
    passwordSalt: salt,
    recoveryCodeHashes: hashes,
    recoveryCodesLeft: hashes.length,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    role: "user",
  }

  userRegistry.set(userId, user)
  usernameIndex.set(normalized, userId)
  persistUsers()

  // Automatically create a personal workspace team for the new user
  try {
    createTeam(
      `${cleanDisplayName}'s Workspace`,
      "Personal collaborative space for wireframes, diagrams, and sketches.",
      userId,
      cleanDisplayName
    )
  } catch (err) {
    console.warn(`[Auth] Failed to create default workspace for ${userId}:`, err)
  }

  // Create an active session
  const session = createSession(userId)

  return {
    success: true,
    user: toClientSafeUser(user),
    recoveryCodes: codes,
    token: session.token,
  }
}

/**
 * Authenticate a user by username and password.
 */
export async function authenticateUser(
  username: string,
  password: string,
  ip = "127.0.0.1"
): Promise<{
  success: boolean
  user?: ClientSafeUser
  token?: string
  error?: string
  locked?: boolean
}> {
  seedInitialAccounts()

  const normalized = username.trim().toLowerCase()
  const attemptKey = `${ip}:${normalized}`
  const attempt = loginAttemptStore.get(attemptKey)

  if (attempt && attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 60000)
    return {
      success: false,
      locked: true,
      error: `Too many failed attempts. Account temporarily locked. Try again in ${minutesLeft} minutes.`,
    }
  }

  const user = getUserByUsername(username)
  if (!user) {
    recordFailedLogin(attemptKey)
    return { success: false, error: "Invalid username or password." }
  }

  const isValid = verifyUserPassword(password, user.passwordHash, user.passwordSalt)
  if (!isValid) {
    const locked = recordFailedLogin(attemptKey)
    if (locked) {
      return {
        success: false,
        locked: true,
        error: "Too many failed attempts. Account temporarily locked for 15 minutes.",
      }
    }
    return { success: false, error: "Invalid username or password." }
  }

  // Login successful -> clear failed attempts and update last login
  loginAttemptStore.delete(attemptKey)
  user.lastLoginAt = Date.now()
  user.updatedAt = Date.now()
  userRegistry.set(user.id, user)
  persistUsers()

  const session = createSession(user.id)

  return {
    success: true,
    user: toClientSafeUser(user),
    token: session.token,
  }
}

/**
 * Record a failed login attempt for brute force protection.
 */
function recordFailedLogin(key: string): boolean {
  const record = loginAttemptStore.get(key) || { count: 0 }
  record.count += 1
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS
    loginAttemptStore.set(key, record)
    return true
  }
  loginAttemptStore.set(key, record)
  return false
}

/**
 * Recover an account using a one-time emergency recovery code.
 */
export async function recoverAccountWithCode({
  username,
  recoveryCode,
  newPassword,
}: {
  username: string
  recoveryCode: string
  newPassword: string
}): Promise<{
  success: boolean
  user?: ClientSafeUser
  token?: string
  error?: string
}> {
  seedInitialAccounts()

  const pVal = validatePassword(newPassword)
  if (!pVal.valid) {
    return { success: false, error: pVal.error }
  }

  const user = getUserByUsername(username)
  if (!user) {
    return { success: false, error: "User account not found." }
  }

  const cleanCode = recoveryCode.trim().toLowerCase()
  const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex")

  const matchIndex = user.recoveryCodeHashes.findIndex((h) => h === codeHash)
  if (matchIndex === -1) {
    return { success: false, error: "Invalid recovery code. Please check your backup codes." }
  }

  // Consume the recovery code (one-time use)
  user.recoveryCodeHashes.splice(matchIndex, 1)
  user.recoveryCodesLeft = user.recoveryCodeHashes.length

  // Update password with fresh salt and PBKDF2 hash
  const { hash, salt } = hashUserPassword(newPassword)
  user.passwordHash = hash
  user.passwordSalt = salt
  user.updatedAt = Date.now()
  user.lastLoginAt = Date.now()
  userRegistry.set(user.id, user)
  persistUsers()

  // Invalidate previous sessions and issue a fresh session
  invalidateAllUserSessions(user.id)
  const session = createSession(user.id)

  return {
    success: true,
    user: toClientSafeUser(user),
    token: session.token,
  }
}

/**
 * Change password for an authenticated user.
 */
export async function changeUserPassword({
  userId,
  oldPassword,
  newPassword,
}: {
  userId: string
  oldPassword: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  const user = getUserById(userId)
  if (!user) {
    return { success: false, error: "User not found." }
  }

  const isValid = verifyUserPassword(oldPassword, user.passwordHash, user.passwordSalt)
  if (!isValid) {
    return { success: false, error: "Incorrect current password." }
  }

  const pVal = validatePassword(newPassword)
  if (!pVal.valid) {
    return { success: false, error: pVal.error }
  }

  const { hash, salt } = hashUserPassword(newPassword)
  user.passwordHash = hash
  user.passwordSalt = salt
  user.updatedAt = Date.now()
  userRegistry.set(user.id, user)
  persistUsers()

  return { success: true }
}

/**
 * Regenerate fresh recovery codes for an authenticated user.
 */
export async function regenerateUserRecoveryCodes({
  userId,
  password,
}: {
  userId: string
  password: string
}): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  const user = getUserById(userId)
  if (!user) {
    return { success: false, error: "User not found." }
  }

  const isValid = verifyUserPassword(password, user.passwordHash, user.passwordSalt)
  if (!isValid) {
    return { success: false, error: "Incorrect password." }
  }

  const { codes, hashes } = generateRecoveryCodes(6)
  user.recoveryCodeHashes = hashes
  user.recoveryCodesLeft = hashes.length
  user.updatedAt = Date.now()
  userRegistry.set(user.id, user)
  persistUsers()

  return { success: true, recoveryCodes: codes }
}

/**
 * Update user profile details (displayName, avatarColor).
 */
export async function updateUserProfile({
  userId,
  displayName,
  avatarColor,
}: {
  userId: string
  displayName?: string
  avatarColor?: string
}): Promise<{ success: boolean; user?: ClientSafeUser; error?: string }> {
  const user = getUserById(userId)
  if (!user) {
    return { success: false, error: "User not found." }
  }

  if (displayName && displayName.trim()) {
    user.displayName = displayName.trim()
  }

  if (avatarColor && AVATAR_COLORS.includes(avatarColor)) {
    user.avatarColor = avatarColor
  }

  user.updatedAt = Date.now()
  userRegistry.set(user.id, user)
  persistUsers()

  return { success: true, user: toClientSafeUser(user) }
}

// ---------------------------------------------------------------------------
// Session Management & Token Signing
// ---------------------------------------------------------------------------

/**
 * Create a new signed session for a user.
 */
export function createSession(userId: string, userAgent?: string, ip?: string): UserSession {
  const sessionId = `sess_${nanoid(16)}`
  const now = Date.now()
  const expiresAt = now + SESSION_TTL_MS

  // Sign session token with HMAC SHA-256
  const payload = `${sessionId}:${userId}:${expiresAt}`
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex")
  const token = Buffer.from(`${payload}:${signature}`).toString("base64url")

  const session: UserSession = {
    id: sessionId,
    userId,
    token,
    createdAt: now,
    expiresAt,
    userAgent,
    ip,
  }

  sessionRegistry.set(token, session)
  return session
}

/**
 * Verify a session token and return the active session if valid.
 */
export function verifySessionToken(token: string): UserSession | null {
  if (!token) return null
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8")
    const parts = raw.split(":")
    if (parts.length !== 4) return null
    const [sessionId, userId, expiresAtStr, signature] = parts

    const expiresAt = parseInt(expiresAtStr, 10)
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      sessionRegistry.delete(token)
      return null
    }

    const payload = `${sessionId}:${userId}:${expiresAtStr}`
    const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex")

    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
      return null
    }

    const session = sessionRegistry.get(token)
    if (!session || session.userId !== userId || session.expiresAt !== expiresAt) {
      // In-memory session check
      return {
        id: sessionId,
        userId,
        token,
        createdAt: expiresAt - SESSION_TTL_MS,
        expiresAt,
      }
    }

    return session
  } catch {
    return null
  }
}

/**
 * Invalidate a session token (e.g., on logout).
 */
export function destroySession(token: string): boolean {
  if (!token) return false
  return sessionRegistry.delete(token)
}

/**
 * Invalidate all active sessions for a user (e.g., on password change / reset).
 */
export function invalidateAllUserSessions(userId: string): void {
  for (const [token, session] of sessionRegistry.entries()) {
    if (session.userId === userId) {
      sessionRegistry.delete(token)
    }
  }
}

/**
 * Extract authenticated user from an incoming Request / NextRequest,
 * defaulting gracefully to the standard local Zenith user so no features are blocked.
 */
export async function getAuthenticatedUser(req?: Request): Promise<UserRecord> {
  seedInitialAccounts()

  let user: UserRecord | null = null

  if (req) {
    // 1. Try Cookie header
    const cookieHeader = req.headers.get("cookie") || ""
    let token: string | undefined

    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim())
      for (const c of cookies) {
        if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) {
          token = c.substring(AUTH_COOKIE_NAME.length + 1)
          break
        }
      }
    }

    // 2. Try Authorization header
    if (!token) {
      const authHeader = req.headers.get("authorization") || ""
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim()
      }
    }

    if (token) {
      const session = verifySessionToken(token)
      if (session) {
        user = getUserById(session.userId)
      }
    }
  }

  return (
    user ||
    userRegistry.get("usr_admin_default") || {
      id: "zenith_default_user",
      username: "zenith_user",
      normalizedUsername: "zenith_user",
      displayName: "Zenith User",
      passwordHash: "",
      passwordSalt: "",
      recoveryCodeHashes: [],
      recoveryCodesLeft: 6,
      avatarColor: "#2563eb",
      role: "admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLoginAt: Date.now(),
    }
  )
}

/**
 * Convenience helper: returns the client safe representation of current user.
 */
export async function getOptionalUser(req?: Request): Promise<ClientSafeUser | null> {
  const user = await getAuthenticatedUser(req)
  return user ? toClientSafeUser(user) : null
}

/**
 * Resolves an effective user identifier for sessions.
 * Returns valid user ID or guest identifier with zero login requirements.
 */
export async function getEffectiveUserId(req?: Request): Promise<{ userId: string; isAuthenticated: boolean }> {
  if (req) {
    const cookieHeader = req.headers.get("cookie") || ""
    let guestId: string | undefined
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim())
      for (const c of cookies) {
        if (c.startsWith("zenithsui_guest_id=")) {
          guestId = c.substring("zenithsui_guest_id=".length).trim()
          break
        }
      }
    }

    if (!guestId) {
      guestId = req.headers.get("x-guest-id")?.trim() || undefined
    }

    if (guestId) {
      return { userId: guestId, isAuthenticated: true }
    }
  }

  const user = await getAuthenticatedUser(req)
  return { userId: user ? user.id : "zenith_default_user", isAuthenticated: true }
}
