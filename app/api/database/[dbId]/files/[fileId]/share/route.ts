import { NextRequest, NextResponse } from "next/server"
import { checkDatabaseAccess } from "@/lib/database-auth"
import {
  getOrCreatePageShare,
  updatePageShare,
  regenerateSharePublicId,
  revokePageShare,
  sanitizeShareConfig,
  type ShareMode,
} from "@/lib/server-share"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  // Only editors and owners can inspect share configurations
  const access = checkDatabaseAccess(dbId, userId, "editor")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Edit access required to view share configuration" }, { status: 403 })
  }

  try {
    const share = await getOrCreatePageShare(dbId, fileId, userId)
    return NextResponse.json({
      success: true,
      share: sanitizeShareConfig(share),
    })
  } catch (err) {
    console.error("[Share API] Error fetching share config:", err)
    return NextResponse.json({ error: "Failed to load share settings" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkDatabaseAccess(dbId, userId, "editor")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Edit access required to update share configuration" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { mode, enabled, password, clearPassword, regenerateId, docSnapshot } = body

    if (regenerateId) {
      const share = await regenerateSharePublicId(dbId, fileId, userId)
      return NextResponse.json({
        success: true,
        share: sanitizeShareConfig(share),
      })
    }

    const share = await updatePageShare(dbId, fileId, userId, {
      mode: mode as ShareMode | undefined,
      enabled: typeof enabled === "boolean" ? enabled : undefined,
      password: typeof password === "string" ? password : undefined,
      clearPassword: !!clearPassword,
      docSnapshot,
    })

    return NextResponse.json({
      success: true,
      share: sanitizeShareConfig(share),
    })
  } catch (err) {
    console.error("[Share API] Error updating share config:", err)
    return NextResponse.json({ error: "Failed to update share settings" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  return PUT(req, context)
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkDatabaseAccess(dbId, userId, "editor")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Edit access required to revoke sharing" }, { status: 403 })
  }

  try {
    const share = await revokePageShare(dbId, fileId, userId)
    return NextResponse.json({
      success: true,
      share: sanitizeShareConfig(share),
    })
  } catch (err) {
    console.error("[Share API] Error revoking share:", err)
    return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 })
  }
}
