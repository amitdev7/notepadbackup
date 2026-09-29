import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { resendInvitation, revokeInvitation } from "../../../../../lib/cloud/invitations"
import { canManageAccess } from "../../../../../lib/cloud/permissions"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await context.params
  const body = await request.json().catch(() => ({}))
  const { invitationId, action } = body

  if (!documentId || !invitationId || !action) {
    return NextResponse.json({ ok: false, error: "Missing required parameters" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const authorized = await canManageAccess(documentId, user.id)
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Only the owner can manage invitations" }, { status: 403 })
  }

  if (action === "resend") {
    try {
      const resent = await resendInvitation(invitationId, user.id)
      return NextResponse.json({ ok: true, data: resent })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  } else if (action === "revoke") {
    const success = await revokeInvitation(invitationId, user.id)
    return NextResponse.json({ ok: success })
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 })
}
