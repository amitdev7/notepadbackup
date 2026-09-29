import { NextResponse } from "next/server"
import { createClient } from "../../../lib/supabase/server"
import { createInvitations, listPendingInvitations, parseEmailList } from "../../../lib/cloud/invitations"
import { canShare } from "../../../lib/cloud/permissions"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get("documentId")

  if (!documentId) {
    return NextResponse.json({ ok: false, error: "Missing documentId" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const authorized = await canShare(documentId, user.id)
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Permission denied" }, { status: 403 })
  }

  const invites = await listPendingInvitations(documentId)
  return NextResponse.json({ ok: true, data: invites })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentId, emails, rawEmailString, role } = body

    if (!documentId) {
      return NextResponse.json({ ok: false, error: "Missing documentId" }, { status: 400 })
    }

    const emailList = Array.isArray(emails) && emails.length > 0
      ? emails
      : parseEmailList(rawEmailString || "")

    if (emailList.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid email addresses provided" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const authorized = await canShare(documentId, user.id)
    if (!authorized) {
      return NextResponse.json({ ok: false, error: "Permission denied" }, { status: 403 })
    }

    const results = await createInvitations({
      documentId,
      inviterId: user.id,
      emails: emailList,
      role: role === "editor" ? "editor" : "viewer",
    })

    return NextResponse.json({ ok: true, data: results })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
