// ---------------------------------------------------------------------------
// Zenithsui Professional Share Links Service
//
// Cryptographic share token lifecycle: Generation, Hashing, Expiration,
// Password Protection, Revocation, and Atomic Rotation.
//
// INVARIANT: ZERO comments! Roles: owner, editor, viewer.
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

export interface CreateShareLinkOptions {
  documentId: string
  userId: string
  permission?: SharePermission // "view" | "edit"
  name?: string | null
  password?: string | null
  expiresInSeconds?: number | null // e.g. 3600 (1h), 86400 (1d), 604800 (7d), 2592000 (30d)
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
 */
export async function createShareLink(
  options: CreateShareLinkOptions,
  client?: any
): Promise<CreateShareLinkResult> {
  const supabase = client ?? (await createServerClient())

  const rawToken = generateShareToken(32)
  const tokenHash = await hashShareToken(rawToken)

  let passwordHash: string | null = null
  let passwordSalt: string | null = null

  if (options.password && options.password.trim().length > 0) {
    const pwdRes = await hashSharePassword(options.password.trim())
    passwordHash = pwdRes.hash
    passwordSalt = pwdRes.salt
  }

  let expiresAt: string | null = null
  if (options.expiresInSeconds && options.expiresInSeconds > 0) {
    expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000).toISOString()
  } else if (options.expiresAtDate) {
    expiresAt = new Date(options.expiresAtDate).toISOString()
  }

  const newLinkData: Partial<ShareLinkRecord> & {
    document_id: string
    token_hash: string
    created_by: string
  } = {
    document_id: options.documentId,
    token_hash: tokenHash,
    name: options.name?.trim() || null,
    permission: options.permission || "view",
    allow_export: options.allowExport ?? true,
    allow_duplicate: options.allowDuplicate ?? true,
    created_by: options.userId,
    expires_at: expiresAt,
    revoked_at: null,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    max_uses: options.maxUses || null,
    use_count: 0,
    is_active: true,
  }

  const { data, error } = await supabase
    .from("share_links")
    .insert(newLinkData)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Failed to create share link: ${error?.message || "Unknown error"}`)
  }

  return {
    link: data as ShareLinkRecord,
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
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from("share_links")
    .select("id, document_id, token_hash, name, permission, allow_export, allow_duplicate, created_by, created_at, expires_at, revoked_at, max_uses, use_count, is_active")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data as any[]
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
  const supabase = client ?? (await createServerClient())

  const rawToken = generateShareToken(32)
  const tokenHash = await hashShareToken(rawToken)

  const { data, error } = await supabase
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

  if (error || !data) {
    throw new Error(`Failed to rotate share link: ${error?.message || "Link not found"}`)
  }

  return {
    rawToken,
    shareUrl: `/share/${rawToken}`,
    link: data as ShareLinkRecord,
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
  const supabase = client ?? (await createServerClient())

  const { error } = await supabase
    .from("share_links")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", linkId)

  return !error
}

/**
 * Emergency owner action: Revokes all active share links for a document.
 */
export async function revokeAllShareLinks(
  documentId: string,
  actorId: string,
  client?: any
): Promise<number> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from("share_links")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("document_id", documentId)
    .eq("is_active", true)
    .select("id")

  if (error) {
    throw new Error(`Failed to revoke all links: ${error.message}`)
  }

  return data?.length || 0
}

/**
 * Resolves a raw share token, verifying hash, expiration, revocation, and password status.
 */
export async function resolveShareToken(
  rawToken: string,
  sessionCookieValue?: string | string[] | null,
  client?: any
): Promise<ResolvedShareLink> {
  const supabase = client ?? (await createServerClient())
  const tokenHash = await hashShareToken(rawToken)

  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("*")
    .eq("token_hash", tokenHash)
    .single()

  if (linkError || !link) {
    return { valid: false, error: "Share link not found or expired." }
  }

  if (!isShareTokenValid(link)) {
    return { valid: false, error: "This share link has expired or has been revoked." }
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
        permission: link.permission,
        allowExport: link.allow_export ?? true,
        allowDuplicate: link.allow_duplicate ?? true,
        requiresPassword: true,
      }
    }
  }

  // Increment usage count asynchronously
  await supabase
    .from("share_links")
    .update({
      use_count: (link.use_count || 0) + 1,
    })
    .eq("id", link.id)
    .catch(() => {})

  // Fetch document payload (sanitized)
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, name, document_json, schema_version, revision, updated_at")
    .eq("id", link.document_id)
    .is("deleted_at", null)
    .single()

  if (docError || !doc) {
    return { valid: false, error: "Document is no longer available." }
  }

  return {
    valid: true,
    linkId: link.id,
    documentId: link.document_id,
    permission: link.permission,
    allowExport: link.allow_export ?? true,
    allowDuplicate: link.allow_duplicate ?? true,
    requiresPassword: false,
    document: doc,
  }
}
