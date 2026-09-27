import { NextRequest, NextResponse } from "next/server"
import { migrateWorkspaceData } from "@/lib/server-connected-databases"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId: workspaceId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "user"

  try {
    const body = await req.json()
    const { targetDatabaseId } = body

    if (!targetDatabaseId || typeof targetDatabaseId !== "string") {
      return NextResponse.json({ error: "targetDatabaseId is required" }, { status: 400 })
    }

    const result = await migrateWorkspaceData(workspaceId, targetDatabaseId, userId)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to migrate workspace" },
      { status: 400 }
    )
  }
}
