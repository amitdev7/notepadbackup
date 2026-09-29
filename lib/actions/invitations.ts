"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "../supabase/server"
import {
  createInvitations,
  resendInvitation,
  revokeInvitation,
  acceptInvitation,
} from "../cloud/invitations"
import { canManageAccess, canShare } from "../cloud/permissions"
import { dispatchSharingNotification } from "../cloud/notifications"

export async function createInvitationsAction(
  documentId: string,
  emails: string[],
  role: "viewer" | "editor"
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canShare(documentId, user.id)
  if (!authorized) throw new Error("Permission denied")

  const results = await createInvitations({
    documentId,
    inviterId: user.id,
    emails,
    role,
  })

  revalidatePath(`/dashboard`)
  return results
}

export async function resendInvitationAction(documentId: string, invitationId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canManageAccess(documentId, user.id)
  if (!authorized) throw new Error("Only the owner can manage invitations")

  const result = await resendInvitation(invitationId, user.id)
  revalidatePath(`/dashboard`)
  return result
}

export async function revokeInvitationAction(documentId: string, invitationId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const authorized = await canManageAccess(documentId, user.id)
  if (!authorized) throw new Error("Only the owner can revoke invitations")

  const success = await revokeInvitation(invitationId, user.id)
  revalidatePath(`/dashboard`)
  return success
}

export async function acceptInvitationAction(token: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Please sign in or create an account to accept this invitation")

  const result = await acceptInvitation(token, user.id)
  if (!result.success) {
    throw new Error(result.error || "Failed to accept invitation")
  }

  if (result.documentId) {
    const { data: doc } = await supabase
      .from("documents")
      .select("created_by, name")
      .eq("id", result.documentId)
      .single()

    if (doc?.created_by) {
      await dispatchSharingNotification({
        userId: doc.created_by,
        documentId: result.documentId,
        actorId: user.id,
        type: "invite_accepted",
        data: {
          acceptedByEmail: user.email,
          documentTitle: doc.name,
          role: result.role,
        },
      })
    }
  }

  revalidatePath(`/dashboard`)
  return result
}
