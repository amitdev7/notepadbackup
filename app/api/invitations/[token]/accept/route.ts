import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { acceptInvitation } from "../../../../../lib/cloud/invitations"
import { dispatchSharingNotification } from "../../../../../lib/cloud/notifications"

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing invitation token" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication required to accept invitation" }, { status: 401 })
  }

  const result = await acceptInvitation(token, user.id)

  if (!result.success) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  // Dispatch invite_accepted notification to inviter if documentId is present
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

  return NextResponse.json({ ok: true, data: result })
}
