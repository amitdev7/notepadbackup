"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "../supabase/server"
import {
  createShareLink,
  rotateShareLink,
  revokeShareLink,
  revokeAllShareLinks,
} from "../cloud/sharing"
import { publishDocument, unpublishDocument } from "../cloud/public"
import { canManageAccess, canShare, canPublish } from "../cloud/permissions"
import { dispatchSharingNotification } from "../cloud/notifications"
import type { SharePermission, DocumentRole } from "../db/types"

export async function createShareLinkAction(
  documentId: string,
  options: {
    permission?: SharePermission
    name?: string | null
    password?: string | null
    expiresInSeconds?: number | null
    expiresAtDate?: string | null
    allowExport?: boolean
    allowDuplicate?: boolean
  }
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canShare(documentId, user.id)
  if (!authorized) throw new Error("Permission denied")

  const result = await createShareLink({
    documentId,
    userId: user.id,
    ...options,
  })

  revalidatePath(`/dashboard`)
  return result
}

export async function rotateShareLinkAction(documentId: string, linkId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canShare(documentId, user.id)
  if (!authorized) throw new Error("Permission denied")

  const result = await rotateShareLink(linkId, user.id)
  revalidatePath(`/dashboard`)
  return result
}

export async function revokeShareLinkAction(documentId: string, linkId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canShare(documentId, user.id)
  if (!authorized) throw new Error("Permission denied")

  const success = await revokeShareLink(linkId, user.id)
  revalidatePath(`/dashboard`)
  return success
}

export async function revokeAllShareLinksAction(documentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const isOwner = await canManageAccess(documentId, user.id)
  if (!isOwner) throw new Error("Only the owner can revoke all share links")

  const count = await revokeAllShareLinks(documentId, user.id)
  revalidatePath(`/dashboard`)
  return count
}

export async function updateDocumentMemberRoleAction(
  documentId: string,
  targetUserId: string,
  newRole: "viewer" | "editor"
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const isOwner = await canManageAccess(documentId, user.id)
  if (!isOwner) throw new Error("Only the owner can change permissions")

  const { error } = await supabase
    .from("document_members")
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("document_id", documentId)
    .eq("user_id", targetUserId)

  if (error) throw new Error(error.message)

  // Dispatch access_changed notification
  await dispatchSharingNotification({
    userId: targetUserId,
    documentId,
    actorId: user.id,
    type: "access_changed",
    data: { newRole },
  })

  revalidatePath(`/dashboard`)
  return true
}

export async function removeDocumentMemberAction(
  documentId: string,
  targetUserId: string
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const isOwner = await canManageAccess(documentId, user.id)
  if (!isOwner) throw new Error("Only the owner can remove access")

  const { error } = await supabase
    .from("document_members")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", targetUserId)

  if (error) throw new Error(error.message)

  // Dispatch access_removed notification
  await dispatchSharingNotification({
    userId: targetUserId,
    documentId,
    actorId: user.id,
    type: "access_removed",
  })

  revalidatePath(`/dashboard`)
  return true
}

export async function transferOwnershipAction(
  documentId: string,
  newOwnerUserId: string
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const isOwner = await canManageAccess(documentId, user.id)
  if (!isOwner) throw new Error("Only the owner can transfer ownership")

  // Update document created_by to new owner
  const { error: docError } = await supabase
    .from("documents")
    .update({
      created_by: newOwnerUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (docError) throw new Error(docError.message)

  // Demote previous owner to editor in document_members
  await supabase
    .from("document_members")
    .upsert({
      document_id: documentId,
      user_id: user.id,
      role: "editor",
    })

  // Ensure new owner is recorded with 'owner' in document_members
  await supabase
    .from("document_members")
    .upsert({
      document_id: documentId,
      user_id: newOwnerUserId,
      role: "owner",
    })

  await dispatchSharingNotification({
    userId: newOwnerUserId,
    documentId,
    actorId: user.id,
    type: "access_changed",
    data: { newRole: "owner", transferred: true },
  })

  revalidatePath(`/dashboard`)
  return true
}

export async function publishDocumentAction(
  documentId: string,
  slug?: string | null,
  publicRole?: "viewer" | "editor"
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canPublish(documentId, user.id)
  if (!authorized) throw new Error("Only the owner can publish to the web")

  const result = await publishDocument({
    documentId,
    actorId: user.id,
    slug,
    publicRole,
  })

  revalidatePath(`/dashboard`)
  return result
}

export async function unpublishDocumentAction(documentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canPublish(documentId, user.id)
  if (!authorized) throw new Error("Only the owner can unpublish")

  const success = await unpublishDocument(documentId, user.id)
  revalidatePath(`/dashboard`)
  return success
}
