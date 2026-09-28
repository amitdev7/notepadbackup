import { NextRequest, NextResponse } from "next/server"
import { assignDatabaseToWorkspace } from "@/lib/server-connected-databases"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId: workspaceId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "user"

  try {
    const body = await req.json()
    const { databaseId } = body

    if (!databaseId || typeof databaseId !== "string") {
      return NextResponse.json({ error: "databaseId is required" }, { status: 400 })
    }

    const result = await assignDatabaseToWorkspace(workspaceId, databaseId, userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to assign database" }, { status: 400 })
    }

    return NextResponse.json({ success: true, workspaceId, databaseId })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to assign database to workspace" },
      { status: 500 }
    )
  }
}
