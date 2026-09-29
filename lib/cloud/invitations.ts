// ---------------------------------------------------------------------------
// Zenithsui Direct Document Invitations Service
//
// Multi-email invite parsing, cryptographic token hashing, 7-day expiration,
// atomic membership binding, and owner invite management.
//
// INVARIANT: ZERO comments! Roles: owner, editor, viewer.
// ---------------------------------------------------------------------------

import type { DocumentInvitationRecord } from "../db/types"
import { generateShareToken, hashShareToken, isShareTokenExpired } from "../security/share-crypto"
import { createClient as createServerClient } from "../supabase/server"

export interface CreateInvitationsOptions {
  documentId: string
  inviterId: string
  emails: string[]
  role: "editor" | "viewer"
}

export interface InvitationResult {
  email: string
  rawToken: string
  inviteUrl: string
  invitation: DocumentInvitationRecord
}

/**
 * Parses and normalizes multi-email string inputs (separators: comma, semicolon, space, newline).
 */
export function parseEmailList(raw: string): string[] {
  if (!raw || typeof raw !== "string") return []

  const parts = raw.split(/[\s,;]+/)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
  const valid = new Set<string>()

  for (const part of parts) {
    const trimmed = part.trim().toLowerCase()
    if (trimmed && !trimmed.includes("..") && !trimmed.includes("@.") && emailRegex.test(trimmed)) {
      valid.add(trimmed)
    }
  }

  return Array.from(valid)
}

/**
 * Creates invitations for multiple recipients with 7-day default expiration.
 */
export async function createInvitations(
  options: CreateInvitationsOptions,
  client?: any
): Promise<InvitationResult[]> {
  const supabase = client ?? (await createServerClient())
  const results: InvitationResult[] = []

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const email of options.emails) {
    const rawToken = generateShareToken(32)
    const tokenHash = await hashShareToken(rawToken)

    const insertData: Partial<DocumentInvitationRecord> & {
      document_id: string
      email: string
      role: "editor" | "viewer"
      invited_by: string
      token_hash: string
    } = {
      document_id: options.documentId,
      email,
      role: options.role,
      invited_by: options.inviterId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      accepted_at: null,
      revoked_at: null,
    }

    const { data, error } = await supabase
      .from("document_invitations")
      .insert(insertData)
      .select("*")
      .single()

    if (!error && data) {
      results.push({
        email,
        rawToken,
        inviteUrl: `/invite/${rawToken}`,
        invitation: data as DocumentInvitationRecord,
      })
    }
  }

  return results
}

/**
 * Lists pending (unaccepted, unexpired, unrevoked) invitations for a document.
 */
export async function listPendingInvitations(
  documentId: string,
  client?: any
): Promise<DocumentInvitationRecord[]> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from("document_invitations")
    .select("id, document_id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at")
    .eq("document_id", documentId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (error || !data) return []
  return data as any[]
}

/**
 * Resends an invitation: refreshes expiration to 7 days from now and returns new invite URL.
 */
export async function resendInvitation(
  invitationId: string,
  actorId: string,
  client?: any
): Promise<{ rawToken: string; inviteUrl: string; invitation: DocumentInvitationRecord }> {
  const supabase = client ?? (await createServerClient())

  const rawToken = generateShareToken(32)
  const tokenHash = await hashShareToken(rawToken)
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("document_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: newExpiresAt,
      revoked_at: null,
    })
    .eq("id", invitationId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Failed to resend invitation: ${error?.message || "Invitation not found"}`)
  }

  return {
    rawToken,
    inviteUrl: `/invite/${rawToken}`,
    invitation: data as DocumentInvitationRecord,
  }
}

/**
 * Revokes an invitation before it is accepted.
 */
export async function revokeInvitation(
  invitationId: string,
  actorId: string,
  client?: any
): Promise<boolean> {
  const supabase = client ?? (await createServerClient())

  const { error } = await supabase
    .from("document_invitations")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("id", invitationId)

  return !error
}

/**
 * Accepts an invitation: validates token hash, expiration, revocation,
 * upserts into document_members, marks accepted_at, and returns document info.
 */
export async function acceptInvitation(
  rawToken: string,
  userId: string,
  client?: any
): Promise<{ success: boolean; documentId?: string; role?: string; error?: string }> {
  const supabase = client ?? (await createServerClient())
  const tokenHash = await hashShareToken(rawToken)

  const { data: invite, error: inviteError } = await supabase
    .from("document_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .single()

  if (inviteError || !invite) {
    return { success: false, error: "Invitation not found." }
  }

  if (invite.accepted_at) {
    return {
      success: true,
      documentId: invite.document_id,
      role: invite.role,
      error: "Invitation has already been accepted.",
    }
  }

  if (invite.revoked_at) {
    return { success: false, error: "This invitation has been revoked." }
  }

  if (isShareTokenExpired(invite.expires_at)) {
    return { success: false, error: "This invitation has expired." }
  }

  // Bind to document_members
  const { error: memberError } = await supabase
    .from("document_members")
    .upsert({
      document_id: invite.document_id,
      user_id: userId,
      role: invite.role,
      created_by: invite.invited_by,
      created_at: new Date().toISOString(),
    })

  if (memberError) {
    return { success: false, error: `Failed to join document: ${memberError.message}` }
  }

  // Mark invitation accepted
  await supabase
    .from("document_invitations")
    .update({
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)

  return {
    success: true,
    documentId: invite.document_id,
    role: invite.role,
  }
}
