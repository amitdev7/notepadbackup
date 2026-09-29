import { NextResponse } from "next/server"
import { createClient } from "../../../lib/supabase/server"
import { createShareLink, listShareLinks, revokeAllShareLinks } from "../../../lib/cloud/sharing"
import { canShare, canManageAccess } from "../../../lib/cloud/permissions"

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

  const links = await listShareLinks(documentId)
  return NextResponse.json({ ok: true, data: links })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentId, permission, name, password, expiresInSeconds, expiresAtDate, allowExport, allowDuplicate } = body

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

    const result = await createShareLink({
      documentId,
      userId: user.id,
      permission: permission === "edit" ? "edit" : "view",
      name,
      password,
      expiresInSeconds,
      expiresAtDate,
      allowExport,
      allowDuplicate,
    })

    return NextResponse.json({ ok: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get("documentId")
  const action = searchParams.get("action")

  if (!documentId || action !== "revoke_all") {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const isOwner = await canManageAccess(documentId, user.id)
  if (!isOwner) {
    return NextResponse.json({ ok: false, error: "Only the owner can revoke all links" }, { status: 403 })
  }

  const revokedCount = await revokeAllShareLinks(documentId, user.id)
  return NextResponse.json({ ok: true, data: { revokedCount } })
}
