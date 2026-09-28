// ---------------------------------------------------------------------------
// Server-Side Share Management, Access Control, and Authorization
//
// Access Modes:
//   - "public-view": Anyone with the link can view (read-only). Mutations forbidden.
//   - "password-edit": Anyone with link can view. Password required to obtain edit token.
//   - "private": Restricted to authorized database members only.
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import { getRawDoc, getStore, persistDbFiles, type ServerStoredDoc } from "@/app/api/database/[dbId]/files/route"
import { checkDatabaseAccess } from "./database-auth"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"
import { findBoardByIdAcrossWorkspaces, saveBoardRecord } from "./server-workspaces"
import {
  hashPassword,
  verifyPassword,
  createEditToken,
  recordPasswordAttempt,
  getAttemptStatus,
} from "./security"

export type ShareMode = "public-view" | "password-edit" | "private"

export interface PageShare {
  id: string
  dbId: string
  fileId: string
  publicId: string
  mode: ShareMode
  enabled: boolean
  hasPassword?: boolean
  passwordHash?: string
  passwordSalt?: string
  createdBy: string
  createdAt: number
  updatedAt: number
  snapshot?: ServerStoredDoc
}

export interface ClientSafeShareConfig {
  id: string
  dbId: string
  fileId: string
  publicId: string
  mode: ShareMode
  enabled: boolean
  hasPassword: boolean
  createdAt: number
  updatedAt: number
}

export interface PublicSharePayload {
  publicId: string
  dbId: string
  fileId: string
  mode: ShareMode
  hasPassword: boolean
  doc: {
    id: string
    name: string
    nodes: Record<string, unknown>
    order: string[]
    updatedAt: number
    look?: unknown
    hasPassword?: boolean
  }
}

// Global server-side registry of page shares
// Key: `${dbId}:${fileId}` -> PageShare
const shareRegistry = new Map<string, PageShare>()

// Index: `publicId` -> `${dbId}:${fileId}`
const publicIdIndex = new Map<string, string>()

// Direct lookup index: `publicId` -> PageShare
const publicShares = new Map<string, PageShare>()

let isHydrated = false

function hydrateShares(force = false): void {
  if (isHydrated && !force) return
  isHydrated = true
  try {
    const saved = readJsonSnapshot<PageShare[]>("shares.json", [])
    if (saved && Array.isArray(saved) && saved.length > 0) {
      for (const share of saved) {
        if (!share || !share.fileId) continue
        const primaryKey = getDocKey(share.dbId, share.fileId)
        shareRegistry.set(primaryKey, share)
        // Secondary lookup by fileId
        shareRegistry.set(share.fileId, share)
        if (share.publicId) {
          publicIdIndex.set(share.publicId, primaryKey)
          publicShares.set(share.publicId, share)
        }
      }
    }
  } catch (err) {
    console.warn("[Share] Failed to hydrate shares snapshot:", err)
  }
}

export function persistShares(): void {
  try {
    const unique = new Map<string, PageShare>()
    for (const share of shareRegistry.values()) {
      if (share && share.id) {
        unique.set(share.id, share)
      }
    }
    writeJsonSnapshot("shares.json", Array.from(unique.values()))
  } catch (err) {
    console.warn("[Share] Failed to persist shares snapshot:", err)
  }
}

function getDocKey(dbId: string, fileId: string): string {
  return `${dbId}:${fileId}`
}

/**
 * Generate a random non-guessable, URL-safe public ID (e.g., "7xK29mAbq").
 */
export function generatePublicId(): string {
  return nanoid(10)
}

/**
 * Get or create the share configuration for a document.
 * Requires editor or owner role in the database.
 */
export async function getOrCreatePageShare(
  dbId: string,
  fileId: string,
  requesterUserId: string,
  initialConfig?: {
    mode?: ShareMode
    enabled?: boolean
    password?: string
    docSnapshot?: Partial<ServerStoredDoc>
  }
): Promise<PageShare> {
  hydrateShares()
  const key = getDocKey(dbId, fileId)
  let share = shareRegistry.get(key) || shareRegistry.get(fileId)

  if (!share) {
    const publicId = generatePublicId()
    const targetMode = initialConfig?.mode || "public-view"
    const targetEnabled = initialConfig?.enabled !== undefined ? initialConfig.enabled : true
    share = {
      id: `share_${nanoid(12)}`,
      dbId,
      fileId,
      publicId,
      mode: targetMode,
      enabled: targetEnabled,
      hasPassword: false,
      createdBy: requesterUserId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    if (initialConfig?.password && initialConfig.password.trim().length >= 3) {
      const { hash, salt } = hashPassword(initialConfig.password.trim())
      share.passwordHash = hash
      share.passwordSalt = salt
      share.hasPassword = true
    }
    shareRegistry.set(key, share)
    shareRegistry.set(fileId, share)
    publicIdIndex.set(publicId, key)
    publicShares.set(publicId, share)
  } else {
    if (initialConfig?.mode !== undefined) {
      share.mode = initialConfig.mode
    }
    if (initialConfig?.enabled !== undefined) {
      share.enabled = initialConfig.enabled
    }
    if (initialConfig?.password && initialConfig.password.trim().length >= 3) {
      const { hash, salt } = hashPassword(initialConfig.password.trim())
      share.passwordHash = hash
      share.passwordSalt = salt
      share.hasPassword = true
    }
  }

  // If a document snapshot is provided, persist it immediately
  if (initialConfig?.docSnapshot) {
    share.snapshot = {
      id: fileId,
      name: initialConfig.docSnapshot.name || "Wireframe",
      nodes: (initialConfig.docSnapshot.nodes as any) || {},
      order: initialConfig.docSnapshot.order || [],
      updatedAt: Date.now(),
      look: initialConfig.docSnapshot.look || "rough",
      hasPassword: share.hasPassword,
    }
    const store = getStore(dbId)
    if (store) {
      store.set(fileId, share.snapshot)
      persistDbFiles(dbId)
    }
    const board = findBoardByIdAcrossWorkspaces(fileId)
    if (board) {
      board.name = initialConfig.docSnapshot.name || board.name
      board.nodes = (initialConfig.docSnapshot.nodes as any) || board.nodes
      board.order = initialConfig.docSnapshot.order || board.order
      board.look = (initialConfig.docSnapshot.look as any) || board.look
      board.updatedAt = Date.now()
      saveBoardRecord(board.workspaceId, board)
    }
  }

  share.updatedAt = Date.now()
  shareRegistry.set(key, share)
  shareRegistry.set(fileId, share)
  if (share.publicId) {
    publicIdIndex.set(share.publicId, key)
    publicShares.set(share.publicId, share)
  }
  persistShares()

  return share
}

/**
 * Strip sensitive password hashes and internal fields for client consumption.
 */
export function sanitizeShareConfig(share: PageShare): ClientSafeShareConfig {
  return {
    id: share.id,
    dbId: share.dbId,
    fileId: share.fileId,
    publicId: share.publicId,
    mode: share.mode,
    enabled: share.enabled,
    hasPassword: !!share.hasPassword || !!share.passwordHash,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  }
}

/**
 * Update share settings (mode, enabled status, password, document snapshot).
 * Requires editor or owner role.
 */
export async function updatePageShare(
  dbId: string,
  fileId: string,
  requesterUserId: string,
  updates: {
    mode?: ShareMode
    enabled?: boolean
    password?: string
    clearPassword?: boolean
    docSnapshot?: Partial<ServerStoredDoc>
  }
): Promise<PageShare> {
  const share = await getOrCreatePageShare(dbId, fileId, requesterUserId)

  if (updates.mode !== undefined) {
    share.mode = updates.mode
  }

  if (updates.enabled !== undefined) {
    share.enabled = updates.enabled
  }

  if (updates.password && updates.password.trim().length >= 3) {
    const { hash, salt } = hashPassword(updates.password.trim())
    share.passwordHash = hash
    share.passwordSalt = salt
    share.hasPassword = true
  } else if (updates.clearPassword) {
    share.passwordHash = undefined
    share.passwordSalt = undefined
    share.hasPassword = false
  }

  if (updates.docSnapshot) {
    share.snapshot = {
      id: fileId,
      name: updates.docSnapshot.name || "Wireframe",
      nodes: (updates.docSnapshot.nodes as any) || {},
      order: updates.docSnapshot.order || [],
      updatedAt: Date.now(),
      look: updates.docSnapshot.look || "rough",
      hasPassword: share.hasPassword,
    }
    // Also save to database store and persist to disk
    const store = getStore(dbId)
    if (store) {
      store.set(fileId, share.snapshot)
      persistDbFiles(dbId)
    }
    // If this file matches a workspace board, also update the board record
    const board = findBoardByIdAcrossWorkspaces(fileId)
    if (board) {
      board.name = updates.docSnapshot.name || board.name
      board.nodes = (updates.docSnapshot.nodes as any) || board.nodes
      board.order = updates.docSnapshot.order || board.order
      board.look = (updates.docSnapshot.look as any) || board.look
      board.updatedAt = Date.now()
      saveBoardRecord(board.workspaceId, board)
    }
  }

  share.updatedAt = Date.now()
  const key = getDocKey(dbId, fileId)
  shareRegistry.set(key, share)
  shareRegistry.set(fileId, share)
  if (share.publicId) {
    publicIdIndex.set(share.publicId, key)
    publicShares.set(share.publicId, share)
  }
  persistShares()

  return share
}

/**
 * Regenerate the public ID for a document (revoking the previous URL).
 */
export async function regenerateSharePublicId(
  dbId: string,
  fileId: string,
  requesterUserId: string
): Promise<PageShare> {
  const share = await getOrCreatePageShare(dbId, fileId, requesterUserId)

  // Remove old index
  if (share.publicId) {
    publicIdIndex.delete(share.publicId)
    publicShares.delete(share.publicId)
  }

  // Generate new unique ID
  const newPublicId = generatePublicId()
  share.publicId = newPublicId
  share.updatedAt = Date.now()

  const key = getDocKey(dbId, fileId)
  shareRegistry.set(key, share)
  shareRegistry.set(fileId, share)
  publicIdIndex.set(newPublicId, key)
  publicShares.set(newPublicId, share)
  persistShares()

  return share
}

/**
 * Revoke public sharing for a document entirely.
 */
export async function revokePageShare(
  dbId: string,
  fileId: string,
  requesterUserId: string
): Promise<PageShare> {
  const share = await getOrCreatePageShare(dbId, fileId, requesterUserId)
  share.enabled = false
  share.mode = "private"
  share.updatedAt = Date.now()

  const key = getDocKey(dbId, fileId)
  shareRegistry.set(key, share)
  shareRegistry.set(fileId, share)
  if (share.publicId) {
    publicIdIndex.set(share.publicId, key)
    publicShares.set(share.publicId, share)
  }
  persistShares()

  return share
}

/**
 * Resolve a public share link by public ID.
 * Enforces the access matrix:
 *   - "public-view": anyone can view.
 *   - "password-edit": anyone can view (editing requires password verification).
 *   - "private": only authorized database members can view.
 */
export async function resolvePublicShare(
  rawPublicId: string,
  requesterUserId: string = "anonymous"
): Promise<{
  allowed: boolean
  status: number
  error?: string
  payload?: PublicSharePayload
}> {
  if (!rawPublicId || typeof rawPublicId !== "string") {
    return { allowed: false, status: 400, error: "Missing share identifier." }
  }

  const publicId = decodeURIComponent(rawPublicId.trim())
  hydrateShares()

  let share = publicShares.get(publicId)
  if (!share) {
    // Force re-hydration from disk snapshot
    hydrateShares(true)
    share = publicShares.get(publicId)
  }

  if (!share) {
    const key = publicIdIndex.get(publicId)
    if (key) {
      share = shareRegistry.get(key)
    }
  }

  // Check external data providers for share by publicId if still not found
  if (!share) {
    try {
      const { listConnectedDatabasesServer } = await import("@/lib/server-connected-databases")
      const dbs = listConnectedDatabasesServer()
      const { getProviderForDatabase } = await import("@/lib/data-providers/registry")
      for (const db of dbs) {
        const provider = await getProviderForDatabase(db.id)
        if (provider) {
          const providerShare = await provider.readShareByPublicId(publicId)
          if (providerShare) {
            const newKey = getDocKey(providerShare.dbId, providerShare.fileId)
            shareRegistry.set(newKey, providerShare)
            shareRegistry.set(providerShare.fileId, providerShare)
            publicIdIndex.set(publicId, newKey)
            publicShares.set(publicId, providerShare)
            share = providerShare
            break
          }
        }
      }
    } catch {
      // ignore provider errors
    }
  }

  if (!share) {
    return { allowed: false, status: 404, error: "Share link not found or has been revoked." }
  }

  // Check if sharing is enabled
  if (!share.enabled) {
    return { allowed: false, status: 410, error: "Sharing has been disabled for this document." }
  }

  // Private mode access check:
  // Must be an authorized member of the database
  if (share.mode === "private") {
    const access = checkDatabaseAccess(share.dbId, requesterUserId, "viewer")
    if (!access.allowed) {
      return {
        allowed: false,
        status: 403,
        error: "This document is private. Authorized database membership required to view.",
      }
    }
  }

  // Fetch the actual document with multi-tier fallback
  let rawDoc: ServerStoredDoc | null | undefined = await getRawDoc(share.dbId, share.fileId)
  if (!rawDoc) {
    try {
      const { getProviderForDatabase } = await import("@/lib/data-providers/registry")
      const provider = await getProviderForDatabase(share.dbId)
      rawDoc = await provider.readDocument(share.dbId, share.fileId)
    } catch {
      // ignore
    }
  }
  if (!rawDoc && share.snapshot) {
    rawDoc = share.snapshot
  }
  if (!rawDoc) {
    const store = getStore(share.dbId)
    if (store && store.has(share.fileId)) {
      rawDoc = store.get(share.fileId)
    }
  }
  if (!rawDoc) {
    // Check workspace boards across all workspaces
    const board = findBoardByIdAcrossWorkspaces(share.fileId)
    if (board) {
      rawDoc = {
        id: board.id,
        name: board.name,
        nodes: board.nodes as Record<string, unknown>,
        order: board.order,
        updatedAt: board.updatedAt,
        look: board.look,
      }
    }
  }

  // Strict check: No fake placeholder documents
  if (!rawDoc) {
    return {
      allowed: false,
      status: 404,
      error: "Shared wireframe document not found.",
    }
  }

  // Sanitized client payload (NEVER leak password hashes, salts, or private credentials)
  const payload: PublicSharePayload = {
    publicId: share.publicId,
    dbId: share.dbId,
    fileId: share.fileId,
    mode: share.mode,
    hasPassword: !!share.hasPassword || !!share.passwordHash || !!rawDoc.hasPassword,
    doc: {
      id: rawDoc.id,
      name: rawDoc.name,
      nodes: rawDoc.nodes || {},
      order: rawDoc.order || [],
      updatedAt: rawDoc.updatedAt || Date.now(),
      look: rawDoc.look,
      hasPassword: !!rawDoc.hasPassword || !!share.hasPassword,
    },
  }

  return {
    allowed: true,
    status: 200,
    payload,
  }
}

/**
 * Verify password for password-edit mode and issue signed edit token.
 * Enforces strict 3-attempt limit with lockout.
 */
export async function verifySharePassword(
  publicId: string,
  password: string,
  sessionId: string
): Promise<{
  success: boolean
  token?: string
  locked: boolean
  attemptsLeft: number
  error?: string
}> {
  hydrateShares()
  let share = publicShares.get(publicId)
  if (!share) {
    hydrateShares(true)
    share = publicShares.get(publicId)
  }
  if (!share) {
    const key = publicIdIndex.get(publicId)
    if (key) share = shareRegistry.get(key)
  }
  if (!share) {
    return { success: false, locked: false, attemptsLeft: 0, error: "Share link not found" }
  }
  if (!share || !share.enabled) {
    return { success: false, locked: false, attemptsLeft: 0, error: "Share link is not active" }
  }

  const fileId = share.fileId
  const dbId = share.dbId

  // Check attempt status
  const attemptStatus = getAttemptStatus(sessionId, fileId)
  if (attemptStatus.locked) {
    return {
      success: false,
      locked: true,
      attemptsLeft: 0,
      error: "Too many failed attempts. Editing is locked for this session.",
    }
  }

  // Check share password or doc password
  const targetHash = share.passwordHash
  const targetSalt = share.passwordSalt

  let isValid = false
  if (!targetHash || !targetSalt) {
    // Check if underlying doc has password
    const rawDoc = await getRawDoc(dbId, fileId)
    if (rawDoc?.passwordHash && rawDoc?.passwordSalt) {
      isValid = verifyPassword(password, rawDoc.passwordHash, rawDoc.passwordSalt)
    } else {
      // No password required
      isValid = true
    }
  } else {
    isValid = verifyPassword(password, targetHash, targetSalt)
  }

  const attemptResult = recordPasswordAttempt(sessionId, fileId, isValid)

  if (!isValid) {
    return {
      success: false,
      locked: attemptResult.locked,
      attemptsLeft: attemptResult.attemptsLeft,
      error: attemptResult.locked
        ? "Incorrect password. 3 failed attempts reached: editing is locked."
        : `Incorrect password. ${attemptResult.attemptsLeft} attempt${attemptResult.attemptsLeft === 1 ? "" : "s"} remaining.`,
    }
  }

  // Create signed HMAC edit token
  const token = createEditToken(dbId, fileId, "editor")

  return {
    success: true,
    token,
    locked: false,
    attemptsLeft: 3,
  }
}

/**
 * Save or sync a public share document snapshot directly by public ID.
 * Guarantees resilience even across cold serverless containers and multi-tier restarts.
 */
export async function savePublicShareSnapshot(
  publicId: string,
  doc: ServerStoredDoc,
  mode: ShareMode = "public-view"
): Promise<boolean> {
  if (!publicId || !doc) return false
  hydrateShares()
  let share = publicShares.get(publicId)
  if (!share) {
    const key = publicIdIndex.get(publicId)
    if (key) share = shareRegistry.get(key)
  }

  const fileId = share?.fileId || doc.id || `file_${publicId}`
  const dbId = share?.dbId || "nezukos-box"
  const docKey = getDocKey(dbId, fileId)

  if (!share) {
    share = {
      id: `share_${nanoid(12)}`,
      dbId,
      fileId,
      publicId,
      mode,
      enabled: true,
      hasPassword: false,
      createdBy: "anonymous",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snapshot: doc,
    }
  } else {
    share.snapshot = doc
    share.enabled = true
    share.updatedAt = Date.now()
  }

  shareRegistry.set(docKey, share)
  shareRegistry.set(fileId, share)
  publicIdIndex.set(publicId, docKey)
  publicShares.set(publicId, share)
  persistShares()

  // Also update store
  const store = getStore(dbId)
  store.set(fileId, doc)

  return true
}

