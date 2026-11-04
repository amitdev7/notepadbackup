// ---------------------------------------------------------------------------
// Zenithsui Professional Share Links Service
//
// Cryptographic share token lifecycle: Generation, Hashing, Expiration,
// Password Protection, Revocation, and Atomic Rotation.
//
// INVARIANT: Max 7 days lifetime for storage conservation and auto-cleanup.
// ---------------------------------------------------------------------------

import type { ShareLinkRecord, SharePermission } from "../db/types"
import {
  generateShareToken,
  hashShareToken,
  hashSharePassword,
  verifySharePassword,
  isShareTokenValid,
} from "../security/share-crypto"
import { verifyShareSessionToken } from "../security/share-session"
import { createClient as createServerClient } from "../supabase/server"
import { isSupabaseConfigured } from "../supabase/client"

/** Strict maximum expiration: 7 days in seconds to preserve database & file storage */
export const MAX_SHARE_EXPIRATION_SECONDS = 7 * 24 * 60 * 60 // 604,800 seconds (7 Days)

interface GlobalShareStore {
  links: Map<string, ShareLinkRecord>
  docs: Map<string, any>
}

declare global {
  var __zenithsuiShareStore: GlobalShareStore | undefined
}

if (!globalThis.__zenithsuiShareStore) {
  globalThis.__zenithsuiShareStore = {
    links: new Map<string, ShareLinkRecord>(),
    docs: new Map<string, any>(),
  }
}

/** Save or update a shared document in the cross-request memory store */
export function saveSharedDocumentMemory(doc: any): void {
  if (!doc?.id) return
  globalThis.__zenithsuiShareStore?.docs.set(doc.id, {
    ...doc,
    updated_at: new Date().toISOString(),
  })
}

/** Retrieve a shared document from the cross-request memory store */
export function getSharedDocumentMemory(docId: string): any | null {
  return globalThis.__zenithsuiShareStore?.docs.get(docId) || null
}

/**
 * Automatically purges expired share links and orphaned documents
 * to conserve database and memory storage.
 */
export async function cleanupExpiredShareLinksAndStorage(client?: any): Promise<{ removedLinks: number; removedDocs: number }> {
  const now = Date.now()
  let removedLinks = 0
  let removedDocs = 0

  // 1. Clean in-memory store
  const store = globalThis.__zenithsuiShareStore
  if (store) {
    for (const [hash, link] of store.links.entries()) {
      if (link.expires_at && new Date(link.expires_at).getTime() <= now) {
        store.links.delete(hash)
        removedLinks++
      }
    }
    const activeDocIds = new Set(Array.from(store.links.values()).map((l) => l.document_id))
    for (const [docId, doc] of store.docs.entries()) {
      const age = now - new Date(doc.updated_at || doc.created_at || 0).getTime()
      if (!activeDocIds.has(docId) && age > MAX_SHARE_EXPIRATION_SECONDS * 1000) {
        store.docs.delete(docId)
        removedDocs++
      }
    }
  }

  // 2. Clean Supabase database if active
  if (isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const nowIso = new Date().toISOString()
      await supabase.from("share_links").delete().lt("expires_at", nowIso)
    } catch {
      // Graceful catch for offline / local mode
    }
  }

  return { removedLinks, removedDocs }
}

export interface CreateShareLinkOptions {
  documentId: string
  userId: string
  permission?: SharePermission // "view" | "edit"
  name?: string | null
  password?: string | null
  expiresInSeconds?: number | null // Capped to max 7 days (604800s)
  expiresAtDate?: string | null
  allowExport?: boolean
  allowDuplicate?: boolean
  maxUses?: number | null
}

export interface CreateShareLinkResult {
  link: ShareLinkRecord
  rawToken: string
  shareUrl: string
}

export interface ResolvedShareLink {
  valid: boolean
  linkId?: string
  documentId?: string
  permission?: SharePermission
  allowExport?: boolean
  allowDuplicate?: boolean
  requiresPassword?: boolean
  document?: any
  error?: string
}

/**
 * Creates a new cryptographic share link for a document.
 * Strictly enforces a 7-day maximum expiration to conserve storage.
 */
export async function createShareLink(
  options: CreateShareLinkOptions,
  client?: any
): Promise<CreateShareLinkResult> {
  // Run background storage cleanup
  void cleanupExpiredShareLinksAndStorage(client)

  const rawToken = generateShareToken(32)
  const tokenHash = await hashShareToken(rawToken)

  let passwordHash: string | null = null
  let passwordSalt: string | null = null

  if (options.password && options.password.trim().length > 0) {
    const pwdRes = await hashSharePassword(options.password.trim())
    passwordHash = pwdRes.hash
    passwordSalt = pwdRes.salt
  }

  // Enforce max 7 days expiration strictly
  let finalExpiresInSeconds = options.expiresInSeconds ?? MAX_SHARE_EXPIRATION_SECONDS
  if (finalExpiresInSeconds <= 0 || finalExpiresInSeconds > MAX_SHARE_EXPIRATION_SECONDS) {
    finalExpiresInSeconds = MAX_SHARE_EXPIRATION_SECONDS
  }

  let expiresAt: string
  if (options.expiresAtDate) {
    const candidate = new Date(options.expiresAtDate).getTime()
    const maxAllowed = Date.now() + MAX_SHARE_EXPIRATION_SECONDS * 1000
    expiresAt = new Date(Math.min(candidate, maxAllowed)).toISOString()
  } else {
    expiresAt = new Date(Date.now() + finalExpiresInSeconds * 1000).toISOString()
  }

  const newLinkData: any = {
    id: `link_${rawToken.slice(0, 16)}`,
    document_id: options.documentId,
    token: tokenHash,
    token_hash: tokenHash,
    access_level: options.permission || "view",
    permission: options.permission || "view",
    name: options.name?.trim() || null,
    allow_export: options.allowExport ?? true,
    allow_duplicate: options.allowDuplicate ?? true,
    created_by: options.userId,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    revoked_at: null,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    max_uses: options.maxUses || null,
    use_count: 0,
    is_active: true,
  }

  // Always store in cross-request memory cache
  globalThis.__zenithsuiShareStore?.links.set(tokenHash, newLinkData)

  // Also persist to Supabase if available
  if (isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const { data } = await supabase
        .from("share_links")
        .insert(newLinkData)
        .select("*")
        .single()

      if (data) {
        newLinkData.id = data.id
      }
    } catch {
      // Graceful fallback to memory store
    }
  }

  return {
    link: newLinkData as ShareLinkRecord,
    rawToken,
    shareUrl: `/share/${rawToken}`,
  }
}

/**
 * Lists all share links for a document.
 */
export async function listShareLinks(
  documentId: string,
  client?: any
): Promise<Omit<ShareLinkRecord, "password_hash" | "password_salt">[]> {
  const links: any[] = []

  // Check memory store
  const store = globalThis.__zenithsuiShareStore
  if (store) {
    for (const link of store.links.values()) {
      if (link.document_id === documentId && link.is_active) {
        links.push(link)
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const { data, error } = await supabase
        .from("share_links")
        .select("id, document_id, token_hash, name, permission, allow_export, allow_duplicate, created_by, created_at, expires_at, revoked_at, max_uses, use_count, is_active")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })

      if (data && !error && data.length > 0) {
        return data as any[]
      }
    } catch {
      // Return memory fallback
    }
  }

  return links
}

/**
 * Rotates an existing share link: generates a new 256-bit token,
 * updates the hash, resets usage counter, and reactivates.
 */
export async function rotateShareLink(
  linkId: string,
  actorId: string,
  client?: any
): Promise<{ rawToken: string; shareUrl: string; link: ShareLinkRecord }> {
  const rawToken = generateShareToken(32)
  const tokenHash = await hashShareToken(rawToken)

  const store = globalThis.__zenithsuiShareStore
  let updatedLink: ShareLinkRecord | null = null

  if (store) {
    for (const [oldHash, l] of store.links.entries()) {
      if (l.id === linkId) {
        store.links.delete(oldHash)
        const newRecord: ShareLinkRecord = {
          ...l,
          token_hash: tokenHash,
          use_count: 0,
          revoked_at: null,
          is_active: true,
        }
        store.links.set(tokenHash, newRecord)
        updatedLink = newRecord
        break
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const { data } = await supabase
        .from("share_links")
        .update({
          token_hash: tokenHash,
          use_count: 0,
          revoked_at: null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkId)
        .select("*")
        .single()

      if (data) updatedLink = data as ShareLinkRecord
    } catch {
      // Fallback
    }
  }

  if (!updatedLink) {
    throw new Error("Share link not found")
  }

  return {
    rawToken,
    shareUrl: `/share/${rawToken}`,
    link: updatedLink,
  }
}

/**
 * Revokes a single share link immediately.
 */
export async function revokeShareLink(
  linkId: string,
  actorId: string,
  client?: any
): Promise<boolean> {
  const store = globalThis.__zenithsuiShareStore
  if (store) {
    for (const l of store.links.values()) {
      if (l.id === linkId) {
        l.is_active = false
        l.revoked_at = new Date().toISOString()
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      await supabase
        .from("share_links")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkId)
    } catch {
      // Fallback
    }
  }

  return true
}

/**
 * Emergency owner action: Revokes all active share links for a document.
 */
export async function revokeAllShareLinks(
  documentId: string,
  actorId: string,
  client?: any
): Promise<number> {
  let count = 0
  const store = globalThis.__zenithsuiShareStore
  if (store) {
    for (const l of store.links.values()) {
      if (l.document_id === documentId && l.is_active) {
        l.is_active = false
        l.revoked_at = new Date().toISOString()
        count++
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const { data } = await supabase
        .from("share_links")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("document_id", documentId)
        .eq("is_active", true)
        .select("id")
      if (data) count = data.length
    } catch {
      // Fallback
    }
  }

  return count
}

/**
 * Resolves a raw share token, verifying hash, expiration, revocation, and password status.
 */
export async function resolveShareToken(
  rawToken: string,
  sessionCookieValue?: string | string[] | null,
  client?: any
): Promise<ResolvedShareLink> {
  const tokenHash = await hashShareToken(rawToken)
  let link: ShareLinkRecord | null = null

  // 1. Check memory store
  const memLink = globalThis.__zenithsuiShareStore?.links.get(tokenHash)
  if (memLink) {
    link = memLink
  }

  // 2. Check Supabase database if configured
  if (!link && isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const { data, error } = await supabase
        .from("share_links")
        .select("*")
        .eq("token_hash", tokenHash)
        .single()
      if (data && !error) {
        link = data as ShareLinkRecord
      }
    } catch {
      // Fallback
    }
  }

  if (!link) {
    return { valid: false, error: "Share link not found or expired." }
  }

  if (!isShareTokenValid(link)) {
    // Purge expired token immediately
    globalThis.__zenithsuiShareStore?.links.delete(tokenHash)
    return { valid: false, error: "This share link has expired (maximum 7 days reached to save storage)." }
  }

  // Check password requirement
  if (link.password_hash) {
    let sessionValid = false
    if (sessionCookieValue) {
      const candidates = Array.isArray(sessionCookieValue)
        ? sessionCookieValue
        : [sessionCookieValue]
      for (const cand of candidates) {
        if (cand && (await verifyShareSessionToken(cand, link.id))) {
          sessionValid = true
          break
        }
      }
    }

    if (!sessionValid) {
      return {
        valid: true,
        linkId: link.id,
        documentId: link.document_id,
        permission: (link.permission || (link as any).access_level || "view") as SharePermission,
        allowExport: link.allow_export ?? true,
        allowDuplicate: link.allow_duplicate ?? true,
        requiresPassword: true,
      }
    }
  }

  // Increment usage count
  link.use_count = (link.use_count || 0) + 1

  // Fetch document payload (from memory or Supabase)
  let doc: any = null
  const memDoc = globalThis.__zenithsuiShareStore?.docs.get(link.document_id)
  if (memDoc) {
    doc = memDoc
  }

  if (!doc && isSupabaseConfigured()) {
    try {
      const supabase = client ?? (await createServerClient())
      const { data: dbDoc } = await supabase
        .from("documents")
        .select("id, name, document_json, schema_version, revision, updated_at")
        .eq("id", link.document_id)
        .is("deleted_at", null)
        .single()
      if (dbDoc) {
        doc = dbDoc
      }
    } catch {
      // Fallback
    }
  }

  if (!doc) {
    // If not found in either, construct fallback document wrapper
    doc = {
      id: link.document_id,
      name: link.name || "Shared Canvas",
      document_json: { nodes: {}, order: [], look: { grid: false, theme: "paper" } },
      schema_version: 1,
      revision: 1,
    }
  }

  return {
    valid: true,
    linkId: link.id,
    documentId: link.document_id,
    permission: (link.permission || (link as any).access_level || "view") as SharePermission,
    allowExport: link.allow_export ?? true,
    allowDuplicate: link.allow_duplicate ?? true,
    requiresPassword: false,
    document: doc,
  }
}
