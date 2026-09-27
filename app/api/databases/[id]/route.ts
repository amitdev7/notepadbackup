import { NextRequest, NextResponse } from "next/server"
import {
  getConnectedDatabaseRecord,
  disconnectDatabase,
  listConnectedDatabases,
} from "@/lib/server-connected-databases"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "user"
  const list = await listConnectedDatabases(userId)
  const item = list.find((d) => d.id === id)

  if (!item) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 })
  }

  return NextResponse.json({ database: item })
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "user"

  const result = await disconnectDatabase(id, userId)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, assignedWorkspacesCount: result.assignedWorkspacesCount },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}
