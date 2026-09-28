import { NextRequest, NextResponse } from "next/server"
import {
  getDatabaseRecord,
  getEffectiveUserRole,
  checkDatabaseAccess,
  addDatabaseMember,
  updateDatabaseMemberRole,
  removeDatabaseMember,
  type DatabaseRole,
} from "@/lib/database-auth"
import { getAuthenticatedUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const db = getDatabaseRecord(dbId)
  const myRole = getEffectiveUserRole(dbId, userId)

  if (!myRole) {
    return NextResponse.json({ error: "Access denied. You do not have access to this database." }, { status: 403 })
  }

  return NextResponse.json({
    dbId,
    name: db.name,
    description: db.description,
    members: db.members,
    myRole,
    isOwner: myRole === "owner",
  })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const user = await getAuthenticatedUser(req)
  const requesterUserId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { email, name, role, userId } = body as {
      email?: string
      name: string
      role: DatabaseRole
      userId?: string
    }

    if (!name || !role) {
      return NextResponse.json({ error: "Name and role are required." }, { status: 400 })
    }

    const result = addDatabaseMember(dbId, requesterUserId, { email, name, role, userId })
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to add member." }, { status: 403 })
    }

    return NextResponse.json({ success: true, dbId, members: result.members })
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const user = await getAuthenticatedUser(req)
  const requesterUserId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { targetUserId, role } = body as { targetUserId: string; role: DatabaseRole }

    if (!targetUserId || !role) {
      return NextResponse.json({ error: "targetUserId and role are required." }, { status: 400 })
    }

    const result = updateDatabaseMemberRole(dbId, requesterUserId, targetUserId, role)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to update role." }, { status: 403 })
    }

    return NextResponse.json({ success: true, dbId, members: result.members })
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const user = await getAuthenticatedUser(req)
  const requesterUserId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { targetUserId } = body as { targetUserId: string }

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 })
    }

    const result = removeDatabaseMember(dbId, requesterUserId, targetUserId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to remove member." }, { status: 403 })
    }

    return NextResponse.json({ success: true, dbId, members: result.members })
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}

