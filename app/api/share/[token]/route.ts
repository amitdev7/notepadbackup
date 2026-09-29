import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "../../../../lib/supabase/server"
import { resolveShareToken, rotateShareLink, revokeShareLink } from "../../../../lib/cloud/sharing"
import { getShareSessionCookieName } from "../../../../lib/security/share-session"
import { canShare } from "../../../../lib/cloud/permissions"

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Find any relevant share password cookie
  let sessionCookie: string | null = null
  for (const c of allCookies) {
    if (c.name.startsWith("zs_share_pwd_")) {
      sessionCookie = c.value
      break
    }
  }

  const result = await resolveShareToken(token, sessionCookie)

  if (!result.valid) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 })
  }

  if (result.requiresPassword) {
    return NextResponse.json({
      ok: true,
      requiresPassword: true,
      linkId: result.linkId,
      documentId: result.documentId,
      permission: result.permission,
      allowExport: result.allowExport,
      allowDuplicate: result.allowDuplicate,
    })
  }

  return NextResponse.json({
    ok: true,
    requiresPassword: false,
    linkId: result.linkId,
    documentId: result.documentId,
    permission: result.permission,
    allowExport: result.allowExport,
    allowDuplicate: result.allowDuplicate,
    document: result.document,
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const body = await request.json().catch(() => ({}))
  const { linkId, action, documentId } = body

  if (!linkId || action !== "rotate" || !documentId) {
    return NextResponse.json({ ok: false, error: "Invalid rotation request" }, { status: 400 })
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

  try {
    const rotated = await rotateShareLink(linkId, user.id)
    return NextResponse.json({ ok: true, data: rotated })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get("linkId")
  const documentId = searchParams.get("documentId")

  if (!linkId || !documentId) {
    return NextResponse.json({ ok: false, error: "Missing linkId or documentId" }, { status: 400 })
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

  const success = await revokeShareLink(linkId, user.id)
  return NextResponse.json({ ok: success })
}
